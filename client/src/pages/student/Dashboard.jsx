import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ClipboardList, Clock, Loader, MessageSquareText, Sparkles } from 'lucide-react';
import api, { errMsg } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { CategoryBadge, EmptyState, ErrorBanner, PageHeader, Spinner, StatCard, StatusBadge } from '../../components/ui.jsx';
import { fmtDate } from '../../utils/constants.js';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    api.get('/complaints/stats/summary').then((r) => setData(r.data)).catch((e) => setError(errMsg(e)));
  };
  useEffect(load, []);

  return (
    <>
      <PageHeader title="Student Dashboard" subtitle={`${user.department || 'University'}${user.studentId ? ` · ${user.studentId}` : ''}`} />
      <ErrorBanner message={error} onRetry={load} />
      {!data && !error && <Spinner />}

      {data && (
        <div className="space-y-6">
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy-800 to-navy-950 p-6 text-white shadow-card sm:p-8">
            <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-gold-400/15" />
            <div className="relative flex flex-wrap items-center justify-between gap-5">
              <div className="max-w-xl">
                <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-gold-300">
                  <Sparkles className="h-3.5 w-3.5" /> AI powered
                </p>
                <h2 className="font-serif text-2xl font-bold sm:text-3xl">Facing a problem? Just tell UniHelp.</h2>
                <p className="mt-2 text-sm text-navy-200">Describe your issue in your own words. The assistant understands it, picks the right category and creates a ticket instantly.</p>
              </div>
              <Link to="/chat" className="btn-gold">
                <MessageSquareText className="h-4 w-4" /> Start a chat <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total complaints" value={data.total} icon={ClipboardList} tone="navy" />
            <StatCard label="Pending" value={data.byStatus.Pending} icon={Clock} tone="amber" />
            <StatCard label="In progress" value={data.byStatus['In Progress']} icon={Loader} tone="sky" />
            <StatCard label="Resolved" value={data.byStatus.Resolved} icon={CheckCircle2} tone="emerald" hint={data.byStatus.Rejected ? `${data.byStatus.Rejected} rejected` : undefined} />
          </section>

          <section className="card">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="font-semibold text-slate-900">Recent complaints</h3>
              <Link to="/complaints" className="text-sm font-semibold text-navy-700 hover:underline">View all</Link>
            </div>
            {data.recent.length === 0 ? (
              <EmptyState
                title="No complaints yet"
                text="When you raise a grievance through the assistant it will show up here."
                action={<Link to="/chat" className="btn-primary">Raise a complaint</Link>}
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.recent.map((c) => (
                  <li key={c._id}>
                    <Link to={`/complaints/${c._id}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 transition hover:bg-slate-50">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-900">{c.title}</p>
                        <p className="mt-0.5 flex items-center gap-3 text-xs text-slate-500">
                          <span className="font-mono">{c.ticketId}</span>
                          <CategoryBadge category={c.category} />
                          <span>{fmtDate(c.createdAt)}</span>
                        </p>
                      </div>
                      <StatusBadge status={c.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </>
  );
}
