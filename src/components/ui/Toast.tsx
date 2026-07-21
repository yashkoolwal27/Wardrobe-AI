import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useWardrobeStore } from '../../store/wardrobeStore';
import type { Toast as ToastType } from '../../types';

const ICONS: Record<ToastType['type'], React.ReactNode> = {
  success: <CheckCircle size={16} className="text-emerald-400" />,
  error:   <AlertCircle size={16} className="text-red-400" />,
  warning: <AlertTriangle size={16} className="text-amber-400" />,
  info:    <Info size={16} className="text-blue-400" />,
};

const ACCENT: Record<ToastType['type'], string> = {
  success: 'border-emerald-500/30',
  error:   'border-red-500/30',
  warning: 'border-amber-500/30',
  info:    'border-blue-500/30',
};

function ToastItem({ toast }: { toast: ToastType }) {
  const removeToast = useWardrobeStore((s) => s.removeToast);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0,  scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`glass-heavy flex items-start gap-3 p-4 pr-10 min-w-[280px] max-w-[380px] relative border ${ACCENT[toast.type]}`}
    >
      <span className="mt-0.5 shrink-0">{ICONS[toast.type]}</span>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-ivory-300">{toast.title}</span>
        {toast.message && (
          <span className="text-xs text-charcoal-400 leading-relaxed">{toast.message}</span>
        )}
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className="absolute top-3 right-3 text-charcoal-400 hover:text-ivory-300 transition-colors"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

export function ToastContainer() {
  const toasts = useWardrobeStore((s) => s.toasts);

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 items-end">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </div>
  );
}
