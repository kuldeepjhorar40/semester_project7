import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquareText, Search } from 'lucide-react';
import api, { errMsg } from '../../api/client.js';
import { CategoryBadge, EmptyState, ErrorBanner, PageHeader, Pagination, Spinner, StatusBadge } from '../../components/ui.jsx';
import { CATEGORIES, STATUSES, fmtDate } from '../../utils/constants.js';
import { useDebounce } from '../../utils/useDebounce.js';

export default function MyComplaints() {
  const [filters, setFilters] = useState({ status: '', category: '', q: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const q = useDebounce(filters.q);

  useEffect(() => setPage(1), [filters.status, filters.category, q]);

  useEffect(() => {
    let alive = true;
    setError('');
    const params = { page, limit: 8 };
    if (filters.status) params.status = filters.status;
    if (filters.category) params.category = filters.category;
    if (q) params.q = q;
    api
      .get('/complaints', { params })
      .then((r) => alive && setData(r.data))
      .catch((e) => alive && setError(errMsg(e)));
    return () => { alive = false; };
  }, [page, filters.status, filters.category, q]);

  return (
    <>
      <PageHeader title="My Complaints" subtitle="Track the progress of every grievance you have raised.">
        <Link to="/chat" className="btn-primary"><MessageSquareText className="h-4 w-4" /> New complaint</Link>
      </PageHeader>

      {/* status tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {['', ...STATUSES].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setFilters((f) => ({ ...f, status: s }))}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              filters.status === s ? 'bg-navy-800 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input !pl-9" placeholder="Search by title or ticket ID" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} />
        </div>
        <select className="input !w-auto" value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))} aria-label="Filter by category">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      <ErrorBanner message={error} />
      {!data && !error && <Spinner />}

      {data && (
        <div className="card overflow-hidden">
          {data.items.length === 0 ? (
            <EmptyState title="No complaints found" text="Try changing the filters, or raise a new complaint using the assistant." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.items.map((c) => (
                <li key={c._id}>
                  <Link to={`/complaints/${c._id}`} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4 transition hover:bg-slate-50">
                    <div className="min-w-0 flex-1 basis-64">
                      <p className="truncate font-medium text-slate-900">{c.title}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span className="font-mono font-semibold text-navy-700">{c.ticketId}</span>
                        <CategoryBadge category={c.category} />
                        <span>{fmtDate(c.createdAt)}</span>
                        {c.assignedTo && <span>Assigned to {c.assignedTo.name}</span>}
                      </p>
                    </div>
                    <StatusBadge status={c.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-slate-100 px-5 pb-4">
            <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />
          </div>
        </div>
      )}
    </>
  );
}
