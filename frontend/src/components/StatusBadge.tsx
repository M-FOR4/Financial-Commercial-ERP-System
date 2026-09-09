import React from 'react';

// ═══════════════════════════════════════════════════════════
//  STATUS BADGE — HotelERP Design System §2.4
//  Single source of truth for every status chip in tables,
//  detail headers, and cards. Never hand-roll status spans.
// ═══════════════════════════════════════════════════════════

export type StatusTone = 'warning' | 'destructive' | 'success' | 'info' | 'neutral';

/** §2.4 tokens — light-mode 700 text / 200 border, dark-mode 400 text / 800 border. */
const TONE_CLASSES: Record<StatusTone, string> = {
  warning:
    'bg-amber-500/15 text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-800',
  destructive:
    'bg-red-500/15 text-red-700 border-red-200 dark:text-red-400 dark:border-red-800',
  success:
    'bg-emerald-500/15 text-emerald-700 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800',
  info: 'bg-sky-500/15 text-sky-700 border-sky-200 dark:text-sky-400 dark:border-sky-800',
  neutral: 'bg-muted text-muted-foreground border-border',
};

interface StatusMeta {
  label: string;
  tone: StatusTone;
}

/** Centralized Arabic localization map (keyed by lowercased status). */
const STATUS_META: Record<string, StatusMeta> = {
  // Document lifecycle
  draft: { label: 'مسودة', tone: 'warning' },
  pending: { label: 'معلقة', tone: 'warning' },
  posted: { label: 'مرحلة', tone: 'success' },
  issued: { label: 'مصدرة', tone: 'success' },
  paid: { label: 'مدفوعة', tone: 'success' },
  completed: { label: 'مكتملة', tone: 'success' },
  approved: { label: 'معتمدة', tone: 'success' },
  cancelled: { label: 'ملغاة', tone: 'destructive' },
  rejected: { label: 'مرفوضة', tone: 'destructive' },
  failed: { label: 'فاشلة', tone: 'destructive' },
  // Assets
  active: { label: 'نشط', tone: 'success' },
  inactive: { label: 'غير نشط', tone: 'neutral' },
  fullydepreciated: { label: 'مستهلكة بالكامل', tone: 'info' },
  disposed: { label: 'تم التخلص', tone: 'destructive' },
  // Stock movement types
  in: { label: 'وارد', tone: 'success' },
  out: { label: 'صادر', tone: 'destructive' },
  adjustment: { label: 'تسوية', tone: 'warning' },
  transfer: { label: 'تحويل', tone: 'info' },
  // Stock health
  lowstock: { label: 'مخزون منخفض', tone: 'warning' },
  good: { label: 'جيد', tone: 'success' },
};

export interface StatusBadgeProps {
  /** Raw status value (e.g. `Draft`, `Posted`, `Cancelled`, `Issued`, `Paid`). */
  status: string;
  /** Optional Arabic label override; defaults to the centralized map. */
  label?: string;
  /** Optional tone override for statuses outside the standard set. */
  tone?: StatusTone;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  tone,
  className = '',
}) => {
  const key = (status || '').toString().toLowerCase();
  const meta = STATUS_META[key];
  const resolvedTone: StatusTone = tone ?? meta?.tone ?? 'neutral';
  // Unknown statuses fall back to the raw value so data is never silently hidden.
  const resolvedLabel = label ?? meta?.label ?? (status || '—');

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-semibold rounded-full border whitespace-nowrap ${TONE_CLASSES[resolvedTone]} ${className}`}
    >
      <span className="h-2 w-2 rounded-full bg-current shrink-0" aria-hidden="true" />
      {resolvedLabel}
    </span>
  );
};
