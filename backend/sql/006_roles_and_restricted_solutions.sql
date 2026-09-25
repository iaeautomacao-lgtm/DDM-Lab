-- Migracao 006 — hierarquia de usuario (gestor/diretor) + solucao restrita
-- Aplicar no phpMyAdmin do cPanel (banco grpia_labs), depois do 005.
-- Idempotente.

-- Novos niveis de usuario: user (normal), gestor, diretor, alem de rh e
-- admin que ja existiam. Diretor e admin sao os unicos que veem solucoes
-- marcadas como restritas.
ALTER TABLE users MODIFY COLUMN role ENUM('user','gestor','diretor','rh','admin') NOT NULL DEFAULT 'user';

-- Solucao com dados sensiveis (login/senha, financeiro, juridico etc.):
-- so diretor/admin (ou quem criou) consegue ver essa linha.
ALTER TABLE solutions ADD COLUMN IF NOT EXISTS restricted TINYINT(1) NOT NULL DEFAULT 0 AFTER status;

-- Ajuste manual: garanta que sua conta seja admin (troque o e-mail se
-- precisar dar acesso a outra pessoa).
UPDATE users SET role = 'admin' WHERE email = 'gisele.oliveira@ddm.adv.br';
