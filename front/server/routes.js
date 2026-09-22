import crypto from "crypto";
import { Router } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { db } from "./db.js";
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  issueRefreshToken,
  findValidRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokens,
  issuePasswordResetCode,
  consumePasswordResetCode,
  signResetToken,
  verifyResetToken,
  setAuthCookies,
  clearAuthCookies,
  setResetCookie,
  clearResetCookie,
  requireAuth,
  requireRole,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  RESET_COOKIE,
} from "./authCore.js";
import { sendPasswordResetCode } from "./mailer.js";
import { upload, saveFile, getFileRow, readFileBuffer, deleteFile, fileUrl, isInlineSafeMimeType } from "./storage.js";

const router = Router();
const uuid = () => crypto.randomUUID();

/** Envolve handlers async: erros caem no error handler central do server.js. */
const h = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const parseList = (value, fallback) =>
  String(value || fallback)
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const ALLOWED_EMAIL_DOMAINS = parseList(process.env.ALLOWED_EMAIL_DOMAINS, "ddm.adv.br,grupoddm.com.br,grupoddm.ia.br");
const ADMIN_EMAILS = parseList(process.env.ADMIN_EMAILS, "");
const RH_EMAILS = parseList(process.env.RH_EMAILS, "");

const emailDomain = (email) => email.slice(email.lastIndexOf("@") + 1);
const isAllowedEmail = (email) => ALLOWED_EMAIL_DOMAINS.includes(emailDomain(email)) || RH_EMAILS.includes(email);
const roleForEmail = (email) => (ADMIN_EMAILS.includes(email) ? "admin" : RH_EMAILS.includes(email) ? "rh" : "user");

const DEFAULT_AVATAR_URL = `/avatars/${encodeURIComponent("Acordito_celular.png")}`;

const toProfile = (row) => ({
  uid: row.id,
  email: row.email,
  displayName: row.full_name || row.email.split("@")[0],
  preferredName: row.preferred_name || row.full_name?.split(" ")[0] || row.email.split("@")[0],
  avatarUrl: row.avatar_url || DEFAULT_AVATAR_URL,
  role: row.role,
  department: row.department || "Geral",
  unit: row.unit || "DDM - São Paulo",
  jobTitle: row.job_title || "Colaborador",
  maturityLevel: row.maturity_level || "Iniciante",
  createdAt: row.created_at,
});

// ══════════════════════════════════════════════════════════════════════════
// Auth
// ══════════════════════════════════════════════════════════════════════════

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
});

const issueSession = async (res, req, userRow) => {
  const accessToken = signAccessToken(userRow);
  const refreshToken = await issueRefreshToken(userRow.id, req);
  setAuthCookies(res, { accessToken, refreshToken });
};

router.post(
  "/auth/register",
  authLimiter,
  h(async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const displayName = String(req.body?.displayName || "").trim() || email.split("@")[0];
    const preferredName = String(req.body?.preferredName || "").trim() || displayName.split(" ")[0];
    const sector = String(req.body?.sector || "Geral").trim();
    const jobTitle = String(req.body?.jobTitle || "Colaborador").trim();

    if (!isAllowedEmail(email)) {
      return res.status(400).json({ error: { message: "Use seu e-mail corporativo DDM para acessar o Lab." } });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: { message: "A senha deve ter pelo menos 6 caracteres." } });
    }

    const existing = await db.queryOne(`SELECT id FROM users WHERE email = ?`, [email]);
    if (existing) {
      return res.status(409).json({ error: { message: "Ja existe uma conta com este e-mail." } });
    }

    const id = uuid();
    const passwordHash = await hashPassword(password);
    const role = roleForEmail(email);

    await db.exec(
      `INSERT INTO users (id, email, password_hash, full_name, preferred_name, role, department, job_title)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, email, passwordHash, displayName, preferredName, role, sector, jobTitle],
    );

    const userRow = await db.queryOne(`SELECT * FROM users WHERE id = ?`, [id]);
    await issueSession(res, req, userRow);
    res.status(201).json({ user: { id: userRow.id, email: userRow.email }, profile: toProfile(userRow) });
  }),
);

router.post(
  "/auth/login",
  authLimiter,
  h(async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    const userRow = await db.queryOne(`SELECT * FROM users WHERE email = ?`, [email]);
    if (!userRow || !userRow.is_active) {
      return res.status(401).json({ error: { message: "E-mail ou senha invalidos." } });
    }

    if (userRow.locked_until && new Date(userRow.locked_until) > new Date()) {
      return res.status(423).json({ error: { message: "Conta temporariamente bloqueada por tentativas invalidas. Tente novamente em alguns minutos." } });
    }

    const ok = await verifyPassword(password, userRow.password_hash);
    if (!ok) {
      const failedLogins = userRow.failed_logins + 1;
      const lockUntil = failedLogins >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      await db.exec(`UPDATE users SET failed_logins = ?, locked_until = ? WHERE id = ?`, [failedLogins, lockUntil, userRow.id]);
      return res.status(401).json({ error: { message: "E-mail ou senha invalidos." } });
    }

    await db.exec(`UPDATE users SET failed_logins = 0, locked_until = NULL, last_login_at = NOW() WHERE id = ?`, [userRow.id]);
    await issueSession(res, req, userRow);
    res.json({ user: { id: userRow.id, email: userRow.email }, profile: toProfile(userRow) });
  }),
);

router.post(
  "/auth/rh-login",
  authLimiter,
  h(async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    const userRow = await db.queryOne(`SELECT * FROM users WHERE email = ?`, [email]);
    if (!userRow || !userRow.is_active) {
      return res.status(401).json({ error: { message: "E-mail ou senha invalidos." } });
    }

    const ok = await verifyPassword(password, userRow.password_hash);
    if (!ok) {
      return res.status(401).json({ error: { message: "E-mail ou senha invalidos." } });
    }

    if (userRow.role !== "rh" && userRow.role !== "admin") {
      return res.status(403).json({ error: { message: "Acesso restrito ao setor de RH." } });
    }

    await db.exec(`UPDATE users SET last_login_at = NOW() WHERE id = ?`, [userRow.id]);
    await issueSession(res, req, userRow);
    res.json({ user: { id: userRow.id, email: userRow.email }, profile: toProfile(userRow) });
  }),
);

router.post(
  "/auth/refresh",
  h(async (req, res) => {
    const raw = req.cookies?.[REFRESH_COOKIE];
    const valid = await findValidRefreshToken(raw);
    if (!valid) {
      clearAuthCookies(res);
      return res.status(401).json({ error: { message: "Sessao expirada." } });
    }

    const userRow = await db.queryOne(`SELECT * FROM users WHERE id = ?`, [valid.user_id]);
    if (!userRow || !userRow.is_active) {
      clearAuthCookies(res);
      return res.status(401).json({ error: { message: "Sessao expirada." } });
    }

    // Rotaciona: revoga o refresh usado e emite um novo par de tokens.
    await revokeRefreshToken(raw);
    await issueSession(res, req, userRow);
    res.json({ user: { id: userRow.id, email: userRow.email }, profile: toProfile(userRow) });
  }),
);

router.post(
  "/auth/logout",
  h(async (req, res) => {
    await revokeRefreshToken(req.cookies?.[REFRESH_COOKIE]);
    clearAuthCookies(res);
    res.json({ ok: true });
  }),
);

router.get(
  "/auth/me",
  requireAuth,
  h(async (req, res) => {
    const userRow = await db.queryOne(`SELECT * FROM users WHERE id = ?`, [req.user.id]);
    if (!userRow || !userRow.is_active) {
      return res.status(401).json({ error: { message: "Sessao expirada." } });
    }
    res.json({ user: { id: userRow.id, email: userRow.email }, profile: toProfile(userRow) });
  }),
);

router.post(
  "/auth/password-reset/request",
  authLimiter,
  h(async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!isAllowedEmail(email)) {
      return res.status(400).json({ error: { message: "Use seu e-mail corporativo DDM." } });
    }

    const userRow = await db.queryOne(`SELECT id, email FROM users WHERE email = ?`, [email]);
    // Nao revela se o e-mail existe: resposta identica nos dois casos.
    if (userRow) {
      const code = await issuePasswordResetCode(userRow.id);
      await sendPasswordResetCode(userRow.email, code).catch((err) => console.error("Falha ao enviar e-mail de reset:", err));
    }
    res.json({ ok: true });
  }),
);

router.post(
  "/auth/password-reset/verify",
  authLimiter,
  h(async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const code = String(req.body?.token || "").trim();

    const userRow = await db.queryOne(`SELECT id FROM users WHERE email = ?`, [email]);
    const ok = userRow ? await consumePasswordResetCode(userRow.id, code) : false;
    if (!ok) {
      return res.status(400).json({ error: { message: "Codigo invalido ou expirado. Solicite um novo codigo." } });
    }

    setResetCookie(res, signResetToken(userRow.id));
    res.json({ ok: true });
  }),
);

router.post(
  "/auth/password-reset/confirm",
  authLimiter,
  h(async (req, res) => {
    const password = String(req.body?.password || "");
    const resetToken = req.cookies?.[RESET_COOKIE];
    const payload = resetToken ? verifyResetToken(resetToken) : null;

    if (!payload) {
      return res.status(401).json({ error: { message: "Sessao de recuperacao expirada. Solicite novamente." } });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: { message: "A nova senha deve ter pelo menos 6 caracteres." } });
    }

    const passwordHash = await hashPassword(password);
    await db.exec(`UPDATE users SET password_hash = ? WHERE id = ?`, [passwordHash, payload.sub]);
    await revokeAllRefreshTokens(payload.sub);
    clearResetCookie(res);
    clearAuthCookies(res);
    res.json({ ok: true });
  }),
);

// ══════════════════════════════════════════════════════════════════════════
// Perfil
// ══════════════════════════════════════════════════════════════════════════

router.patch(
  "/profile",
  requireAuth,
  h(async (req, res) => {
    const b = req.body || {};
    const fields = {
      full_name: b.displayName,
      preferred_name: b.preferredName,
      avatar_url: b.avatarUrl,
      department: b.department,
      unit: b.unit,
      job_title: b.jobTitle,
      maturity_level: b.maturityLevel,
    };

    const set = [];
    const params = [];
    for (const [column, value] of Object.entries(fields)) {
      if (value === undefined) continue;
      set.push(`${column} = ?`);
      params.push(value);
    }

    if (set.length) {
      params.push(req.user.id);
      await db.exec(`UPDATE users SET ${set.join(", ")} WHERE id = ?`, params);
    }

    const userRow = await db.queryOne(`SELECT * FROM users WHERE id = ?`, [req.user.id]);
    res.json({ profile: toProfile(userRow) });
  }),
);

// ══════════════════════════════════════════════════════════════════════════
// Admin / insights
// ══════════════════════════════════════════════════════════════════════════

const maturityToScore = (level) => {
  const n = String(level || "").toLowerCase();
  if (n.includes("expert")) return 9.5;
  if (n.includes("avanc")) return 8.5;
  if (n.includes("intermed")) return 6.5;
  if (n.includes("basic") || n.includes("básic")) return 3.5;
  return 1.5;
};

const sectorColor = (name) => {
  const n = name.trim().toLowerCase();
  if (n.includes("marketing")) return "#FF5100";
  if (n.includes("vendas") || n.includes("comercial")) return "#F59E0B";
  if (n.includes("rh")) return "#EC4899";
  if (n.includes("jur")) return "#8B5CF6";
  if (n.includes("ti")) return "#3B82F6";
  if (n.includes("financ")) return "#10B981";
  return "#71717A";
};

router.get(
  "/admin/stats",
  requireAuth,
  requireRole("admin"),
  h(async (req, res) => {
    const users = await db.query(`SELECT id, department, maturity_level FROM users`);
    const logs = await db.query(`SELECT id, user_id, ia_used, sector, created_at FROM logs_uso_ia`);

    const activeUserIds = new Set();
    const sectorCounts = new Map();
    const iaCounts = new Map();

    logs.forEach((log) => {
      if (log.user_id) activeUserIds.add(log.user_id);
      if (log.sector) sectorCounts.set(log.sector, (sectorCounts.get(log.sector) || 0) + 1);
      if (log.ia_used) iaCounts.set(log.ia_used, (iaCounts.get(log.ia_used) || 0) + 1);
    });

    if (logs.length === 0) {
      users.forEach((u) => {
        const department = u.department || "Geral";
        sectorCounts.set(department, (sectorCounts.get(department) || 0) + 1);
      });
    }

    const maturityScores = users.map((u) => maturityToScore(u.maturity_level));
    const recentInteractions = await db.query(
      `SELECT * FROM logs_uso_ia ORDER BY created_at DESC LIMIT 10`,
    );

    res.json({
      totalUsers: users.length,
      totalPrompts: logs.length,
      activeUsers: activeUserIds.size,
      avgMaturityScore: maturityScores.length
        ? Number((maturityScores.reduce((a, b) => a + b, 0) / maturityScores.length).toFixed(1))
        : 0,
      sectorUsage: Array.from(sectorCounts.entries()).map(([name, value]) => ({ name, value })),
      iaUsage: Array.from(iaCounts.entries()).map(([name, value]) => ({ name, value })),
      recentInteractions,
    });
  }),
);

router.get(
  "/admin/insights",
  requireAuth,
  requireRole("admin"),
  h(async (req, res) => {
    const users = await db.query(`SELECT id, email, full_name, department, unit, maturity_level FROM users`);
    const logs = await db.query(`SELECT id, user_id, ia_used, sector, created_at FROM logs_uso_ia`);

    const userById = new Map(users.map((u) => [u.id, u]));
    const activeUserIds = new Set(logs.map((l) => l.user_id).filter(Boolean));
    const avgMaturityScore = users.length
      ? Number((users.reduce((total, u) => total + maturityToScore(u.maturity_level), 0) / users.length).toFixed(1))
      : 0;

    const sectorCounts = new Map();
    logs.forEach((log) => {
      const sector = log.sector || "Geral";
      sectorCounts.set(sector, (sectorCounts.get(sector) || 0) + 1);
    });
    const sectorData = Array.from(sectorCounts.entries())
      .map(([name, usage]) => ({ name, usage, color: sectorColor(name) }))
      .sort((a, b) => b.usage - a.usage);

    const monthlyBuckets = new Map();
    logs.forEach((log) => {
      if (!log.created_at || !log.user_id) return;
      const month = new Date(log.created_at).toLocaleDateString("pt-BR", { month: "short" });
      const maturity = maturityToScore(userById.get(log.user_id)?.maturity_level);
      const current = monthlyBuckets.get(month) || { total: 0, count: 0 };
      monthlyBuckets.set(month, { total: current.total + maturity, count: current.count + 1 });
    });
    const maturityData = Array.from(monthlyBuckets.entries()).map(([month, data]) => ({
      month,
      level: Number((data.total / data.count).toFixed(1)),
    }));

    const promptCountByUser = new Map();
    logs.forEach((log) => {
      if (log.user_id) promptCountByUser.set(log.user_id, (promptCountByUser.get(log.user_id) || 0) + 1);
    });

    const people = users
      .map((u) => ({
        id: u.id,
        name: u.full_name || u.email.split("@")[0],
        email: u.email,
        sector: u.department || "Geral",
        unit: u.unit || "DDM - São Paulo",
        prompts: promptCountByUser.get(u.id) || 0,
        maturity: u.maturity_level || "Iniciante",
      }))
      .sort((a, b) => b.prompts - a.prompts);

    res.json({
      summary: {
        avgMaturityScore,
        activeUsers: activeUserIds.size,
        totalPrompts: logs.length,
        timeSavedHours: logs.length * 0.25,
      },
      maturityData,
      sectorData,
      people,
    });
  }),
);

// ══════════════════════════════════════════════════════════════════════════
// Logs de uso da IA
// ══════════════════════════════════════════════════════════════════════════

router.get(
  "/usage-logs",
  requireAuth,
  h(async (req, res) => {
    const rows = await db.query(`SELECT * FROM logs_uso_ia WHERE user_id = ? ORDER BY created_at DESC`, [req.user.id]);
    res.json({ logs: rows });
  }),
);

router.post(
  "/usage-logs",
  requireAuth,
  h(async (req, res) => {
    const { promptText, responseText, iaUsed, sector } = req.body || {};
    await db.exec(
      `INSERT INTO logs_uso_ia (id, user_id, prompt_text, response_text, ia_used, sector) VALUES (?, ?, ?, ?, ?, ?)`,
      [uuid(), req.user.id, String(promptText || ""), String(responseText || ""), iaUsed || "Acordito", sector || null],
    );
    res.status(201).json({ ok: true });
  }),
);

router.delete(
  "/usage-logs/:id",
  requireAuth,
  h(async (req, res) => {
    await db.exec(`DELETE FROM logs_uso_ia WHERE id = ? AND user_id = ?`, [req.params.id, req.user.id]);
    res.json({ ok: true });
  }),
);

// ══════════════════════════════════════════════════════════════════════════
// Conversas
// ══════════════════════════════════════════════════════════════════════════

router.get(
  "/conversations",
  requireAuth,
  h(async (req, res) => {
    const rows = await db.query(`SELECT * FROM conversas WHERE criado_por = ? ORDER BY created_at DESC`, [req.user.id]);
    res.json({ conversations: rows });
  }),
);

router.post(
  "/conversations",
  requireAuth,
  h(async (req, res) => {
    const { title, currentModel } = req.body || {};
    const id = uuid();
    await db.exec(`INSERT INTO conversas (id, criado_por, title, current_model) VALUES (?, ?, ?, ?)`, [
      id,
      req.user.id,
      title || "Nova conversa",
      currentModel || null,
    ]);
    const row = await db.queryOne(`SELECT * FROM conversas WHERE id = ?`, [id]);
    res.status(201).json({ conversation: row });
  }),
);

router.delete(
  "/conversations/:id",
  requireAuth,
  h(async (req, res) => {
    await db.exec(`DELETE FROM conversas WHERE id = ? AND criado_por = ?`, [req.params.id, req.user.id]);
    res.json({ ok: true });
  }),
);

router.get(
  "/conversations/:id/messages",
  requireAuth,
  h(async (req, res) => {
    const owns = await db.queryOne(`SELECT id FROM conversas WHERE id = ? AND criado_por = ?`, [req.params.id, req.user.id]);
    if (!owns) return res.status(404).json({ error: { message: "Conversa nao encontrada." } });

    const rows = await db.query(`SELECT * FROM mensagens WHERE conversa_id = ? ORDER BY created_at ASC`, [req.params.id]);
    res.json({ messages: rows });
  }),
);

router.post(
  "/conversations/:id/messages",
  requireAuth,
  h(async (req, res) => {
    const owns = await db.queryOne(`SELECT id FROM conversas WHERE id = ? AND criado_por = ?`, [req.params.id, req.user.id]);
    if (!owns) return res.status(404).json({ error: { message: "Conversa nao encontrada." } });

    const { role, content, modelUsed } = req.body || {};
    if (role !== "user" && role !== "assistant") {
      return res.status(400).json({ error: { message: "role invalido." } });
    }

    const id = uuid();
    await db.exec(
      `INSERT INTO mensagens (id, conversa_id, role, content, model_used) VALUES (?, ?, ?, ?, ?)`,
      [id, req.params.id, role, String(content || ""), modelUsed || null],
    );
    const row = await db.queryOne(`SELECT * FROM mensagens WHERE id = ?`, [id]);
    res.status(201).json({ message: row });
  }),
);

// ══════════════════════════════════════════════════════════════════════════
// Feed
// ══════════════════════════════════════════════════════════════════════════

router.get(
  "/feed/posts",
  requireAuth,
  h(async (req, res) => {
    const posts = await db.query(
      `SELECT p.id, p.user_id, p.content, p.image_url, p.created_at,
              u.full_name AS author_name, u.avatar_url AS author_avatar, u.department AS author_sector,
              (SELECT COUNT(*) FROM feed_reactions r WHERE r.post_id = p.id) AS reaction_count,
              (SELECT COUNT(*) FROM feed_comments c WHERE c.post_id = p.id) AS comment_count,
              EXISTS(SELECT 1 FROM feed_reactions r2 WHERE r2.post_id = p.id AND r2.user_id = ?) AS user_reacted
       FROM feed_posts p
       LEFT JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC
       LIMIT 50`,
      [req.user.id],
    );
    res.json({
      posts: posts.map((p) => ({
        ...p,
        author_name: p.author_name || "Colaborador DDM",
        user_reacted: Boolean(p.user_reacted),
      })),
    });
  }),
);

router.post(
  "/feed/posts",
  requireAuth,
  h(async (req, res) => {
    const content = String(req.body?.content || "").trim();
    if (!content) return res.status(400).json({ error: { message: "Conteudo obrigatorio." } });

    const id = uuid();
    await db.exec(`INSERT INTO feed_posts (id, user_id, content, image_url) VALUES (?, ?, ?, ?)`, [
      id,
      req.user.id,
      content,
      req.body?.imageUrl || null,
    ]);
    const row = await db.queryOne(`SELECT * FROM feed_posts WHERE id = ?`, [id]);
    res.status(201).json({ post: row });
  }),
);

router.delete(
  "/feed/posts/:id",
  requireAuth,
  h(async (req, res) => {
    const isOwnerOrAdmin =
      req.user.role === "admin" || (await db.queryOne(`SELECT id FROM feed_posts WHERE id = ? AND user_id = ?`, [req.params.id, req.user.id]));
    if (!isOwnerOrAdmin) return res.status(403).json({ error: { message: "Sem permissao." } });

    await db.exec(`DELETE FROM feed_posts WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  }),
);

router.post(
  "/feed/posts/:id/react",
  requireAuth,
  h(async (req, res) => {
    const existing = await db.queryOne(`SELECT 1 FROM feed_reactions WHERE post_id = ? AND user_id = ?`, [req.params.id, req.user.id]);
    if (existing) {
      await db.exec(`DELETE FROM feed_reactions WHERE post_id = ? AND user_id = ?`, [req.params.id, req.user.id]);
    } else {
      await db.exec(`INSERT INTO feed_reactions (post_id, user_id) VALUES (?, ?)`, [req.params.id, req.user.id]);
    }
    res.json({ ok: true });
  }),
);

router.get(
  "/feed/posts/:id/comments",
  requireAuth,
  h(async (req, res) => {
    const rows = await db.query(
      `SELECT c.id, c.post_id, c.user_id, c.content, c.created_at,
              u.full_name AS author_name, u.avatar_url AS author_avatar
       FROM feed_comments c
       LEFT JOIN users u ON u.id = c.user_id
       WHERE c.post_id = ?
       ORDER BY c.created_at ASC`,
      [req.params.id],
    );
    res.json({ comments: rows.map((c) => ({ ...c, author_name: c.author_name || "Colaborador DDM" })) });
  }),
);

router.post(
  "/feed/posts/:id/comments",
  requireAuth,
  h(async (req, res) => {
    const content = String(req.body?.content || "").trim();
    if (!content) return res.status(400).json({ error: { message: "Conteudo obrigatorio." } });

    const id = uuid();
    await db.exec(`INSERT INTO feed_comments (id, post_id, user_id, content) VALUES (?, ?, ?, ?)`, [
      id,
      req.params.id,
      req.user.id,
      content,
    ]);
    res.status(201).json({ ok: true });
  }),
);

router.delete(
  "/feed/comments/:id",
  requireAuth,
  h(async (req, res) => {
    const isOwnerOrAdmin =
      req.user.role === "admin" || (await db.queryOne(`SELECT id FROM feed_comments WHERE id = ? AND user_id = ?`, [req.params.id, req.user.id]));
    if (!isOwnerOrAdmin) return res.status(403).json({ error: { message: "Sem permissao." } });

    await db.exec(`DELETE FROM feed_comments WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  }),
);

// ══════════════════════════════════════════════════════════════════════════
// Prompts (catalogo) + prompts customizados
// ══════════════════════════════════════════════════════════════════════════

router.get(
  "/prompts",
  requireAuth,
  h(async (req, res) => {
    const rows = await db.query(`SELECT * FROM prompts ORDER BY title ASC`);
    res.json({ prompts: rows });
  }),
);

router.get(
  "/custom-prompts",
  requireAuth,
  h(async (req, res) => {
    const rows = await db.query(`SELECT * FROM prompts_customizados WHERE user_id = ? ORDER BY created_at DESC`, [req.user.id]);
    res.json({ prompts: rows });
  }),
);

router.post(
  "/custom-prompts",
  requireAuth,
  h(async (req, res) => {
    const { title, department, tone, purpose, prompt_text: promptText } = req.body || {};
    const id = uuid();
    await db.exec(
      `INSERT INTO prompts_customizados (id, user_id, title, department, tone, purpose, prompt_text)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, req.user.id, title || "Sem titulo", department || null, tone || null, purpose || null, promptText || ""],
    );
    const row = await db.queryOne(`SELECT * FROM prompts_customizados WHERE id = ?`, [id]);
    res.status(201).json({ prompt: row });
  }),
);

router.delete(
  "/custom-prompts/:id",
  requireAuth,
  h(async (req, res) => {
    await db.exec(`DELETE FROM prompts_customizados WHERE id = ? AND user_id = ?`, [req.params.id, req.user.id]);
    res.json({ ok: true });
  }),
);

// ══════════════════════════════════════════════════════════════════════════
// RH — informativos
// ══════════════════════════════════════════════════════════════════════════

const mapInformativo = (row) => ({
  ...row,
  anexos: row.anexos || [],
  respostas: row.respostas || [],
  ativo: Boolean(row.ativo),
});

router.get(
  "/rh/informativos",
  requireAuth,
  h(async (req, res) => {
    const rows = await db.query(`SELECT * FROM rh_informativos WHERE ativo = 1 ORDER BY created_at DESC`);
    res.json({ informativos: rows.map(mapInformativo) });
  }),
);

router.get(
  "/rh/informativos/all",
  requireAuth,
  requireRole("rh", "admin"),
  h(async (req, res) => {
    const rows = await db.query(`SELECT * FROM rh_informativos ORDER BY created_at DESC`);
    res.json({ informativos: rows.map(mapInformativo) });
  }),
);

router.post(
  "/rh/informativos",
  requireAuth,
  requireRole("rh", "admin"),
  h(async (req, res) => {
    const { titulo, conteudo, autorNome, anexos } = req.body || {};
    const id = uuid();
    await db.exec(
      `INSERT INTO rh_informativos (id, titulo, conteudo, autor_nome, anexos, respostas) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, titulo || "", conteudo || "", autorNome || "", JSON.stringify(anexos || []), JSON.stringify([])],
    );
    const row = await db.queryOne(`SELECT * FROM rh_informativos WHERE id = ?`, [id]);
    res.status(201).json({ informativo: mapInformativo(row) });
  }),
);

router.patch(
  "/rh/informativos/:id",
  requireAuth,
  requireRole("rh", "admin"),
  h(async (req, res) => {
    const { titulo, conteudo } = req.body || {};
    const set = [];
    const params = [];
    if (titulo !== undefined) { set.push("titulo = ?"); params.push(titulo); }
    if (conteudo !== undefined) { set.push("conteudo = ?"); params.push(conteudo); }
    if (set.length) {
      params.push(req.params.id);
      await db.exec(`UPDATE rh_informativos SET ${set.join(", ")} WHERE id = ?`, params);
    }
    res.json({ ok: true });
  }),
);

router.post(
  "/rh/informativos/:id/deactivate",
  requireAuth,
  requireRole("rh", "admin"),
  h(async (req, res) => {
    await db.exec(`UPDATE rh_informativos SET ativo = 0 WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  }),
);

router.post(
  "/rh/informativos/:id/reactivate",
  requireAuth,
  requireRole("rh", "admin"),
  h(async (req, res) => {
    await db.exec(`UPDATE rh_informativos SET ativo = 1 WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  }),
);

router.post(
  "/rh/informativos/:id/respostas",
  requireAuth,
  h(async (req, res) => {
    const conteudo = String(req.body?.conteudo || "").trim();
    const autorNome = String(req.body?.autorNome || "").trim();
    if (!conteudo) return res.status(400).json({ error: { message: "Conteudo obrigatorio." } });

    const current = await db.queryOne(`SELECT respostas FROM rh_informativos WHERE id = ?`, [req.params.id]);
    if (!current) return res.status(404).json({ error: { message: "Informativo nao encontrado." } });

    const nova = { id: uuid(), conteudo, autor_nome: autorNome, created_at: new Date().toISOString() };
    const respostas = [...(current.respostas || []), nova];
    await db.exec(`UPDATE rh_informativos SET respostas = ? WHERE id = ?`, [JSON.stringify(respostas), req.params.id]);
    res.status(201).json({ resposta: nova });
  }),
);

router.delete(
  "/rh/informativos/:id/respostas/:respostaId",
  requireAuth,
  requireRole("rh", "admin"),
  h(async (req, res) => {
    const current = await db.queryOne(`SELECT respostas FROM rh_informativos WHERE id = ?`, [req.params.id]);
    if (!current) return res.status(404).json({ error: { message: "Informativo nao encontrado." } });

    const respostas = (current.respostas || []).filter((r) => r.id !== req.params.respostaId);
    await db.exec(`UPDATE rh_informativos SET respostas = ? WHERE id = ?`, [JSON.stringify(respostas), req.params.id]);
    res.json({ ok: true });
  }),
);

router.post(
  "/rh/informativos/:id/viewed",
  requireAuth,
  h(async (req, res) => {
    const userNome = String(req.body?.userNome || "").trim() || null;
    await db.exec(
      `INSERT INTO rh_visualizacoes (informativo_id, user_uid, user_nome)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE viewed_at = NOW(), user_nome = VALUES(user_nome)`,
      [req.params.id, req.user.id, userNome],
    );
    res.json({ ok: true });
  }),
);

router.get(
  "/rh/informativos/viewed-ids",
  requireAuth,
  h(async (req, res) => {
    const rows = await db.query(`SELECT informativo_id FROM rh_visualizacoes WHERE user_uid = ?`, [req.user.id]);
    res.json({ ids: rows.map((r) => r.informativo_id) });
  }),
);

router.get(
  "/rh/informativos/:id/visualizacoes",
  requireAuth,
  requireRole("rh", "admin"),
  h(async (req, res) => {
    const rows = await db.query(`SELECT * FROM rh_visualizacoes WHERE informativo_id = ? ORDER BY viewed_at DESC`, [req.params.id]);
    res.json({ visualizacoes: rows });
  }),
);

router.post(
  "/rh/informativos/view-counts",
  requireAuth,
  h(async (req, res) => {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(Boolean) : [];
    if (!ids.length) return res.json({ counts: {} });

    const placeholders = ids.map(() => "?").join(",");
    const rows = await db.query(
      `SELECT informativo_id, COUNT(*) AS total FROM rh_visualizacoes WHERE informativo_id IN (${placeholders}) GROUP BY informativo_id`,
      ids,
    );
    const counts = {};
    rows.forEach((r) => { counts[r.informativo_id] = Number(r.total); });
    res.json({ counts });
  }),
);

router.post(
  "/rh/anexos",
  requireAuth,
  requireRole("rh", "admin"),
  upload.single("file"),
  h(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: { message: "Arquivo obrigatorio." } });

    let saved;
    try {
      saved = await saveFile({
        bucket: "rh-arquivos",
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        ownerId: req.user.id,
      });
    } catch (err) {
      if (err.code === "INVALID_MIME_TYPE") {
        return res.status(400).json({ error: { message: "Tipo de arquivo nao permitido. Use imagem, PDF, Word, Excel, PowerPoint ou texto." } });
      }
      throw err;
    }

    res.status(201).json({
      nome: req.file.originalname,
      url: fileUrl(saved.id),
      tipo: req.file.mimetype.startsWith("image/") ? "image" : "document",
    });
  }),
);

// ══════════════════════════════════════════════════════════════════════════
// RH — base de conhecimento
// ══════════════════════════════════════════════════════════════════════════

router.get(
  "/rh/knowledge",
  requireAuth,
  h(async (req, res) => {
    const rows = await db.query(`SELECT * FROM rh_knowledge ORDER BY updated_at DESC`);
    res.json({ articles: rows });
  }),
);

router.get(
  "/rh/knowledge/search",
  requireAuth,
  h(async (req, res) => {
    const query = String(req.query.q || "").trim();
    const limit = Math.min(Number(req.query.limit) || 4, 20);

    if (!query) return res.json({ articles: [] });

    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length >= 4)
      .slice(0, 5);

    if (!terms.length) {
      const rows = await db.query(`SELECT * FROM rh_knowledge WHERE status = 'published' ORDER BY updated_at DESC LIMIT ?`, [limit]);
      return res.json({ articles: rows });
    }

    const conditions = terms.map(() => `(title LIKE ? OR content LIKE ?)`).join(" OR ");
    const params = terms.flatMap((t) => [`%${t}%`, `%${t}%`]);
    const rows = await db.query(
      `SELECT * FROM rh_knowledge WHERE status = 'published' AND (${conditions}) ORDER BY updated_at DESC LIMIT ?`,
      [...params, limit],
    );
    res.json({ articles: rows });
  }),
);

router.post(
  "/rh/knowledge",
  requireAuth,
  requireRole("rh", "admin"),
  h(async (req, res) => {
    const { title, category, content, tags, status } = req.body || {};
    const id = uuid();
    await db.exec(
      `INSERT INTO rh_knowledge (id, title, content, category, tags, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, title || "", content || "", category || null, JSON.stringify(tags || []), status || "draft", req.user.id],
    );
    const row = await db.queryOne(`SELECT * FROM rh_knowledge WHERE id = ?`, [id]);
    res.status(201).json({ article: row });
  }),
);

router.patch(
  "/rh/knowledge/:id",
  requireAuth,
  requireRole("rh", "admin"),
  h(async (req, res) => {
    const { title, category, content, tags, status } = req.body || {};
    const set = ["updated_at = NOW()"];
    const params = [];
    if (title !== undefined) { set.push("title = ?"); params.push(title); }
    if (category !== undefined) { set.push("category = ?"); params.push(category); }
    if (content !== undefined) { set.push("content = ?"); params.push(content); }
    if (tags !== undefined) { set.push("tags = ?"); params.push(JSON.stringify(tags)); }
    if (status !== undefined) { set.push("status = ?"); params.push(status); }

    params.push(req.params.id);
    await db.exec(`UPDATE rh_knowledge SET ${set.join(", ")} WHERE id = ?`, params);
    res.json({ ok: true });
  }),
);

router.delete(
  "/rh/knowledge/:id",
  requireAuth,
  requireRole("rh", "admin"),
  h(async (req, res) => {
    await db.exec(`DELETE FROM rh_knowledge WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  }),
);

// ══════════════════════════════════════════════════════════════════════════
// Configuracao de agentes (prompts de sistema por setor)
// ══════════════════════════════════════════════════════════════════════════

router.get(
  "/agent-configs/:department",
  requireAuth,
  h(async (req, res) => {
    const row = await db.queryOne(`SELECT system_prompt FROM agent_configs WHERE department = ?`, [req.params.department]);
    res.json({ systemPrompt: row?.system_prompt ?? null });
  }),
);

router.get(
  "/agent-configs",
  requireAuth,
  requireRole("admin"),
  h(async (req, res) => {
    const rows = await db.query(`SELECT * FROM agent_configs ORDER BY department`);
    res.json({ configs: rows });
  }),
);

router.put(
  "/agent-configs/:department",
  requireAuth,
  requireRole("admin"),
  h(async (req, res) => {
    const systemPrompt = String(req.body?.systemPrompt || "");
    await db.exec(
      `INSERT INTO agent_configs (department, system_prompt, updated_by) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE system_prompt = VALUES(system_prompt), updated_by = VALUES(updated_by), updated_at = NOW()`,
      [req.params.department, systemPrompt, req.user.id],
    );
    res.json({ ok: true });
  }),
);

router.delete(
  "/agent-configs/:department",
  requireAuth,
  requireRole("admin"),
  h(async (req, res) => {
    await db.exec(`DELETE FROM agent_configs WHERE department = ?`, [req.params.department]);
    res.json({ ok: true });
  }),
);

// ══════════════════════════════════════════════════════════════════════════
// App config + base de conhecimento OpenAI (vector store)
// ══════════════════════════════════════════════════════════════════════════

router.get(
  "/app-config/:key",
  requireAuth,
  h(async (req, res) => {
    const row = await db.queryOne(`SELECT config_value FROM app_config WHERE config_key = ?`, [req.params.key]);
    res.json({ value: row?.config_value ?? null });
  }),
);

router.put(
  "/app-config/:key",
  requireAuth,
  requireRole("admin"),
  h(async (req, res) => {
    await db.exec(
      `INSERT INTO app_config (config_key, config_value) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), updated_at = NOW()`,
      [req.params.key, String(req.body?.value ?? "")],
    );
    res.json({ ok: true });
  }),
);

router.get(
  "/knowledge-base/docs",
  requireAuth,
  requireRole("admin"),
  h(async (req, res) => {
    const rows = await db.query(`SELECT * FROM knowledge_base_docs ORDER BY created_at DESC`);
    res.json({ docs: rows });
  }),
);

router.post(
  "/knowledge-base/docs",
  requireAuth,
  requireRole("admin"),
  h(async (req, res) => {
    const { fileName, openaiFileId, sizeBytes } = req.body || {};
    const id = uuid();
    await db.exec(
      `INSERT INTO knowledge_base_docs (id, file_name, openai_file_id, size_bytes, uploaded_by) VALUES (?, ?, ?, ?, ?)`,
      [id, fileName || "", openaiFileId || "", sizeBytes || null, req.user.id],
    );
    const row = await db.queryOne(`SELECT * FROM knowledge_base_docs WHERE id = ?`, [id]);
    res.status(201).json({ doc: row });
  }),
);

router.delete(
  "/knowledge-base/docs/:id",
  requireAuth,
  requireRole("admin"),
  h(async (req, res) => {
    await db.exec(`DELETE FROM knowledge_base_docs WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  }),
);

// ══════════════════════════════════════════════════════════════════════════
// Imagens do Creator
// ══════════════════════════════════════════════════════════════════════════

router.post(
  "/creator-images/upload",
  requireAuth,
  h(async (req, res) => {
    const dataUrl = String(req.body?.dataUrl || "");
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return res.status(400).json({ error: { message: "Imagem invalida." } });

    const [, mimeType, base64] = match;
    const buffer = Buffer.from(base64, "base64");
    if (buffer.length > Number(process.env.MAX_UPLOAD_BYTES || 20 * 1024 * 1024)) {
      return res.status(413).json({ error: { message: "Imagem muito grande." } });
    }

    let saved;
    try {
      saved = await saveFile({
        bucket: "creator-images",
        buffer,
        originalName: `${Date.now()}.${mimeType.split("/")[1] || "png"}`,
        mimeType,
        ownerId: req.user.id,
      });
    } catch (err) {
      if (err.code === "INVALID_MIME_TYPE") {
        return res.status(400).json({ error: { message: "Formato de imagem nao permitido." } });
      }
      throw err;
    }

    res.status(201).json({ imageUrl: fileUrl(saved.id) });
  }),
);

router.post(
  "/creator-images",
  requireAuth,
  h(async (req, res) => {
    const { imageUrl, optimizedPrompt, caption, aspectRatio } = req.body || {};
    const id = uuid();
    await db.exec(
      `INSERT INTO creator_images (id, user_id, prompt, storage_key, mime_type) VALUES (?, ?, ?, ?, ?)`,
      [id, req.user.id, optimizedPrompt || caption || null, String(imageUrl || ""), "image/png"],
    );
    res.status(201).json({ ok: true, id });
  }),
);

router.get(
  "/creator-images",
  requireAuth,
  h(async (req, res) => {
    const rows = await db.query(
      `SELECT * FROM creator_images WHERE user_id = ? ORDER BY created_at DESC LIMIT 60`,
      [req.user.id],
    );
    res.json({
      images: rows.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        image_url: r.storage_key,
        optimized_prompt: r.prompt,
        caption: r.prompt,
        aspect_ratio: "1:1",
        created_at: r.created_at,
      })),
    });
  }),
);

router.delete(
  "/creator-images/:id",
  requireAuth,
  h(async (req, res) => {
    const row = await db.queryOne(`SELECT storage_key FROM creator_images WHERE id = ? AND user_id = ?`, [req.params.id, req.user.id]);
    if (!row) return res.json({ ok: true });

    const fileId = row.storage_key.split("/api/files/")[1];
    if (fileId) await deleteFile(fileId).catch(() => {});
    await db.exec(`DELETE FROM creator_images WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  }),
);

// ══════════════════════════════════════════════════════════════════════════
// Uso diario (cota de IA)
// ══════════════════════════════════════════════════════════════════════════

router.get(
  "/daily-usage",
  requireAuth,
  h(async (req, res) => {
    const row = await db.queryOne(
      `SELECT image_count, text_tokens FROM daily_usage WHERE user_id = ? AND usage_date = CURDATE()`,
      [req.user.id],
    );
    res.json({ imageCount: row?.image_count ?? 0, textTokens: row?.text_tokens ?? 0 });
  }),
);

router.post(
  "/daily-usage/increment",
  requireAuth,
  h(async (req, res) => {
    const images = Number(req.body?.images || 0);
    const tokens = Number(req.body?.tokens || 0);
    await db.exec(
      `INSERT INTO daily_usage (user_id, usage_date, image_count, text_tokens) VALUES (?, CURDATE(), ?, ?)
       ON DUPLICATE KEY UPDATE image_count = image_count + VALUES(image_count), text_tokens = text_tokens + VALUES(text_tokens)`,
      [req.user.id, images, tokens],
    );
    res.json({ ok: true });
  }),
);

// ══════════════════════════════════════════════════════════════════════════
// Sugestoes
// ══════════════════════════════════════════════════════════════════════════

router.post(
  "/sugestoes",
  requireAuth,
  h(async (req, res) => {
    const { content, categoria } = req.body || {};
    if (!String(content || "").trim()) return res.status(400).json({ error: { message: "Conteudo obrigatorio." } });

    await db.exec(
      `INSERT INTO sugestoes (id, user_id, conteudo, categoria, status) VALUES (?, ?, ?, ?, 'pendente')`,
      [uuid(), req.user.id, String(content).trim(), categoria || null],
    );
    res.status(201).json({ ok: true });
  }),
);

router.get(
  "/sugestoes",
  requireAuth,
  requireRole("admin"),
  h(async (req, res) => {
    const rows = await db.query(
      `SELECT s.id, s.user_id, s.conteudo AS content, s.categoria, s.status, s.created_at,
              u.email AS user_email, u.full_name AS user_name
       FROM sugestoes s LEFT JOIN users u ON u.id = s.user_id
       ORDER BY s.created_at DESC`,
    );
    res.json({ sugestoes: rows });
  }),
);

router.patch(
  "/sugestoes/:id",
  requireAuth,
  requireRole("admin"),
  h(async (req, res) => {
    await db.exec(`UPDATE sugestoes SET status = ? WHERE id = ?`, [req.body?.status, req.params.id]);
    res.json({ ok: true });
  }),
);

// ══════════════════════════════════════════════════════════════════════════
// Arquivos (Supabase Storage substituido por disco local + rota autenticada)
// ══════════════════════════════════════════════════════════════════════════

router.get(
  "/files/:id",
  requireAuth,
  h(async (req, res) => {
    const row = await getFileRow(req.params.id);
    if (!row) return res.status(404).json({ error: { message: "Arquivo nao encontrado." } });

    // creator-images e privado ao dono (ou admin); rh-arquivos e visivel a
    // qualquer colaborador autenticado, pois e anexo de comunicado publico.
    if (row.bucket === "creator-images" && row.owner_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: { message: "Sem permissao." } });
    }

    const buffer = await readFileBuffer(row.bucket, row.storage_key).catch(() => null);
    if (!buffer) return res.status(404).json({ error: { message: "Arquivo nao encontrado no disco." } });

    res.setHeader("Content-Type", row.mime_type || "application/octet-stream");
    res.setHeader("X-Content-Type-Options", "nosniff");
    // So os tipos da allowlist de "inline seguro" renderizam dentro da app;
    // qualquer outra coisa forca download — mesmo que a validacao no upload
    // falhe ou um arquivo antigo tenha mime_type fora do padrao.
    res.setHeader(
      "Content-Disposition",
      isInlineSafeMimeType(row.mime_type) ? "inline" : `attachment; filename="${encodeURIComponent(row.original_name || "arquivo")}"`,
    );
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.send(buffer);
  }),
);

// ══════════════════════════════════════════════════════════════════════════
// Soluções — catálogo corporativo de dashboards/sistemas/automações
// ══════════════════════════════════════════════════════════════════════════

const SOLUTION_SECTORS = ["financeiro", "planejamento", "rh", "juridico", "backoffice", "comercial", "marketing", "ti_ia", "outros"];
const SOLUTION_TYPES = ["dashboard", "sistema", "automacao", "ia", "skill", "outro"];
const SOLUTION_STATUSES = ["planejado", "em_desenvolvimento", "publicado", "pausado", "arquivado"];

/** Grava uma linha na trilha de auditoria generica (nao lanca — auditoria nunca derruba a request principal). */
const logAudit = async (userId, action, entity, entityId, details) => {
  await db
    .exec(`INSERT INTO audit_log (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)`, [
      userId || null,
      action,
      entity,
      String(entityId),
      JSON.stringify(details ?? {}),
    ])
    .catch((err) => console.error("Falha ao gravar audit_log:", err));
};

router.get(
  "/solutions",
  requireAuth,
  h(async (req, res) => {
    const { search, sector, status, type } = req.query;
    const conditions = [];
    const params = [];

    if (search) {
      conditions.push(`(title LIKE ? OR summary LIKE ? OR owner_name LIKE ?)`);
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    if (sector && SOLUTION_SECTORS.includes(sector)) {
      conditions.push("sector = ?");
      params.push(sector);
    }
    if (status && SOLUTION_STATUSES.includes(status)) {
      conditions.push("status = ?");
      params.push(status);
    }
    if (type && SOLUTION_TYPES.includes(type)) {
      conditions.push("type = ?");
      params.push(type);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = await db.query(
      `SELECT * FROM solutions ${where}
       ORDER BY FIELD(status, 'em_desenvolvimento', 'publicado', 'planejado', 'pausado', 'arquivado'), updated_at DESC`,
      params,
    );
    res.json({ solutions: rows });
  }),
);

router.get(
  "/solutions/stats",
  requireAuth,
  h(async (req, res) => {
    const totals = await db.queryOne(
      `SELECT COUNT(*) AS total,
              SUM(status = 'publicado') AS publicados,
              SUM(status = 'em_desenvolvimento') AS desenvolvimento,
              SUM(status = 'planejado') AS planejados
       FROM solutions WHERE status != 'arquivado'`,
    );
    const bySector = await db.query(
      `SELECT sector, COUNT(*) AS total FROM solutions WHERE status != 'arquivado' GROUP BY sector ORDER BY total DESC`,
    );
    res.json({ totals, bySector });
  }),
);

router.get(
  "/solutions/:id",
  requireAuth,
  h(async (req, res) => {
    const row = await db.queryOne(`SELECT * FROM solutions WHERE id = ?`, [req.params.id]);
    if (!row) return res.status(404).json({ error: { message: "Solucao nao encontrada." } });
    res.json({ solution: row });
  }),
);

router.post(
  "/solutions",
  requireAuth,
  h(async (req, res) => {
    const { title, summary, sector, type, status, url, ownerName, ownerEmail, technologies } = req.body || {};

    if (!title?.trim() || !summary?.trim() || !SOLUTION_SECTORS.includes(sector)) {
      return res.status(400).json({ error: { message: "Titulo, resumo e setor sao obrigatorios." } });
    }
    if (type && !SOLUTION_TYPES.includes(type)) {
      return res.status(400).json({ error: { message: "Tipo invalido." } });
    }
    if (status && !SOLUTION_STATUSES.includes(status)) {
      return res.status(400).json({ error: { message: "Status invalido." } });
    }

    const id = uuid();
    await db.exec(
      `INSERT INTO solutions (id, title, summary, sector, type, status, url, owner_name, owner_email, technologies, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        title.trim(),
        summary.trim(),
        sector,
        type || "dashboard",
        status || "planejado",
        url || null,
        ownerName || null,
        ownerEmail || null,
        JSON.stringify(technologies || []),
        req.user.id,
      ],
    );

    await logAudit(req.user.id, "created", "solution", id, { title, sector });

    const row = await db.queryOne(`SELECT * FROM solutions WHERE id = ?`, [id]);
    res.status(201).json({ solution: row });
  }),
);

router.put(
  "/solutions/:id",
  requireAuth,
  h(async (req, res) => {
    const existing = await db.queryOne(`SELECT id FROM solutions WHERE id = ?`, [req.params.id]);
    if (!existing) return res.status(404).json({ error: { message: "Solucao nao encontrada." } });

    const { title, summary, sector, type, status, url, ownerName, ownerEmail, technologies } = req.body || {};

    if (sector && !SOLUTION_SECTORS.includes(sector)) {
      return res.status(400).json({ error: { message: "Setor invalido." } });
    }
    if (type && !SOLUTION_TYPES.includes(type)) {
      return res.status(400).json({ error: { message: "Tipo invalido." } });
    }
    if (status && !SOLUTION_STATUSES.includes(status)) {
      return res.status(400).json({ error: { message: "Status invalido." } });
    }

    const set = [];
    const params = [];
    const push = (column, value) => {
      if (value === undefined) return;
      set.push(`${column} = ?`);
      params.push(value);
    };

    push("title", title?.trim());
    push("summary", summary?.trim());
    push("sector", sector);
    push("type", type);
    push("status", status);
    push("url", url || null);
    push("owner_name", ownerName || null);
    push("owner_email", ownerEmail || null);
    if (technologies !== undefined) push("technologies", JSON.stringify(technologies || []));

    if (set.length) {
      params.push(req.params.id);
      await db.exec(`UPDATE solutions SET ${set.join(", ")} WHERE id = ?`, params);
      await logAudit(req.user.id, "updated", "solution", req.params.id, req.body);
    }

    const row = await db.queryOne(`SELECT * FROM solutions WHERE id = ?`, [req.params.id]);
    res.json({ solution: row });
  }),
);

export default router;
