import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, CheckCircle2, FilePlus2, Info, MessageSquare, UserCheck } from 'lucide-react';
import api, { errMsg } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { EmptyState, ErrorBanner, PageHeader, Spinner } from '../components/ui.jsx';
import { timeAgo } from '../utils/constants.js';

const ICONS = { created: FilePlus2, status: CheckCircle2, assigned: UserCheck, remark: MessageSquare, info: Info };

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    api.get('/notifications').then((r) => setData(r.data)).catch((e) => setError(errMsg(e)));
  }, []);
  useEffect(load, [load]);

  const open = async (n) => {
    if (!n.read) {
      setData((d) => ({ ...d, unreadCount: Math.max(0, d.unreadCount - 1), items: d.items.map((x) => (x._id === n._id ? { ...x, read: true } : x)) }));
      api.patch(`/notifications/${n._id}/read`).catch(() => {});
    }
    if (n.complaint) navigate(`${user.role === 'admin' ? '/admin' : ''}/complaints/${n.complaint}`);
  };

  const markAll = async () => {
    try {
      await api.patch('/notifications/read-all');
      setData((d) => ({ unreadCount: 0, items: d.items.map((x) => ({ ...x, read: true })) }));
    } catch (err) {
      setError(errMsg(err));
    }
  };

  return (
    <>
      <PageHeader title="Notifications" subtitle={data ? `${data.unreadCount} unread` : ''}>
        <button className="btn-ghost" onClick={markAll} disabled={!data?.unreadCount}><CheckCheck className="h-4 w-4" /> Mark all as read</button>
      </PageHeader>
      <ErrorBanner message={error} onRetry={load} />
      {!data && !error && <Spinner />}
      {data && (
        <div className="card overflow-hidden">
          {data.items.length === 0 ? (
            <EmptyState title="You're all caught up" text="Updates about your complaints will appear here." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.items.map((n) => {
                const Icon = ICONS[n.type] || Bell;
                return (
                  <li key={n._id}>
                    <button onClick={() => open(n)} className={`flex w-full items-start gap-4 px-5 py-4 text-left transition hover:bg-slate-50 ${n.read ? '' : 'bg-navy-50/50'}`}>
                      <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${n.read ? 'bg-slate-100 text-slate-500' : 'bg-navy-800 text-gold-400'}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className={`text-sm ${n.read ? 'font-medium text-slate-700' : 'font-bold text-slate-900'}`}>{n.title}</span>
                          {!n.read && <span className="h-2 w-2 rounded-full bg-rose-500" />}
                        </span>
                        <span className="mt-0.5 block text-sm text-slate-600">{n.message}</span>
                        <span className="mt-1 block text-xs text-slate-400">{timeAgo(n.createdAt)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
