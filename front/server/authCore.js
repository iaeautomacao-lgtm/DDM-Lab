import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "./db.js";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_TTL_DAYS = Number(process.env.REFRESH_TOKEN_DAYS || 30);
const ACCESS_TTL = "15m";
const RESET_TTL = "15m";

if (!ACCESS_SECRET || ACCESS_SECRET.length < 32) {
  throw new Error(
    "FATAL: JWT_ACCESS_SECRET ausente ou curto demais (minimo 32 caracteres). " +
      "Gere com: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\"",
  );
}

const COOKIE_BASE = {
  httpOnly: true,
  sameSite: "strict",
  secure: process.env.NODE_ENV === "production" || process.env.FORCE_SECURE_COOKIES === "true",
  path: "/",
};

export const ACCESS_COOKIE = "ddm_at";
export const REFRESH_COOKIE = "ddm_rt";
export const RESET_COOKIE = "ddm_pwreset";

// ── Senhas ────────────────────────────────────────────────────────────────

export const hashPassword = (plain) => bcrypt.hash(plain, 12);
export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);

// ── Tokens ────────────────────────────────────────────────────────────────

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

export const signAccessToken = (user) =>
  jwt.sign({ sub: user.id, email: user.email, role: user.role }, ACCESS_SECRET, { expiresIn: ACCESS_TTL });

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, ACCESS_SECRET);
  } catch {
    return null;
  }
};

export const signResetToken = (userId) => jwt.sign({ sub: userId, purpose: "password_reset" }, ACCESS_SECRET, { expiresIn: RESET_TTL });

export const verifyResetToken = (token) => {
  try {
    const payload = jwt.verify(token, ACCESS_SECRET);
    return payload.purpose === "password_reset" ? payload : null;
  } catch {
    return null;
  }
};

/** Cria um refresh token opaco, grava o hash no banco, retorna o valor cru (vai no cookie). */
export const issueRefreshToken = async (userId, req) => {
  const raw = crypto.randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.exec(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, user_agent, ip_address)
     VALUES (UUID(), ?, ?, ?, ?, INET6_ATON(?))`,
    [userId, sha256(raw), expiresAt, String(req.headers["user-agent"] || "").slice(0, 255), req.ip || null],
  );
  return raw;
};

/** Valida um refresh token cru contra o hash guardado. Retorna a linha ou null. */
export const findValidRefreshToken = async (raw) => {
  if (!raw) return null;
  const row = await db.queryOne(
    `SELECT id, user_id FROM refresh_tokens
     WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > NOW()`,
    [sha256(raw)],
  );
  return row;
};

export const revokeRefreshToken = async (raw) => {
  if (!raw) return;
  await db.exec(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ?`, [sha256(raw)]);
};

export const revokeAllRefreshTokens = async (userId) => {
  await db.exec(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL`, [userId]);
};

/** Codigo de 6 digitos para reset de senha. Guarda o hash, expira em 15 min. */
export const issuePasswordResetCode = async (userId) => {
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await db.exec(`DELETE FROM auth_tokens WHERE user_id = ? AND purpose = 'password_reset' AND used_at IS NULL`, [userId]);
  await db.exec(
    `INSERT INTO auth_tokens (id, user_id, purpose, token_hash, expires_at) VALUES (UUID(), ?, 'password_reset', ?, ?)`,
    [userId, sha256(code), expiresAt],
  );
  return code;
};

export const consumePasswordResetCode = async (userId, code) => {
  const row = await db.queryOne(
    `SELECT id FROM auth_tokens
     WHERE user_id = ? AND purpose = 'password_reset' AND token_hash = ? AND used_at IS NULL AND expires_at > NOW()`,
    [userId, sha256(String(code || "").trim())],
  );
  if (!row) return false;
  await db.exec(`UPDATE auth_tokens SET used_at = NOW() WHERE id = ?`, [row.id]);
  return true;
};

// ── Cookies ───────────────────────────────────────────────────────────────

export const setAuthCookies = (res, { accessToken, refreshToken }) => {
  res.cookie(ACCESS_COOKIE, accessToken, { ...COOKIE_BASE, maxAge: 15 * 60 * 1000 });
  if (refreshToken) {
    res.cookie(REFRESH_COOKIE, refreshToken, { ...COOKIE_BASE, maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000 });
  }
};

export const clearAuthCookies = (res) => {
  res.clearCookie(ACCESS_COOKIE, COOKIE_BASE);
  res.clearCookie(REFRESH_COOKIE, COOKIE_BASE);
};

export const setResetCookie = (res, token) => {
  res.cookie(RESET_COOKIE, token, { ...COOKIE_BASE, maxAge: 15 * 60 * 1000 });
};

export const clearResetCookie = (res) => res.clearCookie(RESET_COOKIE, COOKIE_BASE);

// ── Middleware ───────────────────────────────────────────────────────────

/** Exige access token valido. Anexa req.user = { id, email, role }. */
export const requireAuth = (req, res, next) => {
  const token = req.cookies?.[ACCESS_COOKIE];
  const payload = token ? verifyAccessToken(token) : null;
  if (!payload) {
    return res.status(401).json({ error: { message: "Sessao expirada. Entre novamente." } });
  }
  req.user = { id: payload.sub, email: payload.email, role: payload.role };
  next();
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: { message: "Acesso restrito." } });
  }
  next();
};
