import { motion } from 'framer-motion';
import type { ReactNode, ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'glass' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  iconAfter?: ReactNode;
  children?: ReactNode;
}

const SIZE: Record<string, string> = {
  sm: 'px-3.5 py-1.5 text-xs gap-1.5',
  md: 'px-5 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2.5',
};

const VARIANT: Record<string, string> = {
  primary: 'bg-gold-500 text-charcoal-900 hover:bg-gold-400 active:scale-95 shadow-gold-glow-sm hover:shadow-gold-glow font-semibold',
  ghost:   'text-ivory-300 hover:bg-white/5 active:scale-95',
  glass:   'glass text-ivory-300 hover:border-gold-500/30 hover:text-ivory-100 active:scale-95',
  danger:  'bg-red-900/40 text-red-300 border border-red-800/40 hover:bg-red-800/50 active:scale-95',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconAfter,
  children,
  className = '',
  disabled,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      whileTap={{ scale: isDisabled ? 1 : 0.96 }}
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center rounded-xl font-medium
        transition-all duration-200 cursor-pointer select-none
        disabled:opacity-40 disabled:cursor-not-allowed
        ${SIZE[size]} ${VARIANT[variant]} ${className}
      `}
      {...(rest as object)}
    >
      {loading ? (
        <Loader2 size={size === 'sm' ? 12 : 14} className="animate-spin" />
      ) : icon}
      {children && <span>{children}</span>}
      {!loading && iconAfter}
    </motion.button>
  );
}
