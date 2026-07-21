import { Template, Department, AICase } from '../types';

export const DEPARTMENTS: Department[] = [
  'RH', 'Marketing', 'Comercial', 'Financeiro',
  'Jurídico', 'Backoffice', 'Planejamento', 'Gestão'
];

export const TEMPLATES: Template[] = [
  // ── RH ──────────────────────────────────────────────────────────────────────
  {
    id: 'rh-vaga',
    name: 'Escrever Vaga de Emprego',
    description: 'Crie textos para contratar novas pessoas de um jeito fácil.',
    department: 'RH',
    objective: 'Atrair pessoas boas para trabalhar na empresa.',
    complexity: 'Básico',
    tags: ['Contratação', 'RH'],
    basePrompt: 'Você é um Especialista em Recrutamento. Escreva uma descrição de vaga para [CARGO] na empresa [EMPRESA]. Inclua responsabilidades, requisitos técnicos, diferenciais e cultura.',
    variables: ['CARGO', 'EMPRESA'],
    popular: true
  },
  {
    id: 'rh-feedback',
    name: 'Feedback de Desempenho',
    description: 'Escreva um feedback construtivo e profissional para qualquer colaborador.',
    department: 'RH',
    objective: 'Desenvolver pessoas com clareza e respeito.',
    complexity: 'Básico',
    tags: ['Feedback', 'Desempenho', 'RH'],
    basePrompt: 'Você é um gestor experiente em desenvolvimento de pessoas. Escreva um feedback de desempenho para [COLABORADOR], destacando pontos fortes relacionados a [PONTO_FORTE] e uma área de desenvolvimento em [PONTO_MELHORIA]. Tom: construtivo, direto e respeitoso.',
    variables: ['COLABORADOR', 'PONTO_FORTE', 'PONTO_MELHORIA'],
    popular: true
  },
  {
    id: 'rh-onboarding',
    name: 'Roteiro de Onboarding',
    description: 'Monte um plano de integração para novos colaboradores.',
    department: 'RH',
    objective: 'Integrar novos colaboradores de forma estruturada.',
    complexity: 'Intermediário',
    tags: ['Onboarding', 'Integração', 'RH'],
    basePrompt: 'Crie um roteiro de onboarding para o cargo de [CARGO] com duração de [DURACAO] dias. Inclua atividades de ambientação, treinamentos prioritários, apresentações às equipes e marcos de acompanhamento.',
    variables: ['CARGO', 'DURACAO'],
    popular: true
  },
  {
    id: 'rh-pdi',
    name: 'Plano de Desenvolvimento Individual',
    description: 'Crie um PDI com metas claras e ações práticas.',
    department: 'RH',
    objective: 'Estruturar o crescimento profissional de um colaborador.',
    complexity: 'Intermediário',
    tags: ['PDI', 'Desenvolvimento', 'RH'],
    basePrompt: 'Elabore um Plano de Desenvolvimento Individual (PDI) para [COLABORADOR], cargo [CARGO]. Competência a desenvolver: [COMPETENCIA]. Prazo: [PRAZO]. Inclua metas SMART, ações concretas, recursos necessários e indicadores de progresso.',
    variables: ['COLABORADOR', 'CARGO', 'COMPETENCIA', 'PRAZO'],
    popular: false
  },
  {
    id: 'rh-comunicado',
    name: 'Comunicado Interno',
    description: 'Envie comunicados claros para toda a equipe.',
    department: 'RH',
    objective: 'Informar colaboradores de forma direta e profissional.',
    complexity: 'Básico',
    tags: ['Comunicação', 'Interno', 'RH'],
    basePrompt: 'Redija um comunicado interno para todos os colaboradores sobre [ASSUNTO]. Tom: claro, objetivo e respeitoso. Inclua o motivo, o que muda e o que os colaboradores precisam fazer.',
    variables: ['ASSUNTO'],
    popular: false
  },
  {
    id: 'rh-pesquisa-clima',
    name: 'Pesquisa de Clima Organizacional',
    description: 'Crie perguntas para medir o engajamento e satisfação da equipe.',
    department: 'RH',
    objective: 'Entender como os colaboradores se sentem no trabalho.',
    complexity: 'Intermediário',
    tags: ['Clima', 'Engajamento', 'RH'],
    basePrompt: 'Crie um questionário de pesquisa de clima organizacional com 15 perguntas para a empresa [EMPRESA], setor [SETOR]. Aborde temas como liderança, comunicação, reconhecimento e ambiente de trabalho. Use escala de 1 a 5 e inclua 2 perguntas abertas.',
    variables: ['EMPRESA', 'SETOR'],
    popular: false
  },

  // ── Marketing ───────────────────────────────────────────────────────────────
  {
    id: 'mkt-linkedin',
    name: 'Post para LinkedIn',
    description: 'Crie textos para postar no LinkedIn e chamar atenção.',
    department: 'Marketing',
    objective: 'Fazer as pessoas se interessarem pelo que postamos.',
    complexity: 'Intermediário',
    tags: ['Redes Sociais', 'LinkedIn', 'Marketing'],
    basePrompt: 'Atue como um Copywriter B2B sênior. Crie 3 variações de post para LinkedIn sobre [TEMA] direcionado ao público [PERSONA]. Use storytelling, dados ou provocação. Inclua call-to-action.',
    variables: ['TEMA', 'PERSONA'],
    popular: true
  },
  {
    id: 'mkt-instagram',
    name: 'Legenda para Instagram',
    description: 'Legendas criativas para posts e reels da empresa.',
    department: 'Marketing',
    objective: 'Aumentar engajamento nas redes sociais.',
    complexity: 'Básico',
    tags: ['Instagram', 'Redes Sociais', 'Marketing'],
    basePrompt: 'Você é um Social Media criativo. Crie 3 opções de legenda para Instagram sobre [TEMA]. Tom: [TOM]. Inclua emojis estratégicos, call-to-action e até 5 hashtags relevantes.',
    variables: ['TEMA', 'TOM'],
    popular: true
  },
  {
    id: 'mkt-email-marketing',
    name: 'E-mail Marketing',
    description: 'Crie campanhas de e-mail que as pessoas realmente leem.',
    department: 'Marketing',
    objective: 'Converter leads ou engajar clientes por e-mail.',
    complexity: 'Intermediário',
    tags: ['E-mail', 'Campanha', 'Marketing'],
    basePrompt: 'Você é um especialista em e-mail marketing. Crie um e-mail de campanha para [OBJETIVO] direcionado a [PUBLICO]. Produto/serviço: [PRODUTO]. Inclua: linha de assunto irresistível, abertura impactante, corpo persuasivo e CTA claro.',
    variables: ['OBJETIVO', 'PUBLICO', 'PRODUTO'],
    popular: true
  },
  {
    id: 'mkt-briefing',
    name: 'Briefing de Campanha',
    description: 'Documente todos os detalhes de uma campanha antes de começar.',
    department: 'Marketing',
    objective: 'Alinhar a equipe antes de executar uma campanha.',
    complexity: 'Intermediário',
    tags: ['Planejamento', 'Campanha', 'Marketing'],
    basePrompt: 'Monte um briefing completo para a campanha [NOME_CAMPANHA]. Produto/serviço: [PRODUTO]. Objetivo: [OBJETIVO]. Público-alvo: [PUBLICO]. Inclua: contexto, mensagem principal, canais, tom de voz, entregáveis esperados e prazo.',
    variables: ['NOME_CAMPANHA', 'PRODUTO', 'OBJETIVO', 'PUBLICO'],
    popular: false
  },
  {
    id: 'mkt-press-release',
    name: 'Press Release',
    description: 'Anuncie novidades da empresa para a imprensa.',
    department: 'Marketing',
    objective: 'Gerar cobertura de mídia para a empresa.',
    complexity: 'Avançado',
    tags: ['Imprensa', 'Comunicado', 'Marketing'],
    basePrompt: 'Escreva um press release sobre [NOVIDADE] da empresa [EMPRESA]. Inclua lead jornalístico (quem, o quê, quando, onde, por quê), citação de porta-voz e informações de contato. Tom: formal, factual e relevante para a imprensa.',
    variables: ['NOVIDADE', 'EMPRESA'],
    popular: false
  },

  // ── Comercial ───────────────────────────────────────────────────────────────
  {
    id: 'comercial-followup',
    name: 'Follow-up de Proposta',
    description: 'Retome o contato com um cliente após o orçamento.',
    department: 'Comercial',
    objective: 'Reativar o interesse do lead e agendar uma chamada.',
    complexity: 'Intermediário',
    tags: ['Vendas', 'Follow-up', 'Comercial'],
    basePrompt: 'Você é um Executivo de Contas sênior. Escreva um e-mail de follow-up para o cliente [NOME_CLIENTE] sobre a proposta de [PRODUTO]. Use um tom profissional e consultivo.',
    variables: ['NOME_CLIENTE', 'PRODUTO'],
    popular: true
  },
  {
    id: 'comercial-objecoes',
    name: 'Quebra de Objeções',
    description: 'Como responder quando o cliente diz "está caro".',
    department: 'Comercial',
    objective: 'Contornar resistências e fechar o negócio.',
    complexity: 'Avançado',
    tags: ['Comercial', 'Objeções'],
    basePrompt: 'Atue como um mestre em vendas. O cliente apresentou a objeção: "[OBJECAO]". Crie 3 respostas usando a técnica de contorno de objeções.',
    variables: ['OBJECAO'],
    popular: false
  },
  {
    id: 'comercial-prospeccao',
    name: 'E-mail de Prospecção',
    description: 'Aborde novos clientes de forma direta e sem spam.',
    department: 'Comercial',
    objective: 'Gerar interesse em prospects frios.',
    complexity: 'Básico',
    tags: ['Prospecção', 'Cold Mail', 'Comercial'],
    basePrompt: 'Você é um SDR experiente. Escreva um e-mail de prospecção fria para [CARGO_PROSPECT] na empresa [EMPRESA_PROSPECT]. Produto/serviço oferecido: [PRODUTO]. Seja breve (máx. 5 linhas), pessoal, mostre valor e finalize com uma pergunta simples.',
    variables: ['CARGO_PROSPECT', 'EMPRESA_PROSPECT', 'PRODUTO'],
    popular: true
  },
  {
    id: 'comercial-proposta',
    name: 'Proposta Comercial',
    description: 'Estruture uma proposta profissional que convence.',
    department: 'Comercial',
    objective: 'Apresentar solução e valor ao cliente de forma persuasiva.',
    complexity: 'Avançado',
    tags: ['Proposta', 'Vendas', 'Comercial'],
    basePrompt: 'Monte uma proposta comercial para o cliente [NOME_CLIENTE] referente a [SOLUCAO]. Inclua: resumo executivo, diagnóstico do problema, solução proposta, investimento, diferenciais, próximos passos e validade da proposta.',
    variables: ['NOME_CLIENTE', 'SOLUCAO'],
    popular: true
  },
  {
    id: 'comercial-script-vendas',
    name: 'Script de Vendas',
    description: 'Roteiro completo para ligação ou reunião com o cliente.',
    department: 'Comercial',
    objective: 'Conduzir conversas de vendas com confiança.',
    complexity: 'Intermediário',
    tags: ['Script', 'Ligação', 'Comercial'],
    basePrompt: 'Crie um script de vendas para [PRODUTO] voltado a [PERFIL_CLIENTE]. Inclua: abertura, descoberta de dores (3 perguntas-chave), apresentação da solução, manejo de objeções comuns e fechamento com urgência.',
    variables: ['PRODUTO', 'PERFIL_CLIENTE'],
    popular: false
  },

  // ── Financeiro ──────────────────────────────────────────────────────────────
  {
    id: 'fin-relatorio',
    name: 'Relatório Financeiro Mensal',
    description: 'Resuma os resultados financeiros do mês de forma clara.',
    department: 'Financeiro',
    objective: 'Comunicar a situação financeira para gestores.',
    complexity: 'Intermediário',
    tags: ['Relatório', 'Financeiro', 'Resultados'],
    basePrompt: 'Você é um analista financeiro. Elabore um relatório financeiro do mês [MES] com base nos dados: receita [RECEITA], despesas [DESPESAS], resultado [RESULTADO]. Inclua análise de variações, pontos de atenção e recomendações.',
    variables: ['MES', 'RECEITA', 'DESPESAS', 'RESULTADO'],
    popular: true
  },
  {
    id: 'fin-fluxo-caixa',
    name: 'Análise de Fluxo de Caixa',
    description: 'Interprete entradas e saídas para tomar decisões melhores.',
    department: 'Financeiro',
    objective: 'Entender a liquidez e planejar pagamentos.',
    complexity: 'Avançado',
    tags: ['Fluxo de Caixa', 'Liquidez', 'Financeiro'],
    basePrompt: 'Analise o fluxo de caixa do período [PERIODO] com entradas de [ENTRADAS] e saídas de [SAIDAS]. Identifique os maiores impactos, risco de insuficiência, e sugira ações para melhorar a liquidez.',
    variables: ['PERIODO', 'ENTRADAS', 'SAIDAS'],
    popular: false
  },
  {
    id: 'fin-justificativa-orcamento',
    name: 'Justificativa de Orçamento',
    description: 'Argumente a favor de um investimento ou aumento de verba.',
    department: 'Financeiro',
    objective: 'Obter aprovação para orçamento junto à diretoria.',
    complexity: 'Intermediário',
    tags: ['Orçamento', 'Aprovação', 'Financeiro'],
    basePrompt: 'Escreva uma justificativa formal para aprovação de orçamento de [VALOR] destinado a [FINALIDADE]. Inclua: objetivo estratégico, retorno esperado, riscos de não aprovação e cronograma de uso.',
    variables: ['VALOR', 'FINALIDADE'],
    popular: true
  },
  {
    id: 'fin-cobranca-email',
    name: 'E-mail de Cobrança',
    description: 'Cobre clientes inadimplentes sem perder o relacionamento.',
    department: 'Financeiro',
    objective: 'Recuperar pagamentos em atraso de forma profissional.',
    complexity: 'Básico',
    tags: ['Cobrança', 'Inadimplência', 'Financeiro'],
    basePrompt: 'Escreva um e-mail de cobrança para o cliente [NOME_CLIENTE] referente à fatura de [VALOR] com vencimento em [DATA_VENC]. Nível de atraso: [DIAS_ATRASO] dias. Tom: profissional, firme mas respeitoso. Inclua opções de regularização.',
    variables: ['NOME_CLIENTE', 'VALOR', 'DATA_VENC', 'DIAS_ATRASO'],
    popular: true
  },
  {
    id: 'fin-dre',
    name: 'Resumo de DRE',
    description: 'Explique a Demonstração de Resultado de forma simples.',
    department: 'Financeiro',
    objective: 'Tornar dados financeiros compreensíveis para não-financeiros.',
    complexity: 'Avançado',
    tags: ['DRE', 'Resultado', 'Financeiro'],
    basePrompt: 'Com base nos dados da DRE do período [PERIODO] (receita bruta [RECEITA_BRUTA], custos [CUSTOS], despesas operacionais [DESP_OP], lucro líquido [LUCRO]), escreva um resumo executivo destacando os principais indicadores e comparação com o período anterior.',
    variables: ['PERIODO', 'RECEITA_BRUTA', 'CUSTOS', 'DESP_OP', 'LUCRO'],
    popular: false
  },

  // ── Jurídico ────────────────────────────────────────────────────────────────
  {
    id: 'jur-analise-contrato',
    name: 'Análise de Contrato',
    description: 'Identifique cláusulas críticas e riscos em contratos.',
    department: 'Jurídico',
    objective: 'Ler contratos com mais segurança e agilidade.',
    complexity: 'Avançado',
    tags: ['Contratos', 'Risco', 'Jurídico'],
    basePrompt: 'Você é um Advogado Corporativo. Analise o contrato abaixo e identifique: cláusulas de rescisão, penalidades, responsabilidades excessivas, pontos de risco e recomendações de ajuste. Contrato: [CONTRATO]',
    variables: ['CONTRATO'],
    popular: true
  },
  {
    id: 'jur-notificacao',
    name: 'Notificação Extrajudicial',
    description: 'Envie uma notificação formal antes de acionar judicialmente.',
    department: 'Jurídico',
    objective: 'Resolver conflitos sem precisar ir ao judiciário.',
    complexity: 'Avançado',
    tags: ['Notificação', 'Extrajudicial', 'Jurídico'],
    basePrompt: 'Elabore uma notificação extrajudicial de [REMETENTE] para [DESTINATARIO] sobre [MOTIVO]. Inclua: fatos, fundamentação legal, prazo para regularização ([PRAZO] dias) e consequências do descumprimento. Tom: formal e técnico.',
    variables: ['REMETENTE', 'DESTINATARIO', 'MOTIVO', 'PRAZO'],
    popular: false
  },
  {
    id: 'jur-parecer',
    name: 'Parecer Jurídico',
    description: 'Emita uma opinião técnica sobre uma questão legal.',
    department: 'Jurídico',
    objective: 'Orientar decisões com embasamento jurídico.',
    complexity: 'Avançado',
    tags: ['Parecer', 'Opinião Legal', 'Jurídico'],
    basePrompt: 'Elabore um parecer jurídico sobre a questão: [QUESTAO]. Inclua: ementa, análise dos fatos, fundamentação legal (legislação e jurisprudência pertinentes), conclusão e recomendação.',
    variables: ['QUESTAO'],
    popular: true
  },
  {
    id: 'jur-politica-privacidade',
    name: 'Política de Privacidade (LGPD)',
    description: 'Crie uma política de privacidade adequada à LGPD.',
    department: 'Jurídico',
    objective: 'Estar em conformidade com a Lei Geral de Proteção de Dados.',
    complexity: 'Avançado',
    tags: ['LGPD', 'Privacidade', 'Jurídico'],
    basePrompt: 'Elabore uma Política de Privacidade em conformidade com a LGPD para a empresa [EMPRESA] que atua no segmento [SEGMENTO] e coleta os dados [DADOS_COLETADOS]. Inclua: base legal, finalidade, direitos do titular e canais de contato.',
    variables: ['EMPRESA', 'SEGMENTO', 'DADOS_COLETADOS'],
    popular: false
  },
  {
    id: 'jur-minuta-contrato',
    name: 'Minuta de Contrato',
    description: 'Gere uma minuta inicial para negociações contratuais.',
    department: 'Jurídico',
    objective: 'Agilizar a elaboração de contratos padrão.',
    complexity: 'Avançado',
    tags: ['Contrato', 'Minuta', 'Jurídico'],
    basePrompt: 'Elabore uma minuta de contrato de [TIPO_CONTRATO] entre [PARTE_A] (contratante) e [PARTE_B] (contratado). Inclua: objeto, obrigações das partes, valor, prazo, penalidades, rescisão e foro.',
    variables: ['TIPO_CONTRATO', 'PARTE_A', 'PARTE_B'],
    popular: true
  },

  // ── Planejamento (ex-Operações) ──────────────────────────────────────────────
  {
    id: 'op-sop',
    name: 'Procedimento Operacional Padrão (SOP)',
    description: 'Crie um passo a passo para padronizar qualquer tarefa.',
    department: 'Planejamento',
    objective: 'Garantir qualidade e consistência na execução.',
    complexity: 'Intermediário',
    tags: ['SOP', 'Processos', 'Planejamento'],
    basePrompt: 'Crie um SOP para a tarefa: [TAREFA] no setor [SETOR]. Inclua: objetivo, responsáveis, materiais/ferramentas, passo a passo detalhado, pontos de controle de qualidade e ações em caso de desvio.',
    variables: ['TAREFA', 'SETOR'],
    popular: true
  },
  {
    id: 'op-kpis',
    name: 'Definição de KPIs',
    description: 'Defina indicadores que realmente medem o desempenho.',
    department: 'Planejamento',
    objective: 'Monitorar resultados com dados relevantes.',
    complexity: 'Intermediário',
    tags: ['KPI', 'Indicadores', 'Operações'],
    basePrompt: 'Defina os principais KPIs para o processo de [PROCESSO] no setor [SETOR]. Para cada indicador, inclua: nome, fórmula de cálculo, meta sugerida, frequência de medição e responsável.',
    variables: ['PROCESSO', 'SETOR'],
    popular: true
  },
  {
    id: 'op-plano-contingencia',
    name: 'Plano de Contingência',
    description: 'Prepare a equipe para lidar com imprevistos.',
    department: 'Planejamento',
    objective: 'Minimizar impacto de falhas e interrupções.',
    complexity: 'Avançado',
    tags: ['Risco', 'Contingência', 'Operações'],
    basePrompt: 'Elabore um plano de contingência para o risco: [RISCO] na operação de [AREA]. Inclua: probabilidade/impacto, gatilho de acionamento, ações imediatas, responsáveis, comunicação interna e prazo para normalização.',
    variables: ['RISCO', 'AREA'],
    popular: false
  },
  {
    id: 'op-relatorio-ocorrencia',
    name: 'Relatório de Ocorrência',
    description: 'Documente incidentes operacionais de forma estruturada.',
    department: 'Planejamento',
    objective: 'Registrar e analisar problemas para evitar reincidência.',
    complexity: 'Básico',
    tags: ['Ocorrência', 'Incidente', 'Operações'],
    basePrompt: 'Elabore um relatório de ocorrência para o incidente [DESCRICAO_INCIDENTE] ocorrido em [DATA] no setor [SETOR]. Inclua: descrição detalhada, causa raiz identificada, impacto, ações corretivas tomadas e medidas preventivas.',
    variables: ['DESCRICAO_INCIDENTE', 'DATA', 'SETOR'],
    popular: false
  },
  {
    id: 'op-cronograma',
    name: 'Cronograma de Projeto',
    description: 'Planeje as etapas e prazos de um projeto operacional.',
    department: 'Planejamento',
    objective: 'Entregar projetos no prazo com visibilidade para a equipe.',
    complexity: 'Intermediário',
    tags: ['Cronograma', 'Projeto', 'Operações'],
    basePrompt: 'Monte um cronograma para o projeto [NOME_PROJETO] com início em [DATA_INICIO] e entrega em [DATA_FIM]. Equipe envolvida: [EQUIPE]. Detalhe as fases, atividades principais, responsáveis e marcos de entrega.',
    variables: ['NOME_PROJETO', 'DATA_INICIO', 'DATA_FIM', 'EQUIPE'],
    popular: true
  },

  // ── Backoffice ──────────────────────────────────────────────────────────────
  {
    id: 'back-cobranca',
    name: 'Roteiro de Cobrança',
    description: 'Abordagem estratégica para negociação de débitos.',
    department: 'Backoffice',
    objective: 'Recuperação de crédito de forma amigável.',
    complexity: 'Avançado',
    tags: ['Cobrança', 'Negociação', 'Backoffice'],
    basePrompt: 'Atue como especialista em cobrança. Crie um roteiro de negociação para cliente com [DIAS_ATRASO] dias de atraso no valor de [VALOR]. Inclua abordagem inicial, oferta de parcelamento e última proposta antes de ação judicial.',
    variables: ['DIAS_ATRASO', 'VALOR'],
    popular: false
  },
  {
    id: 'back-resposta-cliente',
    name: 'Resposta a Reclamação de Cliente',
    description: 'Responda reclamações preservando o relacionamento.',
    department: 'Backoffice',
    objective: 'Resolver insatisfações sem perder o cliente.',
    complexity: 'Básico',
    tags: ['Atendimento', 'Reclamação', 'Backoffice'],
    basePrompt: 'Redija uma resposta para a reclamação do cliente [NOME_CLIENTE] sobre [PROBLEMA]. O status atual é [STATUS]. Tom: empático, profissional e resolutivo. Ofereça solução clara e prazo de resolução.',
    variables: ['NOME_CLIENTE', 'PROBLEMA', 'STATUS'],
    popular: true
  },
  {
    id: 'back-onboarding-fornecedor',
    name: 'Onboarding de Fornecedor',
    description: 'Integre novos fornecedores ao processo de compras.',
    department: 'Backoffice',
    objective: 'Padronizar a entrada de novos parceiros comerciais.',
    complexity: 'Intermediário',
    tags: ['Fornecedor', 'Compras', 'Backoffice'],
    basePrompt: 'Crie um e-mail de boas-vindas e roteiro de onboarding para o fornecedor [FORNECEDOR] que fornecerá [PRODUTO_SERVICO]. Inclua: documentos necessários, contatos internos, processo de pedido, prazos de pagamento e critérios de avaliação.',
    variables: ['FORNECEDOR', 'PRODUTO_SERVICO'],
    popular: false
  },
  {
    id: 'back-ata-reuniao',
    name: 'Ata de Reunião',
    description: 'Documente decisões e próximos passos de reuniões.',
    department: 'Backoffice',
    objective: 'Registrar o que foi decidido e por quem.',
    complexity: 'Básico',
    tags: ['Ata', 'Reunião', 'Backoffice'],
    basePrompt: 'Elabore uma ata da reunião de [TEMA] realizada em [DATA] com os participantes [PARTICIPANTES]. Inclua: pauta, principais discussões, decisões tomadas, responsáveis e próximos passos com prazos.',
    variables: ['TEMA', 'DATA', 'PARTICIPANTES'],
    popular: true
  },
  {
    id: 'back-processo-compras',
    name: 'Política de Compras',
    description: 'Documente as regras e limites para aquisições.',
    department: 'Backoffice',
    objective: 'Controlar gastos e padronizar o processo de compras.',
    complexity: 'Intermediário',
    tags: ['Compras', 'Política', 'Backoffice'],
    basePrompt: 'Escreva uma política de compras para a empresa [EMPRESA]. Inclua: alçadas de aprovação por valor, tipos de compra, processo de cotação, critérios de seleção de fornecedor e vedações.',
    variables: ['EMPRESA'],
    popular: false
  },

  // ── Gestão (ex-TI) ──────────────────────────────────────────────────────────
  {
    id: 'ti-readme',
    name: 'Manual do Projeto (README)',
    description: 'Crie um manual simples para explicar como o projeto funciona.',
    department: 'Gestão',
    objective: 'Ajudar outros desenvolvedores a entenderem o projeto.',
    complexity: 'Básico',
    tags: ['TI', 'Documentação', 'README'],
    basePrompt: 'Crie um arquivo README.md profissional para o projeto [NOME]. Stack: [TECNOLOGIAS]. Inclua seções de Instalação, Uso, Variáveis de Ambiente, Estrutura de Pastas, Scripts e Como Contribuir.',
    variables: ['NOME', 'TECNOLOGIAS'],
    popular: true
  },
  {
    id: 'ti-documentacao-api',
    name: 'Documentação de API',
    description: 'Documente endpoints de forma clara para o time.',
    department: 'Gestão',
    objective: 'Facilitar a integração e uso de APIs internas.',
    complexity: 'Intermediário',
    tags: ['API', 'Documentação', 'TI'],
    basePrompt: 'Documente o endpoint [METODO] [ENDPOINT] da API [NOME_API]. Inclua: descrição, parâmetros de entrada (com tipos e obrigatoriedade), exemplo de requisição, possíveis respostas de sucesso e erro com status codes.',
    variables: ['METODO', 'ENDPOINT', 'NOME_API'],
    popular: true
  },
  {
    id: 'ti-plano-testes',
    name: 'Plano de Testes',
    description: 'Defina os cenários de teste para uma funcionalidade.',
    department: 'Gestão',
    objective: 'Garantir qualidade antes de ir para produção.',
    complexity: 'Intermediário',
    tags: ['QA', 'Testes', 'TI'],
    basePrompt: 'Crie um plano de testes para a funcionalidade [FUNCIONALIDADE] do sistema [SISTEMA]. Inclua: cenários de teste positivos, negativos e de borda, critérios de aceite, dados de teste necessários e ambiente requerido.',
    variables: ['FUNCIONALIDADE', 'SISTEMA'],
    popular: false
  },
  {
    id: 'ti-relatorio-bug',
    name: 'Relatório de Bug',
    description: 'Documente um erro de forma que o time possa reproduzir.',
    department: 'Gestão',
    objective: 'Acelerar a correção de problemas no sistema.',
    complexity: 'Básico',
    tags: ['Bug', 'QA', 'TI'],
    basePrompt: 'Elabore um relatório de bug para o problema [DESCRICAO_BUG] encontrado no sistema [SISTEMA], ambiente [AMBIENTE]. Inclua: passos para reproduzir, comportamento esperado, comportamento atual, evidências (screenshot/log) e severidade.',
    variables: ['DESCRICAO_BUG', 'SISTEMA', 'AMBIENTE'],
    popular: false
  },
  {
    id: 'ti-politica-seguranca',
    name: 'Política de Segurança da Informação',
    description: 'Crie diretrizes de segurança para o time de TI.',
    department: 'Gestão',
    objective: 'Proteger dados e sistemas da empresa.',
    complexity: 'Avançado',
    tags: ['Segurança', 'LGPD', 'TI'],
    basePrompt: 'Elabore uma Política de Segurança da Informação para a empresa [EMPRESA]. Inclua: escopo, classificação de dados, regras de acesso, uso de senhas, dispositivos móveis, incidentes de segurança e penalidades por descumprimento.',
    variables: ['EMPRESA'],
    popular: true
  },

  // ── Gestão ──────────────────────────────────────────────────────────────────
  {
    id: 'gestao-okr',
    name: 'Definição de OKRs',
    description: 'Crie objetivos e resultados-chave para o trimestre.',
    department: 'Gestão',
    objective: 'Alinhar toda a equipe em torno de metas claras.',
    complexity: 'Intermediário',
    tags: ['OKR', 'Estratégia', 'Gestão'],
    basePrompt: 'Elabore 3 OKRs para o time de [AREA] no trimestre [TRIMESTRE]. Contexto estratégico: [CONTEXTO]. Para cada objetivo, crie 3 resultados-chave mensuráveis com métrica e meta numérica.',
    variables: ['AREA', 'TRIMESTRE', 'CONTEXTO'],
    popular: true
  },
  {
    id: 'gestao-relatorio-executivo',
    name: 'Relatório Executivo',
    description: 'Apresente resultados para a liderança de forma objetiva.',
    department: 'Gestão',
    objective: 'Comunicar performance e decisões estratégicas.',
    complexity: 'Intermediário',
    tags: ['Relatório', 'Diretoria', 'Gestão'],
    basePrompt: 'Elabore um relatório executivo do período [PERIODO] para a área de [AREA]. Destaques positivos: [POSITIVOS]. Desafios: [DESAFIOS]. Inclua: resumo executivo, principais métricas, análise de gaps e recomendações estratégicas.',
    variables: ['PERIODO', 'AREA', 'POSITIVOS', 'DESAFIOS'],
    popular: true
  },
  {
    id: 'gestao-plano-acao',
    name: 'Plano de Ação (5W2H)',
    description: 'Transforme decisões em ações concretas com responsáveis.',
    department: 'Gestão',
    objective: 'Garantir execução de projetos e iniciativas.',
    complexity: 'Básico',
    tags: ['5W2H', 'Execução', 'Gestão'],
    basePrompt: 'Elabore um plano de ação 5W2H para [OBJETIVO]. Contexto: [CONTEXTO]. Para cada ação, defina: O quê, Por quê, Quem, Onde, Quando, Como e Quanto custa (se aplicável).',
    variables: ['OBJETIVO', 'CONTEXTO'],
    popular: true
  },
  {
    id: 'gestao-ata-reuniao',
    name: 'Ata de Reunião Gerencial',
    description: 'Documente reuniões estratégicas com clareza.',
    department: 'Gestão',
    objective: 'Registrar decisões e garantir accountability.',
    complexity: 'Básico',
    tags: ['Ata', 'Reunião', 'Gestão'],
    basePrompt: 'Elabore a ata da reunião gerencial de [TEMA] realizada em [DATA]. Participantes: [PARTICIPANTES]. Pautas discutidas: [PAUTAS]. Inclua: decisões tomadas, responsáveis, prazos e pendências para próxima reunião.',
    variables: ['TEMA', 'DATA', 'PARTICIPANTES', 'PAUTAS'],
    popular: false
  },
  {
    id: 'gestao-apresentacao-resultados',
    name: 'Estrutura de Apresentação',
    description: 'Monte a estrutura de slides para apresentações executivas.',
    department: 'Gestão',
    objective: 'Comunicar resultados com impacto para a liderança.',
    complexity: 'Intermediário',
    tags: ['Apresentação', 'Slides', 'Gestão'],
    basePrompt: 'Crie a estrutura de uma apresentação executiva sobre [TEMA] para o público [AUDIENCIA]. Tempo disponível: [DURACAO] minutos. Inclua: título de cada slide, conteúdo-chave, dados a destacar e mensagem principal de cada seção.',
    variables: ['TEMA', 'AUDIENCIA', 'DURACAO'],
    popular: false
  },

  // ── Planejamento ─────────────────────────────────────────────────────────────
  {
    id: 'plan-plano-estrategico',
    name: 'Plano Estratégico',
    description: 'Estruture um plano estratégico com objetivos e metas claras.',
    department: 'Planejamento',
    objective: 'Definir direção e prioridades para um período.',
    complexity: 'Avançado',
    tags: ['Estratégia', 'Planejamento', 'Metas'],
    basePrompt: 'Elabore um plano estratégico para [AREA] referente ao período [PERIODO]. Contexto atual: [CONTEXTO]. Inclua: diagnóstico (forças e desafios), objetivos estratégicos, iniciativas prioritárias, métricas de acompanhamento e riscos.',
    variables: ['AREA', 'PERIODO', 'CONTEXTO'],
    popular: true
  },
  {
    id: 'plan-mapeamento-riscos',
    name: 'Mapeamento de Riscos',
    description: 'Identifique e priorize riscos antes de executar um projeto.',
    department: 'Planejamento',
    objective: 'Antecipar problemas e definir respostas preventivas.',
    complexity: 'Avançado',
    tags: ['Risco', 'Prevenção', 'Planejamento'],
    basePrompt: 'Elabore um mapeamento de riscos para o projeto [PROJETO]. Para cada risco identificado, defina: descrição, probabilidade (alta/média/baixa), impacto, nível de criticidade, responsável e ação de mitigação.',
    variables: ['PROJETO'],
    popular: false
  },
  {
    id: 'plan-plano-capacidade',
    name: 'Plano de Capacidade',
    description: 'Planeje recursos humanos e operacionais para demandas futuras.',
    department: 'Planejamento',
    objective: 'Garantir que a equipe tenha capacidade para entregar.',
    complexity: 'Intermediário',
    tags: ['Capacidade', 'Recursos', 'Planejamento'],
    basePrompt: 'Crie um plano de capacidade para a área de [AREA] considerando a demanda prevista de [DEMANDA] no período [PERIODO]. Analise: equipe atual, lacunas de capacidade, necessidade de contratação ou redistribuição e cronograma de ação.',
    variables: ['AREA', 'DEMANDA', 'PERIODO'],
    popular: true
  },
  {
    id: 'plan-roadmap',
    name: 'Roadmap de Iniciativas',
    description: 'Visualize e priorize iniciativas ao longo do tempo.',
    department: 'Planejamento',
    objective: 'Alinhar equipes sobre o que será feito e quando.',
    complexity: 'Intermediário',
    tags: ['Roadmap', 'Priorização', 'Planejamento'],
    basePrompt: 'Monte um roadmap trimestral de iniciativas para [AREA] com foco em [OBJETIVO]. Liste as iniciativas por trimestre (Q1 a Q4), com responsável, dependências e resultado esperado de cada uma.',
    variables: ['AREA', 'OBJETIVO'],
    popular: true
  },
  {
    id: 'plan-analise-swot',
    name: 'Análise SWOT',
    description: 'Avalie forças, fraquezas, oportunidades e ameaças.',
    department: 'Planejamento',
    objective: 'Embasar decisões estratégicas com visão completa do cenário.',
    complexity: 'Intermediário',
    tags: ['SWOT', 'Análise', 'Planejamento'],
    basePrompt: 'Elabore uma análise SWOT para [EMPRESA_OU_AREA] no contexto de [CONTEXTO]. Para cada quadrante (Forças, Fraquezas, Oportunidades, Ameaças), liste de 3 a 5 pontos relevantes com breve explicação.',
    variables: ['EMPRESA_OU_AREA', 'CONTEXTO'],
    popular: false
  },
];

export const CASE_LIBRARY: AICase[] = [
  {
    id: "1",
    sector: "Backoffice",
    title: "Resposta a Atraso de Entrega",
    situation: "Um cliente reclama de atraso logístico.",
    example: "O cliente enviou um e-mail sobre o produto que não chegou.",
    prompt: "Escreva uma resposta empática para um atraso de 3 dias, garantindo a verificação com a transportadora."
  },
  {
    id: "2",
    sector: "Marketing",
    title: "Legenda para Instagram",
    situation: "Lançamento de serviço.",
    example: "Precisamos de legendas criativas.",
    prompt: "Crie 3 opções de legendas para o Instagram anunciando nossa consultoria em IA."
  },
  {
    id: "3",
    sector: "Comercial",
    title: "Quebra de Objeção de Preço",
    situation: "Cliente achou o orçamento alto.",
    example: "O lead adorou a proposta, mas questionou o valor.",
    prompt: "Gere um roteiro focado no ROI (Retorno sobre Investimento) para justificar o preço."
  }
];

export const COPILOT_TIPS = [
  {
    title: "Dê uma Persona",
    content: "Sempre comece dizendo quem a IA deve ser. Ex: 'Atue como um Especialista em Operações'.",
    icon: "User"
  },
  {
    title: "Contexto é Tudo",
    content: "Explique o 'porquê' e o 'para quem'. Quanto mais a IA souber, melhor.",
    icon: "Globe"
  },
  {
    title: "Defina o Formato",
    content: "Diga como quer a resposta: tópicos, tabela, e-mail ou resumo.",
    icon: "Layout"
  },
  {
    title: "Regras e Limites",
    content: "Diga o que a IA NÃO deve fazer. Ex: 'Não use termos técnicos'.",
    icon: "Shield"
  }
];