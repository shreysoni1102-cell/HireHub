import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios.js';

export default function Home() {
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/jobs');
        if (!cancelled) setJobs(data);
      } catch (e) {
        if (!cancelled) {
          const apiMsg = e.response?.data?.message;
          const hint =
            e.code === 'ERR_NETWORK' || !e.response
              ? ' Is the API running (npm run dev in server/) and is MongoDB up? Try http://localhost:5000/api/health'
              : '';
          setError(apiMsg || `Failed to load jobs.${hint}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="text-slate-500">Loading openings…</p>;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50/80 p-6 text-red-800">
        <p className="font-medium">{error}</p>
        <p className="mt-3 text-sm text-red-900/90">
          Start MongoDB (local install, Docker Compose in the repo root, or Atlas). Then run the API from{' '}
          <code className="rounded bg-red-100 px-1">server/</code> with <code className="rounded bg-red-100 px-1">npm run dev</code>, and the UI from{' '}
          <code className="rounded bg-red-100 px-1">client/</code> with <code className="rounded bg-red-100 px-1">npm run dev</code>.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-10">
        <h1 className="font-display text-3xl font-bold text-slate-900 sm:text-4xl">
          Find your next role
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Browse live openings from companies on HireHub. Create an account as a job seeker to
          apply, or sign up as a recruiter to post roles.
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        {jobs.map((job) => (
          <li key={job._id}>
            <Link
              to={`/jobs/${job._id}`}
              className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-200 hover:shadow-md"
            >
              <h2 className="font-display text-lg font-semibold text-slate-900">{job.title}</h2>
              <p className="mt-1 text-sm font-medium text-brand-700">{job.company}</p>
              <p className="mt-2 text-sm text-slate-600">{job.location}</p>
              <p className="mt-1 text-sm text-emerald-700">{job.salary}</p>
            </Link>
          </li>
        ))}
      </ul>

      {jobs.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-600">
          No jobs yet. Recruiters can post the first opening from the recruiter dashboard.
        </p>
      )}
    </div>
  );
}
