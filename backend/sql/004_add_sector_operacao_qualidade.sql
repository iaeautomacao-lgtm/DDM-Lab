-- Migracao 004 — setor "Operação e Qualidade" (operacao_qualidade)
-- Aplicar no phpMyAdmin do cPanel (banco grpia_labs), depois do 003.
-- Idempotente: MODIFY COLUMN com a lista completa pode rodar de novo.
-- So acrescenta valor ao ENUM, linhas existentes nao mudam.

ALTER TABLE solutions MODIFY COLUMN sector
  ENUM('financeiro','planejamento','rh','juridico','backoffice','comercial','marketing','ti_ia','operacao_qualidade','outros') NOT NULL;

ALTER TABLE projects MODIFY COLUMN sector
  ENUM('financeiro','planejamento','rh','juridico','backoffice','comercial','marketing','ti_ia','operacao_qualidade','outros') NOT NULL;
