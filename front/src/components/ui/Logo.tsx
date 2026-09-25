import React from 'react';
import { cn } from '../../lib/utils';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className, showText = true }) => {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      {/* O arquivo tem o simbolo laranja "DM" encostado na borda direita —
          recorta so essa parte via object-fit, sem filter/invert no wordmark
          (que fica como texto, ver abaixo). */}
      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg">
        <img src="/logo-ddm.webp" alt="" className="h-full w-full object-cover object-right" referrerPolicy="no-referrer" />
      </div>
      {showText && (
        <span className="text-sm font-bold uppercase tracking-[0.14em] text-foreground">
          Grupo <span className="text-primary">DDM</span>
        </span>
      )}
    </div>
  );
};
