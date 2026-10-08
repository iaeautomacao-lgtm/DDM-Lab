-- Migracao 011 — DDM Dashboards: dashboards vivos a partir de planilha (Excel/CSV)
-- enviada pelo usuario. Cada usuario monta e ve so os seus (admin ve todos),
-- igual Apresentacoes. Aplicar no phpMyAdmin do cPanel (banco grpia_labs), depois do 010.

CREATE TABLE IF NOT EXISTS dashboard_data_sources (
  id              CHAR(36)     NOT NULL PRIMARY KEY,
  file_name       VARCHAR(255) NOT NULL,
  row_count       INT          NOT NULL DEFAULT 0,
  column_count    INT          NOT NULL DEFAULT 0,
  -- Perfil (tipo/papel/amostras) de cada coluna, confirmado pelo usuario.
  columns_profile JSON         NOT NULL,
  -- Linhas normalizadas do upload (ate 50 mil). Privado ao dono/admin, nunca
  -- exposto por rota publica — so via /api/dashboards/data-sources/:id, com auth.
  rows_data       JSON         NOT NULL,
  created_by      CHAR(36)     NULL,
  created_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_dashboard_data_sources_user (created_by, created_at),
  CONSTRAINT fk_dashboard_data_sources_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dashboards (
  id             CHAR(36)     NOT NULL PRIMARY KEY,
  name           VARCHAR(200) NOT NULL,
  objective      TEXT         NULL,
  -- DashboardConfig completo (kpis, widgets, filtros, insights) — o front
  -- reconstroi a renderizacao a partir deste JSON + os dados da fonte.
  config         JSON         NOT NULL,
  data_source_id CHAR(36)     NULL,
  created_by     CHAR(36)     NULL,
  created_at     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                              ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_dashboards_user (created_by, updated_at),
  CONSTRAINT fk_dashboards_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_dashboards_data_source FOREIGN KEY (data_source_id) REFERENCES dashboard_data_sources(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
