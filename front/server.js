import { APP_ROOT } from "./server/loadEnv.js"; // precisa ser o primeiro import — ver o comentario no arquivo
import express from "express";
import path from "path";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { db } from "./server/db.js";
import { requireAuth } from "./server/authCore.js";
import apiRoutes from "./server/routes.js";

const app = express();
const PORT = Number(process.env.PORT || 3001);
const distPath = path.join(APP_ROOT, "dist");

// Fail fast: sem banco ou sem segredo de JWT o app nao tem como autenticar
// ninguem. Melhor nao subir do que subir com auth quebrada.
if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
  console.error("FATAL: DB_HOST/DB_USER/DB_NAME ausentes. Servidor nao vai subir.");
  process.exit(1);
}
if (!process.env.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET.length < 32) {
  console.error("FATAL: JWT_ACCESS_SECRET ausente ou curto demais. Servidor nao vai subir.");
  process.exit(1);
}

const parseList = (value, fallback) =>
  String(value || fallback)
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const ALLOWED_EMAIL_DOMAINS = parseList(process.env.ALLOWED_EMAIL_DOMAINS, "ddm.adv.br,grupoddm.com.br,grupoddm.ia.br");
const ADMIN_EMAILS = parseList(process.env.ADMIN_EMAILS, "");

// Allowlist dos proxies de IA: caminho + metodos + exigencia de admin.
// Gestao de arquivos/vector stores e da conta inteira da organizacao, entao
// so admin escreve/apaga (chamado apenas por Admin.tsx).
const OPENAI_ROUTES = [
  { pattern: /^responses$/, methods: ["POST"], adminOnly: false },
  // DDM Creator com gpt-image-1: geracao simples, e edicao quando ha logo ou
  // imagem de referencia (o endpoint de edicao aceita imagens de entrada).
  { pattern: /^images\/generations$/, methods: ["POST"], adminOnly: false },
  { pattern: /^images\/edits$/, methods: ["POST"], adminOnly: false },
  { pattern: /^files$/, methods: ["POST"], adminOnly: true },
  { pattern: /^files\/[A-Za-z0-9_-]+$/, methods: ["GET", "DELETE"], adminOnly: true },
  { pattern: /^vector_stores$/, methods: ["GET", "POST"], adminOnly: true },
  { pattern: /^vector_stores\/[A-Za-z0-9_-]+$/, methods: ["GET"], adminOnly: true },
  { pattern: /^vector_stores\/[A-Za-z0-9_-]+\/files$/, methods: ["GET", "POST"], adminOnly: true },
  { pattern: /^vector_stores\/[A-Za-z0-9_-]+\/files\/[A-Za-z0-9_-]+$/, methods: ["GET", "DELETE"], adminOnly: true },
];

const GEMINI_ROUTES = [
  { pattern: /^models\/[A-Za-z0-9._-]+:(generateContent|predict)$/, methods: ["POST"], adminOnly: false },
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

// Same-origin por padrao: a app serve o proprio frontend. CORS_ORIGINS so no dev
// (Vite em porta separada). O navegador manda o header Origin mesmo em
// requisicoes same-origin (nao so em cross-origin) — comparar so "origin
// vazio = same-origin" e furada: bloqueia a propria app. Usa optionsDelegate
// pra comparar contra o proprio host da requisicao.
const CORS_ORIGINS = parseList(process.env.CORS_ORIGINS, "");
app.use(
  cors((req, callback) => {
    const origin = req.headers.origin;
    const ownOrigin = `${req.protocol}://${req.get("host")}`;

    if (!origin || origin === ownOrigin || CORS_ORIGINS.includes(origin.toLowerCase())) {
      return callback(null, { origin: true, credentials: true });
    }
    return callback(null, { origin: false, credentials: true });
  }),
);

app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// ── API (auth, dados, arquivos) ──────────────────────────────────────────────

app.use("/api", apiRoutes);

// ── Proxy de IA: autenticado pelo JWT proprio, nao mais pelo Supabase ───────

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AI_RATE_LIMIT || 60),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip),
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

app.all("/api/openai", requireAuth, aiLimiter, async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: { message: "Servico de IA indisponivel." } });
  }

  const targetPath = String(req.headers["x-openai-path"] || "").replace(/^\/+/, "");
  const match = matchRoute(OPENAI_ROUTES, targetPath, req.method);
  if (!match.ok) {
    return res.status(403).json({ error: { message: "Operacao nao permitida." } });
  }
  if (match.adminOnly && req.user.role !== "admin") {
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

app.all("/api/gemini", requireAuth, aiLimiter, async (req, res) => {
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

// ── Erro central da API ──────────────────────────────────────────────────────
// Qualquer throw dentro dos handlers de server/routes.js cai aqui via o
// wrapper h(). Nunca ecoa err.message bruto: pode conter SQL ou path de disco.
app.use("/api", (err, req, res, next) => {
  console.error("Erro na API:", err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: { message: "Erro interno. Tente novamente." } });
});

// ── Frontend estatico ────────────────────────────────────────────────────────

app.use(express.static(distPath));
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// Sem top-level await de proposito: o Passenger do cPanel carrega o app.js
// via require(), e require() de ESM falha com ERR_REQUIRE_ASYNC_MODULE se
// houver await no topo de qualquer modulo do grafo. Checagem do banco roda
// antes do listen, via promise.
db.ping()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Dominios liberados: ${ALLOWED_EMAIL_DOMAINS.join(", ")}`);
      console.log(`Admins configurados: ${ADMIN_EMAILS.length}`);
    });
  })
  .catch((err) => {
    console.error("FATAL: nao foi possivel conectar ao MariaDB.", err.message);
    process.exit(1);
  });
