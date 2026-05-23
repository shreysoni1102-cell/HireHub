import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function JobDetail() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const [job, setJob] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [resumeLink, setResumeLink] = useState('');
  const [applyMsg, setApplyMsg] = useState('');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/jobs/${id}`);
        if (!cancelled) setJob(data);
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.message || 'Job not found');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleApply = async (e) => {
    e.preventDefault();
    setApplyMsg('');
    if (user?.role !== 'user') {
      setApplyMsg('Only job seekers can apply. Register as a job seeker or switch accounts.');
      return;
    }
    if (!resumeLink.trim()) {
      setApplyMsg('Please provide a link to your resume (e.g. Google Drive or portfolio).');
      return;
    }
    setApplying(true);
    try {
      await api.post(`/applications/${id}`, { resumeLink: resumeLink.trim() });
      setApplyMsg('Application submitted successfully.');
      setResumeLink('');
    } catch (err) {
      setApplyMsg(err.response?.data?.message || 'Could not apply');
    } finally {
      setApplying(false);
    }
  };

  if (loading) return <p className="text-slate-500">Loading job…</p>;
  if (error || !job) return <p className="text-red-600">{error || 'Not found'}</p>;

  const canApply = isAuthenticated && user?.role === 'user';

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-medium text-brand-700">{job.company}</p>
      <h1 className="font-display mt-1 text-3xl font-bold text-slate-900">{job.title}</h1>
      <p className="mt-2 text-slate-600">
        {job.location} · <span className="text-emerald-700">{job.salary}</span>
      </p>
      {job.createdBy && (
        <p className="mt-4 text-sm text-slate-500">
          Posted by {job.createdBy.name || job.createdBy.email}
        </p>
      )}
      <div className="prose prose-slate mt-8 max-w-none">
        <h2 className="text-lg font-semibold text-slate-900">Description</h2>
        <p className="whitespace-pre-wrap text-slate-700">{job.description}</p>
      </div>

      <div className="mt-10 border-t border-slate-100 pt-8">
        <h2 className="font-display text-lg font-semibold text-slate-900">Apply</h2>
        {!isAuthenticated && (
          <p className="mt-2 text-sm text-slate-600">
            <Link to="/login" className="font-medium text-brand-700 hover:underline">
              Log in
            </Link>{' '}
            as a job seeker to apply.
          </p>
        )}
        {isAuthenticated && user?.role !== 'user' && (
          <p className="mt-2 text-sm text-amber-800">
            Recruiter and admin accounts cannot apply. Use a job seeker account to submit an
            application.
          </p>
        )}
        {canApply && (
          <form onSubmit={handleApply} className="mt-4 max-w-lg space-y-3">
            {applyMsg && (
              <p
                className={`rounded-lg px-3 py-2 text-sm ${
                  applyMsg.includes('success')
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'bg-amber-50 text-amber-900'
                }`}
              >
                {applyMsg}
              </p>
            )}
            <label htmlFor="resume" className="block text-sm font-medium text-slate-700">
              Resume link (URL)
            </label>
            <input
              id="resume"
              type="url"
              value={resumeLink}
              onChange={(e) => setResumeLink(e.target.value)}
              placeholder="https://…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button
              type="submit"
              disabled={applying}
              className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {applying ? 'Submitting…' : 'Submit application'}
            </button>
          </form>
        )}
      </div>

      <p className="mt-8">
        <Link to="/" className="text-sm font-medium text-brand-700 hover:underline">
          ← Back to all jobs
        </Link>
      </p>
    </article>
  );
}
