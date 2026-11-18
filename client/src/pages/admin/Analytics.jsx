import { useEffect, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { CheckCircle2, Gauge, Hourglass, Tag } from 'lucide-react';
import api, { errMsg } from '../../api/client.js';
import { ErrorBanner, PageHeader, Spinner, StatCard } from '../../components/ui.jsx';
import { CATEGORY_COLORS, PRIORITY_COLORS, STATUS_COLORS } from '../../utils/constants.js';

const Chart = ({ title, subtitle, children, className = '' }) => (
  <section className={`card p-5 ${className}`}>
    <h3 className="font-semibold text-slate-900">{title}</h3>
    {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
    <div className="mt-4 h-72">{children}</div>
  </section>
);

const AXIS = { fontSize: 12, fill: '#64748b' };

export default function Analytics() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    api.get('/admin/analytics').then((r) => setData(r.data)).catch((e) => setError(errMsg(e)));
  };
  useEffect(load, []);

  return (
    <>
      <PageHeader title="Analytics" subtitle="Trends, workload and resolution performance." />
      <ErrorBanner message={error} onRetry={load} />
      {!data && !error && <Spinner />}

      {data && (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Resolution rate" value={`${data.totals.resolutionRate}%`} icon={CheckCircle2} tone="emerald" hint={`${data.totals.resolved} of ${data.totals.total} resolved`} />
            <StatCard label="Avg. resolution time" value={data.totals.avgResolutionHours ? `${data.totals.avgResolutionHours} h` : '—'} icon={Hourglass} tone="sky" hint={data.totals.avgResolutionHours ? `≈ ${(data.totals.avgResolutionHours / 24).toFixed(1)} days` : 'No resolved complaints yet'} />
            <StatCard label="Closure rate" value={`${data.totals.closureRate}%`} icon={Gauge} tone="violet" hint="Resolved + rejected" />
            <StatCard label="Top category" value={data.totals.topCategory || '—'} icon={Tag} tone="amber" />
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Chart title="Complaints over time" subtitle="Created vs resolved, last 6 months">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.monthly} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={AXIS} />
                  <YAxis allowDecimals={false} tick={AXIS} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="created" name="Created" stroke="#3a63a3" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </Chart>

            <Chart title="Complaints by category" subtitle="Where students face the most issues">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byCategory} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ ...AXIS, fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={52} />
                  <YAxis allowDecimals={false} tick={AXIS} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="value" name="Complaints" radius={[6, 6, 0, 0]}>
                    {data.byCategory.map((c) => <Cell key={c.name} fill={CATEGORY_COLORS[c.name]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Chart>

            <Chart title="Status breakdown">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.byStatus} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={3} label={({ name, value }) => (value ? `${name} (${value})` : '')}>
                    {data.byStatus.map((s) => <Cell key={s.name} fill={STATUS_COLORS[s.name]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Chart>

            <Chart title="Priority levels">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byPriority} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={AXIS} />
                  <YAxis type="category" dataKey="name" tick={AXIS} width={70} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="value" name="Complaints" radius={[0, 6, 6, 0]}>
                    {data.byPriority.map((p) => <Cell key={p.name} fill={PRIORITY_COLORS[p.name]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Chart>
          </div>

          <Chart title="Open workload per staff member" subtitle="Pending + in-progress complaints currently assigned" className="!pb-8">
            {data.workload.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-slate-400">No open assigned complaints.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.workload} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={AXIS} />
                  <YAxis allowDecimals={false} tick={AXIS} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="open" name="Open complaints" fill="#243f6b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Chart>
        </div>
      )}
    </>
  );
}
