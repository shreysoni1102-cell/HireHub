import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Profile() {
  const { user, deleteAccount } = useAuth();
  const navigate = useNavigate();

  // Self deletion states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const isDemo = user?.email?.toLowerCase().endsWith('@hirehub.demo');

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const handleDeleteConfirm = async (e) => {
    e.preventDefault();
    setDeleteError('');

    if (confirmEmail.trim().toLowerCase() !== user?.email?.toLowerCase()) {
      setDeleteError('Confirmed email does not match your account email.');
      return;
    }

    if (isDemo) {
      setDeleteError('Demo accounts cannot be deleted.');
      return;
    }

    try {
      setDeleting(true);
      const res = await deleteAccount();
      if (res.success) {
        navigate('/login', { state: { infoMessage: 'Your account has been deleted permanently.' } });
      }
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Failed to delete account. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      {/* Page Header */}
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-p">
          Account Profile
        </h1>
        <p className="mt-2 text-sm text-m">
          Manage your personal credentials, view system identifiers, and manage your account.
        </p>
      </div>

      {/* Account Details Card */}
      <div className="space-y-8">
        <div 
          className="rounded-2xl border p-6 shadow-md transition-colors"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <div className="flex flex-col items-center text-center">
            {/* Initials Avatar */}
            <div 
              className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-3xl font-black shadow-lg select-none mb-4 animate-pulse-slow"
            >
              {initials}
            </div>
            <h2 className="text-2xl font-bold text-p">{user?.name}</h2>
            <p className="text-sm text-m mt-1">{user?.email}</p>
            
            <span className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50">
              {user?.role} Badge
            </span>
          </div>

          <div className="mt-8 border-t pt-6 space-y-4" style={{ borderColor: 'var(--border)' }}>
            <div className="flex justify-between text-sm">
              <span className="text-m">System Role:</span>
              <span className="font-semibold capitalize text-p">{user?.role}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-m">Account ID:</span>
              <span className="font-mono text-xs font-medium truncate max-w-[200px] text-p" title={user?.id}>
                {user?.id}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-m">Status:</span>
              <span className="font-semibold text-green-600 dark:text-green-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Active
              </span>
            </div>
          </div>
        </div>

        {/* Danger Zone Card */}
        <div 
          className="rounded-2xl border p-6 shadow-md transition-colors"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <h3 className="text-lg font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">
            Danger Zone
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-m">
            Permanently delete your account and all associated applications, evaluations, chat rooms, and profiles. This action is irreversible.
          </p>
          <button
            onClick={() => {
              setConfirmEmail('');
              setDeleteError('');
              setShowDeleteModal(true);
            }}
            className="mt-6 w-full rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold py-2.5 px-4 text-sm transition shadow-sm hover:shadow"
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* ── Secure Delete Account Confirmation Modal ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div 
            className="w-full max-w-md rounded-2xl border p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-left"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-lg font-bold">Delete Account Permanently?</h3>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-m">
              This will permanently remove your user credentials and delete all applications, posted jobs, active evaluations, and messaging transcripts associated with **{user?.email}**. This cannot be undone.
            </p>

            {isDemo && (
              <div className="mt-3.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-400 border border-amber-200/40">
                ℹ️ **Demo Account Safety:** You can test the deletion interface below, but the actual deletion operation will be blocked by system security.
              </div>
            )}

            <form onSubmit={handleDeleteConfirm} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-p">
                  Type your email address (<span className="font-semibold select-all">{user?.email}</span>) to confirm:
                </label>
                <input
                  type="text"
                  required
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  placeholder={user?.email}
                  className="w-full rounded-xl border bg-transparent py-2.5 px-3 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                />
              </div>

              {deleteError && (
                <div className="rounded-xl bg-red-50 dark:bg-red-950/20 p-3 text-xs text-red-700 dark:text-red-400 border border-red-200/40">
                  ⚠️ {deleteError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="rounded-xl px-4 py-2 text-xs font-semibold border border-border text-primary hover:bg-surface-2 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleting}
                  className="rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold px-4 py-2 text-xs transition shadow-sm hover:shadow"
                >
                  {deleting ? 'Deleting...' : 'Permanently Delete Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
