import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios.js';

export default function InterviewLobby() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Start session form
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [starting, setStarting] = useState(false);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/interview/history');
      if (data && data.success) {
        setHistory(data.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load interview history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleStart = async (e) => {
    e.preventDefault();
    if (!jobTitle.trim() || !jobDescription.trim()) {
      setError('Please fill in both Job Title and Job Description.');
      return;
    }

    try {
      setStarting(true);
      setError('');
      const { data } = await api.post('/interview/start', {
        jobTitle: jobTitle.trim(),
        jobDescription: jobDescription.trim()
      });

      if (data && data.success && data.data) {
        // Redirect to the active interview page with state
        navigate(`/seeker/interview/${data.data.sessionId}`, {
          state: {
            firstQuestion: data.data.question,
            jobTitle: data.data.jobTitle
          }
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start interview session.');
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          AI Interview Coach
        </h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Practice interactive mock interviews tailored to any job role, dictate answers with your voice, and receive professional rubric grading.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {/* Left Column: Start Interview Form */}
        <div className="md:col-span-1">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-wide">
              Start Practice Session
            </h2>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Input the job profile details below. The AI interviewer will generate 5 custom questions based on this.
            </p>

            <form onSubmit={handleStart} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Target Job Title
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. React Developer"
                  required
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Job Description / Skills
                </label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Requirements, tech stack, and key responsibilities..."
                  rows={6}
                  required
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 p-2.5 rounded-lg">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={starting}
                className="w-full flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
              >
                {starting ? (
                  <>
                    <svg className="-ml-1 mr-2 h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Initializing AI Interviewer...
                  </>
                ) : (
                  'Start Interview'
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: History List */}
        <div className="md:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-wide">
              Practice History
            </h2>

            {history.length > 0 ? (
              <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                {history.map((session) => (
                  <div
                    key={session._id}
                    className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white">
                        {session.jobTitle}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(session.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      {session.status === 'completed' ? (
                        <>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Score:</span>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              session.evaluation?.overallScore >= 75
                                ? 'bg-green-100 text-green-700 dark:bg-green-950/20 dark:text-green-400'
                                : session.evaluation?.overallScore >= 50
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400'
                            }`}>
                              {session.evaluation?.overallScore}%
                            </span>
                          </div>
                          <button
                            onClick={() => navigate(`/seeker/interview/${session._id}/report`)}
                            className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            View Report
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/20 dark:text-blue-400">
                            Active
                          </span>
                          <button
                            onClick={() => navigate(`/seeker/interview/${session._id}`)}
                            className="rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                          >
                            Resume
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-8 flex flex-col items-center justify-center text-center">
                <span className="text-4xl">🎙️</span>
                <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No practice sessions yet
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Create a session on the left to start practicing.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
