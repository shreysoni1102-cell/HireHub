import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios.js';

export default function SeekerApplications() {
  const [list, setList] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/applications/my');
        if (!cancelled) setList(data);
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.message || 'Failed to load applications');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <p className="text-slate-500">Loading your applications…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-slate-900">My applications</h1>
      <p className="mt-1 text-slate-600">Track status for roles you have applied to.</p>

      <ul className="mt-8 space-y-4">
        {list.map((app) => (
          <li
            key={app._id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold text-slate-900">
                  {app.jobId?.title || 'Job'}
                </h2>
                <p className="text-sm text-slate-600">{app.jobId?.company}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Applied {new Date(app.appliedAt).toLocaleString()}
                </p>
                <a
                  href={app.resumeLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-sm text-brand-700 hover:underline"
                >
                  Resume link
                </a>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                  app.status === 'shortlisted'
                    ? 'bg-emerald-100 text-emerald-800'
                    : app.status === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-slate-100 text-slate-700'
                }`}
              >
                {app.status}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Link
                to={`/jobs/${app.jobId?._id}`}
                className="text-sm font-medium text-blue-700 hover:underline"
              >
                View job →
              </Link>
              {app.status === 'shortlisted' && (
                <Link
                  to={`/chat/${app._id}`}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  💬 Chat with Recruiter
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>

      {list.length === 0 && (
        <p className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-600">
          You have not applied yet.{' '}
          <Link to="/" className="font-medium text-brand-700 hover:underline">
            Browse jobs
          </Link>
        </p>
      )}
    </div>
  );
}
