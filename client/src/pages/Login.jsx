import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { errMsg } from '../api/client.js';
import { ErrorBanner } from '../components/ui.jsx';
import { homeFor } from '../components/ProtectedRoute.jsx';
import AuthShell from './AuthShell.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await login(form.email.trim(), form.password);
      const from = location.state?.from;
      navigate(from && user.role === 'student' && !from.startsWith('/admin') ? from : homeFor(user), { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const fill = (email, password) => setForm({ email, password });

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to raise or track your grievances.">
      <form onSubmit={submit} className="space-y-5" noValidate>
        <ErrorBanner message={error} />
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" required className="input" placeholder="you@student.edu" value={form.email} onChange={set('email')} />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" required className="input" placeholder="••••••••" value={form.password} onChange={set('password')} />
        </div>
        <button className="btn-primary w-full" disabled={busy || !form.email || !form.password}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        New student?{' '}
        <Link to="/register" className="font-semibold text-navy-700 hover:underline">Create an account</Link>
      </p>

      {import.meta.env.DEV && (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-600">
          <p className="mb-2 font-semibold text-slate-700">Demo accounts (after running the seed script)</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-ghost !px-3 !py-1.5 !text-xs" onClick={() => fill('aarav@student.edu', 'Student@123')}>Student</button>
            <button type="button" className="btn-ghost !px-3 !py-1.5 !text-xs" onClick={() => fill('admin@university.edu', 'Admin@123')}>Admin</button>
          </div>
        </div>
      )}
    </AuthShell>
  );
}
