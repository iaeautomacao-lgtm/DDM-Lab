-- Migracao 008 — DDM Apresentacoes: gerador de apresentacoes profissionais
-- (parecido com o DDM Creator, mas gera slides em vez de imagem).
-- Aplicar no phpMyAdmin do cPanel (banco grpia_labs), depois do 007.

CREATE TABLE IF NOT EXISTS presentations (
  id          CHAR(36)     NOT NULL PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  objective   TEXT         NULL,
  theme       ENUM('claro','escuro','ddm') NOT NULL DEFAULT 'ddm',
  -- Estrutura completa da apresentacao (slides, bullets, notas) — o front
  -- reconstroi a visualizacao e o .pptx a partir deste JSON.
  slides      JSON         NOT NULL,
  created_by  CHAR(36)     NULL,
  created_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                           ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_presentations_user (created_by, updated_at),
  CONSTRAINT fk_presentations_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
