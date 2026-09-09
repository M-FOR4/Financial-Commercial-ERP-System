import React from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';

// ═══════════════════════════════════════════════════════════
//  CONFIRM DIALOG — HotelERP Design System §4.1 B
//  The ONLY sanctioned replacement for window.confirm().
//  State-driven: mount it, toggle with the target entity.
// ═══════════════════════════════════════════════════════════

export interface ConfirmDialogProps {
  open: boolean;
  /** Title, e.g. "تأكيد الإلغاء" */
  title?: string;
  /** Explicit warning / explanation message (supports JSX). */
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** destructive (default) | default */
  variant?: 'destructive' | 'default';
  /** Show a spinner on the confirm button while the action runs. */
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title = 'تأكيد الإلغاء',
  message,
  confirmLabel = 'تأكيد الإلغاء',
  cancelLabel = 'إلغاء',
  variant = 'destructive',
  isPending = false,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md sm:max-w-md p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Unified close button */}
        <button
          type="button"
          onClick={onCancel}
          aria-label="إغلاق"
          className="absolute left-4 top-4 p-1.5 text-muted-foreground hover:text-foreground opacity-70 hover:opacity-100 transition-all"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-4">
          {/* Destructive icon container */}
          <div className="h-10 w-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 pl-8">
            <h3 className="text-lg font-bold text-foreground">{title}</h3>
            <div className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{message}</div>
          </div>
        </div>

        {/* Action bar — bottom-left flex layout */}
        <div className="flex gap-3 justify-end mt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="px-4 py-2 text-sm font-semibold text-foreground bg-muted hover:bg-accent border border-border rounded-lg transition-colors active:scale-[0.98] disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors active:scale-[0.98] disabled:opacity-50 flex items-center gap-2 ${
              variant === 'destructive'
                ? 'bg-destructive hover:bg-destructive/90 text-primary-foreground'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground'
            }`}
          >
            {isPending && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
