import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { Shirt, Heart, BarChart2, Inbox } from 'lucide-react';

type EmptyVariant = 'wardrobe' | 'lookbook' | 'analytics' | 'search' | 'generic';

const PRESETS: Record<EmptyVariant, { icon: ReactNode; title: string; message: string }> = {
  wardrobe: {
    icon: <Shirt size={40} className="text-charcoal-600" />,
    title: 'Your wardrobe is empty',
    message: 'Start building your digital wardrobe by uploading your first clothing item.',
  },
  lookbook: {
    icon: <Heart size={40} className="text-charcoal-600" />,
    title: 'No saved outfits yet',
    message: 'Use the Outfit Builder to create and save your first look.',
  },
  analytics: {
    icon: <BarChart2 size={40} className="text-charcoal-600" />,
    title: 'No wear data yet',
    message: 'Log your outfits to see cost-per-wear and style analytics.',
  },
  search: {
    icon: <Inbox size={40} className="text-charcoal-600" />,
    title: 'No results found',
    message: 'Try adjusting your filters or search term.',
  },
  generic: {
    icon: <Inbox size={40} className="text-charcoal-600" />,
    title: 'Nothing here yet',
    message: 'Content will appear here once you add some data.',
  },
};

interface EmptyStateProps {
  variant?: EmptyVariant;
  title?: string;
  message?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  variant = 'generic',
  title,
  message,
  action,
  className = '',
}: EmptyStateProps) {
  const preset = PRESETS[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`flex flex-col items-center justify-center gap-4 py-20 text-center ${className}`}
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="opacity-60"
      >
        {preset.icon}
      </motion.div>
      <div className="flex flex-col gap-1.5">
        <h3 className="text-lg font-semibold text-ivory-400">{title ?? preset.title}</h3>
        <p className="text-sm text-charcoal-400 max-w-xs leading-relaxed">{message ?? preset.message}</p>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </motion.div>
  );
}
