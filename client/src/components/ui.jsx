import { AlertCircle, ChevronLeft, ChevronRight, Inbox, Loader2 } from 'lucide-react';
import { CATEGORY_COLORS, PRIORITY_STYLES, STATUS_STYLES } from '../utils/constants.js';

const chip = 'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset whitespace-nowrap';

export const StatusBadge = ({ status }) => (
  <span className={`${chip} ${STATUS_STYLES[status] || 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
    <span className="h-1.5 w-1.5 rounded-full bg-current" />
    {status}
  </span>
);

export const PriorityBadge = ({ priority }) => (
  <span className={`${chip} ${PRIORITY_STYLES[priority] || PRIORITY_STYLES.Medium}`}>{priority}</span>
);

export const CategoryBadge = ({ category }) => (
  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
    <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_COLORS[category] || '#94a3b8' }} />
    {category}
  </span>
);

export function StatCard({ label, value, icon: Icon, tone = 'navy', hint }) {
  const tones = {
    navy: 'bg-navy-50 text-navy-700',
    amber: 'bg-amber-50 text-amber-600',
    sky: 'bg-sky-50 text-sky-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
    violet: 'bg-violet-50 text-violet-600',
  };
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
        {Icon && <Icon className="h-6 w-6" />}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {hint && <p className="truncate text-xs text-slate-400">{hint}</p>}
      </div>
    </div>
  );
}

export const Spinner = ({ label = 'Loading…' }) => (
  <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
    <Loader2 className="h-5 w-5 animate-spin" /> {label}
  </div>
);

export const EmptyState = ({ title, text, action }) => (
  <div className="flex flex-col items-center justify-center py-14 text-center">
    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
      <Inbox className="h-7 w-7" />
    </div>
    <p className="font-semibold text-slate-700">{title}</p>
    {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const ErrorBanner = ({ message, onRetry }) =>
  message ? (
    <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="font-semibold underline">
          Retry
        </button>
      )}
    </div>
  ) : null;

export function Pagination({ page, pages, total, onChange }) {
  if (pages <= 1) return <p className="px-1 pt-3 text-xs text-slate-400">{total} result{total === 1 ? '' : 's'}</p>;
  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-xs text-slate-500">
        Page {page} of {pages} · {total} results
      </p>
      <div className="flex gap-2">
        <button className="btn-ghost !px-2.5 !py-1.5" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button className="btn-ghost !px-2.5 !py-1.5" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export const PageHeader = ({ title, subtitle, children }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 className="font-serif text-2xl font-bold text-navy-900 sm:text-3xl">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
    {children}
  </div>
);
