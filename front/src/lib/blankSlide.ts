import type { Slide, SlideType } from './presentationsData';

/** Slide vazio/placeholder de cada tipo — usado no editor manual (ponto de
    partida pra pessoa escrever) e nas miniaturas da galeria de padroes
    (conteudo generico, so pra mostrar a CARA do layout). */
export const blankSlide = (type: SlideType): Slide => {
  switch (type) {
    case 'capa':
      return { type, title: 'Título da capa', subtitle: 'Subtítulo' };
    case 'duas_colunas':
      return {
        type,
        title: 'Título do slide',
        columnLeft: { heading: 'Coluna A', bullets: ['Ponto 1'] },
        columnRight: { heading: 'Coluna B', bullets: ['Ponto 1'] },
      };
    case 'citacao':
      return { type, quote: 'Frase de efeito aqui.', quoteAuthor: 'Autor' };
    case 'fechamento':
      return { type, title: 'Obrigado', bullets: ['contato@grupoddm.com.br'] };
    case 'kpi_grid':
      return {
        type,
        title: 'Título do slide',
        kpiItems: [
          { value: '0', label: 'Indicador 1' },
          { value: '0', label: 'Indicador 2' },
          { value: '0', label: 'Indicador 3' },
        ],
      };
    case 'insight_cards':
      return {
        type,
        title: 'Título do slide',
        insightItems: [
          { number: '1', title: 'Primeiro ponto', body: 'Descrição do ponto.' },
          { number: '2', title: 'Segundo ponto', body: 'Descrição do ponto.' },
        ],
      };
    case 'funil':
      return {
        type,
        title: 'Título do slide',
        funnelStages: [
          { label: 'Etapa 1', value: '100%' },
          { label: 'Etapa 2', value: '60%' },
          { label: 'Etapa 3', value: '20%' },
        ],
      };
    case 'grafico':
      return {
        type,
        title: 'Título do slide',
        chartType: 'bar',
        chartCategories: ['Jan', 'Fev', 'Mar'],
        chartSeries: [{ name: 'Série 1', values: [10, 20, 30] }],
      };
    case 'tabela':
      return {
        type,
        title: 'Título do slide',
        tableColumns: ['Indicador', 'Mês 1', 'Mês 2'],
        tableRows: [['Exemplo', '0', '0']],
      };
    default:
      return { type: 'topicos', title: 'Título do slide', bullets: ['Ponto 1', 'Ponto 2'] };
  }
};
