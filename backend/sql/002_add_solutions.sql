-- Migracao 002 — Painel de Solucoes (catalogo corporativo)
-- Aplicar no phpMyAdmin do cPanel (banco grpia_labs), depois do 001_schema.sql.
-- Idempotente (IF NOT EXISTS) — rodar de novo nao quebra nada.
-- Ja incluida no 001_schema.sql pra instalacoes novas do zero; este arquivo
-- e so pra aplicar a diferenca num banco que ja existe (como o seu).

CREATE TABLE IF NOT EXISTS solutions (
  id            CHAR(36)     NOT NULL PRIMARY KEY,
  title         VARCHAR(180) NOT NULL,
  summary       TEXT         NOT NULL,
  sector        ENUM('financeiro','planejamento','rh','juridico','backoffice','comercial','marketing','ti_ia','outros') NOT NULL,
  type          ENUM('dashboard','sistema','automacao','ia','skill','outro') NOT NULL DEFAULT 'dashboard',
  status        ENUM('planejado','em_desenvolvimento','publicado','pausado','arquivado') NOT NULL DEFAULT 'planejado',
  url           VARCHAR(1000) NULL,
  owner_name    VARCHAR(180) NULL,
  owner_email   VARCHAR(255) NULL,
  technologies  JSON         NULL,
  created_by    CHAR(36)     NULL,
  created_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                             ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_solutions_sector (sector),
  KEY idx_solutions_status (status),
  KEY idx_solutions_type (type),
  CONSTRAINT fk_solutions_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
