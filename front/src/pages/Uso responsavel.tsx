import React from 'react';
import { 
  Shield, 
  Info, 
  ExternalLink, 
  FileText, 
  AlertTriangle,
  Lock,
  Eye,
  MessageSquare
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const Settings = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Uso Responsável</h1>
        <p className="text-text-secondary">Informações sobre o uso da plataforma e diretrizes de segurança.</p>
      </header>

      <div className="grid grid-cols-1 gap-8">
        {/* Responsible Use Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Shield size={20} />
            </div>
            <h2 className="text-xl font-bold">Diretrizes de Uso Responsável</h2>
          </div>
          
          <Card className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-bold flex items-center gap-2 text-emerald-500">
                  <Eye size={18} />
                  O que você DEVE fazer
                </h3>
                <ul className="space-y-2 text-sm text-text-secondary">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-1">•</span>
                    Revisar todo conteúdo gerado por IA antes de usar.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-1">•</span>
                    Validar informações técnicas, jurídicas ou estratégicas com especialistas.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-1">•</span>
                    Adaptar o tom e o conteúdo para o contexto específico do seu trabalho.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-1">•</span>
                    Usar a IA como uma ferramenta de aceleração, não como substituta da sua análise.
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="font-bold flex items-center gap-2 text-rose-500">
                  <Lock size={18} />
                  O que você NÃO DEVE fazer
                </h3>
                <ul className="space-y-2 text-sm text-text-secondary">
                  <li className="flex items-start gap-2">
                    <span className="text-rose-500 mt-1">•</span>
                    Inserir dados sensíveis de clientes ou segredos comerciais.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-500 mt-1">•</span>
                    Confiar cegamente em fatos ou dados numéricos sem checagem.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-500 mt-1">•</span>
                    Usar a ferramenta para criar conteúdos que violem as políticas da empresa.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-500 mt-1">•</span>
                    Ignorar avisos de segurança ou limitações das ferramentas de IA.
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-6 border-t border-border">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-4">
                <AlertTriangle className="text-primary shrink-0 mt-1" size={20} />
                <div className="space-y-1">
                  <p className="text-sm font-bold">Aviso Importante</p>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    A responsabilidade final pelo uso de qualquer material gerado nesta plataforma é inteiramente do colaborador. 
                    A IA pode gerar informações incorretas ou enviesadas. Sempre utilize seu julgamento profissional.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Platform Info */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface-hover flex items-center justify-center text-white">
              <Info size={20} />
            </div>
            <h2 className="text-xl font-bold">Sobre o DDM Lab</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <FileText className="text-primary" size={20} />
                <h3 className="font-bold">Versão da Plataforma</h3>
              </div>
              <p className="text-sm text-text-secondary">
                Versão 1.0.0 (Abril 2026)
              </p>
              <p className="text-xs text-text-secondary">
                Plataforma interna desenvolvida para otimizar o fluxo de trabalho com Inteligência Artificial no Grupo DDM.
              </p>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <MessageSquare className="text-primary" size={20} />
                <h3 className="font-bold">Suporte e Feedback</h3>
              </div>
              <p className="text-sm text-text-secondary">
                Encontrou algum erro ou tem uma sugestão?
              </p>
              <a
                className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
              >
                Falar com o time de Automação e IA pelo e-mail: ia@ddm.adv.br
              </a>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
};
