import React from 'react';
import { cn } from '../../lib/utils';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className, showText = true }) => {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="w-28 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/85 p-2 shadow-lg shadow-primary/10">
        <img
          src="/logo-ddm.webp"
          alt="DDM Lab"
          className="block h-auto w-full object-contain"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
};
