import type { KpiIcon, KpiFormat } from './types';

// Heurísticas para enriquecer KPIs quando a IA não fornece.
// Ícone semântico + direção "boa" (menor melhor p/ FPD, inadimplência, custo, etc).

const ICON_RULES: Array<{ re: RegExp; icon: KpiIcon }> = [
  { re: /(receita|faturamento|valor|montante|ticket|saldo|pago|recuperad|R\$|custo|cac|cpc|cpl|roas)/i, icon: 'money' },
  { re: /(cliente|lead|usuari|aluno|agente|atendente|pessoa|contato)/i, icon: 'users' },
  { re: /(tempo|tma|sla|dura|espera|hora|prazo)/i, icon: 'time' },
  { re: /(taxa|percentual|convers|%|churn|abandono|ades|sla)/i, icon: 'percent' },
  { re: /(fpd|inadimpl|risco|alerta|anomal|vencid|atras|perd)/i, icon: 'alert' },
  { re: /(venda|pedido|compra|carrinho|acordo|contrato|transa)/i, icon: 'cart' },
  { re: /(meta|objetivo|target|budget)/i, icon: 'target' },
  { re: /(mensagem|chamado|protocolo|volume|total|registro|qtd|quantidade|contagem)/i, icon: 'count' },
];

const LOWER_IS_BETTER = /(fpd|inadimpl|perd|perdid|churn|abandono|custo|atras|vencid|cancel|reclama|erro|devolu)/i;

export function guessIcon(title: string, metric: string, format: KpiFormat): KpiIcon {
  const hay = `${title} ${metric}`;
  for (const r of ICON_RULES) if (r.re.test(hay)) return r.icon;
  if (format === 'currency') return 'money';
  if (format === 'percentage') return 'percent';
  return 'count';
}

export function guessGoodDirection(title: string, metric: string): 'up' | 'down' {
  return LOWER_IS_BETTER.test(`${title} ${metric}`) ? 'down' : 'up';
}

/** Normaliza um hint de ícone livre vindo da IA para uma KpiIcon válida. */
export function coerceIcon(hint: unknown): KpiIcon | undefined {
  const valid: KpiIcon[] = ['money', 'users', 'time', 'percent', 'alert', 'cart', 'target', 'trend', 'count', 'activity', 'chart', 'check', 'calendar'];
  if (typeof hint === 'string' && (valid as string[]).includes(hint)) return hint as KpiIcon;
  return undefined;
}
