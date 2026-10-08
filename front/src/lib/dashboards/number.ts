// Parser único de número — usado pelo perfilamento e pelo motor de agregação.
// Regras (foco pt-BR, mas aceita formato US limpo):
//  - number já tipado -> retorna
//  - remove símbolos de moeda e espaços (R$, US$, €, etc.)
//  - se tem "," -> "." é separador de milhar (remove), "," é decimal (-> ".")
//  - se não tem "," -> parseia como está (formato US/plano: "1234.56")

export function parseNumber(v: unknown): number | null {
  if (typeof v === 'number') return isNaN(v) ? null : v;
  if (typeof v !== 'string') return null;

  let s = v.trim();
  if (!s) return null;

  s = s.replace(/[R$€£%\s ]/gi, '').replace(/US\$?/gi, '');

  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  }

  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}
