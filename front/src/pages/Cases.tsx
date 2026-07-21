import React, { useEffect, useState, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  Archive,
  Award,
  BarChart2,
  Bell,
  BookOpen,
  Briefcase,
  Calendar,
  Check,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Cog,
  DollarSign,
  FileSearch,
  FileText,
  Filter,
  Globe,
  Layers,
  ListChecks,
  Mail,
  Map,
  MessageSquare,
  Mic,
  PenTool,
  Phone,
  PieChart,
  Play,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  UserCheck,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../lib/AuthContext';
import { cn } from '../lib/utils';
import { fetchGlobalSectorRanking, formatSavedTime, getMissionProgressAsync, getMissionRankLabel, type SectorRankingEntry } from '../lib/missionProgress';

type MissionSector =
  | 'RH'
  | 'Juridico'
  | 'Financeiro'
  | 'Backoffice'
  | 'Planejamento'
  | 'Operacoes'
  | 'Comercial'
  | 'Marketing'
  | 'Gestao';

interface Mission {
  id: string;
  sector: MissionSector;
  title: string;
  objective: string;
  summary: string;
  badge: string;
  xp: number;
  savedMinutes: number;
  adoption: number;
  difficulty: 1 | 2 | 3;
  color: string;
  borderColor: string;
  icon: React.ElementType;
  starterPrompt: string;
  exampleInput: string;
}

const MISSIONS: Mission[] = [
  // RH
  {
    id: 'rh-recrutador-inteligente',
    sector: 'RH',
    title: 'O Recrutador Inteligente',
    objective: 'Transformar um pedido vago de contratação em uma requisição completa de vaga.',
    summary: 'Estruture requisição completa de vaga a partir de um pedido vago, com descrição para divulgação e checklist de entrevista.',
    badge: 'Caçador de Talentos',
    xp: 80,
    savedMinutes: 40,
    adoption: 62,
    difficulty: 2,
    color: 'from-orange-500/20 via-orange-400/8 to-transparent',
    borderColor: 'hover:border-orange-400/50',
    icon: Users,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor de RH do Grupo DDM. Ajude a transformar a solicitação de vaga abaixo em uma requisição completa: identifique cargo, perfil, quantidade, senioridade e urgência; gere descrição da vaga pronta para divulgação; crie checklist de entrevista; e sugira critérios objetivos de triagem.',
    exampleInput: 'Acordito, temos uma solicitação de vaga. Pode transformar em requisição completa com descrição e checklist de entrevista?',
  },
  {
    id: 'rh-guardiao-onboarding',
    sector: 'RH',
    title: 'O Guardião do Onboarding',
    objective: 'Criar um plano de onboarding com documentos, treinamentos, acessos e comunicações.',
    summary: 'Monte trilha de integração completa para novos colaboradores com checklist, acessos, treinamentos e cronograma dos primeiros dias.',
    badge: 'Mestre da Integração',
    xp: 100,
    savedMinutes: 60,
    adoption: 71,
    difficulty: 1,
    color: 'from-orange-500/20 via-orange-400/8 to-transparent',
    borderColor: 'hover:border-orange-400/50',
    icon: UserCheck,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor de RH do Grupo DDM. Monte um plano completo de onboarding para o novo colaborador: checklist de admissão, e-mail de boas-vindas, lista de acessos necessários, treinamentos obrigatórios e cronograma dos primeiros dias com marcos claros.',
    exampleInput: 'Acordito, tenho um novo colaborador chegando. Pode montar o plano de onboarding completo com checklist e cronograma?',
  },
  {
    id: 'rh-analista-de-ponto',
    sector: 'RH',
    title: 'O Analista de Ponto',
    objective: 'Transformar dados de ponto em análise clara para ação antes do fechamento da folha.',
    summary: 'Identifique inconsistências de ponto, padrões de atraso e riscos antes do fechamento da folha com relatório pronto para o gestor.',
    badge: 'Fiscal da Jornada',
    xp: 90,
    savedMinutes: 50,
    adoption: 58,
    difficulty: 2,
    color: 'from-orange-500/20 via-orange-400/8 to-transparent',
    borderColor: 'hover:border-orange-400/50',
    icon: ClipboardList,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor de RH do Grupo DDM. Analise os dados de ponto fornecidos e entregue: relatório de inconsistências por colaborador, padrões de atraso identificados, alertas de risco antes do fechamento da folha e comunicação pronta para o gestor.',
    exampleInput: 'Acordito, preciso analisar esses dados de ponto antes do fechamento da folha. Pode identificar inconsistências e gerar relatório?',
  },
  {
    id: 'rh-triagem-candidatos',
    sector: 'RH',
    title: 'O Triador de Currículos',
    objective: 'Analisar e classificar currículos com score de aderência ao perfil da vaga.',
    summary: 'Classifique currículos com score de aderência ao perfil, destaque candidatos prioritários e gere lista de aprovados para entrevista.',
    badge: 'Triador de Talentos',
    xp: 90,
    savedMinutes: 50,
    adoption: 66,
    difficulty: 2,
    color: 'from-orange-500/20 via-orange-400/8 to-transparent',
    borderColor: 'hover:border-orange-400/50',
    icon: Filter,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor de RH do Grupo DDM. Analise os currículos fornecidos para a vaga indicada: atribua score de aderência por critério (formação, experiência, competências), classifique em aprovado/revisar/reprovado, destaque os 3 melhores candidatos e explique o motivo da classificação de cada um.',
    exampleInput: 'Acordito, preciso triar currículos para a vaga. Pode avaliar e gerar score de aderência para cada candidato?',
  },
  {
    id: 'rh-entrevista-estruturada',
    sector: 'RH',
    title: 'O Entrevistador Estruturado',
    objective: 'Criar roteiro de entrevista por vaga com perguntas técnicas e comportamentais.',
    summary: 'Monte roteiro completo de entrevista com perguntas técnicas, comportamentais e critérios de avaliação por competência.',
    badge: 'Mestre da Entrevista',
    xp: 75,
    savedMinutes: 35,
    adoption: 72,
    difficulty: 1,
    color: 'from-orange-500/20 via-orange-400/8 to-transparent',
    borderColor: 'hover:border-orange-400/50',
    icon: MessageSquare,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor de RH do Grupo DDM. Crie roteiro de entrevista para a vaga indicada: 5 perguntas técnicas, 5 comportamentais (método STAR), critérios de avaliação por resposta e escala de pontuação. Inclua abertura, encerramento e próximos passos para o candidato.',
    exampleInput: 'Acordito, preciso de roteiro de entrevista para essa vaga. Pode criar perguntas técnicas, comportamentais e critérios de avaliação?',
  },
  {
    id: 'rh-documentos-admissionais',
    sector: 'RH',
    title: 'O Conferente Admissional',
    objective: 'Verificar completude de documentos admissionais antes do primeiro dia.',
    summary: 'Confira checklist admissional, identifique documentos faltantes e gere comunicação ao novo colaborador com pendências.',
    badge: 'Fiscal Admissional',
    xp: 60,
    savedMinutes: 25,
    adoption: 78,
    difficulty: 1,
    color: 'from-orange-500/20 via-orange-400/8 to-transparent',
    borderColor: 'hover:border-orange-400/50',
    icon: ClipboardCheck,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor de RH do Grupo DDM. Confira os documentos admissionais recebidos: compare com o checklist padrão DDM, liste documentos faltantes ou com divergência, calcule prazo limite para entrega e gere e-mail ao novo colaborador listando pendências com instruções claras.',
    exampleInput: 'Acordito, preciso conferir a documentação admissional. Pode comparar com o checklist e identificar o que está faltando?',
  },
  {
    id: 'rh-planejador-ferias',
    sector: 'RH',
    title: 'O Planejador de Férias',
    objective: 'Organizar escala de férias evitando conflitos e garantindo cobertura mínima.',
    summary: 'Monte escala de férias sem conflitos, garantindo cobertura mínima por período e comunicação pronta ao gestor.',
    badge: 'Gestor de Folgas',
    xp: 80,
    savedMinutes: 40,
    adoption: 65,
    difficulty: 2,
    color: 'from-orange-500/20 via-orange-400/8 to-transparent',
    borderColor: 'hover:border-orange-400/50',
    icon: Calendar,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor de RH do Grupo DDM. Organize o planejamento de férias: verifique conflitos de datas entre colaboradores do mesmo setor, identifique períodos críticos sem cobertura, proponha redistribuição quando necessário e gere comunicação ao gestor com o plano aprovado.',
    exampleInput: 'Acordito, preciso organizar a escala de férias do time. Pode verificar conflitos e garantir cobertura mínima?',
  },
  {
    id: 'rh-assistente-beneficios',
    sector: 'RH',
    title: 'O Assistente de Benefícios',
    objective: 'Responder dúvidas sobre benefícios e elegibilidade de forma padronizada.',
    summary: 'Responda dúvidas sobre benefícios com base na política interna, gere comunicado e identifique pendências de cadastro.',
    badge: 'Especialista em Benefícios',
    xp: 55,
    savedMinutes: 20,
    adoption: 80,
    difficulty: 1,
    color: 'from-orange-500/20 via-orange-400/8 to-transparent',
    borderColor: 'hover:border-orange-400/50',
    icon: Award,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor de RH do Grupo DDM. Responda a dúvida sobre benefícios com base na política interna DDM: informe elegibilidade, prazo de ativação, documentos necessários e procedimento de solicitação. Se houver pendência de cadastro, gere alerta e instrução de regularização.',
    exampleInput: 'Acordito, tenho uma dúvida sobre benefícios. Pode explicar a elegibilidade e o procedimento de solicitação?',
  },
  {
    id: 'rh-trilha-treinamento',
    sector: 'RH',
    title: 'O Curador de Trilhas',
    objective: 'Montar trilha de desenvolvimento alinhada ao cargo e lacunas do colaborador.',
    summary: 'Estruture trilha de desenvolvimento por cargo e lacuna de competência com cronograma e recursos indicados.',
    badge: 'Arquiteto de Aprendizagem',
    xp: 110,
    savedMinutes: 60,
    adoption: 58,
    difficulty: 2,
    color: 'from-orange-500/20 via-orange-400/8 to-transparent',
    borderColor: 'hover:border-orange-400/50',
    icon: Layers,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor de RH do Grupo DDM. Monte trilha de desenvolvimento para o colaborador: identifique lacunas de competência pelo perfil e avaliação fornecidos, sugira ações de desenvolvimento (cursos, práticas, mentoria), estime carga horária e defina cronograma de acompanhamento.',
    exampleInput: 'Acordito, preciso montar uma trilha de desenvolvimento para esse colaborador. Pode estruturar com base nas lacunas identificadas?',
  },
  {
    id: 'rh-termometro-clima',
    sector: 'RH',
    title: 'O Termômetro de Clima',
    objective: 'Analisar feedbacks e sinais de clima para antecipar riscos de engajamento.',
    summary: 'Analise feedbacks e indicadores de clima, identifique times em risco e recomende ação preventiva ao gestor.',
    badge: 'Sensor de Clima',
    xp: 130,
    savedMinutes: 70,
    adoption: 50,
    difficulty: 3,
    color: 'from-orange-500/20 via-orange-400/8 to-transparent',
    borderColor: 'hover:border-orange-400/50',
    icon: Activity,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor de RH do Grupo DDM. Analise os dados de clima fornecidos: identifique padrões de insatisfação, áreas ou times em risco, correlacione com absenteísmo ou turnover recente e recomende ação preventiva direcionada ao gestor responsável.',
    exampleInput: 'Acordito, preciso analisar os feedbacks de clima do time. Pode identificar riscos e recomendar ações preventivas?',
  },
  // Jurídico
  {
    id: 'juridico-leitor-de-contratos',
    sector: 'Juridico',
    title: 'O Leitor de Contratos',
    objective: 'Revisar um contrato e gerar análise preliminar com cláusulas críticas e matriz de riscos.',
    summary: 'Leia um contrato, extraia cláusulas críticas e entregue análise preliminar com matriz de riscos para o jurídico.',
    badge: 'Caçador de Cláusulas',
    xp: 120,
    savedMinutes: 90,
    adoption: 55,
    difficulty: 3,
    color: 'from-sky-500/20 via-sky-400/8 to-transparent',
    borderColor: 'hover:border-sky-400/50',
    icon: FileSearch,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor jurídico do Grupo DDM. Analise o contrato fornecido e gere: resumo do objeto, partes, vigência e obrigações principais; destaque de cláusulas críticas (multa, rescisão, LGPD, pagamento, confidencialidade); identificação de cláusulas ausentes importantes; e perguntas para validação pelo jurídico. Análise preliminar — decisão final é do advogado responsável.',
    exampleInput: 'Acordito, preciso de uma análise preliminar deste contrato. Pode resumir e destacar as cláusulas críticas?',
  },
  {
    id: 'juridico-guardiao-lgpd',
    sector: 'Juridico',
    title: 'O Guardião LGPD',
    objective: 'Verificar se uma atividade envolve risco de LGPD e precisa de validação do DPO.',
    summary: 'Avalie o risco de privacidade de uma atividade, identifique a base legal e recomende escalonamento ao DPO quando necessário.',
    badge: 'Sentinela da Privacidade',
    xp: 100,
    savedMinutes: 45,
    adoption: 68,
    difficulty: 2,
    color: 'from-sky-500/20 via-sky-400/8 to-transparent',
    borderColor: 'hover:border-sky-400/50',
    icon: Shield,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor jurídico e DPO do Grupo DDM. Avalie a atividade ou demanda descrita quanto a dados pessoais: identifique tipo de dado envolvido, base legal provável, necessidade de consentimento, ROPA ou RIPD, risco de exposição indevida, e recomende escalonamento ao DPO quando necessário. Não autorize nada — apenas avalie e direcione.',
    exampleInput: 'Acordito, essa atividade envolve dados pessoais. Pode avaliar o risco de LGPD e indicar o que precisa de atenção?',
  },
  {
    id: 'juridico-organizador-de-prazos',
    sector: 'Juridico',
    title: 'O Organizador de Prazos',
    objective: 'Transformar e-mails, notificações ou solicitações em um plano jurídico organizado.',
    summary: 'Extraia prazo, classifique a demanda jurídica e entregue checklist documental com minuta de resposta interna.',
    badge: 'Senhor dos Prazos',
    xp: 75,
    savedMinutes: 35,
    adoption: 74,
    difficulty: 1,
    color: 'from-sky-500/20 via-sky-400/8 to-transparent',
    borderColor: 'hover:border-sky-400/50',
    icon: Calendar,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor jurídico do Grupo DDM. A partir do e-mail, notificação ou solicitação fornecida, organize: prazo extraído, classificação do tipo de demanda, lista de documentos necessários, prioridade e minuta de resposta interna.',
    exampleInput: 'Acordito, recebi esta notificação. Pode extrair o prazo, classificar a demanda e organizar os próximos passos?',
  },
  {
    id: 'juridico-respondedor-titular',
    sector: 'Juridico',
    title: 'O Respondedor ao Titular',
    objective: 'Redigir resposta formal de LGPD ao titular de dados dentro do prazo legal.',
    summary: 'Redija resposta formal e completa ao titular de dados com base na solicitação recebida, dentro do prazo LGPD.',
    badge: 'Guardião do Titular',
    xp: 90,
    savedMinutes: 45,
    adoption: 67,
    difficulty: 2,
    color: 'from-sky-500/20 via-sky-400/8 to-transparent',
    borderColor: 'hover:border-sky-400/50',
    icon: Mail,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor jurídico e DPO do Grupo DDM. Redija a resposta formal à solicitação do titular de dados: identifique o tipo de direito exercido (acesso, correção, exclusão, portabilidade), elabore resposta nos termos da LGPD, calcule prazo de atendimento e indique documentação de registro para o ROPA.',
    exampleInput: 'Acordito, recebi uma solicitação de titular de dados. Pode redigir a resposta formal dentro do prazo LGPD?',
  },
  {
    id: 'juridico-ripd-express',
    sector: 'Juridico',
    title: 'O RIPD Express',
    objective: 'Gerar versão preliminar do RIPD para nova atividade de tratamento de dados.',
    summary: 'Monte estrutura básica do RIPD para nova atividade, identificando dados, finalidade, riscos e medidas de mitigação.',
    badge: 'Arquiteto de Privacidade',
    xp: 130,
    savedMinutes: 80,
    adoption: 48,
    difficulty: 3,
    color: 'from-sky-500/20 via-sky-400/8 to-transparent',
    borderColor: 'hover:border-sky-400/50',
    icon: FileText,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor jurídico e DPO do Grupo DDM. Monte a estrutura preliminar do RIPD para a atividade descrita: identifique dados tratados, finalidade, base legal, categoria de titular, medidas de segurança existentes, riscos identificados e medidas de mitigação recomendadas. Resultado é rascunho para validação do DPO.',
    exampleInput: 'Acordito, preciso montar um RIPD para essa nova atividade. Pode estruturar o rascunho com dados, riscos e medidas?',
  },
  {
    id: 'juridico-organizador-evidencias',
    sector: 'Juridico',
    title: 'O Organizador de Evidências',
    objective: 'Organizar evidências e documentos para audiência ou processo jurídico.',
    summary: 'Organize evidências por tema, crie índice documental e gere checklist de providências antes da audiência.',
    badge: 'Curador de Provas',
    xp: 100,
    savedMinutes: 55,
    adoption: 58,
    difficulty: 2,
    color: 'from-sky-500/20 via-sky-400/8 to-transparent',
    borderColor: 'hover:border-sky-400/50',
    icon: Archive,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor jurídico do Grupo DDM. Organize as evidências e documentos do processo: agrupe por tema (fatos, provas documentais, testemunhos), crie índice com referência e descrição de cada item, identifique lacunas documentais e gere checklist de providências pré-audiência.',
    exampleInput: 'Acordito, preciso organizar as evidências para a audiência. Pode criar índice e identificar o que ainda falta?',
  },
  {
    id: 'juridico-auditor-compliance',
    sector: 'Juridico',
    title: 'O Auditor de Compliance',
    objective: 'Verificar conformidade de processo ou contrato com regulamentação vigente.',
    summary: 'Verifique checklist de compliance regulatório, identifique gaps e gere relatório de adequação com recomendações.',
    badge: 'Guardião da Conformidade',
    xp: 110,
    savedMinutes: 60,
    adoption: 54,
    difficulty: 2,
    color: 'from-sky-500/20 via-sky-400/8 to-transparent',
    borderColor: 'hover:border-sky-400/50',
    icon: ClipboardCheck,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor jurídico do Grupo DDM. Realize auditoria de compliance no processo ou contrato fornecido: verifique aderência à regulamentação aplicável, identifique gaps, avalie riscos por gravidade e gere relatório de adequação com recomendações de ajuste por ordem de prioridade.',
    exampleInput: 'Acordito, preciso auditar esse processo de compliance. Pode verificar gaps e gerar relatório de adequação?',
  },
  {
    id: 'juridico-classificador-demandas',
    sector: 'Juridico',
    title: 'O Classificador de Demandas',
    objective: 'Classificar demandas jurídicas recebidas por tipo, urgência e responsável.',
    summary: 'Classifique demandas por tipo e urgência, atribua responsável e gere fila priorizada para o time jurídico.',
    badge: 'Triador Jurídico',
    xp: 65,
    savedMinutes: 25,
    adoption: 76,
    difficulty: 1,
    color: 'from-sky-500/20 via-sky-400/8 to-transparent',
    borderColor: 'hover:border-sky-400/50',
    icon: Filter,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor jurídico do Grupo DDM. Classifique as demandas recebidas: identifique tipo (contratual, trabalhista, regulatório, LGPD, cível), urgência (urgente/normal/baixa), prazo extraído e responsável sugerido. Entregue fila priorizada com justificativa de classificação.',
    exampleInput: 'Acordito, tenho várias demandas na fila jurídica. Pode classificar por tipo, urgência e sugerir responsáveis?',
  },
  {
    id: 'juridico-detector-risco',
    sector: 'Juridico',
    title: 'O Detector de Risco em Comunicações',
    objective: 'Identificar riscos jurídicos e reputacionais em comunicações internas.',
    summary: 'Revise comunicações internas, identifique expressões com risco jurídico ou reputacional e sugira reformulação segura.',
    badge: 'Escudo Jurídico',
    xp: 85,
    savedMinutes: 40,
    adoption: 63,
    difficulty: 2,
    color: 'from-sky-500/20 via-sky-400/8 to-transparent',
    borderColor: 'hover:border-sky-400/50',
    icon: AlertTriangle,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor jurídico do Grupo DDM. Revise a comunicação interna fornecida: identifique expressões com risco jurídico (promessa, confissão, discriminação), risco reputacional ou exposição indevida de dados. Para cada risco encontrado, sugira reformulação segura e justifique o porquê.',
    exampleInput: 'Acordito, preciso revisar essa comunicação antes de enviar. Pode identificar riscos jurídicos e sugerir reformulação?',
  },
  {
    id: 'juridico-minutador-interno',
    sector: 'Juridico',
    title: 'O Minutador Interno',
    objective: 'Redigir minuta de contrato ou comunicação interna para validação do jurídico.',
    summary: 'Gere minuta de contrato ou comunicação formal interna com estrutura padrão para revisão do advogado responsável.',
    badge: 'Redator Jurídico',
    xp: 140,
    savedMinutes: 90,
    adoption: 44,
    difficulty: 3,
    color: 'from-sky-500/20 via-sky-400/8 to-transparent',
    borderColor: 'hover:border-sky-400/50',
    icon: PenTool,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor jurídico do Grupo DDM. Redija a minuta solicitada com estrutura padrão: identifique tipo do documento, partes envolvidas, objeto, obrigações, vigência, penalidades e cláusulas relevantes ao contexto. Entregue rascunho anotado indicando pontos que precisam de validação ou complementação pelo advogado.',
    exampleInput: 'Acordito, preciso de uma minuta para esse contrato. Pode redigir o rascunho com estrutura padrão para o jurídico revisar?',
  },
  // Financeiro
  {
    id: 'financeiro-conferente-de-pagamentos',
    sector: 'Financeiro',
    title: 'O Conferente de Pagamentos',
    objective: 'Conferir se uma solicitação de pagamento está completa antes do lançamento.',
    summary: 'Valide solicitações de pagamento com checklist de CNPJ, vencimento, valor, aprovação e gere e-mail de validação ao gestor.',
    badge: 'Validador Financeiro',
    xp: 80,
    savedMinutes: 40,
    adoption: 65,
    difficulty: 1,
    color: 'from-emerald-500/20 via-emerald-400/8 to-transparent',
    borderColor: 'hover:border-emerald-400/50',
    icon: ClipboardCheck,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor financeiro do Grupo DDM. Confira a solicitação de pagamento e entregue: checklist com CNPJ, vencimento, valor, centro de custo e aprovação; lista de dados faltantes; classificação entre despesa recorrente e despesa que precisa de validação; e e-mail pronto para aprovação do gestor.',
    exampleInput: 'Acordito, tenho uma solicitação de pagamento para conferir. Pode checar se está completa e gerar e-mail de aprovação?',
  },
  {
    id: 'financeiro-mestre-da-conciliacao',
    sector: 'Financeiro',
    title: 'O Mestre da Conciliação',
    objective: 'Encontrar divergências entre pagamentos, baixas e lançamentos em extrato e sistema.',
    summary: 'Compare extrato e sistema, identifique valores sem baixa e pagamentos duplicados, e gere plano de regularização.',
    badge: 'Caçador de Diferenças',
    xp: 130,
    savedMinutes: 80,
    adoption: 52,
    difficulty: 3,
    color: 'from-emerald-500/20 via-emerald-400/8 to-transparent',
    borderColor: 'hover:border-emerald-400/50',
    icon: BarChart2,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor financeiro do Grupo DDM. Compare os dados de extrato e sistema fornecidos. Identifique: valores sem baixa, pagamentos duplicados ou divergentes, pendências por prioridade. Gere relatório de divergências e plano de regularização. Não altere registros — apenas aponte e organize.',
    exampleInput: 'Acordito, preciso conciliar extrato e sistema. Pode identificar as divergências e gerar plano de regularização?',
  },
  {
    id: 'financeiro-prestador-de-contas',
    sector: 'Financeiro',
    title: 'O Prestador de Contas',
    objective: 'Transformar dados financeiros em uma prestação de contas clara para o cliente.',
    summary: 'Consolide valores, abatimentos e taxas e monte prestação de contas com e-mail formal e checklist de anexos.',
    badge: 'Arquiteto da Prestação',
    xp: 110,
    savedMinutes: 60,
    adoption: 60,
    difficulty: 2,
    color: 'from-emerald-500/20 via-emerald-400/8 to-transparent',
    borderColor: 'hover:border-emerald-400/50',
    icon: FileText,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor financeiro do Grupo DDM. A partir dos dados financeiros fornecidos, monte uma prestação de contas: consolide valores, identifique abatimentos e taxas, gere explicação clara para o cliente, crie e-mail formal de prestação e aponte pendências de nota, boleto ou comprovante.',
    exampleInput: 'Acordito, preciso montar uma prestação de contas para o cliente. Pode consolidar os valores e redigir o e-mail?',
  },
  {
    id: 'financeiro-calculador-provisoes',
    sector: 'Financeiro',
    title: 'O Calculador de Provisões',
    objective: 'Calcular provisões do período e projetar impacto no fluxo de caixa.',
    summary: 'Calcule provisões por categoria, estime impacto no fluxo e gere relatório de posição financeira para o gestor.',
    badge: 'Mestre das Provisões',
    xp: 120,
    savedMinutes: 65,
    adoption: 53,
    difficulty: 3,
    color: 'from-emerald-500/20 via-emerald-400/8 to-transparent',
    borderColor: 'hover:border-emerald-400/50',
    icon: TrendingDown,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor financeiro do Grupo DDM. Calcule as provisões do período com base nos dados fornecidos: categorize por tipo (trabalhista, fiscal, operacional), estime impacto no fluxo de caixa, compare com o período anterior e gere relatório de posição financeira para o gestor.',
    exampleInput: 'Acordito, preciso calcular as provisões do mês. Pode estimar o impacto no fluxo de caixa e gerar o relatório?',
  },
  {
    id: 'financeiro-monitor-inadimplencia',
    sector: 'Financeiro',
    title: 'O Monitor de Inadimplência',
    objective: 'Identificar clientes com risco de inadimplência e gerar alerta para ação preventiva.',
    summary: 'Monitore indicadores de pagamento, identifique clientes em risco e priorize ação de cobrança preventiva.',
    badge: 'Sentinela da Adimplência',
    xp: 100,
    savedMinutes: 50,
    adoption: 61,
    difficulty: 2,
    color: 'from-emerald-500/20 via-emerald-400/8 to-transparent',
    borderColor: 'hover:border-emerald-400/50',
    icon: Activity,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor financeiro do Grupo DDM. Monitore os indicadores de inadimplência fornecidos: identifique clientes com atraso crescente, segmente por risco (alto/médio/baixo), calcule exposição financeira por grupo e gere lista priorizada para ação de cobrança preventiva.',
    exampleInput: 'Acordito, preciso monitorar a inadimplência. Pode identificar clientes em risco e priorizar ações?',
  },
  {
    id: 'financeiro-conferente-nfs',
    sector: 'Financeiro',
    title: 'O Conferente de NFs',
    objective: 'Verificar notas fiscais antes do lançamento e identificar divergências.',
    summary: 'Confira NFs com pedido, contrato e tabela de serviços; aponte divergências; e gere lista para reemissão ou ajuste.',
    badge: 'Fiscal de Notas',
    xp: 70,
    savedMinutes: 35,
    adoption: 70,
    difficulty: 1,
    color: 'from-emerald-500/20 via-emerald-400/8 to-transparent',
    borderColor: 'hover:border-emerald-400/50',
    icon: FileSearch,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor financeiro do Grupo DDM. Confira as notas fiscais fornecidas: compare valor com pedido e contrato, verifique CNPJ, data de competência, código de serviço e retenções, aponte divergências por NF e gere lista de notas que precisam de reemissão ou ajuste com instrução ao fornecedor.',
    exampleInput: 'Acordito, preciso conferir essas notas fiscais antes de lançar. Pode identificar divergências e o que precisa de ajuste?',
  },
  {
    id: 'financeiro-dre-simplificado',
    sector: 'Financeiro',
    title: 'O Gerador de DRE',
    objective: 'Montar demonstrativo simplificado de resultado para apresentação gerencial.',
    summary: 'Consolide receitas e despesas em DRE simplificado com variação mensal e comparativo do período anterior.',
    badge: 'Arquiteto do DRE',
    xp: 140,
    savedMinutes: 80,
    adoption: 47,
    difficulty: 3,
    color: 'from-emerald-500/20 via-emerald-400/8 to-transparent',
    borderColor: 'hover:border-emerald-400/50',
    icon: PieChart,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor financeiro do Grupo DDM. Monte o DRE simplificado com base nos dados fornecidos: consolide receitas brutas e deduções, separe custos fixos e variáveis, calcule margem de contribuição e resultado operacional, compare com período anterior e gere narrativa executiva para apresentação gerencial.',
    exampleInput: 'Acordito, preciso montar o DRE do mês para apresentar. Pode consolidar e gerar o demonstrativo com comparativo?',
  },
  {
    id: 'financeiro-analisador-custos',
    sector: 'Financeiro',
    title: 'O Analisador de Custos',
    objective: 'Identificar centros de custo com desvio acima do orçado e explicar variação.',
    summary: 'Analise custos por centro, identifique variações acima do orçado, explique causas e recomende ação corretiva.',
    badge: 'Controlador de Gastos',
    xp: 110,
    savedMinutes: 60,
    adoption: 56,
    difficulty: 2,
    color: 'from-emerald-500/20 via-emerald-400/8 to-transparent',
    borderColor: 'hover:border-emerald-400/50',
    icon: BarChart2,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor financeiro do Grupo DDM. Analise os custos por centro de custo: identifique desvios acima de 10% em relação ao orçado, classifique por impacto, sugira causas prováveis de cada variação e recomende ação corretiva específica para os 3 maiores desvios.',
    exampleInput: 'Acordito, preciso analisar os desvios de custo. Pode identificar os centros fora do orçado e sugerir ações?',
  },
  {
    id: 'financeiro-controlador-contratos',
    sector: 'Financeiro',
    title: 'O Controlador de Contratos',
    objective: 'Mapear contratos vencendo e alertar responsáveis com antecedência.',
    summary: 'Liste contratos por vencimento, calcule dias restantes e gere alerta de renovação ou encerramento por responsável.',
    badge: 'Guardião Contratual',
    xp: 75,
    savedMinutes: 30,
    adoption: 67,
    difficulty: 1,
    color: 'from-emerald-500/20 via-emerald-400/8 to-transparent',
    borderColor: 'hover:border-emerald-400/50',
    icon: Calendar,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor financeiro do Grupo DDM. Mapeie os contratos ativos: calcule dias restantes até o vencimento, classifique em crítico (até 30 dias), alerta (31-90 dias) e monitoramento (91-180 dias), indique responsável por contrato e gere comunicação de alerta para renovação ou encerramento.',
    exampleInput: 'Acordito, preciso mapear os contratos que vencem em breve. Pode calcular prazos e gerar alertas para os responsáveis?',
  },
  {
    id: 'financeiro-assistente-fechamento',
    sector: 'Financeiro',
    title: 'O Assistente de Fechamento',
    objective: 'Organizar checklist de fechamento mensal e consolidar pendências.',
    summary: 'Monte checklist de fechamento com etapas, prazos e responsáveis; aponte pendências e gere agenda de encerramento.',
    badge: 'Mestre do Fechamento',
    xp: 85,
    savedMinutes: 40,
    adoption: 63,
    difficulty: 2,
    color: 'from-emerald-500/20 via-emerald-400/8 to-transparent',
    borderColor: 'hover:border-emerald-400/50',
    icon: ClipboardList,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor financeiro do Grupo DDM. Organize o fechamento mensal: monte checklist com todas as etapas (conciliação, provisões, NFs, folha, apuração de resultado), defina prazo e responsável para cada item, identifique pendências abertas e gere agenda de encerramento com marcos diários.',
    exampleInput: 'Acordito, preciso organizar o fechamento do mês. Pode montar o checklist com prazos e responsáveis?',
  },
  // Backoffice
  {
    id: 'backoffice-validador-de-bases',
    sector: 'Backoffice',
    title: 'O Validador de Bases',
    objective: 'Validar uma planilha de débitos antes da importação no sistema.',
    summary: 'Confira planilha de débitos antes da importação, aponte erros por linha e gere relatório de correção para cliente ou área interna.',
    badge: 'Higienizador de Dados',
    xp: 120,
    savedMinutes: 60,
    adoption: 57,
    difficulty: 2,
    color: 'from-fuchsia-500/20 via-pink-400/8 to-transparent',
    borderColor: 'hover:border-fuchsia-400/50',
    icon: Wrench,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o backoffice do Grupo DDM. Valide a planilha de débitos para importação: verifique campos obrigatórios, identifique CPF inválido, contrato ausente, valor vazio ou duplicidade; aponte inconsistências por linha; gere relatório de correção e checklist de importação.',
    exampleInput: 'Acordito, tenho uma planilha de débitos para importar. Pode validar e apontar os erros antes que eu envie?',
  },
  {
    id: 'backoffice-sentinela-spc',
    sector: 'Backoffice',
    title: 'O Sentinela SPC/Serasa',
    objective: 'Organizar uma solicitação de negativação ou retirada de restrição com conformidade.',
    summary: 'Organize solicitações de inclusão e exclusão em SPC/Serasa com checklist, conformidade e alerta de risco jurídico ou LGPD.',
    badge: 'Guardião da Restrição',
    xp: 90,
    savedMinutes: 45,
    adoption: 63,
    difficulty: 2,
    color: 'from-fuchsia-500/20 via-pink-400/8 to-transparent',
    borderColor: 'hover:border-fuchsia-400/50',
    icon: AlertTriangle,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o backoffice do Grupo DDM. Organize a solicitação de negativação ou retirada de restrição: verifique documentação mínima, identifique tipo de solicitação, crie checklist de conformidade, gere comunicação ao cliente e alerte quando envolver risco jurídico ou LGPD — nesse caso, escale antes de prosseguir.',
    exampleInput: 'Acordito, tenho uma solicitação de negativação para processar. Pode organizar os documentos e conferir se está tudo certo?',
  },
  {
    id: 'backoffice-organizador-de-propostas',
    sector: 'Backoffice',
    title: 'O Organizador de Propostas',
    objective: 'Revisar dados de uma proposta e apontar pendências antes da aprovação.',
    summary: 'Revise dados de proposta operacional, identifique divergências e defina próximo passo: Comercial, Jurídico ou Operações.',
    badge: 'Validador de Acordos',
    xp: 75,
    savedMinutes: 35,
    adoption: 70,
    difficulty: 1,
    color: 'from-fuchsia-500/20 via-pink-400/8 to-transparent',
    borderColor: 'hover:border-fuchsia-400/50',
    icon: ClipboardList,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o backoffice do Grupo DDM. Revise a proposta operacional: confira dados do acordo (valor, vencimento, cliente, devedor), identifique divergências, resuma as pendências e indique próximo passo — se vai para Comercial, Jurídico ou Operações.',
    exampleInput: 'Acordito, preciso revisar essa proposta antes de enviar para aprovação. Pode conferir os dados e apontar pendências?',
  },
  {
    id: 'backoffice-gestor-acesso',
    sector: 'Backoffice',
    title: 'O Gestor de Acesso',
    objective: 'Organizar e priorizar solicitações de acesso a sistemas internos.',
    summary: 'Valide solicitações de acesso, verifique alçada aprovadora, priorize por urgência e gere trilha de aprovação.',
    badge: 'Guardião dos Acessos',
    xp: 70,
    savedMinutes: 30,
    adoption: 73,
    difficulty: 1,
    color: 'from-fuchsia-500/20 via-pink-400/8 to-transparent',
    borderColor: 'hover:border-fuchsia-400/50',
    icon: Shield,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o backoffice do Grupo DDM. Organize as solicitações de acesso: verifique completude (sistema, perfil, justificativa, aprovador), identifique alçada correta, priorize por urgência e gere trilha de aprovação com prazos e responsáveis para cada solicitação.',
    exampleInput: 'Acordito, tenho solicitações de acesso para organizar. Pode verificar a completude e gerar a trilha de aprovação?',
  },
  {
    id: 'backoffice-arquivista-digital',
    sector: 'Backoffice',
    title: 'O Arquivista Digital',
    objective: 'Estruturar arquivamento digital de documentos por padrão DDM.',
    summary: 'Organize documentos digitais com nomenclatura padrão, estrutura de pastas e cronograma de retenção.',
    badge: 'Mestre do Arquivo',
    xp: 60,
    savedMinutes: 25,
    adoption: 78,
    difficulty: 1,
    color: 'from-fuchsia-500/20 via-pink-400/8 to-transparent',
    borderColor: 'hover:border-fuchsia-400/50',
    icon: Archive,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o backoffice do Grupo DDM. Estruture o arquivamento digital dos documentos: sugira nomenclatura padronizada, hierarquia de pastas por área e tipo, prazo de retenção por categoria e procedimento de descarte ou arquivamento final conforme política interna.',
    exampleInput: 'Acordito, preciso organizar o arquivo digital dos documentos. Pode sugerir estrutura de pastas e padrão de nomenclatura?',
  },
  {
    id: 'backoffice-agente-protocolo',
    sector: 'Backoffice',
    title: 'O Agente de Protocolo',
    objective: 'Registrar e encaminhar protocolos internos ao responsável correto.',
    summary: 'Registre protocolos recebidos, classifique por tipo e urgência e gere encaminhamento com prazo de resposta.',
    badge: 'Agente de Protocolo',
    xp: 65,
    savedMinutes: 25,
    adoption: 76,
    difficulty: 1,
    color: 'from-fuchsia-500/20 via-pink-400/8 to-transparent',
    borderColor: 'hover:border-fuchsia-400/50',
    icon: ClipboardCheck,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o backoffice do Grupo DDM. Registre e encaminhe o protocolo recebido: classifique por tipo (demanda, reclamação, solicitação, informação), identifique responsável de destino, defina prazo de resposta por categoria e gere confirmação de recebimento ao solicitante.',
    exampleInput: 'Acordito, recebi esse protocolo e preciso encaminhar. Pode classificar e direcionar ao responsável correto?',
  },
  {
    id: 'backoffice-triador-emails',
    sector: 'Backoffice',
    title: 'O Triador de E-mails',
    objective: 'Classificar e responder e-mails operacionais recorrentes com padrão.',
    summary: 'Classifique e-mails por tipo de demanda, gere rascunho de resposta padronizado e sinalize os que precisam de análise.',
    badge: 'Filtro Operacional',
    xp: 75,
    savedMinutes: 30,
    adoption: 80,
    difficulty: 1,
    color: 'from-fuchsia-500/20 via-pink-400/8 to-transparent',
    borderColor: 'hover:border-fuchsia-400/50',
    icon: Mail,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o backoffice do Grupo DDM. Trie os e-mails operacionais: classifique por tipo de demanda, urgência e setor de destino; gere rascunho de resposta padrão para os recorrentes; e sinalize os que precisam de análise humana com resumo e sugestão de próxima ação.',
    exampleInput: 'Acordito, tenho vários e-mails operacionais para responder. Pode triá-los e preparar rascunhos de resposta?',
  },
  {
    id: 'backoffice-controlador-contratos-ativos',
    sector: 'Backoffice',
    title: 'O Controlador de Contratos Ativos',
    objective: 'Mapear contratos ativos com vencimento próximo e alertar responsáveis.',
    summary: 'Liste contratos ativos, identifique os que vencem em 30/60/90 dias e gere alerta com responsável e próxima ação.',
    badge: 'Fiscal de Contratos',
    xp: 90,
    savedMinutes: 40,
    adoption: 65,
    difficulty: 2,
    color: 'from-fuchsia-500/20 via-pink-400/8 to-transparent',
    borderColor: 'hover:border-fuchsia-400/50',
    icon: FileText,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o backoffice do Grupo DDM. Mapeie os contratos ativos e vencimentos: identifique os que vencem em 30, 60 e 90 dias, indique responsável por contrato, gere alerta com próxima ação (renovar, encerrar, negociar) e comunicação pronta para o responsável.',
    exampleInput: 'Acordito, preciso monitorar os contratos ativos. Pode mapear vencimentos e gerar alertas para os responsáveis?',
  },
  {
    id: 'backoffice-gerador-atas',
    sector: 'Backoffice',
    title: 'O Gerador de Atas',
    objective: 'Transformar anotações de reunião em ata estruturada e pronta para envio.',
    summary: 'Transforme notas de reunião em ata formal com participantes, decisões, responsáveis e prazos.',
    badge: 'Secretário Digital',
    xp: 60,
    savedMinutes: 25,
    adoption: 82,
    difficulty: 1,
    color: 'from-fuchsia-500/20 via-pink-400/8 to-transparent',
    borderColor: 'hover:border-fuchsia-400/50',
    icon: BookOpen,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o backoffice do Grupo DDM. Transforme as anotações da reunião em ata formal: identifique data, participantes e pauta; extraia decisões tomadas; liste ações definidas com responsável e prazo; e formate em documento padrão pronto para envio e arquivamento.',
    exampleInput: 'Acordito, tenho as anotações da reunião. Pode transformar em ata formal com decisões e responsáveis?',
  },
  {
    id: 'backoffice-assistente-demandas',
    sector: 'Backoffice',
    title: 'O Assistente de Demandas',
    objective: 'Distribuir e rastrear demandas internas entre setores com registro e prazo.',
    summary: 'Registre demandas internas, atribua responsável, defina prazo e gere painel de acompanhamento das pendências.',
    badge: 'Gestor de Demandas',
    xp: 85,
    savedMinutes: 35,
    adoption: 68,
    difficulty: 2,
    color: 'from-fuchsia-500/20 via-pink-400/8 to-transparent',
    borderColor: 'hover:border-fuchsia-400/50',
    icon: MessageSquare,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o backoffice do Grupo DDM. Gerencie as demandas internas: registre cada solicitação com tipo, solicitante e urgência; atribua responsável e prazo de atendimento; identifique demandas em risco de atraso; e gere painel resumido das pendências por setor.',
    exampleInput: 'Acordito, tenho várias demandas internas para organizar. Pode registrar, atribuir responsáveis e gerar o painel?',
  },
  // Planejamento
  {
    id: 'planejamento-arquiteto-de-escalas',
    sector: 'Planejamento',
    title: 'O Arquiteto de Escalas',
    objective: 'Criar uma escala operacional mais eficiente com cobertura por turno e alertas de lacuna.',
    summary: 'Monte escala operacional eficiente com análise de horários de pico, cobertura por turno e alertas de buracos na operação.',
    badge: 'Arquiteto Operacional',
    xp: 120,
    savedMinutes: 60,
    adoption: 59,
    difficulty: 2,
    color: 'from-violet-500/20 via-violet-400/8 to-transparent',
    borderColor: 'hover:border-violet-400/50',
    icon: Cog,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor de Planejamento do Grupo DDM. Monte a escala operacional com base nos dados fornecidos: analise quantidade de operadores e horários de pico, sugira cobertura por turno, aponte buracos de escala e gere versão formatada para comunicar à liderança.',
    exampleInput: 'Acordito, preciso montar a escala da próxima semana. Pode analisar a cobertura e apontar os buracos?',
  },
  {
    id: 'planejamento-estrategista-de-mailing',
    sector: 'Planejamento',
    title: 'O Estrategista de Mailing',
    objective: 'Segmentar bases de cobrança e montar régua de ação por canal, atraso e potencial.',
    summary: 'Segmente bases de cobrança e monte régua inteligente por canal, atraso e potencial de contato para maximizar recuperação.',
    badge: 'Mestre da Segmentação',
    xp: 150,
    savedMinutes: 90,
    adoption: 76,
    difficulty: 3,
    color: 'from-violet-500/20 via-violet-400/8 to-transparent',
    borderColor: 'hover:border-violet-400/50',
    icon: Target,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor de Planejamento do Grupo DDM. Segmente o mailing de cobrança fornecido: separe por atraso, valor, histórico e canal; sugira régua de cobrança; defina prioridade por chance de contato; e recomende canal ideal (WhatsApp, SMS, discador ou e-mail) para cada grupo.',
    exampleInput: 'Acordito, tenho um mailing de cobrança para segmentar. Pode criar os grupos e sugerir a régua por canal?',
  },
  {
    id: 'planejamento-preditor-de-performance',
    sector: 'Planejamento',
    title: 'O Preditor de Performance',
    objective: 'Estimar o desempenho de uma campanha antes da execução com base em histórico.',
    summary: 'Estime performance de campanhas com histórico de CPC, conversão e recuperação, identifique riscos e sugira ajustes antes do lançamento.',
    badge: 'Oráculo dos Indicadores',
    xp: 180,
    savedMinutes: 120,
    adoption: 48,
    difficulty: 3,
    color: 'from-violet-500/20 via-violet-400/8 to-transparent',
    borderColor: 'hover:border-violet-400/50',
    icon: TrendingDown,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor de Planejamento do Grupo DDM. Com base no histórico operacional fornecido, estime o desempenho da campanha: analise CPC, conversão, contato e recuperação; estime volume esperado de acordos; identifique carteiras com risco de baixa performance; sugira ajustes em régua, horário e canal. Deixe claro que é projeção — não garantia.',
    exampleInput: 'Acordito, preciso estimar o resultado dessa campanha antes de lançar. Pode projetar com base no histórico?',
  },
  {
    id: 'planejamento-monitor-sla',
    sector: 'Planejamento',
    title: 'O Monitor de SLA',
    objective: 'Acompanhar indicadores de SLA e identificar operações fora do padrão.',
    summary: 'Monitore SLA da operação, identifique áreas abaixo do esperado e gere alerta com causa e ação recomendada.',
    badge: 'Guardião do SLA',
    xp: 90,
    savedMinutes: 45,
    adoption: 63,
    difficulty: 2,
    color: 'from-violet-500/20 via-violet-400/8 to-transparent',
    borderColor: 'hover:border-violet-400/50',
    icon: Activity,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor de Planejamento do Grupo DDM. Monitore os SLAs operacionais com base nos dados fornecidos: identifique indicadores abaixo do padrão, calcule desvio percentual, classifique por impacto e gere alerta com provável causa e ação corretiva recomendada por área.',
    exampleInput: 'Acordito, preciso monitorar o SLA da operação. Pode identificar o que está fora do padrão e sugerir ações?',
  },
  {
    id: 'planejamento-simulador-cenarios',
    sector: 'Planejamento',
    title: 'O Simulador de Cenários',
    objective: 'Simular impacto de mudanças na régua ou estratégia antes da execução.',
    summary: 'Simule cenários de mudança em régua, volume ou equipe e estime impacto em resultado e risco operacional.',
    badge: 'Arquiteto de Cenários',
    xp: 160,
    savedMinutes: 100,
    adoption: 45,
    difficulty: 3,
    color: 'from-violet-500/20 via-violet-400/8 to-transparent',
    borderColor: 'hover:border-violet-400/50',
    icon: BarChart2,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor de Planejamento do Grupo DDM. Simule os cenários propostos com base nos dados históricos: estime impacto de cada mudança em resultado (acordos, recuperação, contato), identifique riscos operacionais de cada cenário e recomende a abordagem com melhor relação risco-benefício.',
    exampleInput: 'Acordito, quero simular o impacto antes de mudar a régua. Pode comparar os cenários e estimar os resultados?',
  },
  {
    id: 'planejamento-calibrador-metas',
    sector: 'Planejamento',
    title: 'O Calibrador de Metas',
    objective: 'Ajustar metas por carteira, período e desempenho histórico.',
    summary: 'Calcule metas ajustadas por carteira com base em histórico, sazonalidade e capacidade do time.',
    badge: 'Calibrador de Metas',
    xp: 130,
    savedMinutes: 70,
    adoption: 52,
    difficulty: 3,
    color: 'from-violet-500/20 via-violet-400/8 to-transparent',
    borderColor: 'hover:border-violet-400/50',
    icon: Trophy,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor de Planejamento do Grupo DDM. Calibre as metas do período: analise histórico por carteira, ajuste para sazonalidade e capacidade atual do time, distribua metas por operador de forma equilibrada e justifique cada ajuste com base nos dados.',
    exampleInput: 'Acordito, preciso calibrar as metas do próximo período. Pode ajustar com base no histórico e capacidade do time?',
  },
  {
    id: 'planejamento-analisador-absenteismo',
    sector: 'Planejamento',
    title: 'O Analisador de Absenteísmo',
    objective: 'Identificar padrões de falta e estimar impacto na capacidade operacional.',
    summary: 'Analise dados de absenteísmo, identifique padrões, calcule impacto na capacidade e recomende ação preventiva.',
    badge: 'Investigador de Ausências',
    xp: 95,
    savedMinutes: 50,
    adoption: 58,
    difficulty: 2,
    color: 'from-violet-500/20 via-violet-400/8 to-transparent',
    borderColor: 'hover:border-violet-400/50',
    icon: Users,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor de Planejamento do Grupo DDM. Analise os dados de absenteísmo: identifique padrões por dia da semana, colaborador ou setor, calcule impacto percentual na capacidade operacional e recomende ação preventiva para os 3 maiores focos identificados.',
    exampleInput: 'Acordito, preciso entender os padrões de falta. Pode analisar o absenteísmo e estimar impacto na capacidade?',
  },
  {
    id: 'planejamento-planejador-campanha',
    sector: 'Planejamento',
    title: 'O Planejador de Campanha',
    objective: 'Montar cronograma e plano de execução de campanha de cobrança.',
    summary: 'Monte cronograma de campanha com datas, canais, volume e responsáveis para maximizar resultados.',
    badge: 'Estrategista de Campanha',
    xp: 120,
    savedMinutes: 65,
    adoption: 60,
    difficulty: 2,
    color: 'from-violet-500/20 via-violet-400/8 to-transparent',
    borderColor: 'hover:border-violet-400/50',
    icon: Calendar,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor de Planejamento do Grupo DDM. Monte o plano de campanha de cobrança: defina datas de início e fim, canais por fase, volume estimado, metas por etapa, responsáveis e cronograma de execução com marcos. Inclua plano de contingência para baixo desempenho.',
    exampleInput: 'Acordito, preciso planejar a próxima campanha. Pode montar cronograma com canais, volume e responsáveis?',
  },
  {
    id: 'planejamento-gestor-filas',
    sector: 'Planejamento',
    title: 'O Gestor de Filas',
    objective: 'Organizar e priorizar filas de atendimento por critério e urgência.',
    summary: 'Priorize filas por valor, atraso e janela de contato, e distribua entre operadores com equilíbrio de carga.',
    badge: 'Arquiteto de Filas',
    xp: 85,
    savedMinutes: 40,
    adoption: 67,
    difficulty: 2,
    color: 'from-violet-500/20 via-violet-400/8 to-transparent',
    borderColor: 'hover:border-violet-400/50',
    icon: Layers,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor de Planejamento do Grupo DDM. Organize as filas de atendimento: priorize por valor do débito, dias de atraso e melhor janela de contato; distribua entre os operadores disponíveis de forma equilibrada; e identifique devedores que devem ser atendidos primeiro hoje.',
    exampleInput: 'Acordito, preciso organizar as filas para o turno. Pode priorizar e distribuir entre os operadores disponíveis?',
  },
  {
    id: 'planejamento-relatorio-executivo',
    sector: 'Planejamento',
    title: 'O Relator Executivo',
    objective: 'Montar relatório executivo de operações com principais indicadores do período.',
    summary: 'Consolide indicadores operacionais em relatório executivo com narrativa, destaques e alertas para a liderança.',
    badge: 'Narrador de Resultados',
    xp: 140,
    savedMinutes: 80,
    adoption: 50,
    difficulty: 3,
    color: 'from-violet-500/20 via-violet-400/8 to-transparent',
    borderColor: 'hover:border-violet-400/50',
    icon: BookOpen,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor de Planejamento do Grupo DDM. Monte o relatório executivo de operações: consolide os principais indicadores do período, destaque variações positivas e negativas, sinalize riscos operacionais e gere narrativa executiva com recomendações para a liderança.',
    exampleInput: 'Acordito, preciso montar o relatório executivo da operação. Pode consolidar os indicadores e gerar a narrativa?',
  },
  // Operações
  {
    id: 'operacoes-copiloto-de-negociacao',
    sector: 'Operacoes',
    title: 'O Copiloto de Negociação',
    objective: 'Sugerir a melhor abordagem para um atendimento de cobrança com argumentação humanizada.',
    summary: 'Apoie operadores com roteiro de atendimento, argumentação humanizada e alternativas de negociação para cada perfil de devedor.',
    badge: 'Negociador Inteligente',
    xp: 60,
    savedMinutes: 20,
    adoption: 82,
    difficulty: 1,
    color: 'from-cyan-500/20 via-cyan-400/8 to-transparent',
    borderColor: 'hover:border-cyan-400/50',
    icon: MessageSquare,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando as Operações do Grupo DDM. Apoie o operador com a melhor abordagem para este atendimento: analise o perfil do devedor, sugira argumentação humanizada, adapte o tom, indique alternativas de negociação e evite promessas indevidas. Saídas devem ser scripts práticos e respeitosos.',
    exampleInput: 'Acordito, vou atender esse devedor agora. Pode sugerir a melhor abordagem e argumentação?',
  },
  {
    id: 'operacoes-monitor-de-qualidade',
    sector: 'Operacoes',
    title: 'O Monitor de Qualidade',
    objective: 'Analisar atendimentos e gerar feedback estruturado para melhoria do operador.',
    summary: 'Analise atendimentos, identifique falhas de tom e comunicação, e entregue feedback construtivo para reciclagem do operador.',
    badge: 'Auditor de Atendimento',
    xp: 90,
    savedMinutes: 40,
    adoption: 67,
    difficulty: 2,
    color: 'from-cyan-500/20 via-cyan-400/8 to-transparent',
    borderColor: 'hover:border-cyan-400/50',
    icon: Mic,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando as Operações do Grupo DDM. Analise o atendimento registrado abaixo: identifique tom inadequado, avalie clareza, empatia e aderência ao script, aponte oportunidades de conversão e gere feedback estruturado para reciclagem do operador com linguagem construtiva.',
    exampleInput: 'Acordito, preciso avaliar esse atendimento para feedback. Pode analisar e gerar o retorno para o operador?',
  },
  {
    id: 'operacoes-proxima-melhor-acao',
    sector: 'Operacoes',
    title: 'A Próxima Melhor Ação',
    objective: 'Decidir qual ação faz mais sentido após tentativa de contato sem sucesso.',
    summary: 'Defina próxima ação ideal para cada devedor com base no histórico de tentativas, melhor canal e intervalo de contato.',
    badge: 'Estrategista de Recuperação',
    xp: 85,
    savedMinutes: 30,
    adoption: 73,
    difficulty: 2,
    color: 'from-cyan-500/20 via-cyan-400/8 to-transparent',
    borderColor: 'hover:border-cyan-400/50',
    icon: Map,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando as Operações do Grupo DDM. Com base no histórico de tentativas de contato com este devedor, recomende a próxima ação: avalie histórico de tentativas, identifique melhor canal, sugira intervalo ideal de novo contato e recomende envio de proposta, ligação, WhatsApp ou pausa justificada.',
    exampleInput: 'Acordito, já tentamos contato várias vezes. Qual a próxima melhor ação para esse devedor?',
  },
  {
    id: 'operacoes-gerador-roteiros',
    sector: 'Operacoes',
    title: 'O Gerador de Roteiros',
    objective: 'Criar roteiro de atendimento personalizado por tipo de devedor.',
    summary: 'Gere roteiro de atendimento com abordagem, argumentação e manejo de objeções por perfil de devedor.',
    badge: 'Arquiteto de Scripts',
    xp: 80,
    savedMinutes: 35,
    adoption: 71,
    difficulty: 1,
    color: 'from-cyan-500/20 via-cyan-400/8 to-transparent',
    borderColor: 'hover:border-cyan-400/50',
    icon: FileText,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando as Operações do Grupo DDM. Crie roteiro de atendimento para o perfil de devedor descrito: inclua abordagem de abertura, argumentação principal, tratamento de objeções mais comuns, alternativas de proposta e encerramento. Tom deve ser humanizado, respeitoso e focado na solução.',
    exampleInput: 'Acordito, preciso de roteiro de atendimento para esse perfil de devedor. Pode criar com abordagem, argumentação e objeções?',
  },
  {
    id: 'operacoes-analisador-reversoes',
    sector: 'Operacoes',
    title: 'O Analisador de Reversões',
    objective: 'Identificar por que acordos estão quebrando e sugerir ação preventiva.',
    summary: 'Analise motivos de reversão de acordos, identifique padrões e sugira ajuste de abordagem ou proposta.',
    badge: 'Detetive de Reversões',
    xp: 110,
    savedMinutes: 55,
    adoption: 58,
    difficulty: 2,
    color: 'from-cyan-500/20 via-cyan-400/8 to-transparent',
    borderColor: 'hover:border-cyan-400/50',
    icon: TrendingDown,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando as Operações do Grupo DDM. Analise os dados de reversão de acordos: identifique os motivos mais frequentes, classifique por tipo de devedor e carteira, detecte padrões temporais ou operacionais e sugira ajuste em abordagem, proposta ou canal para reduzir a taxa de reversão.',
    exampleInput: 'Acordito, os acordos estão quebrando muito. Pode analisar os motivos e sugerir como reduzir as reversões?',
  },
  {
    id: 'operacoes-curador-faq',
    sector: 'Operacoes',
    title: 'O Curador de FAQ',
    objective: 'Responder dúvidas frequentes dos operadores com base em política interna.',
    summary: 'Compile e responda dúvidas operacionais recorrentes com base na política interna, formatadas para o time.',
    badge: 'Mestre do FAQ',
    xp: 50,
    savedMinutes: 15,
    adoption: 85,
    difficulty: 1,
    color: 'from-cyan-500/20 via-cyan-400/8 to-transparent',
    borderColor: 'hover:border-cyan-400/50',
    icon: BookOpen,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando as Operações do Grupo DDM. Responda as dúvidas operacionais com base na política interna DDM: identifique a regra aplicável, explique de forma clara e direta, aponte exceções relevantes e indique quando escalar para o supervisor. Formate como FAQ para fácil consulta pelo time.',
    exampleInput: 'Acordito, o time tem várias dúvidas recorrentes. Pode responder com base na política e formatar como FAQ?',
  },
  {
    id: 'operacoes-analista-tma',
    sector: 'Operacoes',
    title: 'O Analista de TMA',
    objective: 'Analisar tempo médio de atendimento e identificar gargalos de produtividade.',
    summary: 'Analise TMA por operador e período, identifique outliers e gere recomendações para otimizar o tempo de atendimento.',
    badge: 'Cronometrista de Atendimento',
    xp: 95,
    savedMinutes: 45,
    adoption: 60,
    difficulty: 2,
    color: 'from-cyan-500/20 via-cyan-400/8 to-transparent',
    borderColor: 'hover:border-cyan-400/50',
    icon: Clock,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando as Operações do Grupo DDM. Analise o TMA dos atendimentos: calcule média por operador e por tipo de atendimento, identifique outliers (muito rápido ou muito lento), correlacione com taxa de conversão e gere recomendações de melhoria de produtividade sem comprometer a qualidade.',
    exampleInput: 'Acordito, preciso analisar o TMA da equipe. Pode identificar quem está fora do padrão e sugerir melhorias?',
  },
  {
    id: 'operacoes-assistente-discador',
    sector: 'Operacoes',
    title: 'O Assistente de Discagem',
    objective: 'Otimizar lista de discagem por melhor janela de contato e canal.',
    summary: 'Priorize lista de discagem por janela de horário, canal preferido e histórico de contato para maximizar conversão.',
    badge: 'Mestre da Discagem',
    xp: 100,
    savedMinutes: 50,
    adoption: 65,
    difficulty: 2,
    color: 'from-cyan-500/20 via-cyan-400/8 to-transparent',
    borderColor: 'hover:border-cyan-400/50',
    icon: Phone,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando as Operações do Grupo DDM. Otimize a lista de discagem: priorize contatos por melhor janela de horário histórica, canal com maior taxa de atendimento, dias de atraso e valor do débito. Entregue lista reordenada com justificativa de priorização para cada grupo.',
    exampleInput: 'Acordito, preciso otimizar a lista de discagem. Pode priorizar por melhor janela e canal de contato?',
  },
  {
    id: 'operacoes-revisor-scripts',
    sector: 'Operacoes',
    title: 'O Revisor de Scripts',
    objective: 'Atualizar scripts de atendimento com base em objeções frequentes identificadas.',
    summary: 'Revise scripts de atendimento incorporando objeções reais, tom adequado e alternativas de acordo por perfil.',
    badge: 'Otimizador de Scripts',
    xp: 90,
    savedMinutes: 40,
    adoption: 68,
    difficulty: 2,
    color: 'from-cyan-500/20 via-cyan-400/8 to-transparent',
    borderColor: 'hover:border-cyan-400/50',
    icon: PenTool,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando as Operações do Grupo DDM. Revise o script de atendimento com base nas objeções e situações reais relatadas: incorpore respostas para as objeções mais frequentes, ajuste o tom para cada perfil de devedor, adicione alternativas de proposta e melhore o encerramento para maximizar a taxa de acordo.',
    exampleInput: 'Acordito, preciso atualizar o script com as objeções que o time está recebendo. Pode revisar e melhorar?',
  },
  {
    id: 'operacoes-detector-acertos',
    sector: 'Operacoes',
    title: 'O Detector de Acertos de Risco',
    objective: 'Sinalizar acordos com risco de quebra baseado em perfil e histórico do devedor.',
    summary: 'Identifique acordos com risco de quebra por perfil financeiro e histórico para ação preventiva antes do vencimento.',
    badge: 'Analista de Risco de Acordo',
    xp: 120,
    savedMinutes: 60,
    adoption: 55,
    difficulty: 3,
    color: 'from-cyan-500/20 via-cyan-400/8 to-transparent',
    borderColor: 'hover:border-cyan-400/50',
    icon: AlertTriangle,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando as Operações do Grupo DDM. Identifique acordos com risco de quebra: analise perfil financeiro, histórico de pagamento, valor do acordo e parcelas a vencer, classifique por risco (alto/médio/baixo) e sugira ação preventiva para os acordos em risco alto antes do próximo vencimento.',
    exampleInput: 'Acordito, preciso identificar quais acordos têm risco de quebra. Pode analisar e sugerir ação preventiva?',
  },
  // Comercial
  {
    id: 'comercial-sdr-inteligente',
    sector: 'Comercial',
    title: 'O SDR Inteligente',
    objective: 'Qualificar leads e preparar abordagem comercial personalizada.',
    summary: 'Qualifique leads com score de potencial, perguntas de qualificação e abordagem personalizada para aumentar conversão.',
    badge: 'Caçador de Oportunidades',
    xp: 100,
    savedMinutes: 50,
    adoption: 69,
    difficulty: 2,
    color: 'from-amber-500/20 via-amber-400/8 to-transparent',
    borderColor: 'hover:border-amber-400/50',
    icon: UserCheck,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor Comercial do Grupo DDM. Qualifique o lead e prepare a abordagem: analise segmento, porte, dor provável e potencial; sugira perguntas de qualificação; crie abordagem personalizada; e priorize leads por chance de conversão.',
    exampleInput: 'Acordito, tenho esse lead para qualificar. Pode analisar e preparar a abordagem inicial?',
  },
  {
    id: 'comercial-gerador-de-propostas',
    sector: 'Comercial',
    title: 'O Gerador de Propostas',
    objective: 'Montar uma proposta comercial preliminar com base no briefing do cliente.',
    summary: 'Transforme briefing do cliente em proposta estruturada com problema, solução, escopo, diferenciais DDM e argumentação.',
    badge: 'Arquiteto de Propostas',
    xp: 150,
    savedMinutes: 90,
    adoption: 54,
    difficulty: 2,
    color: 'from-amber-500/20 via-amber-400/8 to-transparent',
    borderColor: 'hover:border-amber-400/50',
    icon: FileText,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor Comercial do Grupo DDM. Monte a proposta comercial preliminar: estruture problema identificado, solução DDM, escopo e benefícios; adapte ao segmento do cliente; sugira diferenciais DDM relevantes; e gere texto para apresentação em formato claro.',
    exampleInput: 'Acordito, preciso montar uma proposta para esse cliente. Pode estruturar o briefing e a argumentação?',
  },
  {
    id: 'comercial-anti-sumico',
    sector: 'Comercial',
    title: 'O Anti-Sumiço',
    objective: 'Criar follow-ups inteligentes para oportunidades paradas sem parecer insistente.',
    summary: 'Reative oportunidades paradas com sequência de follow-up consultivo, timing certo e canal adequado para cada estágio do funil.',
    badge: 'Ressuscitador de Leads',
    xp: 80,
    savedMinutes: 35,
    adoption: 78,
    difficulty: 1,
    color: 'from-amber-500/20 via-amber-400/8 to-transparent',
    borderColor: 'hover:border-amber-400/50',
    icon: Mail,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor Comercial do Grupo DDM. Crie follow-ups inteligentes para reativar oportunidades paradas: analise estágio do funil e motivo provável da pausa, crie sequência de 3 mensagens de follow-up com tom consultivo (não insistente) e sugira canal e timing para cada uma.',
    exampleInput: 'Acordito, essa oportunidade parou de responder. Pode criar uma sequência de follow-up sem parecer insistente?',
  },
  {
    id: 'comercial-analisador-concorrencia',
    sector: 'Comercial',
    title: 'O Analisador de Concorrência',
    objective: 'Mapear concorrentes e posicionar DDM com argumentação diferenciada.',
    summary: 'Mapeie concorrentes por porte e proposta, e gere argumentação de diferenciação DDM por ponto comparativo.',
    badge: 'Espião Comercial',
    xp: 110,
    savedMinutes: 60,
    adoption: 55,
    difficulty: 2,
    color: 'from-amber-500/20 via-amber-400/8 to-transparent',
    borderColor: 'hover:border-amber-400/50',
    icon: Globe,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor Comercial do Grupo DDM. Mapeie o cenário competitivo: analise concorrentes por porte, serviço oferecido e proposta de valor, identifique diferenciais DDM em cada ponto comparativo e gere argumentação comercial para cada diferencial identificado.',
    exampleInput: 'Acordito, preciso entender nossa posição frente à concorrência. Pode mapear e gerar argumentação diferenciada?',
  },
  {
    id: 'comercial-montador-apresentacao',
    sector: 'Comercial',
    title: 'O Montador de Apresentação',
    objective: 'Criar estrutura de apresentação comercial para reunião com prospect.',
    summary: 'Monte apresentação comercial com estrutura de problema, solução, cases e próximos passos para reunião com prospect.',
    badge: 'Apresentador Mestre',
    xp: 130,
    savedMinutes: 70,
    adoption: 58,
    difficulty: 2,
    color: 'from-amber-500/20 via-amber-400/8 to-transparent',
    borderColor: 'hover:border-amber-400/50',
    icon: Briefcase,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor Comercial do Grupo DDM. Monte a estrutura da apresentação comercial: organize em problema do cliente, solução DDM, diferenciais, cases de sucesso relevantes e próximos passos com CTA claro. Adapte o tom ao segmento e porte do prospect.',
    exampleInput: 'Acordito, tenho reunião com um prospect. Pode montar a estrutura da apresentação comercial com problema, solução e cases?',
  },
  {
    id: 'comercial-gestor-pipeline',
    sector: 'Comercial',
    title: 'O Gestor de Pipeline',
    objective: 'Analisar funil comercial e identificar oportunidades em risco de perda.',
    summary: 'Analise pipeline por estágio, identifique oportunidades paradas ou em risco e gere plano de ação por oportunidade.',
    badge: 'Arquiteto do Funil',
    xp: 140,
    savedMinutes: 80,
    adoption: 50,
    difficulty: 3,
    color: 'from-amber-500/20 via-amber-400/8 to-transparent',
    borderColor: 'hover:border-amber-400/50',
    icon: TrendingUp,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor Comercial do Grupo DDM. Analise o pipeline comercial: identifique oportunidades paradas há mais de 15 dias, classifique por risco de perda, calcule valor em risco por estágio e gere plano de ação específico para reativar cada oportunidade crítica.',
    exampleInput: 'Acordito, preciso analisar o pipeline. Pode identificar oportunidades em risco e sugerir plano de ação?',
  },
  {
    id: 'comercial-criador-pitch',
    sector: 'Comercial',
    title: 'O Criador de Pitch',
    objective: 'Gerar pitch personalizado por segmento e perfil do decisor.',
    summary: 'Crie pitch comercial adaptado ao segmento e dor do cliente com abertura, gancho e CTA.',
    badge: 'Pitcheiro Profissional',
    xp: 90,
    savedMinutes: 45,
    adoption: 65,
    difficulty: 1,
    color: 'from-amber-500/20 via-amber-400/8 to-transparent',
    borderColor: 'hover:border-amber-400/50',
    icon: Mic,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor Comercial do Grupo DDM. Crie pitch comercial personalizado: adapte ao segmento, porte e dor provável do cliente, construa abertura de impacto, gancho de valor DDM e CTA claro. Versões para ligação (30 segundos), e-mail (5 linhas) e reunião (2 minutos).',
    exampleInput: 'Acordito, preciso de pitch para esse perfil de cliente. Pode criar versões para ligação, e-mail e reunião?',
  },
  {
    id: 'comercial-analisador-objecoes',
    sector: 'Comercial',
    title: 'O Analisador de Objeções',
    objective: 'Responder objeções comerciais com argumentação baseada em valor DDM.',
    summary: 'Mapeie objeções recebidas, gere respostas baseadas em valor DDM e prepare o time para os próximos contatos.',
    badge: 'Destruidor de Objeções',
    xp: 80,
    savedMinutes: 35,
    adoption: 72,
    difficulty: 1,
    color: 'from-amber-500/20 via-amber-400/8 to-transparent',
    borderColor: 'hover:border-amber-400/50',
    icon: MessageSquare,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor Comercial do Grupo DDM. Trate as objeções recebidas: para cada objeção, identifique o temor real por trás, gere resposta consultiva baseada em valor DDM, sugira pergunta de avanço e indique quando a objeção é sinal de desqualificação. Entregue playbook de objeções para o time.',
    exampleInput: 'Acordito, o prospect levantou essas objeções. Pode preparar respostas e um playbook para o time?',
  },
  {
    id: 'comercial-boas-vindas-cliente',
    sector: 'Comercial',
    title: 'O Agente de Boas-vindas',
    objective: 'Redigir comunicação de onboarding ao novo cliente com primeiros passos.',
    summary: 'Crie comunicação de boas-vindas ao novo cliente com apresentação da equipe, primeiros passos e canais de contato.',
    badge: 'Embaixador do Cliente',
    xp: 60,
    savedMinutes: 25,
    adoption: 80,
    difficulty: 1,
    color: 'from-amber-500/20 via-amber-400/8 to-transparent',
    borderColor: 'hover:border-amber-400/50',
    icon: Users,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor Comercial do Grupo DDM. Redija a comunicação de boas-vindas ao novo cliente: apresente a equipe de atendimento, explique os primeiros passos da parceria, informe canais de contato, SLA de resposta e próximas entregas. Tom deve ser caloroso e profissional.',
    exampleInput: 'Acordito, fechamos com um novo cliente. Pode redigir a comunicação de boas-vindas e onboarding?',
  },
  {
    id: 'comercial-assistente-renovacao',
    sector: 'Comercial',
    title: 'O Assistente de Renovação',
    objective: 'Preparar argumentação para renovação de contrato com cliente atual.',
    summary: 'Compile histórico do cliente, calcule valor gerado e monte argumentação de renovação com proposta de continuidade.',
    badge: 'Renovador Estratégico',
    xp: 120,
    savedMinutes: 65,
    adoption: 57,
    difficulty: 2,
    color: 'from-amber-500/20 via-amber-400/8 to-transparent',
    borderColor: 'hover:border-amber-400/50',
    icon: RefreshCw,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor Comercial do Grupo DDM. Prepare a argumentação de renovação: compile resultados entregues ao cliente no período, calcule valor gerado versus investimento, identifique pontos de melhoria a apresentar, gere argumentação de continuidade e proposta de renovação com benefícios para ambas as partes.',
    exampleInput: 'Acordito, o contrato desse cliente vence em breve. Pode preparar a argumentação de renovação com histórico de resultados?',
  },
  // Marketing
  {
    id: 'marketing-mestre-do-briefing',
    sector: 'Marketing',
    title: 'O Mestre do Briefing',
    objective: 'Organizar uma demanda de marketing antes da produção com briefing completo.',
    summary: 'Transforme pedidos vagos em briefing completo com público, canal, objetivo, prazo, CTA e checklist de aprovação.',
    badge: 'Domador de Demandas',
    xp: 90,
    savedMinutes: 45,
    adoption: 75,
    difficulty: 1,
    color: 'from-pink-500/20 via-rose-400/8 to-transparent',
    borderColor: 'hover:border-pink-400/50',
    icon: ClipboardCheck,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor de Marketing do Grupo DDM. Transforme o pedido de marketing em briefing completo: defina público, canal, objetivo, prazo e formato; identifique informações faltantes; sugira CTA; e crie estrutura pronta para fluxo interno de aprovação.',
    exampleInput: 'Acordito, recebi um pedido de campanha bem vago. Pode transformar em briefing completo?',
  },
  {
    id: 'marketing-guardiao-da-marca',
    sector: 'Marketing',
    title: 'O Guardião da Marca',
    objective: 'Revisar uma campanha antes da aprovação para garantir tom, clareza e ausência de riscos.',
    summary: 'Revise textos e campanhas verificando tom, ortografia, clareza e riscos de imagem, reputação ou LGPD antes da aprovação.',
    badge: 'Fiscal da Marca',
    xp: 75,
    savedMinutes: 30,
    adoption: 80,
    difficulty: 1,
    color: 'from-pink-500/20 via-rose-400/8 to-transparent',
    borderColor: 'hover:border-pink-400/50',
    icon: PenTool,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor de Marketing do Grupo DDM. Revise o texto ou campanha antes da aprovação: verifique consistência de tom, ortografia, clareza da mensagem, risco de imagem, reputação ou LGPD, e entregue versão revisada com checklist de aprovação e pontos de atenção destacados.',
    exampleInput: 'Acordito, pode revisar esse texto antes de aprovar? Quero checar tom, clareza e possíveis riscos.',
  },
  {
    id: 'marketing-analista-de-campanhas',
    sector: 'Marketing',
    title: 'O Analista de Campanhas',
    objective: 'Interpretar resultados de marketing e transformar KPIs em ações de melhoria.',
    summary: 'Interprete KPIs de marketing, compare canais, identifique melhor origem de leads e gere relatório com plano de otimização.',
    badge: 'Estrategista de Conteúdo',
    xp: 120,
    savedMinutes: 60,
    adoption: 64,
    difficulty: 2,
    color: 'from-pink-500/20 via-rose-400/8 to-transparent',
    borderColor: 'hover:border-pink-400/50',
    icon: BarChart2,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor de Marketing do Grupo DDM. Interprete os resultados de marketing fornecidos e transforme em ações: resuma KPIs, compare canais, identifique melhor origem de leads, sugira próximos testes e gere relatório para apresentação mensal.',
    exampleInput: 'Acordito, tenho os resultados do mês. Pode interpretar os KPIs e sugerir os próximos passos?',
  },
  {
    id: 'marketing-produtor-conteudo',
    sector: 'Marketing',
    title: 'O Produtor de Conteúdo',
    objective: 'Gerar sugestões de posts e conteúdos para redes sociais por tema.',
    summary: 'Gere sugestões de posts para LinkedIn, Instagram e outros canais com texto, formato e CTA por tema solicitado.',
    badge: 'Criativo Digital',
    xp: 70,
    savedMinutes: 30,
    adoption: 76,
    difficulty: 1,
    color: 'from-pink-500/20 via-rose-400/8 to-transparent',
    borderColor: 'hover:border-pink-400/50',
    icon: Sparkles,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor de Marketing do Grupo DDM. Gere sugestões de conteúdo para o tema solicitado: crie 3 opções de post por canal (LinkedIn, Instagram), com texto adaptado ao tom de cada plataforma, hashtags relevantes e CTA claro. Inclua sugestão de formato (carrossel, vídeo curto, imagem estática).',
    exampleInput: 'Acordito, preciso de sugestões de posts sobre esse tema. Pode criar versões para LinkedIn e Instagram com CTA?',
  },
  {
    id: 'marketing-gestor-calendario',
    sector: 'Marketing',
    title: 'O Gestor de Calendário',
    objective: 'Montar calendário editorial mensal alinhado ao planejamento comercial.',
    summary: 'Monte calendário editorial com temas, datas, canais e responsáveis alinhado às campanhas e sazonalidade do mês.',
    badge: 'Planejador de Conteúdo',
    xp: 90,
    savedMinutes: 45,
    adoption: 70,
    difficulty: 2,
    color: 'from-pink-500/20 via-rose-400/8 to-transparent',
    borderColor: 'hover:border-pink-400/50',
    icon: Calendar,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor de Marketing do Grupo DDM. Monte o calendário editorial do mês: distribua temas por semana alinhando a datas comemorativas e campanhas ativas, defina canal e formato por publicação, atribua responsável e gere visão mensal formatada para aprovação.',
    exampleInput: 'Acordito, preciso montar o calendário editorial do mês. Pode distribuir temas, canais e responsáveis?',
  },
  {
    id: 'marketing-gerador-email',
    sector: 'Marketing',
    title: 'O Gerador de E-mail Marketing',
    objective: 'Criar e-mail marketing segmentado para campanha com CTA e estrutura eficiente.',
    summary: 'Redija e-mail de campanha com assunto, corpo e CTA adaptados ao segmento e objetivo da comunicação.',
    badge: 'Copywriter Digital',
    xp: 80,
    savedMinutes: 35,
    adoption: 73,
    difficulty: 1,
    color: 'from-pink-500/20 via-rose-400/8 to-transparent',
    borderColor: 'hover:border-pink-400/50',
    icon: Mail,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor de Marketing do Grupo DDM. Redija o e-mail de campanha: crie 3 opções de assunto com alto potencial de abertura, escreva o corpo com hierarquia clara (problema, solução, prova, CTA), adapte o tom ao segmento e inclua texto do botão de CTA e pré-header.',
    exampleInput: 'Acordito, preciso de um e-mail marketing para essa campanha. Pode criar com assunto, corpo e CTA por segmento?',
  },
  {
    id: 'marketing-espia-concorrencia',
    sector: 'Marketing',
    title: 'O Espião da Concorrência',
    objective: 'Mapear presença digital e estratégia de conteúdo dos concorrentes.',
    summary: 'Analise presença digital dos concorrentes, identifique gaps e oportunidades e sugira diferenciação de conteúdo.',
    badge: 'Analista de Mercado',
    xp: 110,
    savedMinutes: 55,
    adoption: 58,
    difficulty: 2,
    color: 'from-pink-500/20 via-rose-400/8 to-transparent',
    borderColor: 'hover:border-pink-400/50',
    icon: Globe,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor de Marketing do Grupo DDM. Analise a presença digital dos concorrentes indicados: identifique canais ativos, frequência e tipo de conteúdo, temas explorados e ausentes, tom de comunicação e oportunidades de diferenciação para o DDM Lab.',
    exampleInput: 'Acordito, preciso mapear como os concorrentes comunicam digitalmente. Pode analisar e identificar oportunidades?',
  },
  {
    id: 'marketing-criador-personas',
    sector: 'Marketing',
    title: 'O Criador de Personas',
    objective: 'Estruturar personas por segmento de cliente para guiar produção de conteúdo.',
    summary: 'Crie personas de clientes DDM com perfil, dores, canais preferidos e linguagem para guiar conteúdo e campanha.',
    badge: 'Arquiteto de Audiência',
    xp: 120,
    savedMinutes: 65,
    adoption: 54,
    difficulty: 2,
    color: 'from-pink-500/20 via-rose-400/8 to-transparent',
    borderColor: 'hover:border-pink-400/50',
    icon: Users,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor de Marketing do Grupo DDM. Crie as personas de clientes DDM: para cada segmento fornecido, defina perfil demográfico, cargo, dores principais, objetivos, canais preferidos, linguagem adequada e tipo de conteúdo que mais ressoa. Entregue ficha de persona formatada para uso pelo time.',
    exampleInput: 'Acordito, preciso criar personas para guiar nosso conteúdo. Pode estruturar por segmento de cliente?',
  },
  {
    id: 'marketing-relatorio-midias',
    sector: 'Marketing',
    title: 'O Relator de Mídias',
    objective: 'Compilar desempenho de mídias sociais em relatório mensal para a liderança.',
    summary: 'Consolide métricas de redes sociais em relatório mensal com destaques, comparativo e recomendações de melhoria.',
    badge: 'Analista de Redes',
    xp: 100,
    savedMinutes: 50,
    adoption: 65,
    difficulty: 2,
    color: 'from-pink-500/20 via-rose-400/8 to-transparent',
    borderColor: 'hover:border-pink-400/50',
    icon: PieChart,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor de Marketing do Grupo DDM. Monte o relatório de mídias sociais: consolide métricas por canal (alcance, engajamento, cliques, seguidores), identifique os posts com melhor desempenho, compare com o mês anterior e gere 3 recomendações de melhoria para o próximo período.',
    exampleInput: 'Acordito, tenho os dados das mídias do mês. Pode montar o relatório com comparativo e recomendações?',
  },
  {
    id: 'marketing-assistente-seo',
    sector: 'Marketing',
    title: 'O Assistente de SEO',
    objective: 'Sugerir melhorias de SEO para conteúdo e páginas da empresa.',
    summary: 'Analise conteúdo, sugira palavras-chave, otimize meta-descrições e recomende ajustes para melhorar rankeamento.',
    badge: 'Otimizador de Busca',
    xp: 100,
    savedMinutes: 50,
    adoption: 57,
    difficulty: 2,
    color: 'from-pink-500/20 via-rose-400/8 to-transparent',
    borderColor: 'hover:border-pink-400/50',
    icon: Search,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando o setor de Marketing do Grupo DDM. Analise o conteúdo fornecido para SEO: sugira 5 palavras-chave principais e variações long-tail, otimize título e meta-descrição, identifique melhorias de estrutura (H1/H2, densidade de palavras-chave, links internos) e gere versão otimizada do texto.',
    exampleInput: 'Acordito, preciso otimizar esse conteúdo para SEO. Pode sugerir palavras-chave e melhorias de estrutura?',
  },
  // Gestão
  {
    id: 'gestao-resumidor-executivo',
    sector: 'Gestao',
    title: 'O Resumidor Executivo',
    objective: 'Criar resumo executivo de relatório longo para tomada de decisão da diretoria.',
    summary: 'Transforme relatórios longos em visão executiva com principais resultados, riscos, recomendações e pauta de reunião.',
    badge: 'Conselheiro Executivo',
    xp: 130,
    savedMinutes: 60,
    adoption: 61,
    difficulty: 2,
    color: 'from-indigo-500/20 via-indigo-400/8 to-transparent',
    borderColor: 'hover:border-indigo-400/50',
    icon: BookOpen,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando a Gestão do Grupo DDM. Transforme o relatório abaixo em visão executiva: extraia os principais resultados, destaque variações relevantes, aponte riscos, sugira possíveis decisões e gere pauta de reunião. Decisão final é da liderança — o Acordito organiza para facilitar, não substitui o julgamento humano.',
    exampleInput: 'Acordito, preciso de um resumo executivo deste relatório para a diretoria. Pode condensar em pontos de decisão?',
  },
  {
    id: 'gestao-radar-de-gargalos',
    sector: 'Gestao',
    title: 'O Radar de Gargalos',
    objective: 'Identificar onde os processos estão travando com base em indicadores entre setores.',
    summary: 'Cruze indicadores de prazo, retrabalho, volume e SLA para mapear gargalos entre setores e gerar plano de ação com responsáveis.',
    badge: 'Detector de Ineficiência',
    xp: 160,
    savedMinutes: 90,
    adoption: 50,
    difficulty: 3,
    color: 'from-indigo-500/20 via-indigo-400/8 to-transparent',
    borderColor: 'hover:border-indigo-400/50',
    icon: AlertTriangle,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando a Gestão do Grupo DDM. Analise os indicadores e dados fornecidos para identificar gargalos entre setores: cruze dados de prazo, retrabalho, volume e SLA; identifique área impactada; sugira causa provável; e recomende plano de ação com responsáveis.',
    exampleInput: 'Acordito, estou vendo atrasos entre os setores. Pode cruzar os indicadores e mapear onde está travando?',
  },
  {
    id: 'gestao-comite-de-indicadores',
    sector: 'Gestao',
    title: 'O Comitê de Indicadores',
    objective: 'Preparar apresentação mensal de metas, indicadores e resultados para reunião executiva.',
    summary: 'Organize KPIs por área, monte narrativa de resultados e prepare roteiro completo para reunião executiva de indicadores.',
    badge: 'Mestre dos KPIs',
    xp: 180,
    savedMinutes: 120,
    adoption: 44,
    difficulty: 3,
    color: 'from-indigo-500/20 via-indigo-400/8 to-transparent',
    borderColor: 'hover:border-indigo-400/50',
    icon: Trophy,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando a Gestão do Grupo DDM. Prepare a apresentação mensal de metas e indicadores: organize KPIs por área, destaque metas atingidas e não atingidas, sugira explicações para variações e monte roteiro de apresentação para reunião executiva.',
    exampleInput: 'Acordito, preciso preparar a reunião de indicadores do mês. Pode organizar os KPIs e montar o roteiro?',
  },
  {
    id: 'gestao-assistente-okr',
    sector: 'Gestao',
    title: 'O Assistente de OKR',
    objective: 'Estruturar OKRs por área com métricas claras e alinhamento estratégico.',
    summary: 'Construa OKRs por área com objetivos, resultados-chave e métricas de acompanhamento alinhados à estratégia DDM.',
    badge: 'Arquiteto de Metas',
    xp: 150,
    savedMinutes: 90,
    adoption: 46,
    difficulty: 3,
    color: 'from-indigo-500/20 via-indigo-400/8 to-transparent',
    borderColor: 'hover:border-indigo-400/50',
    icon: Target,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando a Gestão do Grupo DDM. Estruture os OKRs para as áreas indicadas: defina objetivo qualitativo inspirador, 3 resultados-chave mensuráveis com meta e prazo, iniciativas principais para atingir cada KR e indicador de acompanhamento semanal. Alinhe ao contexto estratégico DDM.',
    exampleInput: 'Acordito, preciso estruturar OKRs para o próximo trimestre. Pode montar com objetivos, KRs e iniciativas?',
  },
  {
    id: 'gestao-montador-pauta',
    sector: 'Gestao',
    title: 'O Montador de Pauta',
    objective: 'Organizar pauta de reunião gerencial com prioridades e tempo por tema.',
    summary: 'Monte pauta de reunião com temas, responsáveis, tempo estimado e objetivo por item para maximizar produtividade.',
    badge: 'Maestro de Reuniões',
    xp: 60,
    savedMinutes: 25,
    adoption: 78,
    difficulty: 1,
    color: 'from-indigo-500/20 via-indigo-400/8 to-transparent',
    borderColor: 'hover:border-indigo-400/50',
    icon: ListChecks,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando a Gestão do Grupo DDM. Monte a pauta da reunião: priorize os temas por urgência e impacto, defina responsável por tema, estime tempo de discussão para caber no horário disponível e indique o objetivo (decisão, alinhamento ou informação) para cada item. Gere pauta formatada para envio prévio.',
    exampleInput: 'Acordito, preciso montar a pauta da reunião de gestão. Pode organizar os temas com responsáveis e tempo?',
  },
  {
    id: 'gestao-analisador-pesquisa',
    sector: 'Gestao',
    title: 'O Analisador de Pesquisa',
    objective: 'Interpretar resultados de pesquisa interna de clima ou satisfação.',
    summary: 'Analise dados de pesquisa interna, extraia padrões, destaque pontos críticos e gere relatório com plano de ação.',
    badge: 'Intérprete de Dados',
    xp: 110,
    savedMinutes: 60,
    adoption: 55,
    difficulty: 2,
    color: 'from-indigo-500/20 via-indigo-400/8 to-transparent',
    borderColor: 'hover:border-indigo-400/50',
    icon: BarChart2,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando a Gestão do Grupo DDM. Analise os resultados da pesquisa interna: calcule médias por dimensão, identifique os 3 pontos mais críticos e os 3 destaques positivos, correlacione com dados de turnover ou absenteísmo se disponíveis e gere relatório com plano de ação por área.',
    exampleInput: 'Acordito, tenho os resultados da pesquisa interna. Pode analisar, identificar padrões e gerar plano de ação?',
  },
  {
    id: 'gestao-gestor-projetos',
    sector: 'Gestao',
    title: 'O Gestor de Projetos',
    objective: 'Mapear status de iniciativas e alertar riscos de prazo e entrega.',
    summary: 'Consolide status de projetos, identifique iniciativas em risco, sinalize blockers e gere resumo executivo de portfólio.',
    badge: 'PMO do Futuro',
    xp: 140,
    savedMinutes: 80,
    adoption: 50,
    difficulty: 3,
    color: 'from-indigo-500/20 via-indigo-400/8 to-transparent',
    borderColor: 'hover:border-indigo-400/50',
    icon: Layers,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando a Gestão do Grupo DDM. Consolide o portfólio de projetos: atualize status de cada iniciativa, identifique projetos em risco de prazo ou entrega, liste blockers ativos, calcule % de conclusão e gere resumo executivo para a liderança com recomendações de priorização.',
    exampleInput: 'Acordito, preciso consolidar o status dos projetos. Pode identificar riscos e gerar resumo executivo?',
  },
  {
    id: 'gestao-comunicador-interno',
    sector: 'Gestao',
    title: 'O Comunicador Interno',
    objective: 'Redigir comunicados internos de mudança com clareza e sem ruído.',
    summary: 'Redija comunicados internos de mudança de processo, política ou estrutura com linguagem clara e objetiva.',
    badge: 'Porta-voz Digital',
    xp: 70,
    savedMinutes: 30,
    adoption: 72,
    difficulty: 1,
    color: 'from-indigo-500/20 via-indigo-400/8 to-transparent',
    borderColor: 'hover:border-indigo-400/50',
    icon: Bell,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando a Gestão do Grupo DDM. Redija o comunicado interno de mudança: explique o que muda, por que muda, quando entra em vigor, quem é impactado e quais são os próximos passos para cada público. Tom deve ser direto, respeitoso e sem deixar dúvidas sobre a ação esperada.',
    exampleInput: 'Acordito, preciso comunicar uma mudança de processo para o time. Pode redigir o comunicado interno de forma clara?',
  },
  {
    id: 'gestao-monitor-custos',
    sector: 'Gestao',
    title: 'O Monitor de Custos',
    objective: 'Alertar variações de custo acima do previsto e identificar causa.',
    summary: 'Monitore custos por área, alerte variações acima do orçado e gere análise de causa para tomada de decisão.',
    badge: 'Fiscal de Orçamento',
    xp: 120,
    savedMinutes: 65,
    adoption: 53,
    difficulty: 3,
    color: 'from-indigo-500/20 via-indigo-400/8 to-transparent',
    borderColor: 'hover:border-indigo-400/50',
    icon: DollarSign,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando a Gestão do Grupo DDM. Monitore os custos do período: identifique variações acima de 5% em relação ao orçado por área, classifique por impacto financeiro, sugira causa provável e recomende ação corretiva específica para cada desvio relevante.',
    exampleInput: 'Acordito, preciso monitorar as variações de custo. Pode identificar o que está fora do orçado e sugerir ações?',
  },
  {
    id: 'gestao-assistente-pdi',
    sector: 'Gestao',
    title: 'O Assistente de PDI',
    objective: 'Estruturar plano de desenvolvimento individual com metas e cronograma.',
    summary: 'Monte PDI com lacunas de competência, ações de desenvolvimento, recursos e cronograma de acompanhamento.',
    badge: 'Mentor de Crescimento',
    xp: 100,
    savedMinutes: 55,
    adoption: 58,
    difficulty: 2,
    color: 'from-indigo-500/20 via-indigo-400/8 to-transparent',
    borderColor: 'hover:border-indigo-400/50',
    icon: Award,
    starterPrompt: 'Você é o Acordito, assistente do DDM Lab, apoiando a Gestão do Grupo DDM. Monte o PDI para o colaborador: identifique lacunas de competência em relação ao cargo e nível esperado, defina 3 a 5 ações de desenvolvimento com recursos e prazo, estabeleça marcos de acompanhamento trimestral e gere documento formatado para validação com o gestor.',
    exampleInput: 'Acordito, preciso montar o PDI para esse colaborador. Pode estruturar com lacunas, ações e cronograma?',
  },
];

interface SectorTrophy {
  id: string;
  name: string;
  criterion: string;
  requiredCount: number;
  xp: number;
  sector: MissionSector;
}

const SECTOR_COLORS: Record<MissionSector, { trophy: string; border: string; text: string }> = {
  RH: { trophy: 'text-orange-300', border: 'border-orange-500/30', text: 'text-orange-300' },
  Juridico: { trophy: 'text-sky-300', border: 'border-sky-500/30', text: 'text-sky-300' },
  Financeiro: { trophy: 'text-emerald-300', border: 'border-emerald-500/30', text: 'text-emerald-300' },
  Backoffice: { trophy: 'text-fuchsia-300', border: 'border-fuchsia-500/30', text: 'text-fuchsia-300' },
  Planejamento: { trophy: 'text-violet-300', border: 'border-violet-500/30', text: 'text-violet-300' },
  Operacoes: { trophy: 'text-cyan-300', border: 'border-cyan-500/30', text: 'text-cyan-300' },
  Comercial: { trophy: 'text-amber-300', border: 'border-amber-500/30', text: 'text-amber-300' },
  Marketing: { trophy: 'text-pink-300', border: 'border-pink-500/30', text: 'text-pink-300' },
  Gestao: { trophy: 'text-indigo-300', border: 'border-indigo-500/30', text: 'text-indigo-300' },
};

const SECTOR_TROPHIES: SectorTrophy[] = [
  // RH
  { id: 'rh-t1', name: 'Guardião da Jornada', criterion: 'Completar 2 cases de RH', requiredCount: 2, xp: 60, sector: 'RH' },
  { id: 'rh-t2', name: 'Mestre do Onboarding', criterion: 'Completar 4 cases de RH', requiredCount: 4, xp: 80, sector: 'RH' },
  { id: 'rh-t3', name: 'Analista de Clima', criterion: 'Completar 6 cases de RH', requiredCount: 6, xp: 100, sector: 'RH' },
  { id: 'rh-t4', name: 'Mentor de Desenvolvimento', criterion: 'Completar 8 cases de RH', requiredCount: 8, xp: 120, sector: 'RH' },
  { id: 'rh-t5', name: 'Referência em Gente', criterion: 'Completar 10 cases de RH', requiredCount: 10, xp: 150, sector: 'RH' },
  // Jurídico
  { id: 'jur-t1', name: 'Leitor de Cláusulas', criterion: 'Completar 2 cases jurídicos', requiredCount: 2, xp: 60, sector: 'Juridico' },
  { id: 'jur-t2', name: 'Guardião da LGPD', criterion: 'Completar 4 cases jurídicos', requiredCount: 4, xp: 80, sector: 'Juridico' },
  { id: 'jur-t3', name: 'Organizador de Riscos', criterion: 'Completar 6 cases jurídicos', requiredCount: 6, xp: 100, sector: 'Juridico' },
  { id: 'jur-t4', name: 'Curador de Documentos', criterion: 'Completar 8 cases jurídicos', requiredCount: 8, xp: 120, sector: 'Juridico' },
  { id: 'jur-t5', name: 'Sentinela Jurídica', criterion: 'Completar 10 cases jurídicos', requiredCount: 10, xp: 150, sector: 'Juridico' },
  // Financeiro
  { id: 'fin-t1', name: 'Conferente Financeiro', criterion: 'Completar 2 cases de Financeiro', requiredCount: 2, xp: 60, sector: 'Financeiro' },
  { id: 'fin-t2', name: 'Mestre da Conciliação', criterion: 'Completar 4 cases de Financeiro', requiredCount: 4, xp: 80, sector: 'Financeiro' },
  { id: 'fin-t3', name: 'Guardião dos Prazos', criterion: 'Completar 6 cases de Financeiro', requiredCount: 6, xp: 100, sector: 'Financeiro' },
  { id: 'fin-t4', name: 'Analista de Prestação', criterion: 'Completar 8 cases de Financeiro', requiredCount: 8, xp: 120, sector: 'Financeiro' },
  { id: 'fin-t5', name: 'Precisão Financeira', criterion: 'Completar 10 cases de Financeiro', requiredCount: 10, xp: 150, sector: 'Financeiro' },
  // Backoffice
  { id: 'bck-t1', name: 'Organizador Operacional', criterion: 'Completar 2 cases de Backoffice', requiredCount: 2, xp: 60, sector: 'Backoffice' },
  { id: 'bck-t2', name: 'Higienizador de Bases', criterion: 'Completar 4 cases de Backoffice', requiredCount: 4, xp: 80, sector: 'Backoffice' },
  { id: 'bck-t3', name: 'Fiscal de Pendências', criterion: 'Completar 6 cases de Backoffice', requiredCount: 6, xp: 100, sector: 'Backoffice' },
  { id: 'bck-t4', name: 'Executor de Fluxos', criterion: 'Completar 8 cases de Backoffice', requiredCount: 8, xp: 120, sector: 'Backoffice' },
  { id: 'bck-t5', name: 'Mestre do Backoffice', criterion: 'Completar 10 cases de Backoffice', requiredCount: 10, xp: 150, sector: 'Backoffice' },
  // Planejamento
  { id: 'pla-t1', name: 'Visionário Estratégico', criterion: 'Completar 2 cases de Planejamento', requiredCount: 2, xp: 60, sector: 'Planejamento' },
  { id: 'pla-t2', name: 'Arquiteto de Escalas', criterion: 'Completar 4 cases de Planejamento', requiredCount: 4, xp: 80, sector: 'Planejamento' },
  { id: 'pla-t3', name: 'Estrategista de Mailing', criterion: 'Completar 6 cases de Planejamento', requiredCount: 6, xp: 100, sector: 'Planejamento' },
  { id: 'pla-t4', name: 'Antecipador de Riscos', criterion: 'Completar 8 cases de Planejamento', requiredCount: 8, xp: 120, sector: 'Planejamento' },
  { id: 'pla-t5', name: 'Contador de Resultados', criterion: 'Completar 10 cases de Planejamento', requiredCount: 10, xp: 150, sector: 'Planejamento' },
  // Operações
  { id: 'ope-t1', name: 'Negociador Inteligente', criterion: 'Completar 2 cases de Operações', requiredCount: 2, xp: 60, sector: 'Operacoes' },
  { id: 'ope-t2', name: 'Auditor de Atendimento', criterion: 'Completar 4 cases de Operações', requiredCount: 4, xp: 80, sector: 'Operacoes' },
  { id: 'ope-t3', name: 'Mestre da Próxima Ação', criterion: 'Completar 6 cases de Operações', requiredCount: 6, xp: 100, sector: 'Operacoes' },
  { id: 'ope-t4', name: 'Redutor de Retrabalho', criterion: 'Completar 8 cases de Operações', requiredCount: 8, xp: 120, sector: 'Operacoes' },
  { id: 'ope-t5', name: 'Alta Performance Operacional', criterion: 'Completar 10 cases de Operações', requiredCount: 10, xp: 150, sector: 'Operacoes' },
  // Comercial
  { id: 'com-t1', name: 'Caçador de Oportunidades', criterion: 'Completar 2 cases de Comercial', requiredCount: 2, xp: 60, sector: 'Comercial' },
  { id: 'com-t2', name: 'Qualificador de Leads', criterion: 'Completar 4 cases de Comercial', requiredCount: 4, xp: 80, sector: 'Comercial' },
  { id: 'com-t3', name: 'Arquiteto de Propostas', criterion: 'Completar 6 cases de Comercial', requiredCount: 6, xp: 100, sector: 'Comercial' },
  { id: 'com-t4', name: 'Mestre do Follow-up', criterion: 'Completar 8 cases de Comercial', requiredCount: 8, xp: 120, sector: 'Comercial' },
  { id: 'com-t5', name: 'Especialista em Conversão', criterion: 'Completar 10 cases de Comercial', requiredCount: 10, xp: 150, sector: 'Comercial' },
  // Marketing
  { id: 'mkt-t1', name: 'Domador de Briefings', criterion: 'Completar 2 cases de Marketing', requiredCount: 2, xp: 60, sector: 'Marketing' },
  { id: 'mkt-t2', name: 'Guardião da Marca', criterion: 'Completar 4 cases de Marketing', requiredCount: 4, xp: 80, sector: 'Marketing' },
  { id: 'mkt-t3', name: 'Criador de Conteúdo', criterion: 'Completar 6 cases de Marketing', requiredCount: 6, xp: 100, sector: 'Marketing' },
  { id: 'mkt-t4', name: 'Analista de Campanhas', criterion: 'Completar 8 cases de Marketing', requiredCount: 8, xp: 120, sector: 'Marketing' },
  { id: 'mkt-t5', name: 'Estrategista de Marca', criterion: 'Completar 10 cases de Marketing', requiredCount: 10, xp: 150, sector: 'Marketing' },
  // Gestão
  { id: 'ges-t1', name: 'Conselheiro Executivo', criterion: 'Completar 2 cases de Gestão', requiredCount: 2, xp: 60, sector: 'Gestao' },
  { id: 'ges-t2', name: 'Leitor de Indicadores', criterion: 'Completar 4 cases de Gestão', requiredCount: 4, xp: 80, sector: 'Gestao' },
  { id: 'ges-t3', name: 'Detector de Gargalos', criterion: 'Completar 6 cases de Gestão', requiredCount: 6, xp: 100, sector: 'Gestao' },
  { id: 'ges-t4', name: 'Facilitador de Reuniões', criterion: 'Completar 8 cases de Gestão', requiredCount: 8, xp: 120, sector: 'Gestao' },
  { id: 'ges-t5', name: 'Líder Data-Driven', criterion: 'Completar 10 cases de Gestão', requiredCount: 10, xp: 150, sector: 'Gestao' },
];

const XP_TIERS = [
  { xp: 0, label: 'Aspirante a Prompt Engineer' },
  { xp: 300, label: 'Operador de IA' },
  { xp: 800, label: 'Especialista de Eficiência' },
  { xp: 1500, label: 'Arquiteto de Processos com IA' },
  { xp: 2500, label: 'Líder de Automação Inteligente' },
  { xp: 4000, label: 'Mestre do DDM Lab' },
];

const normalizeDepartmentToMissionSector = (department?: string): MissionSector | null => {
  const normalized = String(department || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

  if (normalized.includes('jur')) return 'Juridico';
  if (normalized.includes('mark')) return 'Marketing';
  if (normalized.includes('finan')) return 'Financeiro';
  if (normalized.includes('planej')) return 'Planejamento';
  if (normalized.includes('oper')) return 'Operacoes';
  if (normalized.includes('comercial') || normalized.includes('vend')) return 'Comercial';
  if (normalized.includes('back')) return 'Backoffice';
  if (normalized.includes('rh')) return 'RH';
  if (normalized.includes('gest')) return 'Gestao';
  return null;
};

export function Cases() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const preferredSector = normalizeDepartmentToMissionSector(profile?.department);
  const [selectedSector, setSelectedSector] = useState<MissionSector | 'Todas'>(preferredSector || 'Todas');
  const [completedMissionIds, setCompletedMissionIds] = useState<string[]>([]);
  const [totalXp, setTotalXp] = useState(0);
  const [savedMinutes, setSavedMinutes] = useState(0);
  const [badges, setBadges] = useState<string[]>([]);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [isLaunchingMission, setIsLaunchingMission] = useState(false);
  const [sectorRanking, setSectorRanking] = useState<SectorRankingEntry[]>([]);

  useEffect(() => {
    if (!user) return;
    getMissionProgressAsync(user.id)
      .then((progress) => {
        setCompletedMissionIds(progress.completedMissionIds);
        setTotalXp(progress.totalXp);
        setSavedMinutes(progress.savedMinutes);
        setBadges(progress.badges);
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    fetchGlobalSectorRanking(MISSIONS.map((m) => ({ id: m.id, sector: m.sector })))
      .then(setSectorRanking)
      .catch(() => {});
  }, []);

  const filteredMissions = useMemo(() => {
    if (selectedSector === 'Todas') return MISSIONS;
    return MISSIONS.filter((mission) => mission.sector === selectedSector);
  }, [selectedSector]);

  const currentRank = getMissionRankLabel(totalXp);
  const firstName = profile?.preferredName || profile?.displayName?.split(' ')[0] || 'Colaborador';

  const completedBySector = useMemo(() => {
    const counts: Partial<Record<MissionSector, number>> = {};
    for (const id of completedMissionIds) {
      const mission = MISSIONS.find((m) => m.id === id);
      if (mission) counts[mission.sector] = (counts[mission.sector] || 0) + 1;
    }
    return counts;
  }, [completedMissionIds]);

  const strongestSector = useMemo(() => {
    const entries = Object.entries(completedBySector) as [MissionSector, number][];
    if (!entries.length) return null;
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  }, [completedBySector]);

  const nextConquest = useMemo(() => {
    const sectors = preferredSector
      ? [preferredSector, ...(Object.keys(SECTOR_COLORS) as MissionSector[]).filter((s) => s !== preferredSector)]
      : (Object.keys(SECTOR_COLORS) as MissionSector[]);
    for (const sector of sectors) {
      const count = completedBySector[sector] || 0;
      const trophy = SECTOR_TROPHIES.find((t) => t.sector === sector && count < t.requiredCount && count > 0);
      if (trophy) return { trophy, completed: count };
    }
    const fallback = preferredSector || sectors[0];
    const fallbackCount = completedBySector[fallback] || 0;
    const fallbackTrophy = SECTOR_TROPHIES.find((t) => t.sector === fallback && fallbackCount < t.requiredCount);
    if (fallbackTrophy) return { trophy: fallbackTrophy, completed: fallbackCount };
    return null;
  }, [completedBySector, preferredSector]);

  const currentTierIdx = XP_TIERS.reduce((acc, tier, i) => (totalXp >= tier.xp ? i : acc), 0);
  const nextTier = XP_TIERS[currentTierIdx + 1];
  const progressPercent = nextTier
    ? Math.min(((totalXp - XP_TIERS[currentTierIdx].xp) / (nextTier.xp - XP_TIERS[currentTierIdx].xp)) * 100, 100)
    : 100;

  const handlePlayMission = (mission: Mission) => {
    setIsLaunchingMission(true);

    window.setTimeout(() => {
      navigate('/generator', {
        state: {
          prompt: mission.exampleInput,
          missionId: mission.id,
          missionTitle: mission.title,
          missionBadge: mission.badge,
          missionXp: mission.xp,
          missionSavedMinutes: mission.savedMinutes,
          sector: mission.sector,
          missionObjective: mission.objective,
          missionStarterPrompt: mission.starterPrompt,
          introMessage: `Olá! Você aceitou a missão **"${mission.title}"** do setor ${mission.sector}.\n\n🎯 **Objetivo:** ${mission.objective}\n\nMe envie o material necessário (texto, documento, contexto) e vou te conduzir passo a passo até você conquistar o badge **${mission.badge}**. Pode começar!`,
        },
      });
    }, 650);
  };

  const sectors = ['Todas', ...Array.from(new Set(MISSIONS.map((mission) => mission.sector)))] as Array<
    MissionSector | 'Todas'
  >;

  return (
    <div className="mx-auto max-w-7xl space-y-10 pb-20">
      <header className="grid gap-6 xl:grid-cols-[1.7fr_0.9fr]">
        <Card className="overflow-hidden border-orange-500/15 bg-[radial-gradient(circle_at_top_left,rgba(255,87,34,0.16),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))] p-8">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-5">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-orange-500/20 blur-xl" />
                  <div
                    className="relative flex h-24 w-24 items-center justify-center rounded-full"
                    style={{
                      background: `conic-gradient(#ff6b1a ${progressPercent}%, rgba(255,255,255,0.08) ${progressPercent}% 100%)`,
                    }}
                  >
                    <div className="flex h-[86px] w-[86px] items-center justify-center rounded-full bg-background p-1.5">
                      <img
                        src={profile?.avatarUrl || '/acordito.png'}
                        alt={profile?.displayName || 'Avatar'}
                        className="h-full w-full rounded-full object-cover"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h1 className="text-4xl font-black tracking-tight text-foreground">Jornada da Eficiência</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary md:text-base">
                    Escolha uma missão, avance com o Acordito e transforme IA em ganho real de produtividade no seu dia a dia.
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-surface-hover p-5 lg:min-w-[290px]">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-text-secondary"></p>
                <p className="mt-2 text-xl font-black text-foreground">{firstName}</p>
                <p className="mt-1 text-sm text-orange-300">{currentRank}</p>
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
                    <span>XP total</span>
                    <span className="text-orange-300">{totalXp}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-hover">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-500 via-orange-400 to-yellow-300 shadow-[0_0_18px_rgba(255,115,0,0.55)]"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <MetricCard label="Missões concluídas" value={String(completedMissionIds.length)} icon={Target} />
              <MetricCard label="Badges desbloqueadas" value={String(badges.length)} icon={Trophy} />
              <MetricCard label="Tempo economizado" value={`${savedMinutes}min`} icon={Briefcase} />
            </div>
          </div>
        </Card>

        <Card className="border-border bg-surface-hover/30 p-6">
          <div className="flex items-center gap-2 text-foreground">
            <Trophy size={18} className="text-orange-400" />
            <h2 className="text-lg font-bold">Ranking dos Setores</h2>
          </div>

          {sectorRanking.length > 0 ? (
            <div className="mt-6 space-y-4">
              {sectorRanking.map((item, index) => (
                <div key={item.sector} className="rounded-2xl border border-border bg-surface-hover p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-text-secondary">{index + 1}º lugar</p>
                      <p className="mt-1 text-lg font-bold text-foreground">{item.sector}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-orange-300">{item.adoption}%</p>
                      <p className="text-xs text-text-secondary">{item.completed}/{item.total} quests</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-border bg-surface-hover p-5 text-center">
              <p className="text-sm text-text-secondary">Complete quests para ver seu ranking por setor.</p>
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-orange-500/15 bg-orange-500/5 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-orange-300">Próximo salto</p>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              Conclua mais quests para evoluir de rank e fortalecer sua presença na Academia de Agentes.
            </p>
          </div>
        </Card>
      </header>

      <section className="space-y-5">
        <div className="flex flex-wrap gap-3">
          {sectors.map((sector) => (
            <button
              key={sector}
              type="button"
              onClick={() => setSelectedSector(sector)}
              className={cn(
                'rounded-full border px-4 py-2 text-sm font-semibold transition-all',
                selectedSector === sector
                  ? 'border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                  : 'border-border bg-surface text-text-secondary hover:border-primary/50 hover:text-foreground',
              )}
            >
              {sector}
            </button>
          ))}
        </div>

        {/* Minhas Conquistas */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-orange-400" />
            <h2 className="text-base font-bold text-foreground">Minhas Conquistas</h2>
            {selectedSector !== 'Todas' && (
              <span className="ml-auto text-xs text-text-secondary">
                {SECTOR_TROPHIES.filter(
                  (t) => t.sector === selectedSector && (completedBySector[selectedSector as MissionSector] || 0) >= t.requiredCount,
                ).length}
                /5 troféus desbloqueados
              </span>
            )}
          </div>

          {selectedSector !== 'Todas' ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
              {SECTOR_TROPHIES.filter((t) => t.sector === selectedSector).map((trophy) => {
                const completedCount = completedBySector[trophy.sector] || 0;
                const isUnlocked = completedCount >= trophy.requiredCount;
                const isInProgress = !isUnlocked && completedCount > 0;
                const progress = Math.min((completedCount / trophy.requiredCount) * 100, 100);
                const colors = SECTOR_COLORS[trophy.sector];
                return (
                  <div
                    key={trophy.id}
                    className={cn(
                      'rounded-2xl border p-4 transition-all',
                      isUnlocked
                        ? 'border-green-500/40 bg-green-500/5'
                        : isInProgress
                          ? cn(colors.border, 'bg-surface-hover')
                          : 'border-border bg-surface-hover/30 opacity-60',
                    )}
                  >
                    <div className="flex flex-col items-center gap-2 text-center">
                      <div
                        className={cn(
                          'flex h-11 w-11 items-center justify-center rounded-full',
                          isUnlocked ? 'bg-green-500/15' : isInProgress ? 'bg-orange-500/10' : 'bg-surface',
                        )}
                      >
                        <Trophy
                          size={22}
                          className={
                            isUnlocked ? 'text-green-400' : isInProgress ? colors.trophy : 'text-text-secondary/30'
                          }
                        />
                      </div>
                      <p
                        className={cn(
                          'text-xs font-bold leading-tight',
                          isUnlocked ? 'text-green-300' : isInProgress ? 'text-foreground' : 'text-text-secondary',
                        )}
                      >
                        {trophy.name}
                      </p>
                      <p className="text-[9px] text-text-secondary">{trophy.criterion}</p>
                      {isUnlocked ? (
                        <div className="flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5">
                          <Check size={9} className="text-green-400" />
                          <span className="text-[9px] font-bold text-green-300">Desbloqueado</span>
                        </div>
                      ) : (
                        <div className="w-full space-y-1">
                          <div className="h-1 overflow-hidden rounded-full bg-surface">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <p className="text-[9px] text-text-secondary">
                            {completedCount}/{trophy.requiredCount} missões
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
              {(Object.keys(SECTOR_COLORS) as MissionSector[]).map((sector) => {
                const count = completedBySector[sector] || 0;
                const unlockedCount = SECTOR_TROPHIES.filter((t) => t.sector === sector && count >= t.requiredCount).length;
                const colors = SECTOR_COLORS[sector];
                return (
                  <button
                    key={sector}
                    type="button"
                    onClick={() => setSelectedSector(sector)}
                    className={cn(
                      'rounded-2xl border p-3 text-center transition-all hover:-translate-y-0.5',
                      unlockedCount > 0 ? cn(colors.border, 'bg-surface-hover') : 'border-border bg-surface-hover/30',
                    )}
                  >
                    <p className={cn('truncate text-xs font-bold', unlockedCount > 0 ? colors.text : 'text-text-secondary')}>
                      {sector}
                    </p>
                    <p className={cn('mt-1 text-xl font-black', unlockedCount > 0 ? colors.text : 'text-text-secondary/40')}>
                      {unlockedCount}/5
                    </p>
                    <p className="mt-0.5 text-[9px] text-text-secondary">troféus</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.65fr_0.8fr]">
          <div className="grid gap-6 md:grid-cols-2">
            {filteredMissions.map((mission) => {
              const Icon = mission.icon;
              const completed = completedMissionIds.includes(mission.id);
              const socialProofCount = Math.max(4, Math.round(mission.adoption / 8));

              return (
                <button
                  key={mission.id}
                  type="button"
                  onClick={() => setSelectedMission(mission)}
                  className={cn(
                    'group relative flex flex-col overflow-hidden rounded-2xl border bg-surface p-0 text-left transition-all duration-300 hover:-translate-y-1.5 hover:border-[#ff6a00] hover:shadow-[0_0_30px_rgba(255,106,0,0.25)]',
                    completed ? 'border-green-500/30' : 'border-border',
                  )}
                >
                  <div
                    className={cn(
                      'absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100',
                      mission.color,
                    )}
                  />

                  <div className="relative z-10 p-6 flex flex-col flex-1">
                    <div className="absolute -right-2 -top-2 rotate-12 rounded bg-orange-600 px-3 py-1 text-[10px] font-bold text-white shadow-lg">
                      +{mission.xp} XP
                    </div>

                    {completed && (
                      <div className="absolute -left-2 -top-2 -rotate-12 flex items-center gap-1 rounded bg-green-600 px-3 py-1 text-[10px] font-bold text-white shadow-lg">
                        <Check size={10} />
                        Concluída
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-500/20 bg-orange-500/10 text-orange-300">
                          <Icon size={22} />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-text-secondary">
                            {mission.sector}
                          </p>
                          <h3 className="mt-1 text-xl font-bold text-foreground">{mission.title}</h3>
                        </div>
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-relaxed text-text-secondary">{mission.summary}</p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <span className="rounded-full border border-border bg-surface-hover px-3 py-1 text-xs font-medium text-text-secondary">
                        Badge: {mission.badge}
                      </span>
                      <span className="rounded-full border border-border bg-surface-hover px-3 py-1 text-xs font-medium text-text-secondary">
                        {mission.savedMinutes}min poupados
                      </span>
                    </div>

                    <div className="mt-4 flex items-center gap-1 text-amber-300">
                      {Array.from({ length: 3 }, (_, index) => (
                        <Star
                          key={`${mission.id}-difficulty-${index}`}
                          size={14}
                          className={index < mission.difficulty ? 'fill-current' : 'text-text-secondary'}
                        />
                      ))}
                    </div>

                    <div className="mt-6">
                      <div className="mb-2 flex items-center justify-between text-xs text-text-secondary">
                        <span>Progresso social</span>
                        <span>{mission.adoption}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-hover">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 shadow-[0_0_12px_rgba(255,115,0,0.35)]"
                          style={{ width: `${mission.adoption}%` }}
                        />
                      </div>
                      <p className="mt-2 text-[10px] uppercase tracking-[0.22em] text-text-secondary">
                        {socialProofCount} colegas já completaram esta missão
                      </p>
                    </div>

                    <div className="mt-auto pt-6 flex items-center justify-between gap-4">
                      <div className={cn('flex items-center gap-2 text-xs font-semibold', completed ? 'text-green-400' : 'text-text-secondary')}>
                        {completed ? <Check size={14} /> : <Star size={14} className="text-text-secondary" />}
                        {completed ? 'Quest concluída' : 'Quest disponível'}
                      </div>

                      <span className="inline-flex items-center gap-2 text-sm font-semibold text-orange-300">
                        Iniciar quest
                        <ChevronRight size={14} />
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="space-y-6">
            <Card className="border-border bg-surface-hover/30 p-6">
              <div className="flex items-center gap-2">
                <Trophy size={18} className="text-orange-400" />
                <h3 className="text-lg font-bold text-foreground">Seu Progresso</h3>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-text-secondary">Rank atual</p>
                  <p className="mt-2 text-2xl font-black text-foreground">{currentRank}</p>
                  {nextTier && (
                    <p className="mt-1 text-[11px] text-text-secondary">
                      Próximo: {nextTier.label} ({nextTier.xp - totalXp} XP restantes)
                    </p>
                  )}
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between text-xs text-text-secondary">
                    <span>Evolução do rank</span>
                    <span>{progressPercent.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-hover">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-500 to-yellow-400 shadow-[0_0_16px_rgba(255,115,0,0.45)]"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-border bg-surface p-3">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-secondary">XP total</p>
                    <p className="mt-1 text-xl font-black text-orange-300">{totalXp}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface p-3">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-secondary">Tempo poupado</p>
                    <p className="mt-1 text-xl font-black text-foreground">{formatSavedTime(savedMinutes)}</p>
                  </div>
                </div>

                {strongestSector && (
                  <div className="rounded-2xl border border-border bg-surface p-3">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-secondary">Setor mais forte</p>
                    <p className="mt-1 text-sm font-bold text-foreground">{strongestSector}</p>
                    <p className="text-[10px] text-text-secondary">
                      {completedBySector[strongestSector]} missões concluídas
                    </p>
                  </div>
                )}

                {nextConquest && (
                  <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-3">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-orange-300">Próxima conquista</p>
                    <p className="mt-1 text-sm font-bold text-foreground">{nextConquest.trophy.name}</p>
                    <p className="mt-1 text-[10px] text-text-secondary">
                      Faltam {nextConquest.trophy.requiredCount - nextConquest.completed} missões
                    </p>
                  </div>
                )}

                {badges.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-secondary">Badges desbloqueadas</p>
                    <div className="flex flex-wrap gap-2">
                      {badges.slice(0, 6).map((badge, index) => (
                        <span
                          key={`${badge}-${index}`}
                          className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[9px] font-bold text-orange-300"
                          title={badge}
                        >
                          {badge.split(' ')[0]}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card className="border-orange-500/15 bg-[linear-gradient(180deg,rgba(255,87,34,0.08),rgba(255,87,34,0.02))] p-6">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-orange-300" />
                <h3 className="text-lg font-bold text-foreground">Loop da Jornada</h3>
              </div>

              <div className="mt-5 space-y-4 text-sm leading-relaxed text-text-secondary">
                <p>Escolha uma quest, aceite o briefing e siga direto para o chat do Acordito com o contexto carregado.</p>
                <p>Quando a missão for concluída, sua experiência sobe, novas badges aparecem e o ganho de tempo entra no dashboard.</p>
                <p>Isso transforma os cases em prática diária, e não só em uma vitrine estática de exemplos.</p>
              </div>

              <button
                type="button"
                onClick={() => navigate('/generator')}
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-orange-300 transition-colors hover:text-orange-200"
              >
                Abrir Criar Pedido
                <ChevronRight size={16} />
              </button>
            </Card>
          </div>
        </div>
      </section>

      {selectedMission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[2rem] border border-orange-500/20 bg-background shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
            <div className="flex items-start justify-between border-b border-white/10 bg-gradient-to-r from-orange-600 to-orange-500 px-6 py-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-100/80">Briefing da Quest</p>
                <h3 className="mt-2 text-2xl font-black text-white">
                  Quest: {selectedMission.title} ({selectedMission.sector})
                </h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedMission(null);
                  setIsLaunchingMission(false);
                }}
                className="rounded-full border border-white/15 bg-black/10 p-2 text-white transition hover:bg-surface-hover"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div className="rounded-2xl border border-border bg-surface-hover/30 p-5">
                <p className="text-sm leading-relaxed text-text-secondary">
                  Acordito está com a missão <span className="font-semibold text-white">{selectedMission.title}</span>.
                  Você aceita ajudá-lo a resolver esse desafio no setor {selectedMission.sector}?
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-surface-hover/30 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-secondary">Objetivo do jogo</p>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">{selectedMission.objective}</p>
                </div>

                <div className="rounded-2xl border border-border bg-surface-hover/30 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-secondary">Recompensa</p>
                  <p className="mt-2 text-sm text-text-secondary">
                    +{selectedMission.xp} XP e medalha de {selectedMission.badge}
                  </p>
                  <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.22em] text-text-secondary">Dificuldade</p>
                  <div className="mt-2 flex items-center gap-1 text-amber-300">
                    {Array.from({ length: 3 }, (_, index) => (
                      <Star
                        key={`${selectedMission.id}-modal-difficulty-${index}`}
                        size={15}
                        className={index < selectedMission.difficulty ? 'fill-current' : 'text-text-secondary'}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-orange-500/25 bg-orange-500/5 p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-orange-300">Transição para o chat</p>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  Ao aceitar, o Acordito vai abrir o chat já com briefing contextual e pronto para começar a missão com você.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSelectedMission(null);
                    setIsLaunchingMission(false);
                  }}
                  className="rounded-xl border border-border"
                >
                  Fechar
                </Button>
                <Button onClick={() => handlePlayMission(selectedMission)} className="rounded-xl bg-orange-600 hover:bg-orange-500">
                  {isLaunchingMission ? 'Carregando contexto do setor...' : 'Aceitar missão'}
                  <Play size={14} className="ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface-hover p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-300">
          <Icon size={20} />
        </div>
        <div>
          <p className="text-2xl font-black text-foreground">{value}</p>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-secondary">{label}</p>
        </div>
      </div>
    </div>
  );
}
