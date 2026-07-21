import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'heavy' | 'gold' | 'dark';
  animate?: boolean;
  delay?: number;
}

export function GlassPanel({
  children,
  className = '',
  variant = 'default',
  animate = false,
  delay = 0,
}: GlassPanelProps) {
  const variantClass = {
    default: 'glass',
    heavy:   'glass-heavy',
    gold:    'glass-gold',
    dark:    'glass-dark',
  }[variant];

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
        className={`${variantClass} ${className}`}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={`${variantClass} ${className}`}>
      {children}
    </div>
  );
}
