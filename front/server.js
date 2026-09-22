import express from "express";
import path from "path";
import helmet from "helmet";
import cors from "cors";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), "../backend/.env.local") });

const app = express();
const PORT = Number(process.env.PORT || 3001);
const distPath = path.join(process.cwd(), "dist");

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

// Fail fast: sem estas envs o gate de autenticacao nao funciona e o proxy de IA
// ficaria aberto. Melhor nao subir do que subir sem protecao.
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("FATAL: SUPABASE_URL/SUPABASE_ANON_KEY ausentes. Servidor nao vai subir.");
  process.exit(1);
}

// ── Autorizacao ──────────────────────────────────────────────────────────────

const parseList = (value, fallback) =>
  String(value || fallback)
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

// Dominios fechados. Substitui o antigo email.includes("ddm"), que aceitava
// qualquer endereco com a substring "ddm" (ddm@gmail.com, xddmx@outlook.com).
const ALLOWED_EMAIL_DOMAINS = parseList(
  process.env.ALLOWED_EMAIL_DOMAINS,
  "ddm.adv.br,grupoddm.com.br,grupoddm.ia.br",
);
const ADMIN_EMAILS = parseList(process.env.ADMIN_EMAILS, "");

const emailDomain = (email) => email.slice(email.lastIndexOf("@") + 1);
const isAllowedEmail = (email) => ALLOWED_EMAIL_DOMAINS.includes(emailDomain(email));
const isAdminEmail = (email) => ADMIN_EMAILS.includes(email);

// Allowlist dos proxies: caminho + metodos permitidos + exigencia de admin.
// Gestao de arquivos/vector stores e da conta inteira da organizacao, entao so
// admin pode escrever ou apagar (chamado apenas por Admin.tsx).
const OPENAI_ROUTES = [
  { pattern: /^responses$/, methods: ["POST"], adminOnly: false },
  { pattern: /^files$/, methods: ["POST"], adminOnly: true },
  { pattern: /^files\/[A-Za-z0-9_-]+$/, methods: ["GET", "DELETE"], adminOnly: true },
  { pattern: /^vector_stores$/, methods: ["GET", "POST"], adminOnly: true },
  { pattern: /^vector_stores\/[A-Za-z0-9_-]+$/, methods: ["GET"], adminOnly: true },
  { pattern: /^vector_stores\/[A-Za-z0-9_-]+\/files$/, methods: ["GET", "POST"], adminOnly: true },
  {
    pattern: /^vector_stores\/[A-Za-z0-9_-]+\/files\/[A-Za-z0-9_-]+$/,
    methods: ["GET", "DELETE"],
    adminOnly: true,
  },
];

const GEMINI_ROUTES = [
  {
    pattern: /^models\/[A-Za-z0-9._-]+:(generateContent|predict)$/,
    methods: ["POST"],
    adminOnly: false,
  },
];

const matchRoute = (routes, targetPath, method) => {
  const route = routes.find((item) => item.pattern.test(targetPath));
  if (!route) return { ok: false };
  if (!route.methods.includes(method.toUpperCase())) return { ok: false };
  return { ok: true, adminOnly: route.adminOnly };
};

// ── Hardening de transporte ──────────────────────────────────────────────────

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(
  helmet({
    // O bundle do Vite usa estilos inline; CSP entra junto com o build da fase 2.
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true, preload: true }));

// Same-origin por padrao: a app serve o proprio frontend. CORS_ORIGINS so no dev.
const CORS_ORIGINS = parseList(process.env.CORS_ORIGINS, "");
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (CORS_ORIGINS.includes(origin.toLowerCase())) return callback(null, true);
      return callback(new Error("Origem nao permitida."));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "10mb" }));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// ── Autenticacao ─────────────────────────────────────────────────────────────

const authenticateSupabaseUser = async (req) => {
  const raw = String(req.headers.authorization || "");
  const token = raw.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;

    const user = await response.json();
    const email = String(user?.email || "").trim().toLowerCase();
    if (!email || !isAllowedEmail(email)) return null;

    return { ...user, email, isAdmin: isAdminEmail(email) };
  } catch {
    return null;
  }
};

const requireSupabaseAuth = async (req, res, next) => {
  const user = await authenticateSupabaseUser(req);
  if (!user) return res.status(401).json({ error: { message: "Nao autorizado." } });
  req.supabaseUser = user;
  next();
};

// Cota por usuario autenticado, nao por IP: impede que um unico login torre a
// fatura da OpenAI/Gemini. Ajuste AI_RATE_LIMIT conforme o uso real.
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AI_RATE_LIMIT || 60),
  standardHeaders: true,
  legacyHeaders: false,
  // ipKeyGenerator normaliza o /64 do IPv6. Sem isso, trocar de endereco IPv6
  // dentro do mesmo prefixo zeraria a cota.
  keyGenerator: (req) => req.supabaseUser?.id || ipKeyGenerator(req.ip),
  message: {
    error: { message: "Limite de uso da IA atingido. Tente novamente em alguns minutos." },
  },
});

const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 20 * 1024 * 1024);

const readRawBody = (req, maxBytes) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("payload-too-large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });

const buildProxyBody = async (req) => {
  if (req.method === "GET" || req.method === "HEAD") return undefined;
  const isJson = String(req.headers["content-type"] || "").includes("application/json");
  if (isJson) return JSON.stringify(req.body);
  return readRawBody(req, MAX_UPLOAD_BYTES);
};

// ── Proxy OpenAI ─────────────────────────────────────────────────────────────

app.all("/api/openai", requireSupabaseAuth, aiLimiter, async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: { message: "Servico de IA indisponivel." } });
  }

  const targetPath = String(req.headers["x-openai-path"] || "").replace(/^\/+/, "");
  const match = matchRoute(OPENAI_ROUTES, targetPath, req.method);
  if (!match.ok) {
    return res.status(403).json({ error: { message: "Operacao nao permitida." } });
  }
  if (match.adminOnly && !req.supabaseUser.isAdmin) {
    return res.status(403).json({ error: { message: "Operacao restrita a administradores." } });
  }

  let body;
  try {
    body = await buildProxyBody(req);
  } catch {
    return res.status(413).json({ error: { message: "Arquivo muito grande." } });
  }

  try {
    const upstream = await fetch(`https://api.openai.com/v1/${targetPath}`, {
      method: req.method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": req.headers["content-type"] || "application/json",
        ...(req.headers["openai-beta"] ? { "OpenAI-Beta": String(req.headers["openai-beta"]) } : {}),
      },
      body,
    });

    const responseBody = Buffer.from(await upstream.arrayBuffer());
    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json");
    res.send(responseBody);
  } catch {
    res.status(502).json({ error: { message: "Falha ao contatar a OpenAI." } });
  }
});

// ── Proxy Gemini ─────────────────────────────────────────────────────────────

app.all("/api/gemini", requireSupabaseAuth, aiLimiter, async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: { message: "Servico de IA indisponivel." } });
  }

  const targetPath = String(req.headers["x-gemini-path"] || "").replace(/^\/+/, "");
  const match = matchRoute(GEMINI_ROUTES, targetPath, req.method);
  if (!match.ok) {
    return res.status(403).json({ error: { message: "Operacao nao permitida." } });
  }

  let body;
  try {
    body = await buildProxyBody(req);
  } catch {
    return res.status(413).json({ error: { message: "Arquivo muito grande." } });
  }

  try {
    // Chave no header, nao na query string: evita vazamento em log de acesso.
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/${targetPath}`, {
      method: req.method,
      headers: {
        "Content-Type": req.headers["content-type"] || "application/json",
        "x-goog-api-key": apiKey,
      },
      body,
    });

    const responseBody = Buffer.from(await upstream.arrayBuffer());
    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json");
    res.send(responseBody);
  } catch {
    res.status(502).json({ error: { message: "Falha ao contatar o Gemini." } });
  }
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

// ── Frontend estatico ────────────────────────────────────────────────────────

app.use(express.static(distPath));
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Dominios liberados: ${ALLOWED_EMAIL_DOMAINS.join(", ")}`);
  console.log(`Admins configurados: ${ADMIN_EMAILS.length}`);
});
