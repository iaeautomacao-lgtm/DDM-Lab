-- Migracao 007 — Skills: usuarios enviam .zip de skills do Claude pra
-- compartilhar no Labs (aba "Skills" dentro de Modelos Prontos).
-- Aplicar no phpMyAdmin do cPanel (banco grpia_labs), depois do 006.

ALTER TABLE stored_files MODIFY COLUMN bucket ENUM('creator-images','rh-arquivos','skills') NOT NULL;

CREATE TABLE IF NOT EXISTS skills (
  id             CHAR(36)     NOT NULL PRIMARY KEY,
  name           VARCHAR(180) NOT NULL,
  description    TEXT         NOT NULL,
  category       VARCHAR(100) NULL,
  tags           JSON         NULL,
  compatibility  VARCHAR(100) NOT NULL DEFAULT 'Claude',
  version        VARCHAR(30)  NOT NULL DEFAULT '1.0.0',
  -- privada: so o autor (e admin) veem. em_revisao: autor pediu publicacao,
  -- aguardando moderacao. publicada: todo mundo ve e baixa. rejeitada: admin
  -- recusou (autor pode editar e reenviar).
  visibility     ENUM('privada','em_revisao','publicada','rejeitada') NOT NULL DEFAULT 'privada',
  moderation_note TEXT NULL,
  file_id        CHAR(36)     NOT NULL,
  download_count INT UNSIGNED NOT NULL DEFAULT 0,
  created_by     CHAR(36)     NULL,
  created_at     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                              ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_skills_visibility (visibility),
  KEY idx_skills_created_by (created_by),
  CONSTRAINT fk_skills_file FOREIGN KEY (file_id) REFERENCES stored_files(id) ON DELETE CASCADE,
  CONSTRAINT fk_skills_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
