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

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 rounded-full border-4 border-blue-600/30 border-t-blue-600 animate-spin mb-4" />
        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Loading applications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 md:px-8 text-center">
        <div className="mb-4 text-4xl">⚠️</div>
        <p className="text-lg font-bold" style={{ color: 'var(--danger)' }}>{error}</p>
        <Link to="/" className="mt-4 inline-block text-sm font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
          Back to listings
        </Link>
      </div>
    );
  }

  const getStatusBadgeStyle = (status) => {
    if (status === 'shortlisted') {
      return {
        bg: 'var(--success-muted)',
        text: 'var(--success)',
        border: 'rgba(16, 185, 129, 0.2)'
      };
    }
    if (status === 'rejected') {
      return {
        bg: 'var(--danger-muted)',
        text: 'var(--danger)',
        border: 'rgba(239, 68, 68, 0.2)'
      };
    }
    return {
      bg: 'var(--bg-page)',
      text: 'var(--text-muted)',
      border: 'var(--border)'
    };
  };

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 md:px-8">
      {/* Header section */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          My Applications
        </h1>
        <p className="mt-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
          Track the status of the job positions you have applied for.
        </p>
      </div>

      {/* Applications list */}
      <ul className="space-y-5">
        {list.map((app) => {
          const badge = getStatusBadgeStyle(app.status);
          const isShortlisted = app.status === 'shortlisted';
          
          return (
            <li
              key={app._id}
              className="rounded-2xl border p-5 shadow-sm transition-all duration-200 hover:shadow-md relative overflow-hidden"
              style={{ 
                backgroundColor: 'var(--bg-surface)', 
                borderColor: isShortlisted ? 'var(--success)' : 'var(--border)',
                borderWidth: isShortlisted ? '1.5px' : '1px'
              }}
            >
              {/* Pulsing shortlisted accent top bar */}
              {isShortlisted && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-green-500 animate-pulse" />
              )}

              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    {app.jobId?.title || 'Job Position'}
                  </h2>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
                    🏢 {app.jobId?.company || 'Company'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                    📅 Applied {new Date(app.appliedAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  <div className="pt-2">
                    <a
                      href={app.resumeLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold hover:underline"
                      style={{ color: 'var(--accent)' }}
                    >
                      📄 View Submitted Resume
                    </a>
                  </div>
                </div>

                <div className="flex sm:flex-col items-start sm:items-end gap-2 shrink-0">
                  <span
                    className="px-3 py-1 rounded-full text-xs font-bold border capitalize tracking-wider flex items-center gap-1.5"
                    style={{ backgroundColor: badge.bg, color: badge.text, borderColor: badge.border }}
                  >
                    {isShortlisted && (
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
                    )}
                    {app.status}
                  </span>
                </div>
              </div>

              {/* Actions footer */}
              <div className="mt-5 pt-4 border-t flex flex-wrap items-center justify-between gap-3" style={{ borderColor: 'var(--border)' }}>
                <Link
                  to={`/jobs/${app.jobId?._id}`}
                  className="text-xs font-bold hover:underline"
                  style={{ color: 'var(--accent)' }}
                >
                  View Job Details →
                </Link>
                {isShortlisted && (
                  <Link
                    to={`/chat/${app._id}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-bold text-white transition-colors shadow-sm"
                  >
                    💬 Chat with Recruiter
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {list.length === 0 && (
        <div 
          className="rounded-xl border border-dashed p-12 text-center"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <span className="text-4xl block mb-3">🎓</span>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            You haven't submitted any job applications yet.
          </p>
          <Link 
            to="/" 
            className="mt-4 inline-block text-xs font-bold hover:underline"
            style={{ color: 'var(--accent)' }}
          >
            Browse & Apply to Jobs Now
          </Link>
        </div>
      )}
    </div>
  );
}
