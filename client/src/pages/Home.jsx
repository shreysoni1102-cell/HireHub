import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios.js';

const COMPANY_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4',
];
const companyColor = (name = '') => COMPANY_COLORS[name.charCodeAt(0) % COMPANY_COLORS.length];

function JobCard({ job }) {
  const color = companyColor(job.company);
  return (
    <div
      className="flex flex-col rounded-xl p-5 border transition-all duration-200 hover:shadow-lg group cursor-pointer"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-11 h-11 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md"
          style={{ backgroundColor: color }}
        >
          {job.company?.[0]?.toUpperCase() || '?'}
        </div>
        <button style={{ color: 'var(--text-faint)' }} title="Save job"
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-faint)')}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
      </div>

      <h2 className="font-semibold text-base leading-snug transition-colors"
          style={{ color: 'var(--text-primary)' }}>
        {job.title}
      </h2>
      <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{job.company}</p>

      <div className="mt-3 space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {job.location || 'Remote'}
        </div>
        {job.salary && (
          <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--success)' }}>
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {job.salary}
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="px-2 py-0.5 rounded-md text-xs font-medium"
              style={{ color: 'var(--accent)', backgroundColor: 'var(--accent-muted)' }}>
          Full-time
        </span>
        <span className="px-2 py-0.5 rounded-md text-xs font-medium"
              style={{ color: 'var(--success)', backgroundColor: 'var(--success-muted)' }}>
          Remote
        </span>
      </div>

      {/* Apply button */}
      <Link
        to={`/jobs/${job._id}`}
        className="mt-4 block w-full text-center rounded-lg py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors"
      >
        Apply Now
      </Link>
    </div>
  );
}

export default function Home() {
  const [jobs,    setJobs]    = useState([]);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/jobs');
        if (!cancelled) setJobs(data);
      } catch (e) {
        if (!cancelled) {
          const apiMsg = e.response?.data?.message;
          const hint = e.code === 'ERR_NETWORK' || !e.response
            ? ' Is the API running? Check http://localhost:5000/api/health'
            : '';
          setError(apiMsg || `Failed to load jobs.${hint}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = jobs.filter((j) =>
    !search ||
    j.title?.toLowerCase().includes(search.toLowerCase()) ||
    j.company?.toLowerCase().includes(search.toLowerCase()) ||
    j.location?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen transition-colors duration-200" style={{ backgroundColor: 'var(--bg-page)' }}>

      {/* ── Hero ── */}
      <div
        className="py-16 px-6 text-center border-b transition-colors duration-200"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight"
              style={{ color: 'var(--text-primary)' }}>
            Find Your{' '}
            <span style={{ color: 'var(--accent)' }}>Dream Job</span>
          </h1>
          <p className="mt-3 text-lg" style={{ color: 'var(--text-muted)' }}>
            Discover opportunities at top companies worldwide.
          </p>

          {/* Search */}
          <div className="mt-8 flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                   style={{ color: 'var(--text-faint)' }}
                   fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search jobs, skills or companies..."
                className="w-full pl-10 pr-4 py-3 rounded-lg text-sm border focus:outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--bg-page)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>
            <button className="px-6 py-3 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors shrink-0">
              Find Jobs
            </button>
          </div>

          {/* Filter chips */}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {['Location ↓', 'Job Type ↓', 'Salary ↓'].map((f) => (
              <button
                key={f}
                className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
                style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.color = 'var(--accent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Listings ── */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Showing{' '}
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{filtered.length}</span>
            {' '}job{filtered.length !== 1 ? 's' : ''}
            {search && (
              <> matching "<span style={{ color: 'var(--accent)' }}>{search}</span>"</>
            )}
          </p>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-56 rounded-xl animate-pulse"
                   style={{ backgroundColor: 'var(--bg-surface)' }} />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border p-6"
               style={{ borderColor: 'var(--danger)', backgroundColor: 'var(--danger-muted)' }}>
            <p className="font-medium" style={{ color: 'var(--danger)' }}>{error}</p>
            <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
              Start MongoDB and run the API from <code className="rounded px-1"
                style={{ backgroundColor: 'var(--bg-surface-3)' }}>server/</code> with{' '}
              <code className="rounded px-1"
                    style={{ backgroundColor: 'var(--bg-surface-3)' }}>npm run dev</code>.
            </p>
          </div>
        )}

        {/* Grid */}
        {!loading && !error && (
          filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed py-16 text-center"
                 style={{ borderColor: 'var(--border)' }}>
              <p className="text-4xl mb-3">🔍</p>
              <p style={{ color: 'var(--text-muted)' }}>
                {search
                  ? `No jobs matching "${search}"`
                  : 'No jobs posted yet. Recruiters can post from the dashboard.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((job) => <JobCard key={job._id} job={job} />)}
            </div>
          )
        )}
      </div>
    </div>
  );
}
