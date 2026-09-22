// ── Configuração de acesso por função ────────────────────────────────────────
// Adicione ou remova e-mails aqui para controlar quem é admin ou RH.
// Todos os e-mails são comparados em lowercase e sem espaços.
//
// ATENÇÃO: estas listas vão para o bundle e são visíveis no navegador. Elas
// controlam só o que a interface mostra. A autorização que vale é a do
// servidor (ALLOWED_EMAIL_DOMAINS / ADMIN_EMAILS em backend/.env.local).

// Domínios corporativos liberados. Precisa bater com ALLOWED_EMAIL_DOMAINS no
// servidor — se divergir, o usuário entra na interface e toma 401 na IA.
export const ALLOWED_EMAIL_DOMAINS: string[] = [
  'ddm.adv.br',
  'grupoddm.com.br',
  'grupoddm.ia.br',
];

export const isAllowedDomain = (email: string): boolean => {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf('@');
  if (at < 1) return false;
  return ALLOWED_EMAIL_DOMAINS.includes(normalized.slice(at + 1));
};

export const ADMIN_EMAILS: string[] = [
  'gisele.oliveira@ddm.adv.br'
];

export const RH_EMAILS: string[] = [
  'gisele.oliveira@ddm.adv.br',
  // adicione aqui os e-mails do time de RH
];
