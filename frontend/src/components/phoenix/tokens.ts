import React from 'react';

// ═══════════════════════════════════════════════════════════
//  PHOENIX DESIGN TOKENS & GRID HELPERS
//  Pure functions/constants — no React components in this file
//  (keeps react-refresh happy; components live in sibling files).
// ═══════════════════════════════════════════════════════════

// ── Standard input classes (shared across all Phoenix pages) ──

export const phoenixCellInput = (focusRing = true) =>
  `w-full h-8 px-2 bg-transparent border rounded-md text-sm text-foreground tabular-nums focus:outline-none ${focusRing ? 'focus:ring-1 focus:ring-ring' : ''} border-border focus:border-ring transition-colors`;

export const phoenixHeaderInput =
  'w-full h-9 px-3 bg-input border border-border rounded-md text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring';

export const phoenixCard = 'bg-card border border-border rounded-2xl';

// ── Grid line focus helpers (Enter hops between cells) ──

/** Focus the Nth input inside a table row (1-based: 1 = barcode, 3 = item, 5 = qty, 6 = price...). */
export const focusRowCell = (row: Element | null | undefined, cellIndex: number) => {
  const input = row?.querySelector<HTMLInputElement>(`td:nth-child(${cellIndex}) input`);
  input?.focus();
};

/** Enter-key handler: focus the Nth cell's input in the current row, or run a fallback. */
export const focusCellInRow = (
  e: React.KeyboardEvent<HTMLInputElement>,
  cellIndex: number,
  extra?: () => void,
) => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const row = (e.target as HTMLElement).closest('tr');
  const input = row?.querySelector<HTMLInputElement>(`td:nth-child(${cellIndex}) input`);
  if (input) input.focus();
  else extra?.();
};
