#!/usr/bin/env node
// Gera um SQL com os hashes de senha originais (auth.users do Supabase) pra
// aplicar no MariaDB via phpMyAdmin.
//
// Existe porque o servidor cPanel nao alcanca o Postgres do Supabase (porta
// bloqueada), entao o migrate.mjs rodado la migra os usuarios sem senha.
// Rodar numa maquina que alcanca o Supabase, DEPOIS do migrate.mjs:
//
//   node export-password-hashes.mjs
//
// Saida: backend/scripts/out/password_hashes.sql (gitignored). Contem hash
// bcrypt de senha dos usuarios — nao commitar, nao mandar por chat/e-mail,
// apagar depois de aplicar.

import path from "path";
import fs from "fs/promises";
import dotenv from "dotenv";
import pg from "pg";
import { fileURLToPath } from "url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_DIR = path.resolve(SCRIPT_DIR, "..");
dotenv.config({ path: path.join(BACKEND_DIR, ".env.local") });
dotenv.config({ path: path.join(BACKEND_DIR, ".env.migration") });

const parseList = (value) =>
  String(value || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

const ALLOWED_DOMAINS = parseList(process.env.ALLOWED_EMAIL_DOMAINS || "ddm.adv.br,grupoddm.com.br,grupoddm.ia.br");
const RH_EMAILS = parseList(process.env.RH_EMAILS);
const EXCLUDE_EMAILS = parseList(process.env.EXCLUDE_EMAILS);

if (!process.env.SUPABASE_DB_HOST) {
  console.error("FATAL: SUPABASE_DB_HOST/USER/PASSWORD ausentes (backend/.env.local ou backend/.env.migration).");
  process.exit(1);
}

const client = new pg.Client({
  host: process.env.SUPABASE_DB_HOST,
  port: Number(process.env.SUPABASE_DB_PORT || 5432),
  database: process.env.SUPABASE_DB_NAME || "postgres",
  user: process.env.SUPABASE_DB_USER,
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

const sqlString = (value) => `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;

await client.connect();
try {
  const { rows } = await client.query(
    `SELECT id, email, encrypted_password FROM auth.users
     WHERE encrypted_password IS NOT NULL AND encrypted_password <> ''`,
  );

  const selected = rows.filter((row) => {
    const email = String(row.email || "").trim().toLowerCase();
    if (!email || EXCLUDE_EMAILS.includes(email)) return false;
    const domain = email.split("@")[1] || "";
    return ALLOWED_DOMAINS.includes(domain) || RH_EMAILS.includes(email);
  });

  const lines = [
    "-- Hashes de senha originais do Supabase. Aplicar no phpMyAdmin (banco",
    "-- grpia_labs) DEPOIS do migrate.mjs. Apagar este arquivo depois.",
    "-- So atualiza contas que ja existem (UPDATE por id) — nao cria usuario.",
    "",
    ...selected.map(
      (row) => `UPDATE users SET password_hash = ${sqlString(row.encrypted_password)} WHERE id = ${sqlString(row.id)};`,
    ),
    "",
  ];

  const outDir = path.join(SCRIPT_DIR, "out");
  await fs.mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, "password_hashes.sql");
  await fs.writeFile(outFile, lines.join("\n"), "utf8");

  console.log(`${selected.length} senhas exportadas para ${outFile}`);
} finally {
  await client.end();
}
