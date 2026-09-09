// ═══════════════════════════════════════════════════════════
//  CENTRAL TOAST HELPER — HotelERP Design System §1.3
//  The ONLY sanctioned way to show notifications.
//  Never call window.alert() / window.confirm() / toast.* directly.
// ═══════════════════════════════════════════════════════════

export type ToastType = 'success' | 'error' | 'info' | 'warning';

type AddFn = (type: ToastType, message: string, duration?: number) => void;

// Bound by <ToastProvider> on mount — lets non-React code (helpers,
// api clients) raise notifications without hook availability.
let storeAdd: AddFn | null = null;

/** @internal Bound by ToastProvider; not for application use. */
export const bindToastStore = (add: AddFn | null) => {
  storeAdd = add;
};

/** Success notification — completed operations. */
export const showSuccess = (message: string, duration?: number) =>
  storeAdd?.('success', message, duration);

/** Error notification — failures. Pass the server detail as the second argument. */
export const showError = (message: string, description?: string, duration?: number) =>
  storeAdd?.('error', description ? `${message} — ${description}` : message, duration);

/** Warning notification — validation failures, blocked actions. */
export const showWarning = (message: string, duration?: number) =>
  storeAdd?.('warning', message, duration);

/** Info notification — neutral contextual messages. */
export const showInfo = (message: string, duration?: number) =>
  storeAdd?.('info', message, duration);
