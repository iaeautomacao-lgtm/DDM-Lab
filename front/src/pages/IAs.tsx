import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Zap,
  ExternalLink,
  CheckCircle2,
  Info,
  Lock,
  ArrowRight,
  Cpu,
  Mic,
  Search,
  BookOpen,
  MonitorSmartphone,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

type IACategory = 'all' | 'text' | 'image' | 'audio' | 'data' | 'apresentation';

const categories: Array<{ id: IACategory; label: string; icon: string }> = [
  { id: 'all', label: 'Todas', icon: '✨' },
  { id: 'text', label: 'Texto & Pesquisa', icon: '📝' },
  { id: 'image', label: 'Imagem & Design', icon: '🎨' },
  { id: 'audio', label: 'Voz & Audio', icon: '🎙️' },
  { id: 'data', label: 'Produtividade & Dados', icon: '💡' },
  { id: 'apresentation', label: 'Apresentações', icon: '📊' },
];

const models = [
  {
    name: 'ChatGPT (OpenAI)',
    version: 'GPT-4o / gpt-5-nano',
    desc: 'Assistente integrado ao DDM Lab. Redacao, analise de documentos e geracao de prompts diretamente na plataforma.',
    whatItDoes: 'Escreve, revisa, resume e estrutura textos. Analisa documentos e extrai insights de textos longos.',
    useCase: 'E-mails, pareceres, minutas, feedbacks, respostas a clientes e revisao de materiais internos.',
    strengths: ['Integrado ao DDM Lab', 'Redacao estrategica', 'Analise de documentos', 'Versatilidade'],
    available: true,
    color: 'bg-emerald-500',
    icon: Cpu,
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg',
    link: 'https://chat.openai.com',
    categories: ['text', 'image', 'data'] as IACategory[],
  },
  {
    name: 'Gemini (Google)',
    version: 'Gemini 2.5 Flash',
    desc: 'Modelo multimodal do Google integrado ao DDM Lab. Analisa texto, imagens e PDFs com contexto longo.',
    whatItDoes: 'Processa texto, imagens e documentos simultaneamente. Excelente para analise visual e pesquisas com base em arquivos.',
    useCase: 'Revisao de contratos com imagens anexas, analise de planilhas, geracao de imagens via DDM Creator.',
    strengths: ['Integrado ao DDM Lab', 'Multimodal', 'Contexto longo', 'Geracao de imagens'],
    available: true,
    color: 'bg-blue-600',
    icon: Cpu,
    logoUrl: 'https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg',
    link: 'https://gemini.google.com',
    categories: ['text', 'image', 'data'] as IACategory[],
  },
  {
    name: 'Manus',
    version: 'Agente Autonomo',
    desc: 'Agente de IA autonomo capaz de navegar na web, executar tarefas e entregar resultados completos sem supervisao.',
    whatItDoes: 'Executa fluxos de trabalho de ponta a ponta: pesquisa, compilacao, escrita e entrega de arquivos prontos.',
    useCase: 'Pesquisas de mercado, automacao de processos burocraticos e producao de relatorios complexos.',
    strengths: ['Autonomia', 'Navegacao Web', 'Execucao de tarefas', 'Producao de arquivos'],
    available: false,
    color: 'bg-zinc-700',
    icon: Cpu,
    link: 'https://manus.im',
    categories: ['data'] as IACategory[],
  },
  {
    name: 'Perplexity',
    version: 'AI Search',
    desc: 'Motor de busca com IA que responde perguntas com fontes citadas em tempo real.',
    whatItDoes: 'Pesquisa na web e sintetiza informacoes atualizadas com referencias claras e verificaveis.',
    useCase: 'Pesquisa de jurisprudencia, benchmarks de mercado, verificacao de dados e noticias do setor.',
    strengths: ['Pesquisa em tempo real', 'Fontes citadas', 'Respostas precisas', 'Modo academico'],
    available: false,
    color: 'bg-teal-600',
    icon: Search,
    link: 'https://perplexity.ai',
    categories: ['text', 'data'] as IACategory[],
  },
  {
    name: 'Grok (xAI)',
    version: 'Grok 3',
    desc: 'IA da xAI com acesso em tempo real ao X (Twitter) e capacidade de raciocinio avancado.',
    whatItDoes: 'Responde com dados atuais, analisa tendencias de redes sociais e executa raciocinio complexo.',
    useCase: 'Monitoramento de tendencias, analise de reputacao, pesquisa de mercado e raciocinio logico.',
    strengths: ['Tempo real', 'Raciocinio avancado', 'Dados do X/Twitter', 'Contexto amplo'],
    available: false,
    color: 'bg-surface',
    icon: Cpu,
    link: 'https://grok.com',
    categories: ['text', 'data'] as IACategory[],
  },
  {
    name: 'Microsoft Copilot',
    version: 'Copilot 365',
    desc: 'IA da Microsoft integrada ao Word, Excel, PowerPoint, Teams e Outlook.',
    whatItDoes: 'Gera documentos, analisa planilhas, resume reunioes e redige e-mails diretamente no Office.',
    useCase: 'Automacao de relatorios em Excel, resumo de reunioes no Teams e criacao de apresentacoes no PowerPoint.',
    strengths: ['Integrado ao Office 365', 'Excel e Word nativos', 'Resumo de reunioes', 'E-mail automatico'],
    available: false,
    color: 'bg-blue-700',
    icon: MonitorSmartphone,
    link: 'https://copilot.microsoft.com',
    categories: ['data', 'apresentation'] as IACategory[],
  },
  {
    name: 'ElevenLabs',
    version: 'Voice AI',
    desc: 'Plataforma lider em sintese de voz com IA. Transforma texto em audio com vozes hiper-realistas.',
    whatItDoes: 'Gera narracao profissional, clona vozes e produz audio para videos, podcasts e treinamentos.',
    useCase: 'Narracoes para treinamentos internos, podcasts corporativos, comunicados em audio e videos institucionais.',
    strengths: ['Voz hiper-realista', 'Clonagem de voz', 'Multiplos idiomas', 'Integracao via API'],
    available: false,
    color: 'bg-yellow-600',
    icon: Mic,
    link: 'https://elevenlabs.io',
    categories: ['audio'] as IACategory[],
  },
  {
    name: 'NotebookLM',
    version: 'Google NotebookLM',
    desc: 'Assistente de pesquisa do Google que analisa seus proprios documentos e gera resumos, podcasts e perguntas.',
    whatItDoes: 'Indexa PDFs, slides e textos enviados pelo usuario e responde exclusivamente com base nesses materiais.',
    useCase: 'Estudo de processos, analise de contratos extensos, criacao de podcasts de treinamento e resumo de manuais.',
    strengths: ['Base em seus documentos', 'Geracao de podcast', 'Sem alucinacoes externas', 'Gratuito'],
    available: false,
    color: 'bg-orange-600',
    icon: BookOpen,
    link: 'https://notebooklm.google.com',
    categories: ['text', 'data', 'audio'] as IACategory[],
  },
];

export const IAs = () => {
  const [filter, setFilter] = useState<IACategory>('all');

  const filteredModels = useMemo(() => {
    if (filter === 'all') return models;
    return models.filter((model) => model.categories.includes(filter));
  }, [filter]);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-primary">
            <Zap size={20} />
            <span className="text-xs font-bold uppercase tracking-widest">Ecossistema de IA</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">IAs Populares</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary sm:text-base">
            Conheca as principais ferramentas de IA Generativa. 
          </p>
        </div>

        <div className="flex w-fit items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-emerald-400 sm:shrink-0">
          <CheckCircle2 size={13} />
          Ferramentas Mapeadas
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFilter(cat.id)}
            className={`flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-all ${
              filter === cat.id
                ? 'border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                : 'border-border bg-surface text-text-secondary hover:border-zinc-600 hover:text-foreground'
            }`}
          >
            <span className="text-[13px]">{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Security banner */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="flex flex-col gap-4 border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Lock size={26} />
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="text-base font-bold text-foreground">Seguranca de Dados no Acordito</h3>
            <p className="max-w-2xl text-sm leading-relaxed text-text-secondary">
              Nunca insira dados sensiveis, senhas, chaves de API ou informacoes confidenciais de clientes em IAs publicas. Use o{' '}
              <span className="font-bold text-primary">Gerador de Prompts</span> para estruturar pedidos com mais seguranca.
            </p>
          </div>
          <Button variant="outline" className="shrink-0 self-start sm:self-auto">
            Ver Politica de Uso
          </Button>
        </Card>
      </motion.div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {filteredModels.map((model, i) => 
        (
          <motion.div
            key={model.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Card className={`group flex h-full flex-col overflow-hidden border-border/50 p-0 transition-all hover:border-primary/30 ${!model.available ? 'opacity-70' : ''}`}>
              <div className="flex-1 space-y-5 p-6">
                {/* Card header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-lg', model.color)}>
                      {'logoUrl' in model && model.logoUrl ? (
                        <img src={model.logoUrl as string} alt={`Logo ${model.name}`} className="h-9 w-9 object-contain p-1" />
                      ) : (
                        <model.icon size={22} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-bold leading-tight text-foreground">{model.name}</h3>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">{model.version}</p>
                    </div>
                  </div>

                  {/* Status badge — green if available, muted red if not */}
                  {model.available ? (
                    <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                      Disponível
                    </div>
                  ) : (
                    <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-red-500/25 bg-red-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500/60" />
                      Indisponível
                    </div>
                  )}
                </div>

                <p className="max-w-sm text-sm leading-relaxed text-text-secondary">{model.desc}</p>

                {/* Info block */}
                <div className="rounded-2xl border border-border/50 bg-surface-lighter/40 p-4 space-y-3">
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">O que faz</h4>
                    <p className="mt-1.5 max-w-sm text-sm text-foreground">{model.whatItDoes}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Uso na DDM</h4>
                    <p className="mt-1.5 max-w-sm text-sm text-foreground">{model.useCase}</p>
                  </div>
                </div>

                {/* Strengths */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Principais Forcas</h4>
                  <div className="flex flex-wrap gap-2">
                    {model.strengths.map((strength) => (
                      <span
                        key={strength}
                        className="rounded-lg border border-border bg-surface-lighter px-3 py-1 text-xs font-medium text-text-secondary"
                      >
                        {strength}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card footer */}
              <div className="flex items-center justify-between border-t border-border/50 bg-surface-lighter px-5 py-3">
                <a
                  href={model.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/link flex items-center gap-1.5 text-xs font-bold text-text-secondary transition-colors hover:text-primary"
                >
                  Acessar ferramenta oficial
                  <ExternalLink size={13} className="transition-transform group-hover/link:translate-x-0.5" />
                </a>
                <Link to="/generator">
                  <Button variant="ghost" size="sm" className="group/btn">
                    Criar Prompt
                    <ArrowRight size={13} className="ml-1.5 transition-transform group-hover/btn:translate-x-1" />
                  </Button>
                </Link>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Qual escolher */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
          <Info className="text-primary" size={20} />
          Qual escolher?
        </h2>
        <Card className="border-border border-dashed bg-surface/30 p-6 sm:p-8">
          <div className="grid grid-cols-1 gap-6 text-center sm:grid-cols-2 md:grid-cols-4">
            {[
              { title: 'Texto e Pesquisa', desc: 'ChatGPT, Gemini e Perplexity para redacao, analise de documentos e pesquisa com fontes.' },
              { title: 'Imagem e Design', desc: 'Gemini (DDM Creator) integrado ao DDM Lab para geracao de imagens direto na plataforma.' },
              { title: 'Voz e Audio', desc: 'ElevenLabs e NotebookLM para narracao profissional, podcasts e treinamentos em audio.' },
              { title: 'Produtividade e Dados', desc: 'Copilot para Office 365, Manus para automacao autonoma e NotebookLM para analise de documentos proprios.' },
            ].map((item) => (
              <div key={item.title} className="space-y-1.5">
                <h4 className="font-bold text-foreground">{item.title}</h4>
                <p className="text-sm leading-relaxed text-text-secondary">{item.desc}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
};

function cn(...inputs: unknown[]) {
  return (inputs.filter(Boolean) as string[]).join(' ');
}
