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

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 rounded-full border-4 border-blue-600/30 border-t-blue-600 animate-spin mb-4" />
        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Loading job details...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 md:px-8 text-center">
        <div className="mb-4 text-4xl">⚠️</div>
        <p className="text-lg font-bold" style={{ color: 'var(--danger)' }}>{error || 'Job not found'}</p>
        <Link to="/" className="mt-4 inline-block text-sm font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
          Back to listings
        </Link>
      </div>
    );
  }

  const canApply = isAuthenticated && user?.role === 'user';

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 md:px-8">
      <Link 
        to="/" 
        className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline mb-6 transition-colors"
        style={{ color: 'var(--accent)' }}
      >
        ← Back to all jobs
      </Link>

      {/* Main card */}
      <article 
        className="rounded-2xl border p-6 shadow-md sm:p-8 transition-colors duration-200"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        {/* Company header */}
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {job.company}
        </p>
        
        {/* Job Title */}
        <h1 className="font-display mt-1.5 text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          {job.title}
        </h1>
        
        {/* Metadata: Location & Salary */}
        <p className="mt-2.5 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
          📍 {job.location || 'Remote'} 
          {job.salary && (
            <>
              {'   '}
              <span className="font-semibold" style={{ color: 'var(--success)' }}>
                💰 {job.salary}
              </span>
            </>
          )}
        </p>

        {job.createdBy && (
          <p className="mt-4 text-xs" style={{ color: 'var(--text-faint)' }}>
            Posted by {job.createdBy.name || job.createdBy.email}
          </p>
        )}

        {/* Job Description */}
        <div className="mt-8 border-t pt-8" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Description</h2>
          <p className="whitespace-pre-wrap text-sm mt-3 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {job.description}
          </p>
        </div>

        {/* Application Section */}
        <div className="mt-10 border-t pt-8" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Apply to Position
          </h2>
          
          {!isAuthenticated && (
            <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
              Please{' '}
              <Link to="/login" className="font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
                log in
              </Link>{' '}
              as a job seeker to submit your application.
            </p>
          )}

          {isAuthenticated && user?.role !== 'user' && (
            <div className="mt-3 p-3 rounded-lg border border-orange-500/20 bg-orange-500/10 text-xs text-orange-400">
              ⚠️ Recruiter and admin accounts cannot apply to jobs. Please sign in with a Job Seeker account.
            </div>
          )}

          {canApply && (
            <form onSubmit={handleApply} className="mt-4 max-w-lg space-y-4">
              {applyMsg && (
                <div 
                  className={`rounded-lg px-4 py-3 text-sm border ${
                    applyMsg.includes('success')
                      ? 'bg-green-50 text-green-800 border-green-500/20 dark:bg-green-900/10 dark:text-green-400'
                      : 'bg-orange-50 text-orange-900 border-orange-500/20 dark:bg-orange-900/10 dark:text-orange-400'
                  }`}
                >
                  {applyMsg}
                </div>
              )}
              
              <div className="space-y-1.5">
                <label htmlFor="resume" className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Resume link (URL)
                </label>
                <input
                  id="resume"
                  type="url"
                  value={resumeLink}
                  onChange={(e) => setResumeLink(e.target.value)}
                  placeholder="e.g. Google Drive link or Portfolio URL"
                  className="w-full rounded-lg px-4 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  style={{
                    backgroundColor: 'var(--bg-page)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={applying}
                className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60 transition-colors"
              >
                {applying ? 'Submitting...' : 'Submit Application'}
              </button>
            </form>
          )}
        </div>
      </article>
    </div>
  );
}
