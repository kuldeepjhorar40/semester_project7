import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import api, { errMsg } from '../../api/client.js';
import { CategoryBadge, EmptyState, ErrorBanner, PageHeader, Pagination, PriorityBadge, Spinner, StatusBadge } from '../../components/ui.jsx';
import { CATEGORIES, PRIORITIES, STATUSES, fmtDate } from '../../utils/constants.js';
import { useDebounce } from '../../utils/useDebounce.js';

export default function ManageComplaints() {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    q: '', status: '', category: '', priority: '',
    assignedTo: searchParams.get('assigned') === 'unassigned' ? 'unassigned' : '',
  });
  const [staff, setStaff] = useState([]);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const q = useDebounce(filters.q);

  useEffect(() => { api.get('/admin/staff').then((r) => setStaff(r.data.staff)).catch(() => {}); }, []);
  useEffect(() => setPage(1), [q, filters.status, filters.category, filters.priority, filters.assignedTo]);

  useEffect(() => {
    let alive = true;
    setError('');
    const params = { page, limit: 10 };
    ['status', 'category', 'priority', 'assignedTo'].forEach((k) => { if (filters[k]) params[k] = filters[k]; });
    if (q) params.q = q;
    api.get('/admin/complaints', { params }).then((r) => alive && setData(r.data)).catch((e) => alive && setError(errMsg(e)));
    return () => { alive = false; };
  }, [page, q, filters.status, filters.category, filters.priority, filters.assignedTo]);

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <>
      <PageHeader title="Manage Complaints" subtitle="Search, filter, assign and resolve student grievances." />

      <div className="card mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input !pl-9" placeholder="Search ticket ID or title" value={filters.q} onChange={set('q')} />
        </div>
        <select className="input" value={filters.status} onChange={set('status')} aria-label="Status"><option value="">All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
        <select className="input" value={filters.category} onChange={set('category')} aria-label="Category"><option value="">All categories</option>{CATEGORIES.map((s) => <option key={s}>{s}</option>)}</select>
        <select className="input" value={filters.priority} onChange={set('priority')} aria-label="Priority"><option value="">All priorities</option>{PRIORITIES.map((s) => <option key={s}>{s}</option>)}</select>
        <select className="input" value={filters.assignedTo} onChange={set('assignedTo')} aria-label="Assignee">
          <option value="">Any assignee</option>
          <option value="unassigned">Unassigned</option>
          {staff.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        {hasFilters && (
          <button className="btn-ghost lg:col-span-6 lg:justify-self-start" onClick={() => setFilters({ q: '', status: '', category: '', priority: '', assignedTo: '' })}>
            <X className="h-4 w-4" /> Clear filters
          </button>
        )}
      </div>

      <ErrorBanner message={error} />
      {!data && !error && <Spinner />}

      {data && (
        <div className="card overflow-hidden">
          {data.items.length === 0 ? (
            <EmptyState title="No complaints match these filters" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Ticket</th>
                    <th className="px-3 py-3 font-semibold">Complaint</th>
                    <th className="px-3 py-3 font-semibold">Student</th>
                    <th className="px-3 py-3 font-semibold">Priority</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold">Assigned</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((c) => (
                    <tr key={c._id} className="transition hover:bg-slate-50">
                      <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs font-bold text-navy-700">{c.ticketId}<div className="mt-0.5 font-sans font-normal text-slate-400">{fmtDate(c.createdAt)}</div></td>
                      <td className="max-w-[280px] px-3 py-3.5"><p className="truncate font-medium text-slate-900">{c.title}</p><CategoryBadge category={c.category} /></td>
                      <td className="whitespace-nowrap px-3 py-3.5 text-slate-700">{c.student?.name}</td>
                      <td className="px-3 py-3.5"><PriorityBadge priority={c.priority} /></td>
                      <td className="px-3 py-3.5"><StatusBadge status={c.status} /></td>
                      <td className="whitespace-nowrap px-3 py-3.5 text-slate-600">{c.assignedTo?.name || <span className="text-slate-400">Unassigned</span>}</td>
                      <td className="px-5 py-3.5 text-right"><Link to={`/admin/complaints/${c._id}`} className="btn-ghost !px-3 !py-1.5 !text-xs">Manage</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="border-t border-slate-100 px-5 pb-4"><Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} /></div>
        </div>
      )}
    </>
  );
}
