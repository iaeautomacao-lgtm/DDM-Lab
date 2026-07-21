import React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'outline';
}

export const Badge = ({ children, className, variant = 'primary', ...props }: BadgeProps) => {
  const variants = {
    primary: 'bg-primary text-white',
    secondary: 'bg-surface-hover text-white border border-border',
    outline: 'bg-transparent border border-primary text-primary',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-xs font-bold leading-none',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
