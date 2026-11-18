import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Circle, Loader2, MessageSquare, Save, UserCheck } from 'lucide-react';
import api, { errMsg } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { CategoryBadge, ErrorBanner, PriorityBadge, Spinner, StatusBadge } from '../components/ui.jsx';
import { CATEGORIES, PRIORITIES, STATUSES, fmtDate, fmtDateTime } from '../utils/constants.js';

function AdminPanel({ complaint, onUpdated }) {
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({ status: complaint.status, priority: complaint.priority, category: complaint.category, assignedTo: complaint.assignedTo?._id || '', remark: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => { api.get('/admin/staff').then((r) => setStaff(r.data.staff)).catch(() => {}); }, []);

  // keep the form in sync after a save
  useEffect(() => {
    setForm({ status: complaint.status, priority: complaint.priority, category: complaint.category, assignedTo: complaint.assignedTo?._id || '', remark: '' });
  }, [complaint]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const needsRemark = ['Resolved', 'Rejected'].includes(form.status) && form.status !== complaint.status;

  const save = async (e) => {
    e.preventDefault();
    setError(''); setOk('');
    const body = {};
    if (form.status !== complaint.status) body.status = form.status;
    if (form.priority !== complaint.priority) body.priority = form.priority;
    if (form.category !== complaint.category) body.category = form.category;
    if (form.assignedTo !== (complaint.assignedTo?._id || '')) body.assignedTo = form.assignedTo || null;
    if (form.remark.trim()) body.remark = form.remark.trim();
    if (!Object.keys(body).length) { setError('Nothing to update. Change a field or add a remark.'); return; }
    if (needsRemark && !body.remark) { setError(`Add a remark explaining why this is ${form.status.toLowerCase()}.`); return; }

    setBusy(true);
    try {
      const res = await api.patch(`/admin/complaints/${complaint._id}`, body);
      onUpdated(res.data.complaint);
      setOk('Complaint updated. The student has been notified.');
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="card space-y-4 p-5">
      <h3 className="flex items-center gap-2 font-semibold text-slate-900"><UserCheck className="h-5 w-5 text-navy-600" /> Manage complaint</h3>
      <ErrorBanner message={error} />
      {ok && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{ok}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="status">Status</label>
          <select id="status" className="input" value={form.status} onChange={set('status')}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
        </div>
        <div>
          <label className="label" htmlFor="assignedTo">Assign to</label>
          <select id="assignedTo" className="input" value={form.assignedTo} onChange={set('assignedTo')}>
            <option value="">Unassigned</option>
            {staff.map((s) => <option key={s._id} value={s._id}>{s.name}{s.department ? ` · ${s.department}` : ''}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="priority">Priority</label>
          <select id="priority" className="input" value={form.priority} onChange={set('priority')}>{PRIORITIES.map((s) => <option key={s}>{s}</option>)}</select>
        </div>
        <div>
          <label className="label" htmlFor="category">Category</label>
          <select id="category" className="input" value={form.category} onChange={set('category')}>{CATEGORIES.map((s) => <option key={s}>{s}</option>)}</select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="remark">Remark to student {needsRemark && <span className="text-rose-500">(required)</span>}</label>
        <textarea id="remark" rows={3} maxLength={1000} className="input" placeholder="Explain the action taken or the reason for the decision…" value={form.remark} onChange={set('remark')} />
      </div>
      <button className="btn-primary" disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
      </button>
    </form>
  );
}

export default function ComplaintDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const [complaint, setComplaint] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    api.get(`/complaints/${id}`).then((r) => setComplaint(r.data.complaint)).catch((e) => setError(errMsg(e)));
  }, [id]);
  useEffect(load, [load]);

  const back = isAdmin ? '/admin/complaints' : '/complaints';

  return (
    <>
      <Link to={back} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to complaints
      </Link>
      <ErrorBanner message={error} onRetry={load} />
      {!complaint && !error && <Spinner />}

      {complaint && (
        <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <div className="space-y-6">
            <section className="card p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-sm font-bold text-navy-700">{complaint.ticketId}</p>
                  <h1 className="mt-1 font-serif text-2xl font-bold text-navy-900">{complaint.title}</h1>
                </div>
                <StatusBadge status={complaint.status} />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                <CategoryBadge category={complaint.category} />
                <PriorityBadge priority={complaint.priority} />
                <span className="text-xs text-slate-500">Filed {fmtDate(complaint.createdAt)} via {complaint.source}</span>
              </div>
              <p className="mt-5 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">{complaint.description}</p>

              <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Raised by</dt>
                  <dd className="mt-0.5 text-slate-800">{complaint.student?.name}{complaint.student?.studentId ? ` (${complaint.student.studentId})` : ''}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Assigned to</dt>
                  <dd className="mt-0.5 text-slate-800">{complaint.assignedTo?.name || 'Not assigned yet'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Resolved on</dt>
                  <dd className="mt-0.5 text-slate-800">{fmtDate(complaint.resolvedAt)}</dd>
                </div>
              </dl>
            </section>

            <section className="card p-6">
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-900"><MessageSquare className="h-5 w-5 text-navy-600" /> Remarks from administration</h3>
              {complaint.remarks.length === 0 ? (
                <p className="text-sm text-slate-500">No remarks yet. You will be notified when the administration responds.</p>
              ) : (
                <ul className="space-y-3">
                  {complaint.remarks.map((r, i) => (
                    <li key={i} className="rounded-xl border border-slate-200 p-3.5">
                      <p className="text-sm text-slate-800">{r.message}</p>
                      <p className="mt-1.5 text-xs text-slate-400">{r.by?.name || 'Admin'} · {fmtDateTime(r.at)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="space-y-6">
            {isAdmin && <AdminPanel complaint={complaint} onUpdated={setComplaint} />}

            <section className="card p-6">
              <h3 className="mb-4 font-semibold text-slate-900">Progress timeline</h3>
              <ol className="relative space-y-5 border-l-2 border-slate-100 pl-6">
                {complaint.statusHistory.map((h, i) => {
                  const last = i === complaint.statusHistory.length - 1;
                  return (
                    <li key={i} className="relative">
                      <span className={`absolute -left-[33px] flex h-5 w-5 items-center justify-center rounded-full bg-white ${last ? 'text-navy-700' : 'text-emerald-500'}`}>
                        {last ? <Circle className="h-4 w-4 fill-current" /> : <CheckCircle2 className="h-5 w-5" />}
                      </span>
                      <p className="text-sm font-semibold text-slate-800">{h.status}</p>
                      {h.note && <p className="text-sm text-slate-600">{h.note}</p>}
                      <p className="mt-0.5 text-xs text-slate-400">{h.changedBy?.name ? `${h.changedBy.name} · ` : ''}{fmtDateTime(h.at)}</p>
                    </li>
                  );
                })}
              </ol>
            </section>
          </div>
        </div>
      )}
    </>
  );
}
