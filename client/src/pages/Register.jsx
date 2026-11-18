import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { errMsg } from '../api/client.js';
import { ErrorBanner } from '../components/ui.jsx';
import AuthShell from './AuthShell.jsx';

const DEPARTMENTS = ['Computer Science', 'Electronics', 'Mechanical', 'Civil Engineering', 'Biotechnology', 'Management', 'Arts & Humanities', 'Other'];

function validate(f) {
  const errors = {};
  if (f.name.trim().length < 2) errors.name = 'Enter your full name';
  if (!/^\S+@\S+\.\S+$/.test(f.email)) errors.email = 'Enter a valid email address';
  if (f.password.length < 8 || !/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) errors.password = 'At least 8 characters with a letter and a number';
  if (f.confirm !== f.password) errors.confirm = 'Passwords do not match';
  if (f.phone && !/^[+\d][\d\s-]{6,18}$/.test(f.phone)) errors.phone = 'Enter a valid phone number';
  return errors;
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', studentId: '', department: '', phone: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const v = validate(form);
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      const { confirm, ...payload } = form;
      await register(payload);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const Field = ({ id, label, type = 'text', placeholder, autoComplete }) => (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <input id={id} type={type} autoComplete={autoComplete} className={`input ${errors[id] ? '!border-rose-400' : ''}`} placeholder={placeholder} value={form[id]} onChange={set(id)} />
      {errors[id] && <p className="mt-1 text-xs text-rose-600">{errors[id]}</p>}
    </div>
  );

  return (
    <AuthShell title="Create your account" subtitle="Register with your university details to start raising grievances.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <ErrorBanner message={error} />
        {Field({ id: 'name', label: 'Full name', placeholder: 'Aarav Sharma', autoComplete: 'name' })}
        {Field({ id: 'email', label: 'University email', type: 'email', placeholder: 'you@student.edu', autoComplete: 'email' })}
        <div className="grid gap-4 sm:grid-cols-2">
          {Field({ id: 'studentId', label: 'Student ID (optional)', placeholder: 'CS2021001' })}
          {Field({ id: 'phone', label: 'Phone (optional)', placeholder: '9876543210', autoComplete: 'tel' })}
        </div>
        <div>
          <label className="label" htmlFor="department">Department (optional)</label>
          <select id="department" className="input" value={form.department} onChange={set('department')}>
            <option value="">Select department</option>
            {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {Field({ id: 'password', label: 'Password', type: 'password', placeholder: 'Min 8 chars', autoComplete: 'new-password' })}
          {Field({ id: 'confirm', label: 'Confirm password', type: 'password', placeholder: 'Repeat password', autoComplete: 'new-password' })}
        </div>
        <button className="btn-primary w-full" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Create account
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Already registered?{' '}
        <Link to="/login" className="font-semibold text-navy-700 hover:underline">Sign in</Link>
      </p>
    </AuthShell>
  );
}
