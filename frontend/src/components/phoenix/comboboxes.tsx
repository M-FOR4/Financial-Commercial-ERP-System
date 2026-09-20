import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import { phoenixCellInput } from './tokens';

// ═══════════════════════════════════════════════════════════
//  SHARED PHOENIX COMBOBOXES
//  Component-only module (react-refresh compliant).
// ═══════════════════════════════════════════════════════════

// ── Generic search combobox used by product & account pickers ──

interface SimpleComboboxProps<T> {
  items: T[];
  /** Return the searchable haystack for one item (name / code / sku). */
  searchText: (item: T) => string;
  /** Primary label (bold line). */
  primary: (item: T) => React.ReactNode;
  /** Secondary label (small line under the primary). */
  secondary?: (item: T) => React.ReactNode;
  /** Trailing value (e.g. price / balance), right-aligned. */
  trailing?: (item: T) => React.ReactNode;
  onSelect: (item: T) => void;
  /** Enter on an empty query → default action (e.g. hop to next cell / add line). */
  onEmptyEnter?: () => void;
  autoFocus?: boolean;
  className?: string;
  placeholder?: string;
}

export function SimpleCombobox<T>(props: SimpleComboboxProps<T>) {
  const {
    items, searchText, primary, secondary, trailing,
    onSelect, onEmptyEnter, autoFocus, className, placeholder,
  } = props;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 8);
    return items.filter(i => searchText(i).toLowerCase().includes(q)).slice(0, 8);
  }, [items, query, searchText]);

  // Reset highlight when the query changes (render-time adjustment)
  const [prevQuery, setPrevQuery] = useState(query);
  if (prevQuery !== query) {
    setPrevQuery(query);
    setHighlight(0);
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const pick = (item: T) => {
    onSelect(item);
    setQuery(''); setOpen(false);
  };

  return (
    <div ref={rootRef} className={`relative ${className ?? ''}`}>
      <Search size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <input
        autoFocus={autoFocus}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHighlight(h => Math.min(h + 1, results.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
          else if (e.key === 'Enter') {
            e.preventDefault();
            if (results.length > 0) pick(results[highlight]);
            else if (query.trim() === '') onEmptyEnter?.();
          }
          else if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
        }}
        placeholder={placeholder ?? 'ابحث...'}
        className={`${phoenixCellInput()} pr-7 text-right placeholder:text-muted-foreground/60`}
      />
      {open && results.length > 0 && (
        <div className="absolute z-30 top-full mt-1 w-[320px] max-w-[80vw] bg-popover border border-border rounded-xl shadow-2xl overflow-hidden">
          {results.map((item, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); pick(item); }}
              onMouseEnter={() => setHighlight(i)}
              className={`w-full text-right px-3 py-2 flex items-center justify-between gap-3 transition-colors ${i === highlight ? 'bg-accent' : 'hover:bg-accent/60'}`}
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground truncate">{primary(item)}</span>
                {secondary && <span className="block text-[10px] text-muted-foreground">{secondary(item)}</span>}
              </span>
              {trailing && <span className="text-left shrink-0">{trailing(item)}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Selected-entity chip (re-opens the picker when clicked) ──

interface SelectedChipProps {
  title: string;
  onClick: () => void;
}

export const SelectedChip: React.FC<SelectedChipProps> = ({ title, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full text-right h-8 px-2 border border-border rounded-md bg-muted/30 hover:bg-accent transition-colors flex items-center justify-between gap-2"
    title="اضغط لتغيير التحديد"
  >
    <span className="text-sm font-semibold text-foreground truncate">{title}</span>
    <span className="text-[10px] text-muted-foreground shrink-0">تغيير ✕</span>
  </button>
);
