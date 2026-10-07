import type { SlideType } from './presentationsData';

// Padroes curados a partir de 7 apresentacoes reais do Grupo DDM (pasta
// "MODELOS DE APRESENTACAO"). Os exemplos abaixo sao GENERALIZADOS — numeros,
// nomes de cliente e dados reais foram trocados por valores ilustrativos de
// mesmo formato. Nunca manda o conteudo real desses arquivos pra OpenAI; so
// a estrutura (sequencia de slide) e o "jeito de escrever" servem de guia
// pra IA, igual a um estilo de redacao, nao um fato a repetir.

export interface PresentationPattern {
  id: string;
  label: string;
  description: string;
  slideSequence: SlideType[];
  examples: Partial<Record<SlideType, string[]>>;
}

export const PRESENTATION_PATTERNS: PresentationPattern[] = [
  {
    id: 'comite_gerencial',
    label: 'Comitê Gerencial',
    description: 'Reunião executiva com panorama, oportunidades, funil e custos — pra diretoria/comitê.',
    slideSequence: ['capa', 'topicos', 'kpi_grid', 'grafico', 'insight_cards', 'funil', 'kpi_grid', 'fechamento'],
    examples: {
      capa: ['Comitê Gerencial — [Cliente]: oportunidades e caminhos para ampliar o resultado'],
      topicos: [
        '01 — A parceria entrega resultado: panorama consolidado do período\n02 — Oportunidades da carteira: descontos, judicialização e outras alavancas\n03 — A voz do cliente: o que os atendimentos revelam\n04 — Funil operacional: da carteira ao pagamento\n05 — Custos e equilíbrio financeiro\n06 — Sugestões e próximos passos',
      ],
      kpi_grid: [
        'RECUPERADO NO PERÍODO | R$ 1,8 mi | carteira do cliente~~HONORÁRIO EFETIVO | 22,8% | sobre o recuperado~~POSIÇÃO NO RANKING | 2º lugar | entre os parceiros do ecossistema',
      ],
      insight_cards: [
        '1 | Régua de descontos | A régua atual é mais contida que a praticada no mercado — ampliar a faixa para títulos antigos pode aumentar a conversão sem sacrificar o valor total recuperado.~~2 | Judicialização | A cobrança judicial ainda não é explorada nessa carteira e é eficaz para títulos de maior valor com atraso prolongado.',
      ],
      funil: ['Carteira | 131 mil | CPFs~~Tentativas | 869 mil~~Contato efetivo | 52 mil~~Acordos | 4,1 mil'],
      fechamento: ['Obrigado pela parceria. Seguimos juntos buscando os melhores resultados.'],
    },
  },
  {
    id: 'analise_resultados',
    label: 'Análise de Resultados',
    description: 'Operação de discagem/cobrança: cobertura de base, funil, evolução mensal e plano de ação.',
    slideSequence: ['capa', 'kpi_grid', 'kpi_grid', 'funil', 'grafico', 'insight_cards', 'fechamento'],
    examples: {
      capa: ['Análise de Resultados — Métricas consolidadas de discagem, conversão e engajamento'],
      kpi_grid: [
        'BASE TOTAL IMPORTADA | 64 mil | 100% da base~~TENTATIVAS DE CONTATO | 1,1 milhão | no período~~TAXA DE ALÔ | 6,8% | das tentativas',
      ],
      funil: ['Mailing importado | 64 mil~~Discagem (tentativas) | 1,1 milhão~~Atendidas (alô) | 78 mil~~Positivos | 9,6 mil'],
      insight_cards: [
        '1 | Enriquecimento da base | Parte relevante da carteira não tem telefone nem e-mail válido — enriquecer os contatos aumenta a cobertura real.~~2 | Canal complementar | Quem não responde por voz pode ser acionado por e-mail em massa, ampliando o alcance sem custo adicional de discagem.',
      ],
      fechamento: ['Muito obrigado! Seguimos buscando a excelência em cada atendimento.'],
    },
  },
  {
    id: 'relatorio_qualidade',
    label: 'Relatório de Qualidade',
    description: 'Monitoria de atendimento: quartil de desempenho, oportunidades por nível e plano de ação.',
    slideSequence: ['capa', 'kpi_grid', 'tabela', 'insight_cards', 'fechamento'],
    examples: {
      capa: ['Análise de Qualidade — Resumo executivo e operacional do período'],
      kpi_grid: [
        'LIGAÇÕES MONITORADAS | 32 | na amostra~~COM ACORDO FORMALIZADO | 100% | no atendimento~~NOTA MÉDIA | 84,0 | quartil de excelência',
      ],
      tabela: ['Quartil|Faixa de nota|Agentes~~Q1 — Excelência|84,0 a 78,0|12~~Q2 — Bom|77,9 a 70,0|18~~Q3 — Atenção|69,9 a 60,0|7'],
      insight_cards: [
        '1 | Direcionamento por nível | Agentes no Q3 precisam de reforço de script em quebra de objeção — monitor dedicado in loco acelera a curva de melhoria.',
      ],
      fechamento: ['Plano de ação: atuação de monitor de qualidade dedicado in loco a partir do próximo ciclo.'],
    },
  },
  {
    id: 'check_point',
    label: 'Check Point',
    description: 'Acompanhamento periódico: indicador comparado mês a mês, ranking e planos de ação.',
    slideSequence: ['capa', 'tabela', 'tabela', 'kpi_grid', 'insight_cards'],
    examples: {
      capa: ['Check Point — Grupo DDM | Data: [DD/MM/AAAA]'],
      tabela: ['Indicador|Mês 1|Mês 2|Mês 3~~Taxa de contato|22%|24%|27%~~Taxa de acordo|9%|10%|12%'],
      kpi_grid: ['AUMENTO NAS PROMESSAS | 37% | mesmo com redução nos disparos~~RANKING | 3º lugar | no período'],
      insight_cards: [
        '1 | Foco operacional | Priorizar a discagem dos contatos já localizados na base nova, concentrando esforço nas primeiras faixas de atraso.',
      ],
    },
  },
  {
    id: 'reuniao_resultados',
    label: 'Reunião de Resultados',
    description: 'Consolidado por canal (voz/WhatsApp/e-mail), ranking de demandas e melhorias implementadas.',
    slideSequence: ['capa', 'topicos', 'tabela', 'kpi_grid', 'tabela', 'insight_cards', 'fechamento'],
    examples: {
      capa: ['Central de Relacionamento [Cliente] — [Mês/Ano]'],
      topicos: ['1. Consolidado de canais\n2. Canal voz\n3. WhatsApp\n4. Mais procurados\n5. Melhorias e conclusões'],
      tabela: ['Canal|Mês anterior — Volume|Mês atual — Volume~~E-mail|4.200|3.950~~Voz|18.400|19.100~~WhatsApp|6.030|6.800'],
      kpi_grid: ['TOTAL ENTRANTES (URA) | 19,1 mil | no mês~~ATENDIDA HUMANO | 14,2 mil | 74% do total'],
      insight_cards: [
        '1 | Atendimento omnichannel | Gestão integrada dos canais de contato permitiu visão única do histórico do cliente.~~2 | Integração do WhatsApp | Digitalização do atendimento e envio em massa de mensagens ativas.',
      ],
      fechamento: ['Agradecemos a parceria sólida e estratégica, que fortalece nosso caminho rumo a resultados relevantes.'],
    },
  },
];

export const findPattern = (id: string | null) => PRESENTATION_PATTERNS.find((p) => p.id === id) || null;
