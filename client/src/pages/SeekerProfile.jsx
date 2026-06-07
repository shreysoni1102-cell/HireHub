import { useEffect, useState } from 'react';
import api from '../api/axios.js';

export default function SeekerProfile() {
  const [profile, setProfile] = useState(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await api.get('/profile');
      if (data && data.success && data.data) {
        setProfile(data.data);
        setUsernameInput(data.data.githubUsername || '');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSync = async (e) => {
    e.preventDefault();
    if (!usernameInput.trim()) {
      setError('Please provide a valid GitHub username.');
      return;
    }

    try {
      setSyncing(true);
      setError('');
      setSuccessMsg('');
      const { data } = await api.post('/profile/github-sync', {
        githubUsername: usernameInput.trim()
      });
      if (data && data.success) {
        setProfile(data.data);
        setSuccessMsg('Profile successfully synced with GitHub.');
        // Clear success message after 4s
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Sync failed. Please check the username and try again.');
    } finally {
      setSyncing(false);
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
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Developer Profile
        </h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Sync your public GitHub projects to build an AI-powered bio and skills highlight sheet.
        </p>
      </div>

      {/* Sync Form */}
      <div className="mb-8 rounded-2xl border border-slate-200/80 bg-white/70 p-6 shadow-sm backdrop-blur transition-colors dark:border-slate-800/80 dark:bg-slate-900/70">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white">GitHub Integration</h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Enter your username to pull your top repositories and trigger AI profile categorization.
        </p>
        <form onSubmit={handleSync} className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-grow">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">@</span>
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="e.g. octocat"
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-8 pr-4 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              disabled={syncing}
            />
          </div>
          <button
            type="submit"
            disabled={syncing}
            className="flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
          >
            {syncing ? (
              <>
                <svg className="-ml-1 mr-2 h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Syncing Profile...
              </>
            ) : (
              'Sync with GitHub'
            )}
          </button>
        </form>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-400">
            ⚠️ {error}
          </div>
        )}
        {successMsg && (
          <div className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950/20 dark:text-green-400">
            ✅ {successMsg}
          </div>
        )}
      </div>

      {profile ? (
        <div className="grid gap-8 md:grid-cols-3">
          {/* Left Column: Bio & Skills */}
          <div className="space-y-8 md:col-span-1">
            {/* Bio Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-base font-bold text-slate-800 dark:text-white uppercase tracking-wide">
                AI Summary
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {profile.bio || 'Sync your GitHub profile to generate an AI bio.'}
              </p>
            </div>

            {/* Skills Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-base font-bold text-slate-800 dark:text-white uppercase tracking-wide">
                Skills Highlight
              </h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.skills && profile.skills.length > 0 ? (
                  profile.skills.map((skill, index) => {
                    const colors = [
                      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50',
                      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50',
                      'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/50',
                      'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/50',
                      'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900/50'
                    ];
                    const selectedColor = colors[index % colors.length];
                    return (
                      <span
                        key={index}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${selectedColor}`}
                      >
                        {skill}
                      </span>
                    );
                  })
                ) : (
                  <p className="text-sm text-slate-400">No skills identified yet.</p>
                )}
              </div>
            </div>

            {/* Meta Stats */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/50">
              <p className="text-xs text-slate-500">
                Last Synced: {new Date(profile.lastSynced).toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          {/* Right Column: Synced Repositories */}
          <div className="space-y-6 md:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-4 text-base font-bold text-slate-800 dark:text-white uppercase tracking-wide">
                Highlighted Repositories
              </h3>

              {profile.repositories && profile.repositories.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {profile.repositories.map((repo, idx) => (
                    <div
                      key={idx}
                      className="group flex flex-col justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition duration-200 hover:-translate-y-1 hover:border-slate-200 hover:bg-white hover:shadow-md dark:border-slate-800 dark:bg-slate-950/20 dark:hover:border-slate-700 dark:hover:bg-slate-950/50"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-slate-950 group-hover:text-blue-600 dark:text-white">
                            {repo.name}
                          </h4>
                          <span className="flex items-center text-xs font-medium text-amber-500">
                            ★ <span className="ml-1 text-slate-600 dark:text-slate-300">{repo.stars}</span>
                          </span>
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-3">
                          {repo.description || 'No description provided.'}
                        </p>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-2xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {repo.language}
                        </span>
                        <a
                          href={repo.repoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                        >
                          View Source ↗
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No repositories synced.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 py-16 text-center dark:border-slate-800">
          <span className="text-5xl">🐙</span>
          <h3 className="mt-4 text-base font-semibold text-slate-800 dark:text-white">No GitHub Profile Synced</h3>
          <p className="mt-2 text-sm text-slate-500">
            Connect your GitHub account above to automatically showcase your repositories and projects.
          </p>
        </div>
      )}
    </div>
  );
}
