import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DisclaimerProps {
  showCheckbox?: boolean;
  checked?: boolean;
  onCheckboxChange?: (checked: boolean) => void;
  variant?: 'default' | 'balanced' | 'strict';
}

export const Disclaimer = ({ 
  showCheckbox = false, 
  checked = false, 
  onCheckboxChange,
  variant = 'default'
}: DisclaimerProps) => {
  const variants = {
    default: 'bg-surface border-border text-text-secondary',
    balanced: 'bg-primary/5 border-primary/20 text-text-secondary',
    strict: 'bg-rose-500/5 border-rose-500/20 text-rose-200',
  };

  return (
    <div className={cn(
      "p-6 rounded-2xl border flex flex-col gap-4 transition-all",
      variants[variant]
    )}>
      <div className="flex gap-3 items-start">
        <AlertCircle size={20} className={cn(
          "shrink-0 mt-0.5",
          variant === 'strict' ? "text-rose-400" : "text-primary"
        )} />
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-white">Aviso de Uso Responsável</h4>
          <p className="text-xs leading-relaxed opacity-80">
            As respostas geradas por IA podem conter imprecisões. Sempre revise o conteúdo antes de utilizá-lo em comunicações oficiais ou processos críticos. Não insira dados sensíveis ou confidenciais da empresa nos prompts.
          </p>
        </div>
      </div>

      {showCheckbox && (
        <label className="flex items-center gap-3 cursor-pointer group">
          <div 
            onClick={() => onCheckboxChange?.(!checked)}
            className={cn(
              "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
              checked ? "bg-primary border-primary text-white" : "border-border group-hover:border-primary/50"
            )}
          >
            {checked && <CheckCircle2 size={14} />}
          </div>
          <span className="text-xs font-medium text-white/70 group-hover:text-white transition-colors">
            Compreendo os riscos e revisei o conteúdo gerado.
          </span>
        </label>
      )}
    </div>
  );
};
