import type { ReactNode } from 'react';

type BadgeVariant = 'gold' | 'glass' | 'ivory' | 'green' | 'red' | 'blue';

const VARIANT: Record<BadgeVariant, string> = {
  gold:  'bg-gold-500/15 text-gold-400 border border-gold-500/25',
  glass: 'glass text-ivory-400',
  ivory: 'bg-ivory-300/10 text-ivory-400 border border-ivory-300/15',
  green: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  red:   'bg-red-500/15 text-red-400 border border-red-500/20',
  blue:  'bg-blue-500/15 text-blue-400 border border-blue-500/20',
};

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  icon?: ReactNode;
  className?: string;
}

export function Badge({ children, variant = 'glass', icon, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${VARIANT[variant]} ${className}`}>
      {icon && <span className="opacity-70">{icon}</span>}
      {children}
    </span>
  );
}
