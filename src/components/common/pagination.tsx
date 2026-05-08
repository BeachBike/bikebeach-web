import { useEffect, useMemo, useState } from 'react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /// Optional: total item count, used for the "X – Y de Z" caption.
  totalItems?: number;
  pageSize?: number;
}

/// Numbered pagination control: « 1 … 4 5 6 … 12 ». Renders nothing when
/// totalPages <= 1. Pair with `usePagination` for state + slicing.
export function Pagination({
  page,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const window = buildWindow(page, totalPages);

  return (
    <nav
      className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm"
      aria-label="Paginação"
    >
      {totalItems !== undefined && pageSize !== undefined && (
        <span className="text-xs text-ink-2">
          {Math.min((page - 1) * pageSize + 1, totalItems)}–
          {Math.min(page * pageSize, totalItems)} de {totalItems}
        </span>
      )}
      <div className="ml-auto flex items-center gap-1">
        <PageBtn
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          aria-label="Página anterior"
        >
          ←
        </PageBtn>
        {window.map((entry, i) =>
          entry === 'ellipsis' ? (
            <span
              key={`gap-${i}`}
              className="px-2 text-ink-3"
              aria-hidden
            >
              …
            </span>
          ) : (
            <PageBtn
              key={entry}
              active={entry === page}
              onClick={() => onPageChange(entry)}
              aria-label={`Página ${entry}`}
              aria-current={entry === page ? 'page' : undefined}
            >
              {entry}
            </PageBtn>
          ),
        )}
        <PageBtn
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          aria-label="Próxima página"
        >
          →
        </PageBtn>
      </div>
    </nav>
  );
}

interface PageBtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

function PageBtn({
  active,
  className = '',
  children,
  ...rest
}: PageBtnProps) {
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex h-9 min-w-9 items-center justify-center rounded-full px-2.5 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? 'bg-ink text-cream'
          : 'bg-cream-2 text-ink hover:bg-sand/60'
      } ${className}`}
    >
      {children}
    </button>
  );
}

/// Build the page-number window:
/// always show first + last + neighbours of `page`. Insert 'ellipsis' marker
/// where there's a gap. Examples (totalPages = 12):
///   page 1  → [1,2,3,e,12]
///   page 5  → [1,e,4,5,6,e,12]
///   page 12 → [1,e,10,11,12]
function buildWindow(page: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const out: (number | 'ellipsis')[] = [];
  const left = Math.max(2, page - 1);
  const right = Math.min(totalPages - 1, page + 1);

  out.push(1);
  if (left > 2) out.push('ellipsis');
  for (let i = left; i <= right; i++) out.push(i);
  if (right < totalPages - 1) out.push('ellipsis');
  out.push(totalPages);
  return out;
}

// ---------------------------------------------------------------------------
// usePagination — slices an array and tracks current page
// ---------------------------------------------------------------------------

export interface UsePaginationResult<T> {
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
  totalItems: number;
  pageItems: T[];
  pageSize: number;
}

/// Default page size = 6 per the cross-cutting rule (`tasks/lessons.md`).
/// Override per call: `usePagination(items, 5)` for payments etc.
///
/// Resets to page 1 whenever `items.length` shrinks below the current page.
export function usePagination<T>(
  items: T[],
  pageSize = 6,
): UsePaginationResult<T> {
  const [page, setPage] = useState(1);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Clamp page when items shrink (e.g. after a filter change).
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return { page, setPage, totalPages, totalItems, pageItems, pageSize };
}
