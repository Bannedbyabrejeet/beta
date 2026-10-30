import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface NotificationBannerProps {
  id: string;
  variant: 'error' | 'success';
  title: string;
  message: string;
}

const STYLES = {
  error: {
    wrapper: 'bg-rose-950/40 border-rose-500/30 text-rose-300',
    icon: 'text-rose-400',
    text: 'text-rose-200',
    Icon: AlertTriangle
  },
  success: {
    wrapper: 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300',
    icon: 'text-emerald-400',
    text: 'text-emerald-200',
    Icon: CheckCircle2
  }
};

/** Banner animado de error / éxito del portal de autenticación. */
export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  id,
  variant,
  title,
  message
}) => {
  const { wrapper, icon, text, Icon } = STYLES[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      id={id}
      className={`mb-5 p-3 rounded-lg border text-xs font-mono flex items-start gap-2.5 ${wrapper}`}
    >
      <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${icon}`} />
      <div className="flex-1">
        <span className="font-bold block">{title}</span>
        <span className={text}>{message}</span>
      </div>
    </motion.div>
  );
};
