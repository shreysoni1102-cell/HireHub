import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area,
} from 'recharts';

const emptyForm = { title: '', description: '', company: '', location: '', salary: '' };

const STATUS_COLORS = {
  applied:     '#58a6ff',
  shortlisted: '#3fb950',
  rejected:    '#f85149',
};

// ── Sidebar Icon ──
function SideIcon({ path }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

// ── Stat Card ──
function StatCard({ icon, label, value, sub, trend, color, onClick }) {
  const palette = {
    blue:   { bg: 'var(--accent-muted)', text: 'var(--accent)', icon: 'var(--accent)' },
    green:  { bg: 'var(--success-muted)', text: 'var(--success)', icon: 'var(--success)' },
    red:    { bg: 'var(--danger-muted)', text: 'var(--danger)', icon: 'var(--danger)' },
    purple: { bg: 'rgba(139, 92, 246, 0.1)', text: '#a78bfa', icon: '#a78bfa' },
  };
  const p = palette[color] || palette.blue;
  return (
    <div
      onClick={onClick}
      className={`rounded-xl p-5 border text-left transition-all duration-200 select-none ${
        onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''
      }`}
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border)',
      }}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.borderColor = p.text; }}
      onMouseLeave={(e) => { if (onClick) e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted mb-1">{label}</p>
          <p className="text-3xl font-bold text-primary">{value}</p>
          {sub && <p className="text-xs mt-1" style={{ color: p.text }}>{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
             style={{ backgroundColor: p.bg, color: p.icon }}>
          {icon}
        </div>
      </div>
      {trend && (
        <p className="mt-2 text-xs text-muted">
          <span className="text-success">↑</span> {trend}
        </p>
      )}
    </div>
  );
}

// ── Custom Tooltip ──
function DarkTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border px-4 py-2 text-sm shadow-xl"
         style={{ backgroundColor: 'var(--bg-surface-2)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
      <p className="font-semibold text-muted mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">{p.name}: {p.value}</p>
      ))}
    </div>
  );
}

// ── Analytics Tab ──
function AnalyticsTab({ myJobs, applications, onStatClick }) {
  const stats = useMemo(() => {
    const total       = applications.length;
    const shortlisted = applications.filter((a) => a.status === 'shortlisted').length;
    const rejected    = applications.filter((a) => a.status === 'rejected').length;
    const applied     = total - shortlisted - rejected;
    const rate        = total ? Math.round((shortlisted / total) * 100) : 0;
    return { total, shortlisted, rejected, applied, rate };
  }, [applications]);

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

  const statusPie = useMemo(() => [
    { name: 'Applied',     value: stats.applied,     color: STATUS_COLORS.applied     },
    { name: 'Shortlisted', value: stats.shortlisted, color: STATUS_COLORS.shortlisted },
    { name: 'Rejected',    value: stats.rejected,    color: STATUS_COLORS.rejected    },
  ].filter((d) => d.value > 0), [stats]);

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

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon="💼" label="Total Jobs Posted"   value={myJobs.length}      trend="+2 this month"  color="blue"   onClick={() => onStatClick('jobs')} />
        <StatCard icon="👥" label="Total Applications"  value={stats.total}        trend="+5 new"         color="purple" onClick={() => onStatClick('all')} />
        <StatCard icon="⭐" label="Shortlisted"         value={stats.shortlisted}  sub={`${stats.rate}% rate`} color="green" onClick={() => onStatClick('shortlisted')} />
        <StatCard icon="❌" label="Rejected"            value={stats.rejected}     sub="+1 denied"        color="red"    onClick={() => onStatClick('rejected')} />
      </div>

      {/* Bar Chart */}
      <div className="rounded-xl border p-6" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <h3 className="text-sm font-semibold text-primary mb-5">Applications Per Job</h3>
        {appsPerJob.length === 0 ? (
          <p className="text-sm text-muted">No data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={appsPerJob} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<DarkTooltip />} />
              <Bar dataKey="count" name="Applications" fill="var(--accent)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Pie + Area */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border p-6" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-semibold text-primary mb-5">Status Breakdown</h3>
          {statusPie.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center">
              <p className="text-sm text-muted">No data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusPie}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {statusPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ color: 'var(--text-muted)', fontSize: 12, paddingTop: '10px' }}
                  formatter={(value) => {
                    const item = statusPie.find((d) => d.name === value);
                    if (!item) return value;
                    const percentage = stats.total > 0 ? ((item.value / stats.total) * 100).toFixed(0) : 0;
                    return `${value}: ${item.value} (${percentage}%)`;
                  }}
                />
                <Tooltip content={<DarkTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border p-6" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-semibold text-primary mb-5">Applications — Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={timeline}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<DarkTooltip />} />
              <Area type="monotone" dataKey="applications" name="Applications"
                stroke="var(--accent)" strokeWidth={2.5} fill="url(#areaGrad)"
                dot={{ r: 4, fill: 'var(--accent)', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ── Status Badge ──
function StatusBadge({ status }) {
  const map = {
    shortlisted: { label: 'Shortlisted', bg: '#1a3a28', text: '#3fb950', border: '#2ea043' },
    rejected:    { label: 'Rejected',    bg: '#3a1f1f', text: '#f85149', border: '#da3633' },
    applied:     { label: 'Pending',     bg: '#1f3a5c', text: '#58a6ff', border: '#1f6feb' },
  };
  const s = map[status] || map.applied;
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-semibold border"
          style={{ backgroundColor: s.bg, color: s.text, borderColor: s.border }}>
      {s.label}
    </span>
  );
}

// ── Main Dashboard ──
export default function RecruiterDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs]               = useState([]);
  const [form, setForm]               = useState(emptyForm);
  const [editingId, setEditingId]     = useState(null);
  const [applicationsPayload, setApplicationsPayload] = useState(null);
  const [error, setError]             = useState('');
  const [tab, setTab]                 = useState('analytics');
  const [busy, setBusy]               = useState(false);
  const [applicantFilter, setApplicantFilter] = useState('all');

  const loadJobs = async () => { const { data } = await api.get('/jobs'); setJobs(data); };
  const loadApplicants = async () => { const { data } = await api.get('/applications/recruiter'); setApplicationsPayload(data); };

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
    e.preventDefault(); setError(''); setBusy(true);
    try {
      if (editingId) { await api.put(`/jobs/${editingId}`, form); }
      else           { await api.post('/jobs', form); }
      setForm(emptyForm); setEditingId(null);
      await loadJobs(); await loadApplicants();
    } catch (err) { setError(err.response?.data?.message || 'Save failed'); }
    finally { setBusy(false); }
  };

  const startEdit = (job) => {
    setEditingId(job._id);
    setForm({ title: job.title, description: job.description, company: job.company, location: job.location, salary: job.salary });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => { setEditingId(null); setForm(emptyForm); };

  const removeJob = async (id) => {
    if (!window.confirm('Delete this job?')) return;
    setBusy(true);
    try { await api.delete(`/jobs/${id}`); await loadJobs(); await loadApplicants(); }
    catch (err) { setError(err.response?.data?.message || 'Delete failed'); }
    finally { setBusy(false); }
  };

  const updateStatus = async (applicationId, status) => {
    setBusy(true);
    try { await api.put(`/applications/${applicationId}/status`, { status }); await loadApplicants(); }
    catch (err) { setError(err.response?.data?.message || 'Update failed'); }
    finally { setBusy(false); }
  };

  const applications = applicationsPayload?.applications || [];
  const filteredApplications = useMemo(() => {
    if (applicantFilter === 'all') return applications;
    return applications.filter((app) => app.status === applicantFilter);
  }, [applications, applicantFilter]);

  const SIDEBAR = [
    { id: 'analytics',  label: 'Dashboard',  icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12 0a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
    { id: 'jobs',       label: 'Jobs',        icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { id: 'applicants', label: 'Candidates',  icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  ];

  return (
    <div className="flex flex-1" style={{ backgroundColor: 'var(--bg-page)', minHeight: 'calc(100vh - 56px)' }}>

      {/* ── Sidebar ── */}
      <aside
        className="w-56 shrink-0 flex flex-col border-r py-4"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <p className="px-4 text-xs font-semibold text-faint uppercase tracking-widest mb-3">
          Navigation
        </p>
        <nav className="flex flex-col gap-1 px-2">
          {SIDEBAR.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left"
              style={{
                backgroundColor: tab === item.id ? 'var(--accent-muted)' : 'transparent',
                color: tab === item.id ? 'var(--accent)' : 'var(--text-muted)',
              }}
            >
              <SideIcon path={item.icon} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto px-4 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.[0]?.toUpperCase() || 'R'}
            </div>
            <div>
              <p className="text-xs font-semibold text-primary truncate">{user?.name}</p>
              <p className="text-xs text-muted capitalize">{user?.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-primary">Recruiter Dashboard</h1>
            <p className="text-sm text-muted mt-0.5">Post jobs, review applicants, and track performance.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-primary border border-border hover:border-accent transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
              {user?.name?.[0]?.toUpperCase() || 'R'}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* ── Analytics Tab ── */}
        {tab === 'analytics' && (
          <AnalyticsTab 
            myJobs={myJobs} 
            applications={applications} 
            onStatClick={(type) => {
              if (type === 'jobs') {
                setTab('jobs');
              } else {
                setTab('applicants');
                setApplicantFilter(type);
              }
            }}
          />
        )}

        {/* ── Jobs Tab ── */}
        {tab === 'jobs' && (
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Post/Edit Form */}
            <section>
              <h2 className="text-base font-semibold text-primary mb-4">
                {editingId ? '✏️ Edit Job' : '+ Post a New Job'}
              </h2>
              <form
                onSubmit={handleSubmit}
                className="rounded-xl border p-5 space-y-4"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
              >
                {['title', 'company', 'location', 'salary'].map((field) => (
                  <div key={field}>
                    <label className="block text-xs font-semibold tracking-widest text-muted mb-1.5 capitalize">
                      {field}
                    </label>
                    <input
                      value={form[field]}
                      onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                      className="w-full rounded-lg px-3 py-2.5 text-sm text-primary border focus:outline-none focus:border-accent placeholder-faint"
                      style={{ backgroundColor: 'var(--bg-page)', borderColor: 'var(--border)' }}
                      required
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-muted mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={4}
                    className="w-full rounded-lg px-3 py-2.5 text-sm text-primary border focus:outline-none focus:border-accent placeholder-faint resize-none"
                    style={{ backgroundColor: 'var(--bg-page)', borderColor: 'var(--border)' }}
                    required
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={busy}
                    className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors"
                  >
                    {busy ? 'Saving...' : editingId ? 'Update Job' : 'Publish Job'}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-5 py-2.5 rounded-lg text-sm font-medium text-muted border border-border hover:border-accent transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </section>

            {/* My Jobs */}
            <section>
              <h2 className="text-base font-semibold text-primary mb-4">Your Listings ({myJobs.length})</h2>
              <div className="space-y-3">
                {myJobs.map((job) => (
                  <div
                    key={job._id}
                    className="rounded-xl border p-4 flex items-start justify-between gap-4"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
                  >
                    <div>
                      <p className="font-semibold text-sm text-primary">{job.title}</p>
                      <p className="text-xs text-muted mt-0.5">{job.company} · {job.location}</p>
                      {job.salary && <p className="text-xs text-success mt-0.5">{job.salary}</p>}
                    </div>
                    <div className="flex gap-3 shrink-0">
                      <button onClick={() => startEdit(job)} className="text-xs font-medium text-accent hover:underline">Edit</button>
                      <button onClick={() => removeJob(job._id)} className="text-xs font-medium text-danger hover:underline">Delete</button>
                    </div>
                  </div>
                ))}
                {myJobs.length === 0 && (
                  <p className="text-sm text-muted text-center py-8">No jobs posted yet.</p>
                )}
              </div>
            </section>
          </div>
        )}

        {/* ── Applicants Tab ── */}
        {tab === 'applicants' && (
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <h2 className="text-base font-semibold text-primary">
                Recent Applications
                {applicantFilter !== 'all' && (
                  <span className="text-xs font-normal text-muted ml-2 capitalize">
                    (Filtered by: {applicantFilter})
                  </span>
                )}
              </h2>
              <div className="flex bg-surface border border-border p-1 rounded-lg text-xs">
                {[
                  { id: 'all',         label: 'All' },
                  { id: 'applied',     label: 'Pending' },
                  { id: 'shortlisted', label: 'Shortlisted' },
                  { id: 'rejected',    label: 'Rejected' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setApplicantFilter(f.id)}
                    className="px-3 py-1.5 rounded-md font-medium transition-colors"
                    style={{
                      backgroundColor: applicantFilter === f.id ? 'var(--accent-muted)' : 'transparent',
                      color: applicantFilter === f.id ? 'var(--accent)' : 'var(--text-muted)',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottomColor: 'var(--border)', borderBottomWidth: 1 }}>
                    {['#', 'Applicant Name', 'Job Title', 'Status', 'Applied Date', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map((app, i) => (
                    <tr
                      key={app._id}
                      className="border-t hover:bg-surface-2 transition-colors"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <td className="px-4 py-3 text-muted text-xs">{i + 1}.</td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-primary text-xs">{app.applicantId?.name}</p>
                          <p className="text-muted text-xs">{app.applicantId?.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-primary">{app.jobId?.title}</td>
                      <td className="px-4 py-3"><StatusBadge status={app.status} /></td>
                      <td className="px-4 py-3 text-xs text-muted">
                        {app.createdAt ? new Date(app.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {app.resumeLink && (
                            <a href={app.resumeLink} target="_blank" rel="noreferrer"
                               className="px-2.5 py-1 rounded-md text-xs font-medium text-accent border border-accent hover:bg-accent-muted transition-colors">
                              View ↗
                            </a>
                          )}
                          <button
                            disabled={busy}
                            onClick={() => updateStatus(app._id, 'shortlisted')}
                            className="px-2.5 py-1 rounded-md text-xs font-medium text-success border border-success hover:bg-success-muted disabled:opacity-50 transition-colors"
                          >
                            Shortlist
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => updateStatus(app._id, 'rejected')}
                            className="px-2.5 py-1 rounded-md text-xs font-medium text-danger border border-danger hover:bg-danger-muted disabled:opacity-50 transition-colors"
                          >
                            Reject
                          </button>
                          {app.status === 'shortlisted' && (
                            <button
                              onClick={() => navigate(`/chat/${app._id}`)}
                              className="px-2.5 py-1 rounded-md text-xs font-medium text-muted border border-border hover:border-accent hover:text-accent transition-colors"
                            >
                              Chat
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredApplications.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted">
                        No {applicantFilter === 'all' ? '' : applicantFilter} applications found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
