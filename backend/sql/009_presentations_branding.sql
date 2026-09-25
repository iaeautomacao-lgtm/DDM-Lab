-- Migracao 009 — DDM Apresentacoes: cores da marca e logo por apresentacao
-- Aplicar no phpMyAdmin do cPanel (banco grpia_labs), depois do 008.

ALTER TABLE presentations
  ADD COLUMN IF NOT EXISTS primary_color  VARCHAR(9)   NULL AFTER theme,
  ADD COLUMN IF NOT EXISTS accent_color   VARCHAR(9)   NULL AFTER primary_color,
  -- Logo em base64 (data URL) — pequeno o bastante (poucas centenas de KB)
  -- pra nao valer a pena montar upload em disco separado so pra isso.
  ADD COLUMN IF NOT EXISTS logo_data_url  MEDIUMTEXT   NULL AFTER accent_color;
