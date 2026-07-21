import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hoverable?: boolean;
}

export const Card = ({ children, className, hoverable, ...props }: CardProps) => {
  return (
    <div 
      className={cn(
        "bg-surface border border-border rounded-3xl p-8 shadow-xl shadow-black/5",
        hoverable && "hover:border-primary/30 transition-all cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
