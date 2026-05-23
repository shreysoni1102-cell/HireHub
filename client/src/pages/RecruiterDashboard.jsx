import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area,
} from 'recharts';

// ─── Constants ────────────────────────────────────────────────────────────────
const emptyForm = { title: '', description: '', company: '', location: '', salary: '' };

const STATUS_COLORS = {
  applied:     '#3b82f6',
  shortlisted: '#22c55e',
  rejected:    '#ef4444',
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color }) {
  const colors = {
    blue:   'bg-blue-50 border-blue-200 text-blue-700',
    green:  'bg-green-50 border-green-200 text-green-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  };
  return (
    <div className={`rounded-2xl border p-5 ${colors[color]}`}>
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <span className="text-3xl font-bold">{value}</span>
      </div>
      <p className="mt-2 text-sm font-semibold">{label}</p>
      {sub && <p className="text-xs opacity-70">{sub}</p>}
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-lg text-sm">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

// ─── Analytics Tab ────────────────────────────────────────────────────────────
function AnalyticsTab({ myJobs, applications }) {
  const stats = useMemo(() => {
    const total       = applications.length;
    const shortlisted = applications.filter((a) => a.status === 'shortlisted').length;
    const rejected    = applications.filter((a) => a.status === 'rejected').length;
    const applied     = total - shortlisted - rejected;
    const rate        = total ? Math.round((shortlisted / total) * 100) : 0;
    return { total, shortlisted, rejected, applied, rate };
  }, [applications]);

  // Bar chart: applications per job
  const appsPerJob = useMemo(() => {
    const map = {};
    applications.forEach((a) => {
      const title = a.jobId?.title || 'Unknown';
      map[title] = (map[title] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name: name.length > 18 ? name.slice(0, 16) + '…' : name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [applications]);

  // Pie chart: status breakdown
  const statusPie = useMemo(() => [
    { name: 'Applied',     value: stats.applied,     color: STATUS_COLORS.applied     },
    { name: 'Shortlisted', value: stats.shortlisted, color: STATUS_COLORS.shortlisted },
    { name: 'Rejected',    value: stats.rejected,    color: STATUS_COLORS.rejected    },
  ].filter((d) => d.value > 0), [stats]);

  // Area chart: applications over last 7 days
  const timeline = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().slice(0, 10);
    });
    const map = {};
    days.forEach((d) => (map[d] = 0));
    applications.forEach((a) => {
      const day = new Date(a.createdAt).toISOString().slice(0, 10);
      if (map[day] !== undefined) map[day]++;
    });
    return days.map((d) => ({
      date: new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      applications: map[d],
    }));
  }, [applications]);

  if (applications.length === 0) {
    return (
      <div className="mt-10 flex flex-col items-center gap-3 text-center">
        <span className="text-5xl">📊</span>
        <p className="text-lg font-semibold text-slate-700">No data yet</p>
        <p className="text-sm text-slate-500">Post jobs and receive applications to see your analytics.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon="💼" label="Jobs Posted"    value={myJobs.length}   color="blue"   />
        <StatCard icon="👥" label="Total Applicants" value={stats.total}  color="purple"  />
        <StatCard icon="🎯" label="Shortlisted"    value={stats.shortlisted} sub={`${stats.rate}% rate`} color="green" />
        <StatCard icon="❌" label="Rejected"       value={stats.rejected}  color="orange"  />
      </div>

      {/* Bar Chart — Apps per Job */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-slate-700 uppercase tracking-wide">
          📊 Applications per Job
        </h3>
        {appsPerJob.length === 0 ? (
          <p className="text-sm text-slate-400">No data</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={appsPerJob} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Applications" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Pie + Area side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pie Chart — Status Breakdown */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-700 uppercase tracking-wide">
            🍩 Application Status Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusPie} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                dataKey="value" paddingAngle={3} label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}>
                {statusPie.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Legend iconType="circle" iconSize={8} />
              <Tooltip formatter={(v, n) => [v, n]} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Area Chart — Applications over time */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-700 uppercase tracking-wide">
            📈 Applications — Last 7 Days
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={timeline}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="applications" name="Applications"
                stroke="#3b82f6" strokeWidth={2.5} fill="url(#areaGrad)" dot={{ r: 4, fill: '#3b82f6' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RecruiterDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs]                         = useState([]);
  const [form, setForm]                         = useState(emptyForm);
  const [editingId, setEditingId]               = useState(null);
  const [applicationsPayload, setApplicationsPayload] = useState(null);
  const [error, setError]                       = useState('');
  const [tab, setTab]                           = useState('jobs');
  const [busy, setBusy]                         = useState(false);

  const loadJobs = async () => {
    const { data } = await api.get('/jobs');
    setJobs(data);
  };

  const loadApplicants = async () => {
    const { data } = await api.get('/applications/recruiter');
    setApplicationsPayload(data);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadJobs();
        if (!cancelled) await loadApplicants();
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.message || 'Failed to load data');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const myJobs = jobs.filter((j) => {
    const creatorId = j.createdBy?._id || j.createdBy;
    return creatorId && user?.id && String(creatorId) === String(user.id);
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (editingId) {
        await api.put(`/jobs/${editingId}`, form);
      } else {
        await api.post('/jobs', form);
      }
      setForm(emptyForm);
      setEditingId(null);
      await loadJobs();
      await loadApplicants();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (job) => {
    setEditingId(job._id);
    setForm({ title: job.title, description: job.description, company: job.company, location: job.location, salary: job.salary });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => { setEditingId(null); setForm(emptyForm); };

  const removeJob = async (id) => {
    if (!window.confirm('Delete this job? Applications will remain in the database.')) return;
    setBusy(true);
    try {
      await api.delete(`/jobs/${id}`);
      await loadJobs();
      await loadApplicants();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async (applicationId, status) => {
    setBusy(true);
    try {
      await api.put(`/applications/${applicationId}/status`, { status });
      await loadApplicants();
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  const applications = applicationsPayload?.applications || [];

  const TABS = [
    { id: 'jobs',       label: '💼 My Jobs' },
    { id: 'applicants', label: '👥 Applicants' },
    { id: 'analytics',  label: '📊 Analytics' },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-slate-900">Recruiter Dashboard</h1>
      <p className="mt-1 text-slate-600">Post jobs, review applicants, and track your hiring performance.</p>

      {/* Tab Bar */}
      <div className="mt-6 flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition ${
              tab === t.id
                ? 'border-b-2 border-blue-600 text-blue-700 bg-blue-50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {/* ── Jobs Tab ── */}
      {tab === 'jobs' && (
        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          <section>
            <h2 className="font-display text-lg font-semibold text-slate-900">
              {editingId ? 'Edit job' : 'Post a new job'}
            </h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              {['title', 'company', 'location', 'salary'].map((field) => (
                <div key={field}>
                  <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">{field}</label>
                  <input value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={5} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={busy}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                  {editingId ? 'Update job' : 'Publish job'}
                </button>
                {editingId && (
                  <button type="button" onClick={cancelEdit}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-slate-900">Your listings</h2>
            <ul className="mt-4 space-y-3">
              {myJobs.map((job) => (
                <li key={job._id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="font-semibold text-slate-900">{job.title}</h3>
                  <p className="text-sm text-slate-600">{job.company} · {job.location}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => startEdit(job)}
                      className="text-sm font-medium text-blue-700 hover:underline">Edit</button>
                    <button type="button" onClick={() => removeJob(job._id)}
                      className="text-sm font-medium text-red-600 hover:underline">Delete</button>
                  </div>
                </li>
              ))}
            </ul>
            {myJobs.length === 0 && <p className="mt-4 text-sm text-slate-500">You have not posted any jobs yet.</p>}
          </section>
        </div>
      )}

      {/* ── Applicants Tab ── */}
      {tab === 'applicants' && (
        <section className="mt-8">
          <h2 className="font-display text-lg font-semibold text-slate-900">Applications to your jobs</h2>
          <ul className="mt-4 space-y-4">
            {applications.map((app) => (
              <li key={app._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{app.jobId?.title}</p>
                    <p className="text-sm text-slate-600">{app.applicantId?.name} · {app.applicantId?.email}</p>
                    <a href={app.resumeLink} target="_blank" rel="noreferrer"
                      className="mt-2 inline-block text-sm text-blue-700 hover:underline">Resume ↗</a>
                    <span className={`ml-3 inline-block rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                      app.status === 'shortlisted' ? 'bg-green-100 text-green-700' :
                      app.status === 'rejected'    ? 'bg-red-100 text-red-700' :
                                                     'bg-blue-100 text-blue-700'
                    }`}>{app.status}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={busy}
                      onClick={() => updateStatus(app._id, 'shortlisted')}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                      ✅ Shortlist
                    </button>
                    <button type="button" disabled={busy}
                      onClick={() => updateStatus(app._id, 'rejected')}
                      className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-300 disabled:opacity-60">
                      ❌ Reject
                    </button>
                    {app.status === 'shortlisted' && (
                      <button type="button"
                        onClick={() => navigate(`/chat/${app._id}`)}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
                        💬 Chat
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {applications.length === 0 && <p className="mt-4 text-sm text-slate-500">No applications yet.</p>}
        </section>
      )}

      {/* ── Analytics Tab ── */}
      {tab === 'analytics' && (
        <AnalyticsTab myJobs={myJobs} applications={applications} />
      )}
    </div>
  );
}
