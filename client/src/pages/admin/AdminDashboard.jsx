import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { AlertTriangle, CheckCircle2, ClipboardList, Clock, Loader, UserX } from 'lucide-react';
import api, { errMsg } from '../../api/client.js';
import { CategoryBadge, ErrorBanner, PageHeader, PriorityBadge, Spinner, StatCard, StatusBadge } from '../../components/ui.jsx';
import { STATUS_COLORS, fmtDate } from '../../utils/constants.js';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    Promise.all([api.get('/admin/analytics'), api.get('/admin/recent')])
      .then(([a, r]) => { setStats(a.data); setRecent(r.data.items); })
      .catch((e) => setError(errMsg(e)));
  };
  useEffect(load, []);

  const t = stats?.totals;
  return (
    <>
      <PageHeader title="Administration Overview" subtitle="Live snapshot of grievances across the university." />
      <ErrorBanner message={error} onRetry={load} />
      {!stats && !error && <Spinner />}

      {stats && (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Total complaints" value={t.total} icon={ClipboardList} tone="navy" hint={`${t.students} registered students`} />
            <StatCard label="Pending" value={t.pending} icon={Clock} tone="amber" hint={`${t.unassigned} unassigned open`} />
            <StatCard label="In progress" value={t.inProgress} icon={Loader} tone="sky" />
            <StatCard label="Resolved" value={t.resolved} icon={CheckCircle2} tone="emerald" hint={`${t.resolutionRate}% resolution rate`} />
            <StatCard label="Rejected" value={t.rejected} icon={UserX} tone="rose" />
          </section>

          <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
            <section className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h3 className="font-semibold text-slate-900">Latest complaints</h3>
                <Link to="/admin/complaints" className="text-sm font-semibold text-navy-700 hover:underline">Manage all</Link>
              </div>
              <ul className="divide-y divide-slate-100">
                {recent.map((c) => (
                  <li key={c._id}>
                    <Link to={`/admin/complaints/${c._id}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 transition hover:bg-slate-50">
                      <div className="min-w-0 flex-1 basis-56">
                        <p className="truncate font-medium text-slate-900">{c.title}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
                          <span className="font-mono font-semibold text-navy-700">{c.ticketId}</span>
                          <CategoryBadge category={c.category} />
                          <span>{c.student?.name}</span>
                          <span>{fmtDate(c.createdAt)}</span>
                        </p>
                      </div>
                      <PriorityBadge priority={c.priority} />
                      <StatusBadge status={c.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <div className="space-y-6">
              <section className="card p-5">
                <h3 className="font-semibold text-slate-900">Status distribution</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={stats.byStatus} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={3}>
                        {stats.byStatus.map((s) => <Cell key={s.name} fill={STATUS_COLORS[s.name]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  {stats.byStatus.map((s) => (
                    <li key={s.name} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLORS[s.name] }} /> {s.name} <b className="ml-auto text-slate-800">{s.value}</b>
                    </li>
                  ))}
                </ul>
              </section>

              {t.unassigned > 0 && (
                <Link to="/admin/complaints?assigned=unassigned" className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 transition hover:bg-amber-100">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                  <span><b>{t.unassigned} open complaint{t.unassigned === 1 ? '' : 's'}</b> have no assignee. Review and assign them.</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
