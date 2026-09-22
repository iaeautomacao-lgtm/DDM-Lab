-- Migracao 003 — Projetos/tarefas por setor + campo "problema que resolve"
-- Aplicar no phpMyAdmin do cPanel (banco grpia_labs), depois do 002.
-- Idempotente — rodar de novo nao quebra nada (MariaDB suporta
-- ADD COLUMN IF NOT EXISTS desde a 10.0.2).

ALTER TABLE solutions ADD COLUMN IF NOT EXISTS problem_solved TEXT NULL AFTER summary;

-- MariaDB nao aceita adicionar valor a ENUM existente com sintaxe simples
-- fora de MODIFY COLUMN. Se a tabela solutions ja foi criada pelo 002 (sem
-- 'homologacao' em status e sem 'portal' em type), rode tambem:
ALTER TABLE solutions MODIFY COLUMN type ENUM('dashboard','sistema','automacao','ia','skill','portal','outro') NOT NULL DEFAULT 'dashboard';
ALTER TABLE solutions MODIFY COLUMN status ENUM('planejado','em_desenvolvimento','homologacao','publicado','pausado','arquivado') NOT NULL DEFAULT 'planejado';

CREATE TABLE IF NOT EXISTS projects (
  id           CHAR(36)     NOT NULL PRIMARY KEY,
  title        VARCHAR(180) NOT NULL,
  description  TEXT         NOT NULL,
  sector       ENUM('financeiro','planejamento','rh','juridico','backoffice','comercial','marketing','ti_ia','outros') NOT NULL,
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
