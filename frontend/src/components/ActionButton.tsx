import React from 'react';
import { Loader2 } from 'lucide-react';

// ═══════════════════════════════════════════════════════════
//  ACTION BUTTON — Phoenix top-bar action chip
//  Module-level component (never created during render).
// ═══════════════════════════════════════════════════════════

export interface ActionButtonProps {
  onClick?: () => void;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  variant?: 'primary' | 'success' | 'outline' | 'ghost' | 'destructive';
  disabled?: boolean;
  loading?: boolean;
}

const STYLES: Record<NonNullable<ActionButtonProps['variant']>, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90 border border-primary',
  success: 'bg-emerald-600 text-white hover:bg-emerald-500 border border-emerald-500',
  outline: 'bg-muted text-foreground hover:bg-accent border border-border',
  ghost: 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent',
  destructive: 'bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/30',
};

export const ActionButton: React.FC<ActionButtonProps> = ({
  onClick, icon, label, shortcut, variant = 'outline', disabled, loading,
}) => (
  <button
    type="button" onClick={onClick} disabled={disabled || loading}
    className={`h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 ${STYLES[variant]}`}
  >
    {loading ? <Loader2 size={14} className="animate-spin" /> : icon}
    <span>{label}</span>
    {shortcut && (
      <kbd className="hidden lg:inline-block ml-1 px-1.5 py-0.5 text-[9px] font-mono bg-black/10 dark:bg-white/10 rounded">
        {shortcut}
      </kbd>
    )}
  </button>
);
