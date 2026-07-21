import express, { Request, Response, NextFunction } from "express";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), "../backend/.env.local") });

// Extend Request type
interface AuthenticatedRequest extends Request {
  user?: any;
}

const app = express();
const PORT = Number(process.env.PORT || 3001);
const JWT_SECRET = process.env.JWT_SECRET || "acordito-secret-key";
const distPath = path.join(process.cwd(), "dist");
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

const OPENAI_ALLOWED_PATHS = [
  /^responses$/,
  /^files$/,
  /^files\/[A-Za-z0-9_-]+$/,
  /^vector_stores$/,
  /^vector_stores\/[A-Za-z0-9_-]+$/,
  /^vector_stores\/[A-Za-z0-9_-]+\/files$/,
  /^vector_stores\/[A-Za-z0-9_-]+\/files\/[A-Za-z0-9_-]+$/,
];
const GEMINI_ALLOWED_PATH = /^models\/[A-Za-z0-9._-]+:(generateContent|predict)$/;

app.use(express.json({ limit: "25mb" }));

const readRawBody = (req: Request): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });

const authenticateSupabaseUser = async (req: Request) => {
  const raw = String(req.headers.authorization || "");
  const token = raw.replace(/^Bearer\s+/i, "").trim();
  if (!token || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;

    const user = await response.json();
    const email = String(user?.email || "").trim().toLowerCase();
    if (!email.includes("ddm")) return null;

    return user;
  } catch {
    return null;
  }
};

const requireSupabaseAuth = async (req: Request, res: Response, next: NextFunction) => {
  const user = await authenticateSupabaseUser(req);
  if (!user) return res.status(401).json({ error: { message: "Nao autorizado." } });
  (req as any).supabaseUser = user;
  next();
};

// In-memory "Database"
const users = [
  { id: "1", name: "Admin Acordito", email: "admin@empresa.com", password: bcrypt.hashSync("admin123", 10), role: "admin", sector: "TI" },
  { id: "2", name: "João Silva", email: "joao@empresa.com", password: bcrypt.hashSync("user123", 10), role: "user", sector: "Marketing" },
  { id: "3", name: "Maria Souza", email: "maria@empresa.com", password: bcrypt.hashSync("user123", 10), role: "user", sector: "Comercial" },
];

const interactions: any[] = [];

// Auth Middleware
const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// API Routes
app.post("/api/auth/login", (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);

  if (user && bcrypt.compareSync(password, user.password)) {
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name, sector: user.sector }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, sector: user.sector } });
  } else {
    res.status(401).json({ message: "Credenciais inválidas" });
  }
});

app.post("/api/interactions", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const interaction = {
    ...req.body,
    id: Math.random().toString(36).substr(2, 9),
    userId: req.user.id,
    userName: req.user.name,
    userSector: req.user.sector,
    timestamp: new Date().toISOString()
  };
  interactions.push(interaction);
  res.status(201).json(interaction);
});

app.get("/api/admin/stats", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);

  const stats = {
    totalInteractions: interactions.length,
    interactionsBySector: interactions.reduce((acc: any, curr: any) => {
      acc[curr.userSector] = (acc[curr.userSector] || 0) + 1;
      return acc;
    }, {}),
    recentInteractions: interactions.slice(-10).reverse(),
    usersCount: users.length
  };
  res.json(stats);
});

app.all("/api/openai", requireSupabaseAuth, async (req: Request, res: Response) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: { message: "OPENAI_API_KEY nao configurada no servidor." } });
  }

  const targetPath = String(req.headers["x-openai-path"] || "").replace(/^\/+/, "");
  if (!OPENAI_ALLOWED_PATHS.some((pattern) => pattern.test(targetPath))) {
    return res.status(400).json({ error: { message: `Endpoint nao permitido: ${targetPath}` } });
  }

  const isJson = String(req.headers["content-type"] || "").includes("application/json");
  const body = req.method === "GET" || req.method === "HEAD"
    ? undefined
    : isJson
      ? JSON.stringify(req.body)
      : await readRawBody(req);

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

app.all("/api/gemini", requireSupabaseAuth, async (req: Request, res: Response) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: { message: "GEMINI_API_KEY nao configurada no servidor." } });
  }

  const targetPath = String(req.headers["x-gemini-path"] || "").replace(/^\/+/, "");
  if (!GEMINI_ALLOWED_PATH.test(targetPath)) {
    return res.status(400).json({ error: { message: `Endpoint nao permitido: ${targetPath}` } });
  }

  const isJson = String(req.headers["content-type"] || "").includes("application/json");
  const body = req.method === "GET" || req.method === "HEAD"
    ? undefined
    : isJson
      ? JSON.stringify(req.body)
      : await readRawBody(req);

  try {
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/${targetPath}?key=${apiKey}`, {
      method: req.method,
      headers: { "Content-Type": req.headers["content-type"] || "application/json" },
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

app.use(express.static(distPath));
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
