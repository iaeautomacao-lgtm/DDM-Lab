#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════════
// Migracao Supabase -> MariaDB para o DDM Lab.
//
// USO:
//   cd backend/scripts && npm install
//   node migrate.mjs                 # roda tudo
//   node migrate.mjs --only=users    # roda so uma etapa (ver STEPS abaixo)
//   node migrate.mjs --dry-run       # le do Supabase, nao escreve no MariaDB
//
// PRE-REQUISITOS (backend/.env.local):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  — leitura das 19 tabelas + storage
//   SUPABASE_DB_URL (opcional, mas recomendado) — connection string Postgres
//     direta (Project Settings > Database > Connection string > URI). Sem ela,
//     NAO da para migrar o hash de senha real: os usuarios entram como
//     "requer redefinicao de senha" e precisam usar Esqueci minha senha.
//   DB_HOST, DB_USER, DB_PASSWORD, DB_NAME — MariaDB de destino (schema
//     001_schema.sql precisa ja estar aplicado)
//   STORAGE_DIR — pasta de destino dos arquivos baixados do Supabase Storage
//
// IMPORTANTE — leia antes de rodar:
//   O schema real do Supabase deste projeto diverge do que os arquivos .sql
//   do repo descrevem (ver memoria "Supabase profiles quebrado"). Este script
//   assume os nomes de coluna que o proprio frontend usava para ler/escrever
//   (a fonte mais confiavel disponivel). Rode primeiro com --dry-run e
//   confira o resumo antes de gravar em producao. Tabelas onde o app tinha
//   fallback defensivo de nome de coluna (logs_uso_ia, prompts) sao lidas com
//   deteccao automatica; as demais usam nome fixo.
//
// IDEMPOTENTE: pode rodar de novo — usa INSERT ... ON DUPLICATE KEY UPDATE
// (ou ignora linhas ja migradas) pelo id original do Supabase.
// ════════════════════════════════════════════════════════════════════════════

import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import pg from "pg";
import { fileURLToPath } from "url";

// Caminhos a partir deste arquivo, nao do cwd. Credenciais do Supabase ficam
// num arquivo separado (backend/.env.migration) que so existe durante a
// migracao — o .env.local de producao nao precisa carregar esses segredos.
// dotenv nao sobrescreve: o que estiver no .env.local (DB_*) vale.
const BACKEND_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP_ROOT = path.resolve(BACKEND_DIR, "../front");
dotenv.config({ path: path.join(BACKEND_DIR, ".env.local") });
dotenv.config({ path: path.join(BACKEND_DIR, ".env.migration") });

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const ONLY = [...args].find((a) => a.startsWith("--only="))?.split("=")[1] ?? null;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL || null;

// Parametros separados evitam ter que URL-encodar a senha do Postgres (que
// pode ter @, /, ' etc.) dentro de uma connection string. Preferidos sobre
// SUPABASE_DB_URL quando presentes.
const pgConfig = process.env.SUPABASE_DB_HOST
  ? {
      host: process.env.SUPABASE_DB_HOST,
      port: Number(process.env.SUPABASE_DB_PORT || 5432),
      database: process.env.SUPABASE_DB_NAME || "postgres",
      user: process.env.SUPABASE_DB_USER,
      password: process.env.SUPABASE_DB_PASSWORD,
      ssl: { rejectUnauthorized: false }, // Supabase exige SSL; CA propria nao esta no store padrao do Node
    }
  : SUPABASE_DB_URL
    ? { connectionString: SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } }
    : null;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("FATAL: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em backend/.env.migration.");
  process.exit(1);
}

// Mesmo calculo do app (front/server/storage.js): STORAGE_DIR relativo a front/.
const STORAGE_ROOT = path.resolve(APP_ROOT, process.env.STORAGE_DIR || "../storage");

// Ids de usuario que existem no MariaDB depois da etapa users. Toda linha que
// referencia usuario (FK) e checada contra isso: conta excluida (EXCLUDE_EMAILS)
// ou sem profile nao pode derrubar a migracao por violacao de chave estrangeira.
const migratedUserIds = new Set();
const userOrNull = (id) => (id && migratedUserIds.has(id) ? id : null);

const ensureUserIds = async () => {
  if (migratedUserIds.size || DRY_RUN) return;
  const [rows] = await pool.query(`SELECT id FROM users`);
  rows.forEach((r) => migratedUserIds.add(r.id));
};

// ── MariaDB de destino ───────────────────────────────────────────────────────

const pool = DRY_RUN
  ? null
  : mysql.createPool({
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectionLimit: 4,
    });

const run = async (sql, params = []) => {
  if (DRY_RUN) return { affectedRows: 0 };
  const [result] = await pool.query(sql, params);
  return result;
};

// ── Supabase REST (service_role — ignora RLS) ────────────────────────────────

const PAGE_SIZE = 1000;

/** Le uma tabela inteira do Supabase via REST, paginando por Range. */
const fetchTable = async (table) => {
  const rows = [];
  let from = 0;

  for (;;) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Range: `${from}-${from + PAGE_SIZE - 1}`,
        Prefer: "count=exact",
      },
    });

    if (res.status === 404 || res.status === 400) {
      console.warn(`  aviso: tabela '${table}' nao encontrada ou inacessivel (status ${res.status}) — pulando.`);
      return rows;
    }
    if (!res.ok) {
      throw new Error(`Falha ao ler '${table}': ${res.status} ${await res.text()}`);
    }

    const page = await res.json();
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
};

/** Primeira coluna existente na linha, dentre os candidatos, na ordem dada. */
const pick = (row, candidates, fallback = null) => {
  for (const key of candidates) {
    if (row[key] !== undefined && row[key] !== null) return row[key];
  }
  return fallback;
};

const asJson = (value, fallback = []) => {
  if (value === null || value === undefined) return JSON.stringify(fallback);
  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value));
    } catch {
      return JSON.stringify(fallback);
    }
  }
  return JSON.stringify(value);
};

const toDatetime = (value) => (value ? new Date(value) : null);

const uuid = () => crypto.randomUUID();

/** UUID estavel derivado de uma string (mesma entrada = mesmo id). */
const deterministicUuid = (input) => {
  const h = crypto.createHash("sha256").update(input).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
};

const emailDomain = (email) => String(email || "").split("@")[1]?.toLowerCase() || "";
const parseList = (value) =>
  String(value || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
const ALLOWED_DOMAINS = parseList(process.env.ALLOWED_EMAIL_DOMAINS || "ddm.adv.br,grupoddm.com.br,grupoddm.ia.br");
const ADMIN_EMAILS = parseList(process.env.ADMIN_EMAILS);
const RH_EMAILS = parseList(process.env.RH_EMAILS);
// Contas descartadas na migracao (ex.: duplicata por typo de dominio no
// cadastro original). Nao migra a linha de profiles nem nada que dependa
// dela — decisao humana, nao automatica.
const EXCLUDE_EMAILS = parseList(process.env.EXCLUDE_EMAILS);
const roleForEmail = (email) => {
  const e = String(email || "").trim().toLowerCase();
  if (ADMIN_EMAILS.includes(e)) return "admin";
  if (RH_EMAILS.includes(e)) return "rh";
  return "user";
};

// ══════════════════════════════════════════════════════════════════════════
// Etapa: users (auth.users + profiles)
// ══════════════════════════════════════════════════════════════════════════

const migrateUsers = async () => {
  console.log("\n== users ==");

  let authUsers = [];
  if (pgConfig) {
    const client = new pg.Client(pgConfig);
    try {
      await client.connect();
      const { rows } = await client.query(
        `SELECT id, email, encrypted_password, created_at, last_sign_in_at, raw_user_meta_data
         FROM auth.users
         WHERE email ILIKE ANY (ARRAY[${ALLOWED_DOMAINS.map((d) => `'%@${d}'`).join(",") || "'%@%'"}])
            OR email = ANY (ARRAY[${RH_EMAILS.map((e) => `'${e}'`).join(",") || "'-'"}])`,
      );
      authUsers = rows;
    } catch (err) {
      console.error(`  falha ao conectar/consultar o Postgres direto: ${err.message}`);
      console.error("  seguindo sem hash de senha — usuarios vao precisar de 'Esqueci minha senha'.");
    } finally {
      await client.end().catch(() => {});
    }
    console.log(`  auth.users (Postgres direto): ${authUsers.length} linhas dentro do dominio DDM.`);
  } else {
    console.warn(
      "  SUPABASE_DB_URL nao configurada — hash de senha NAO sera migrado.\n" +
        "  Os usuarios migrados vao precisar usar 'Esqueci minha senha' no primeiro acesso.",
    );
  }

  const profiles = await fetchTable("profiles");
  console.log(`  profiles (REST): ${profiles.length} linhas.`);

  const authById = new Map(authUsers.map((u) => [u.id, u]));
  const noPasswordEmails = [];
  let migrated = 0;

  for (const profile of profiles) {
    const id = profile.id;
    const email = String(profile.email || "").trim().toLowerCase();
    if (!email) continue;
    if (EXCLUDE_EMAILS.includes(email)) {
      console.log(`  excluido (EXCLUDE_EMAILS): ${email}`);
      continue;
    }

    const auth = authById.get(id);
    let passwordHash = auth?.encrypted_password || null;

    // auth.users do Supabase usa bcrypt ($2a$/$2b$) — compativel com bcryptjs
    // usado no login novo. Sem o hash, gera um valor aleatorio impossivel de
    // adivinhar; o usuario destrava a conta pelo fluxo de recuperacao de senha.
    if (!passwordHash) {
      passwordHash = `$2b$12$${crypto.randomBytes(22).toString("base64").replace(/[^A-Za-z0-9./]/g, "0").slice(0, 53)}`;
      noPasswordEmails.push(email);
    }

    const role = profile.role === "admin" || profile.role === "rh" ? profile.role : roleForEmail(email);

    // Conta criada direto no MariaDB antes da migracao (ex.: admin de teste)
    // com o mesmo e-mail e outro id: a do Supabase e a verdadeira — tem a
    // senha original e e o id que conversas/imagens referenciam.
    if (!DRY_RUN) {
      const [conflicts] = await pool.query(`SELECT id FROM users WHERE email = ? AND id <> ?`, [email, id]);
      if (conflicts.length) {
        await pool.query(`DELETE FROM users WHERE email = ? AND id <> ?`, [email, id]);
        console.log(`  substituida conta local de mesmo e-mail (${email}) pela do Supabase`);
      }
    }

    await run(
      `INSERT INTO users (id, email, password_hash, full_name, preferred_name, avatar_url, role, department, unit, job_title, maturity_level, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         full_name = VALUES(full_name), preferred_name = VALUES(preferred_name), avatar_url = VALUES(avatar_url),
         role = VALUES(role), department = VALUES(department), unit = VALUES(unit), job_title = VALUES(job_title),
         maturity_level = VALUES(maturity_level)`,
      [
        id,
        email,
        passwordHash,
        profile.full_name || email.split("@")[0],
        profile.preferred_name || null,
        profile.avatar_url || null,
        role,
        profile.department || "Geral",
        profile.unit || "DDM - São Paulo",
        profile.job_title || "Colaborador",
        profile.maturity_level || "Iniciante",
        toDatetime(profile.created_at || auth?.created_at) || new Date(),
      ],
    );
    migratedUserIds.add(id);
    migrated += 1;
  }

  console.log(`  migrados: ${migrated}`);
  if (noPasswordEmails.length) {
    console.log(`  SEM SENHA MIGRADA (precisam de 'Esqueci minha senha'): ${noPasswordEmails.length}`);
    console.log(`  ${noPasswordEmails.join(", ")}`);
  }
};

// ══════════════════════════════════════════════════════════════════════════
// Etapa: logs_uso_ia (nomes de coluna variavam no app — deteccao automatica)
// ══════════════════════════════════════════════════════════════════════════

const migrateLogsUsoIa = async () => {
  console.log("\n== logs_uso_ia ==");
  const rows = await fetchTable("logs_uso_ia");
  console.log(`  lidos: ${rows.length}`);

  for (const row of rows) {
    await run(
      `INSERT INTO logs_uso_ia (id, user_id, prompt_text, response_text, ia_used, sector, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE id = id`,
      [
        row.id || uuid(),
        pick(row, ["user_id", "usuario_id", "criado_por"]),
        pick(row, ["prompt_text", "prompt"], ""),
        pick(row, ["response_text", "resposta"], ""),
        pick(row, ["ia_used", "ferramenta", "modelo_usado"]),
        pick(row, ["sector", "department", "setor"]),
        toDatetime(pick(row, ["created_at", "criado_em"])) || new Date(),
      ],
    );
  }
  console.log(`  migrados: ${rows.length}`);
};

// ══════════════════════════════════════════════════════════════════════════
// Etapa: conversas + mensagens
// ══════════════════════════════════════════════════════════════════════════

const migrateConversas = async () => {
  console.log("\n== conversas + mensagens ==");
  const conversas = await fetchTable("conversas");
  console.log(`  conversas lidas: ${conversas.length}`);

  const migratedConversaIds = new Set();
  for (const row of conversas) {
    // FK exige dono existente — conta excluida/sem profile fica de fora.
    if (!row.id || !userOrNull(row.criado_por)) continue;
    await run(
      `INSERT INTO conversas (id, criado_por, title, current_model, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE id = id`,
      [row.id, row.criado_por, row.titulo || "Nova conversa", row.modelo_atual || null, toDatetime(row.created_at) || new Date()],
    );
    migratedConversaIds.add(row.id);
  }

  const mensagens = await fetchTable("mensagens");
  console.log(`  mensagens lidas: ${mensagens.length}`);

  let mensagensMigradas = 0;
  for (const row of mensagens) {
    if (!migratedConversaIds.has(row.conversa_id)) continue;
    mensagensMigradas += 1;
    await run(
      `INSERT INTO mensagens (id, conversa_id, role, content, model_used, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE id = id`,
      [
        row.id || uuid(),
        row.conversa_id,
        row.role === "user" ? "user" : "assistant",
        row.conteudo || "",
        row.modelo_usado || null,
        toDatetime(row.created_at) || new Date(),
      ],
    );
  }
  console.log(
    `  migrados: ${migratedConversaIds.size}/${conversas.length} conversas, ${mensagensMigradas}/${mensagens.length} mensagens`,
  );
};

// ══════════════════════════════════════════════════════════════════════════
// Etapa: feed (posts, comentarios, reacoes)
// ══════════════════════════════════════════════════════════════════════════

const migrateFeed = async () => {
  console.log("\n== feed ==");

  const posts = await fetchTable("feed_posts");
  const migratedPostIds = new Set();
  for (const row of posts) {
    if (!row.id || !userOrNull(row.user_id)) continue;
    migratedPostIds.add(row.id);
    await run(
      `INSERT INTO feed_posts (id, user_id, content, image_url, created_at) VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE id = id`,
      [row.id || uuid(), row.user_id, row.content || "", row.image_url || null, toDatetime(row.created_at) || new Date()],
    );
  }

  const comments = await fetchTable("feed_comments");
  for (const row of comments) {
    if (!migratedPostIds.has(row.post_id) || !userOrNull(row.user_id)) continue;
    await run(
      `INSERT INTO feed_comments (id, post_id, user_id, content, created_at) VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE id = id`,
      [row.id || uuid(), row.post_id, row.user_id, row.content || "", toDatetime(row.created_at) || new Date()],
    );
  }

  const reactions = await fetchTable("feed_reactions");
  for (const row of reactions) {
    if (!migratedPostIds.has(row.post_id) || !userOrNull(row.user_id)) continue;
    await run(
      `INSERT INTO feed_reactions (post_id, user_id, created_at) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE post_id = post_id`,
      [row.post_id, row.user_id, toDatetime(row.created_at) || new Date()],
    );
  }

  console.log(`  migrados: ${posts.length} posts, ${comments.length} comentarios, ${reactions.length} reacoes`);
};

// ══════════════════════════════════════════════════════════════════════════
// Etapa: RH (informativos, visualizacoes, knowledge)
// ══════════════════════════════════════════════════════════════════════════

// Mapa preenchido pela etapa de storage — usado para trocar URLs publicas
// antigas do Supabase Storage por /api/files/<id> nos anexos.
const storageUrlMap = new Map();

const rewriteUrl = (url) => (url && storageUrlMap.has(url) ? storageUrlMap.get(url) : url);

const migrateRH = async () => {
  console.log("\n== RH (informativos, visualizacoes, knowledge) ==");

  const informativos = await fetchTable("rh_informativos");
  const migratedInformativoIds = new Set();
  for (const row of informativos) {
    if (!row.id) continue;
    migratedInformativoIds.add(row.id);
    const anexos = (row.anexos || []).map((a) => ({ ...a, url: rewriteUrl(a.url) }));
    await run(
      `INSERT INTO rh_informativos (id, titulo, conteudo, autor_nome, anexos, respostas, ativo, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE id = id`,
      [
        row.id || uuid(),
        row.titulo || "",
        row.conteudo || "",
        row.autor_nome || "",
        asJson(anexos),
        asJson(row.respostas),
        row.ativo === false ? 0 : 1,
        toDatetime(row.created_at) || new Date(),
        toDatetime(row.updated_at || row.created_at) || new Date(),
      ],
    );
  }

  const visualizacoes = await fetchTable("rh_visualizacoes");
  for (const row of visualizacoes) {
    if (!migratedInformativoIds.has(row.informativo_id) || !userOrNull(row.user_uid)) continue;
    await run(
      `INSERT INTO rh_visualizacoes (informativo_id, user_uid, user_nome, viewed_at) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE viewed_at = VALUES(viewed_at)`,
      [row.informativo_id, row.user_uid, row.user_nome || null, toDatetime(row.viewed_at) || new Date()],
    );
  }

  const knowledge = await fetchTable("rh_knowledge");
  for (const row of knowledge) {
    await run(
      `INSERT INTO rh_knowledge (id, title, content, category, tags, status, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE id = id`,
      [
        row.id || uuid(),
        row.title || "",
        row.content || "",
        row.category || null,
        asJson(row.tags),
        row.status === "published" ? "published" : "draft",
        userOrNull(row.created_by),
        toDatetime(row.created_at) || new Date(),
        toDatetime(row.updated_at || row.created_at) || new Date(),
      ],
    );
  }

  console.log(`  migrados: ${informativos.length} informativos, ${visualizacoes.length} visualizacoes, ${knowledge.length} artigos`);
};

// ══════════════════════════════════════════════════════════════════════════
// Etapa: prompts (catalogo — nomes de coluna variavam) + prompts_customizados
// ══════════════════════════════════════════════════════════════════════════

const migratePrompts = async () => {
  console.log("\n== prompts + prompts_customizados ==");

  const prompts = await fetchTable("prompts");
  for (const row of prompts) {
    await run(
      `INSERT INTO prompts (id, title, description, department, objective, complexity, tags, base_prompt, variables, popular, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE id = id`,
      [
        row.id || uuid(),
        pick(row, ["title", "name"], "Modelo sem titulo"),
        pick(row, ["description", "descricao"]),
        pick(row, ["department", "departamento", "sector"], "Marketing"),
        pick(row, ["objective", "objetivo"]),
        pick(row, ["complexity", "nivel"], "Basico"),
        asJson(row.tags),
        pick(row, ["base_prompt", "prompt", "content"], ""),
        asJson(row.variables),
        Boolean(row.popular),
        toDatetime(row.created_at) || new Date(),
      ],
    );
  }

  const custom = await fetchTable("prompts_customizados");
  for (const row of custom) {
    if (!userOrNull(row.user_id)) continue;
    await run(
      `INSERT INTO prompts_customizados (id, user_id, title, department, tone, purpose, prompt_text, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE id = id`,
      [
        row.id || uuid(),
        row.user_id,
        row.title || "Sem titulo",
        row.department || null,
        row.tone || null,
        row.purpose || null,
        row.prompt_text || "",
        toDatetime(row.created_at) || new Date(),
      ],
    );
  }

  console.log(`  migrados: ${prompts.length} prompts, ${custom.length} customizados`);
};

// ══════════════════════════════════════════════════════════════════════════
// Etapa: agent_configs, app_config, knowledge_base_docs, sugestoes
// ══════════════════════════════════════════════════════════════════════════
// user_progress (missoes/XP/badges) nao migra — a feature Cases IA que
// alimentava essa tabela foi removida do app.

const migrateMisc = async () => {
  console.log("\n== agent_configs / app_config / knowledge_base_docs / sugestoes ==");

  const agentConfigs = await fetchTable("agent_configs");
  for (const row of agentConfigs) {
    await run(
      `INSERT INTO agent_configs (department, system_prompt, updated_by, updated_at) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE system_prompt = VALUES(system_prompt)`,
      [row.department, row.system_prompt || "", userOrNull(row.updated_by), toDatetime(row.updated_at) || new Date()],
    );
  }

  const appConfig = await fetchTable("app_config");
  for (const row of appConfig) {
    const key = row.key || row.config_key;
    const value = row.value || row.config_value;
    if (!key) continue;
    await run(
      `INSERT INTO app_config (config_key, config_value) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
      [key, value ?? null],
    );
  }

  const kbDocs = await fetchTable("knowledge_base_docs");
  for (const row of kbDocs) {
    await run(
      `INSERT INTO knowledge_base_docs (id, file_name, openai_file_id, size_bytes, uploaded_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE id = id`,
      [row.id || uuid(), row.file_name || "", row.openai_file_id || "", row.size_bytes || null, userOrNull(row.uploaded_by), toDatetime(row.created_at) || new Date()],
    );
  }

  const sugestoes = await fetchTable("sugestoes");
  for (const row of sugestoes) {
    await run(
      `INSERT INTO sugestoes (id, user_id, conteudo, categoria, status, created_at) VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE id = id`,
      [
        row.id || uuid(),
        userOrNull(row.user_id),
        row.content || row.conteudo || "",
        row.categoria || null,
        ["pendente", "lida", "arquivada"].includes(row.status) ? row.status : "pendente",
        toDatetime(row.created_at) || new Date(),
      ],
    );
  }

  console.log(
    `  migrados: ${agentConfigs.length} agent_configs, ${appConfig.length} app_config, ${kbDocs.length} kb_docs, ${sugestoes.length} sugestoes`,
  );
};

// ══════════════════════════════════════════════════════════════════════════
// Etapa: storage (creator-images, rh-arquivos) + creator_images (metadados)
// ══════════════════════════════════════════════════════════════════════════

const BUCKETS = ["creator-images", "rh-arquivos"];

/**
 * Lista um bucket do Supabase Storage recursivamente. A API so lista um
 * nivel por vez — uma entrada com metadata=null e sempre uma PASTA, nunca um
 * arquivo vazio (confirmado: creator-images guarda em `<userId>/<arquivo>`,
 * entao listar so a raiz retorna pastas de usuario, nao os arquivos).
 */
const listBucketRecursive = async (bucket, prefix = "", depth = 0) => {
  if (depth > 6) return []; // trava de seguranca contra recursao infinita

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${bucket}`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ limit: 10000, prefix }),
  });

  if (!res.ok) {
    if (depth === 0) console.warn(`  bucket '${bucket}' inacessivel (${res.status}) — pulando.`);
    return [];
  }

  const entries = await res.json();
  const files = [];

  for (const entry of entries) {
    if (!entry.name) continue;
    const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.id === null && entry.metadata === null) {
      // pasta — desce um nivel
      files.push(...(await listBucketRecursive(bucket, fullPath, depth + 1)));
    } else {
      files.push({ path: fullPath, metadata: entry.metadata });
    }
  }

  return files;
};

const migrateStorage = async () => {
  console.log("\n== storage (arquivos) ==");

  for (const bucket of BUCKETS) {
    const files = await listBucketRecursive(bucket);
    console.log(`  ${bucket}: ${files.length} arquivos`);
    await fs.mkdir(path.join(STORAGE_ROOT, bucket), { recursive: true });

    for (const file of files) {
      const oldPublicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${file.path}`;

      const fileRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${file.path}`, {
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      });
      if (!fileRes.ok) {
        console.warn(`    falha ao baixar ${bucket}/${file.path}: ${fileRes.status}`);
        continue;
      }

      const buffer = Buffer.from(await fileRes.arrayBuffer());
      // Id deterministico (bucket + caminho original): rodar a migracao de
      // novo reaproveita o mesmo registro em vez de duplicar arquivo.
      const id = deterministicUuid(`${bucket}/${file.path}`);
      const ext = path.extname(file.path);
      const storageKey = `${id}${ext}`;

      if (!DRY_RUN) {
        await fs.writeFile(path.join(STORAGE_ROOT, bucket, storageKey), buffer);
      }

      // creator-images guarda em <userId>/<arquivo>: o dono e o 1o segmento.
      // Sem isso o /api/files/:id negaria a imagem ao proprio dono.
      const ownerId = bucket === "creator-images" ? userOrNull(file.path.split("/")[0]) : null;

      const mimeType = file.metadata?.mimetype || "application/octet-stream";
      await run(
        `INSERT INTO stored_files (id, bucket, storage_key, original_name, mime_type, size_bytes, owner_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE owner_id = VALUES(owner_id)`,
        [id, bucket, storageKey, file.path, mimeType, buffer.length, ownerId],
      );

      storageUrlMap.set(oldPublicUrl, `/api/files/${id}`);
    }
  }

  console.log(`  URLs mapeadas para reescrita: ${storageUrlMap.size}`);
};

const migrateCreatorImages = async () => {
  console.log("\n== creator_images (metadados) ==");
  const rows = await fetchTable("creator_images");

  let migrados = 0;
  let semArquivo = 0;
  for (const row of rows) {
    if (!userOrNull(row.user_id)) continue;
    const newUrl = rewriteUrl(row.image_url) || row.image_url;
    if (!String(newUrl).startsWith("/api/files/")) semArquivo += 1;
    migrados += 1;
    await run(
      `INSERT INTO creator_images (id, user_id, prompt, storage_key, mime_type, created_at)
       VALUES (?, ?, ?, ?, 'image/png', ?)
       ON DUPLICATE KEY UPDATE id = id`,
      [row.id || uuid(), row.user_id, row.optimized_prompt || row.caption || null, newUrl || "", toDatetime(row.created_at) || new Date()],
    );
  }
  console.log(`  migrados: ${migrados}/${rows.length}`);
  if (semArquivo) {
    console.warn(`  ATENCAO: ${semArquivo} imagem(ns) sem arquivo correspondente no Storage — ficam com a URL antiga do Supabase.`);
  }
};

// ══════════════════════════════════════════════════════════════════════════
// Orquestracao
// ══════════════════════════════════════════════════════════════════════════

// storage PRECISA rodar antes de RH e creator_images (elas dependem do mapa
// de URL reescrita). users precisa rodar antes de tudo que tem FK para ele.
const STEPS = [
  ["users", migrateUsers],
  ["storage", migrateStorage],
  ["logs", migrateLogsUsoIa],
  ["conversas", migrateConversas],
  ["feed", migrateFeed],
  ["rh", migrateRH],
  ["prompts", migratePrompts],
  ["misc", migrateMisc],
  ["creator-images", migrateCreatorImages],
];

const main = async () => {
  console.log(`Migracao Supabase -> MariaDB ${DRY_RUN ? "(DRY RUN — nada sera gravado)" : ""}`);
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log(`Postgres direto (auth.users): ${pgConfig ? "configurado" : "NAO configurado"}`);

  for (const [name, fn] of STEPS) {
    if (ONLY && ONLY !== name) continue;
    // Com --only=<etapa> a etapa users nao roda nesta execucao: carrega do
    // banco quem ja foi migrado, pra checagem de FK continuar valendo.
    if (name !== "users") await ensureUserIds();
    await fn();
  }

  console.log("\nConcluido.");
  if (pool) await pool.end();
};

main().catch((err) => {
  console.error("\nFALHA NA MIGRACAO:", err);
  process.exit(1);
});
