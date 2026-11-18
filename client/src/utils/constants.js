export const CATEGORIES = ['Academic', 'Exams', 'Hostel', 'Fees', 'Transport', 'Faculty', 'Infrastructure', 'Other'];
export const STATUSES = ['Pending', 'In Progress', 'Resolved', 'Rejected'];
export const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

export const STATUS_STYLES = {
  Pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  'In Progress': 'bg-sky-50 text-sky-700 ring-sky-200',
  Resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Rejected: 'bg-rose-50 text-rose-700 ring-rose-200',
};

export const PRIORITY_STYLES = {
  Low: 'bg-slate-100 text-slate-600 ring-slate-200',
  Medium: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  High: 'bg-orange-50 text-orange-700 ring-orange-200',
  Urgent: 'bg-red-50 text-red-700 ring-red-200',
};

// Chart colours (also used for status chips so the UI stays consistent)
export const STATUS_COLORS = { Pending: '#f59e0b', 'In Progress': '#0ea5e9', Resolved: '#10b981', Rejected: '#f43f5e' };
export const CATEGORY_COLORS = {
  Academic: '#3a63a3', Exams: '#e8b82f', Hostel: '#10b981', Fees: '#8b5cf6',
  Transport: '#f97316', Faculty: '#ec4899', Infrastructure: '#14b8a6', Other: '#94a3b8',
};
export const PRIORITY_COLORS = { Low: '#94a3b8', Medium: '#6366f1', High: '#f97316', Urgent: '#ef4444' };

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

export const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return days < 30 ? `${days}d ago` : fmtDate(d);
};
