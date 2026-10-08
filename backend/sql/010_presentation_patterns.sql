-- Migracao 010 — Padroes de apresentacao enviados pelos usuarios
-- (upload de .pptx de referencia, extrai so a ESTRUTURA — nunca o texto real
-- dos slides, pra nao guardar dado confidencial de cliente).
-- Aplicar no phpMyAdmin do cPanel (banco grpia_labs), depois do 009.

CREATE TABLE IF NOT EXISTS presentation_patterns (
  id                    CHAR(36)     NOT NULL PRIMARY KEY,
  label                 VARCHAR(120) NOT NULL,
  description           VARCHAR(255) NULL,
  slide_sequence        JSON         NOT NULL,
  suggested_primary_color VARCHAR(9) NULL,
  created_by            CHAR(36)     NULL,
  created_at             DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_presentation_patterns_user (created_by),
  CONSTRAINT fk_presentation_patterns_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
