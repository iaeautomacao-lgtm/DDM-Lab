-- Migracao 005 — separa "Operação e Qualidade" em dois setores distintos
-- (Operação e Qualidade sao times diferentes na empresa).
-- Aplicar no phpMyAdmin do cPanel (banco grpia_labs), depois do 004.
-- So precisa rodar se voce chegou a aplicar o 004 (setor combinado
-- operacao_qualidade). Se pulou o 004, ignore este arquivo.

-- Passo 1: acrescenta os dois setores novos ao ENUM sem tirar o antigo ainda
-- (MariaDB nao deixa trocar linhas que apontam pra um valor que sai do ENUM).
ALTER TABLE solutions MODIFY COLUMN sector
  ENUM('financeiro','planejamento','rh','juridico','backoffice','comercial','marketing','ti_ia','operacao_qualidade','operacao','qualidade','outros') NOT NULL;
ALTER TABLE projects MODIFY COLUMN sector
  ENUM('financeiro','planejamento','rh','juridico','backoffice','comercial','marketing','ti_ia','operacao_qualidade','operacao','qualidade','outros') NOT NULL;

-- Passo 2: linhas que estavam em "Operação e Qualidade" viram "Operação" por
-- padrao — ajuste manualmente pra "Qualidade" quem for do caso.
UPDATE solutions SET sector = 'operacao' WHERE sector = 'operacao_qualidade';
UPDATE projects SET sector = 'operacao' WHERE sector = 'operacao_qualidade';

-- Passo 3: agora que nao tem mais linha usando operacao_qualidade, tira do ENUM.
ALTER TABLE solutions MODIFY COLUMN sector
  ENUM('financeiro','planejamento','rh','juridico','backoffice','comercial','marketing','ti_ia','operacao','qualidade','outros') NOT NULL;
ALTER TABLE projects MODIFY COLUMN sector
  ENUM('financeiro','planejamento','rh','juridico','backoffice','comercial','marketing','ti_ia','operacao','qualidade','outros') NOT NULL;
