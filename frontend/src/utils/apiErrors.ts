// ═══════════════════════════════════════
//  API ERROR HELPERS
// ═══════════════════════════════════════

export interface ApiErrorBody {
  error?: string;
  message?: string;
  title?: string;
  errors?: Record<string, unknown>;
}

/**
 * Extract a human-readable message from an axios error.
 *
 * The API returns business errors as `{ error }` (controllers) and the global
 * ExceptionMiddleware payload also carries `{ message, error }`. ASP.NET Core's
 * automatic model-validation rejections (400) arrive as a ValidationProblemDetails
 * body shaped like `{ title, errors: { Field: ["message", ...] } }`, which has
 * neither key — so that shape is decoded here too.
 */
export const getApiErrorMessage = (err: unknown, fallback: string): string => {
  const data = (err as { response?: { data?: unknown } } | undefined)?.response?.data;
  if (typeof data !== 'object' || data === null) return fallback;
  const body = data as ApiErrorBody;
  if (typeof body.error === 'string' && body.error.trim()) return body.error;
  if (typeof body.message === 'string' && body.message.trim()) return body.message;
  if (body.errors && typeof body.errors === 'object') {
    const messages = Object.values(body.errors)
      .flatMap(v => (Array.isArray(v) ? v : [v]))
      .filter((v): v is string => typeof v === 'string' && v.trim() !== '');
    if (messages.length > 0) return messages.join(' ');
  }
  if (typeof body.title === 'string' && body.title.trim()) return body.title;
  return fallback;
};