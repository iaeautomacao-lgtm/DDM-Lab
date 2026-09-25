-- ════════════════════════════════════════════════════════════════════════════
-- DDM Lab — schema MariaDB (substitui o Supabase/Postgres)
-- ════════════════════════════════════════════════════════════════════════════
--
-- ATENCAO: este schema foi inferido a partir do codigo do frontend (colunas
-- realmente lidas e escritas em front/src/lib/*). Antes de rodar em producao,
-- confira contra o schema real do Supabase:
--
--   pg_dump --schema-only --no-owner \
--     "postgresql://postgres:SENHA@db.SEU-PROJETO.supabase.co:5432/postgres" \
--     > supabase_schema.sql
--
-- Diferencas que exigem atencao na migracao de dados:
--   - uuid    -> CHAR(36)
--   - jsonb   -> JSON
--   - text[]  -> JSON (array)
--   - timestamptz -> DATETIME(3) armazenado em UTC
--
-- Executar: mysql -u USUARIO -p BANCO < 001_schema.sql

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ── Autenticacao (substitui auth.users + profiles do Supabase) ───────────────

CREATE TABLE IF NOT EXISTS users (
  id                CHAR(36)     NOT NULL PRIMARY KEY,
  email             VARCHAR(255) NOT NULL,
  password_hash     VARCHAR(255) NOT NULL,        -- bcrypt, cost >= 12
  email_verified_at DATETIME(3)  NULL,
  full_name         VARCHAR(255) NOT NULL DEFAULT '',
  preferred_name    VARCHAR(120) NOT NULL DEFAULT '',
  avatar_url        VARCHAR(512) NULL,
  role              ENUM('user','gestor','diretor','rh','admin') NOT NULL DEFAULT 'user',
  department        VARCHAR(120) NOT NULL DEFAULT 'Geral',
  unit              VARCHAR(120) NOT NULL DEFAULT '',
  job_title         VARCHAR(160) NOT NULL DEFAULT 'Colaborador',
  maturity_level    VARCHAR(60)  NOT NULL DEFAULT 'Iniciante',
  is_active         TINYINT(1)   NOT NULL DEFAULT 1,
  failed_logins     INT UNSIGNED NOT NULL DEFAULT 0,
  locked_until      DATETIME(3)  NULL,
  last_login_at     DATETIME(3)  NULL,
  created_at        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                 ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role),
  KEY idx_users_department (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Refresh tokens: guardamos so o hash. Vazou o banco, nao vazou sessao.
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          CHAR(36)     NOT NULL PRIMARY KEY,
  user_id     CHAR(36)     NOT NULL,
  token_hash  CHAR(64)     NOT NULL,              -- sha256 hex
  expires_at  DATETIME(3)  NOT NULL,
  revoked_at  DATETIME(3)  NULL,
  user_agent  VARCHAR(255) NULL,
  ip_address  VARBINARY(16) NULL,
  created_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_refresh_hash (token_hash),
  KEY idx_refresh_user (user_id, expires_at),
  CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reset de senha e confirmacao de e-mail: token de uso unico, so o hash.
CREATE TABLE IF NOT EXISTS auth_tokens (
  id         CHAR(36) NOT NULL PRIMARY KEY,
  user_id    CHAR(36) NOT NULL,
  purpose    ENUM('password_reset','email_verify') NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  used_at    DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_auth_token_hash (token_hash),
  KEY idx_auth_token_user (user_id, purpose),
  CONSTRAINT fk_auth_token_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Uso de IA ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS logs_uso_ia (
  id            CHAR(36)     NOT NULL PRIMARY KEY,
  user_id       CHAR(36)     NULL,
  prompt_text   MEDIUMTEXT   NOT NULL,
  response_text MEDIUMTEXT   NOT NULL,
  ia_used       VARCHAR(80)  NULL,
  sector        VARCHAR(120) NULL,
  created_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_logs_user_created (user_id, created_at),
  KEY idx_logs_created (created_at),
  CONSTRAINT fk_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cota diaria. Hoje e conferida so no navegador (burlavel); passa a ser
-- checada no servidor antes de chamar OpenAI/Gemini.
CREATE TABLE IF NOT EXISTS daily_usage (
  user_id     CHAR(36) NOT NULL,
  usage_date  DATE     NOT NULL,
  image_count INT UNSIGNED NOT NULL DEFAULT 0,
  text_tokens BIGINT UNSIGNED NOT NULL DEFAULT 0,
  updated_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                          ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id, usage_date),
  CONSTRAINT fk_usage_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Conversas ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS conversas (
  id            CHAR(36)     NOT NULL PRIMARY KEY,
  criado_por    CHAR(36)     NOT NULL,
  title         VARCHAR(255) NOT NULL DEFAULT 'Nova conversa',
  current_model VARCHAR(80)  NULL,
  created_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_conversas_user (criado_por, created_at),
  CONSTRAINT fk_conversas_user FOREIGN KEY (criado_por) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mensagens (
  id          CHAR(36)    NOT NULL PRIMARY KEY,
  conversa_id CHAR(36)    NOT NULL,
  role        ENUM('user','assistant') NOT NULL,
  content     MEDIUMTEXT  NOT NULL,
  model_used  VARCHAR(80) NULL,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_mensagens_conversa (conversa_id, created_at),
  CONSTRAINT fk_mensagens_conversa FOREIGN KEY (conversa_id) REFERENCES conversas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Feed ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS feed_posts (
  id         CHAR(36)     NOT NULL PRIMARY KEY,
  user_id    CHAR(36)     NOT NULL,
  content    TEXT         NOT NULL,
  image_url  VARCHAR(512) NULL,
  created_at DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_posts_created (created_at),
  CONSTRAINT fk_posts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS feed_comments (
  id         CHAR(36)    NOT NULL PRIMARY KEY,
  post_id    CHAR(36)    NOT NULL,
  user_id    CHAR(36)    NOT NULL,
  content    TEXT        NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_comments_post (post_id, created_at),
  CONSTRAINT fk_comments_post FOREIGN KEY (post_id) REFERENCES feed_posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS feed_reactions (
  post_id    CHAR(36)    NOT NULL,
  user_id    CHAR(36)    NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (post_id, user_id),
  CONSTRAINT fk_reactions_post FOREIGN KEY (post_id) REFERENCES feed_posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_reactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── RH ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rh_informativos (
  id         CHAR(36)     NOT NULL PRIMARY KEY,
  titulo     VARCHAR(255) NOT NULL,
  conteudo   MEDIUMTEXT   NOT NULL,
  autor_nome VARCHAR(160) NOT NULL DEFAULT '',
  anexos     JSON         NULL,
  respostas  JSON         NULL,
  ativo      TINYINT(1)   NOT NULL DEFAULT 1,
  created_at DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                          ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_informativos_ativo (ativo, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rh_visualizacoes (
  informativo_id CHAR(36)     NOT NULL,
  user_uid       CHAR(36)     NOT NULL,
  user_nome      VARCHAR(160) NOT NULL DEFAULT '',
  viewed_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (informativo_id, user_uid),
  KEY idx_visualizacoes_viewed (viewed_at),
  CONSTRAINT fk_visualizacoes_informativo FOREIGN KEY (informativo_id)
    REFERENCES rh_informativos(id) ON DELETE CASCADE,
  CONSTRAINT fk_visualizacoes_user FOREIGN KEY (user_uid)
    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rh_knowledge (
  id         CHAR(36)     NOT NULL PRIMARY KEY,
  title      VARCHAR(255) NOT NULL,
  content    MEDIUMTEXT   NOT NULL,
  category   VARCHAR(120) NULL,
  tags       JSON         NULL,
  status     ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  created_by CHAR(36)     NULL,
  created_at DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                          ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_knowledge_status (status, updated_at),
  CONSTRAINT fk_knowledge_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Prompts e configuracao ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS prompts (
  id          CHAR(36)     NOT NULL PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  description TEXT         NULL,
  department  VARCHAR(120) NULL,
  objective   VARCHAR(255) NULL,
  complexity  VARCHAR(60)  NULL,
  tags        JSON         NULL,
  base_prompt MEDIUMTEXT   NOT NULL,
  variables   JSON         NULL,
  popular     TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_prompts_title (title),
  KEY idx_prompts_department (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS prompts_customizados (
  id          CHAR(36)     NOT NULL PRIMARY KEY,
  user_id     CHAR(36)     NOT NULL,
  title       VARCHAR(255) NOT NULL,
  department  VARCHAR(120) NULL,
  tone        VARCHAR(120) NULL,
  purpose     TEXT         NULL,
  prompt_text MEDIUMTEXT   NOT NULL,
  created_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_custom_user (user_id, created_at),
  CONSTRAINT fk_custom_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS agent_configs (
  department    VARCHAR(120) NOT NULL PRIMARY KEY,
  system_prompt MEDIUMTEXT   NOT NULL,
  updated_by    CHAR(36)     NULL,
  updated_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                             ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_agent_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS app_config (
  config_key   VARCHAR(120) NOT NULL PRIMARY KEY,
  config_value TEXT         NULL,
  updated_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                            ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Base de conhecimento (OpenAI vector store) ──────────────────────────────

CREATE TABLE IF NOT EXISTS knowledge_base_docs (
  id             CHAR(36)     NOT NULL PRIMARY KEY,
  file_name      VARCHAR(255) NOT NULL,
  openai_file_id VARCHAR(120) NOT NULL,
  size_bytes     BIGINT UNSIGNED NULL,
  uploaded_by    CHAR(36)     NULL,
  created_at     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_kb_openai_file (openai_file_id),
  KEY idx_kb_created (created_at),
  CONSTRAINT fk_kb_user FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Imagens geradas e progresso ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS creator_images (
  id          CHAR(36)     NOT NULL PRIMARY KEY,
  user_id     CHAR(36)     NOT NULL,
  prompt      MEDIUMTEXT   NULL,
  storage_key VARCHAR(512) NOT NULL,  -- caminho relativo em storage/creator-images
  mime_type   VARCHAR(80)  NOT NULL DEFAULT 'image/png',
  size_bytes  BIGINT UNSIGNED NULL,
  created_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_creator_user (user_id, created_at),
  CONSTRAINT fk_creator_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sugestoes (
  id         CHAR(36)     NOT NULL PRIMARY KEY,
  user_id    CHAR(36)     NULL,
  conteudo   TEXT         NOT NULL,
  categoria  VARCHAR(60)  NULL,
  status     ENUM('pendente','lida','arquivada') NOT NULL DEFAULT 'pendente',
  created_at DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_sugestoes_status (status, created_at),
  CONSTRAINT fk_sugestoes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Arquivos (substitui o Supabase Storage) ─────────────────────────────────
-- Buckets atuais: creator-images, rh-arquivos.
-- Os bytes ficam em disco FORA do docroot (ex.: /home/grpia/storage/ddm-labs/),
-- servidos por rota autenticada do Express. Nunca dentro de dist/.

CREATE TABLE IF NOT EXISTS stored_files (
  id           CHAR(36)     NOT NULL PRIMARY KEY,
  bucket       ENUM('creator-images','rh-arquivos','skills') NOT NULL,
  storage_key  VARCHAR(512) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type    VARCHAR(120) NOT NULL,
  size_bytes   BIGINT UNSIGNED NOT NULL,
  owner_id     CHAR(36)     NULL,
  created_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_files_key (bucket, storage_key),
  KEY idx_files_owner (owner_id),
  CONSTRAINT fk_files_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Painel de Solucoes (catalogo corporativo de dashboards/sistemas) ────────
-- Pedido do CEO via reuniao de planejamento: cada setor cadastra o que
-- construiu (dashboard, sistema, automacao, skill de IA), com link e resumo,
-- pra empresa toda ver o que ja existe e evitar retrabalho duplicado
-- (caso citado: Control Desk de SP x Fernanda/Nivea de Operacoes fazendo a
-- mesma coisa sem saber). Sistemas robustos (com banco/backend proprio) nao
-- entram aqui dentro — so o link + resumo, o Labs e vitrine, nao hospedagem.

CREATE TABLE IF NOT EXISTS solutions (
  id             CHAR(36)     NOT NULL PRIMARY KEY,
  title          VARCHAR(180) NOT NULL,
  summary        TEXT         NOT NULL,
  problem_solved TEXT         NULL,
  sector         ENUM('financeiro','planejamento','rh','juridico','backoffice','comercial','marketing','ti_ia','operacao','qualidade','outros') NOT NULL,
  type           ENUM('dashboard','sistema','automacao','ia','skill','portal','outro') NOT NULL DEFAULT 'dashboard',
  status         ENUM('planejado','em_desenvolvimento','homologacao','publicado','pausado','arquivado') NOT NULL DEFAULT 'planejado',
  -- Solucao com dados sensiveis (login/senha, financeiro, juridico etc.):
  -- so diretor/admin (ou quem criou) consegue ver.
  restricted     TINYINT(1)   NOT NULL DEFAULT 0,
  url            VARCHAR(1000) NULL,
  owner_name     VARCHAR(180) NULL,
  owner_email    VARCHAR(255) NULL,
  technologies   JSON         NULL,
  created_by     CHAR(36)     NULL,
  created_at     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                              ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_solutions_sector (sector),
  KEY idx_solutions_status (status),
  KEY idx_solutions_type (type),
  CONSTRAINT fk_solutions_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Projetos/tarefas em andamento por setor. Vinculo opcional a uma solucao ja
-- publicada (ex.: "Automacao de acordos" alimentando o "Painel Juridico").
CREATE TABLE IF NOT EXISTS projects (
  id           CHAR(36)     NOT NULL PRIMARY KEY,
  title        VARCHAR(180) NOT NULL,
  description  TEXT         NOT NULL,
  sector       ENUM('financeiro','planejamento','rh','juridico','backoffice','comercial','marketing','ti_ia','operacao','qualidade','outros') NOT NULL,
  status       ENUM('ideia','planejado','em_andamento','bloqueado','concluido','cancelado') NOT NULL DEFAULT 'planejado',
  priority     ENUM('baixa','media','alta','critica') NOT NULL DEFAULT 'media',
  solution_id  CHAR(36)     NULL,
  owner_name   VARCHAR(180) NULL,
  owner_email  VARCHAR(255) NULL,
  progress     TINYINT UNSIGNED NOT NULL DEFAULT 0,
  started_at   DATE         NULL,
  due_date     DATE         NULL,
  created_by   CHAR(36)     NULL,
  created_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                            ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_projects_sector (sector),
  KEY idx_projects_status (status),
  KEY idx_projects_solution (solution_id),
  CONSTRAINT fk_projects_solution FOREIGN KEY (solution_id) REFERENCES solutions(id) ON DELETE SET NULL,
  CONSTRAINT fk_projects_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Skills (aba dentro de Modelos Prontos) ──────────────────────────────────
-- Usuarios enviam .zip de skills do Claude pra compartilhar no Labs.

CREATE TABLE IF NOT EXISTS skills (
  id              CHAR(36)     NOT NULL PRIMARY KEY,
  name            VARCHAR(180) NOT NULL,
  description     TEXT         NOT NULL,
  category        VARCHAR(100) NULL,
  tags            JSON         NULL,
  compatibility   VARCHAR(100) NOT NULL DEFAULT 'Claude',
  version         VARCHAR(30)  NOT NULL DEFAULT '1.0.0',
  visibility      ENUM('privada','em_revisao','publicada','rejeitada') NOT NULL DEFAULT 'privada',
  moderation_note TEXT NULL,
  file_id         CHAR(36)     NOT NULL,
  download_count  INT UNSIGNED NOT NULL DEFAULT 0,
  created_by      CHAR(36)     NULL,
  created_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                               ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_skills_visibility (visibility),
  KEY idx_skills_created_by (created_by),
  CONSTRAINT fk_skills_file FOREIGN KEY (file_id) REFERENCES stored_files(id) ON DELETE CASCADE,
  CONSTRAINT fk_skills_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── DDM Apresentacoes (gerador de apresentacoes profissionais) ──────────────

CREATE TABLE IF NOT EXISTS presentations (
  id          CHAR(36)     NOT NULL PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  objective   TEXT         NULL,
  theme       ENUM('claro','escuro','ddm') NOT NULL DEFAULT 'ddm',
  primary_color VARCHAR(9) NULL,
  accent_color  VARCHAR(9) NULL,
  logo_data_url MEDIUMTEXT NULL,
  slides      JSON         NOT NULL,
  created_by  CHAR(36)     NULL,
  created_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                           ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_presentations_user (created_by, updated_at),
  CONSTRAINT fk_presentations_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Auditoria ───────────────────────────────────────────────────────────────
-- Nao existia no Supabase. Entra agora: sem RLS, a trilha de quem fez o que
-- passa a ser a principal evidencia em caso de incidente.

CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id     CHAR(36)     NULL,
  action      VARCHAR(80)  NOT NULL,
  entity      VARCHAR(80)  NULL,
  entity_id   VARCHAR(120) NULL,
  ip_address  VARBINARY(16) NULL,
  user_agent  VARCHAR(255) NULL,
  details     JSON         NULL,
  created_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_audit_user (user_id, created_at),
  KEY idx_audit_action (action, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
