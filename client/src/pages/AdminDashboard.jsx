import { useEffect, useState } from 'react';
import api from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';

// Helper to get initials from user's name
const getInitials = (name) => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Helper to assign dynamic avatar colors based on hash of name
const getAvatarColor = (name) => {
  const colors = [
    { bg: 'rgba(37, 99, 235, 0.1)', text: '#58a6ff' },    // Blue
    { bg: 'rgba(16, 185, 129, 0.1)', text: '#3fb950' },   // Green
    { bg: 'rgba(139, 92, 246, 0.1)', text: '#a78bfa' },   // Purple
    { bg: 'rgba(239, 68, 68, 0.1)', text: '#f85149' },    // Red
    { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b' },    // Orange
  ];
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

// Stat Card Component
function AdminStatCard({ icon, label, value, colorClass }) {
  const colors = {
    blue:   { bg: 'var(--accent-muted)', text: 'var(--accent)', iconBg: 'rgba(37, 99, 235, 0.15)' },
    green:  { bg: 'var(--success-muted)', text: 'var(--success)', iconBg: 'rgba(16, 185, 129, 0.15)' },
    purple: { bg: 'rgba(139, 92, 246, 0.1)', text: '#a78bfa', iconBg: 'rgba(139, 92, 246, 0.2)' },
    orange: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', iconBg: 'rgba(245, 158, 11, 0.2)' },
  };
  const activeColor = colors[colorClass] || colors.blue;
  return (
    <div
      className="rounded-xl p-5 border flex items-center justify-between transition-all duration-200 hover:shadow-md"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border)',
      }}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {label}
        </p>
        <p className="text-3xl font-extrabold mt-2" style={{ color: 'var(--text-primary)' }}>
          {value}
        </p>
      </div>
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm"
        style={{ backgroundColor: activeColor.iconBg }}
      >
        {icon}
      </div>
    </div>
  );
}

// Role Badge Component
function RoleBadge({ role }) {
  const config = {
    admin: {
      bg: 'rgba(139, 92, 246, 0.1)',
      text: '#a78bfa',
      border: 'rgba(139, 92, 246, 0.2)',
      label: 'Admin'
    },
    recruiter: {
      bg: 'var(--success-muted)',
      text: 'var(--success)',
      border: 'rgba(16, 185, 129, 0.2)',
      label: 'Recruiter'
    },
    user: {
      bg: 'var(--accent-muted)',
      text: 'var(--accent)',
      border: 'rgba(37, 99, 235, 0.2)',
      label: 'Job Seeker'
    }
  };
  const r = config[role?.toLowerCase()] || {
    bg: 'var(--bg-surface-2)',
    text: 'var(--text-primary)',
    border: 'var(--border)',
    label: role
  };
  return (
    <span
      className="px-2.5 py-1 rounded-full text-xs font-semibold border inline-block tracking-wide"
      style={{ backgroundColor: r.bg, color: r.text, borderColor: r.border }}
    >
      {r.label}
    </span>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    const { data } = await api.get('/admin/users');
    setUsers(data);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.message || 'Failed to load users');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const remove = async (id) => {
    if (String(id) === String(user?.id)) {
      alert('You cannot delete your own account.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this user account? This action cannot be undone.')) return;
    try {
      await api.delete(`/admin/user/${id}`);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || 'Delete failed');
    }
  };

  // Compute stat metrics from loaded data
  const stats = {
    total: users.length,
    seekers: users.filter(u => u.role?.toLowerCase() === 'user').length,
    recruiters: users.filter(u => u.role?.toLowerCase() === 'recruiter').length,
    admins: users.filter(u => u.role?.toLowerCase() === 'admin').length,
  };

  // Filter users by search query
  const filteredUsers = users.filter((u) => {
    const s = search.toLowerCase();
    return (
      (u.name || '').toLowerCase().includes(s) ||
      (u.email || '').toLowerCase().includes(s) ||
      (u.role || '').toLowerCase().includes(s)
    );
  });

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 rounded-full border-4 border-blue-600/30 border-t-blue-600 animate-spin mb-4" />
        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Loading system accounts...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 md:px-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Admin Dashboard
          </h1>
          <p className="mt-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
            Monitor and manage registered user accounts across HireHub.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-800/30 bg-red-900/10 px-4 py-3 text-sm text-red-400 flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <AdminStatCard icon="👥" label="Total Accounts" value={stats.total} colorClass="blue" />
        <AdminStatCard icon="🎓" label="Job Seekers" value={stats.seekers} colorClass="purple" />
        <AdminStatCard icon="💼" label="Recruiters" value={stats.recruiters} colorClass="green" />
        <AdminStatCard icon="🛡️" label="Admins" value={stats.admins} colorClass="orange" />
      </div>

      {/* Main Table Card */}
      <div
        className="rounded-xl border shadow-sm overflow-hidden transition-all duration-200"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        {/* Search Header */}
        <div className="p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            System Users ({filteredUsers.length} of {stats.total})
          </h2>
          <div className="relative w-full sm:w-72">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-style" style={{ color: 'var(--text-muted)' }}>
              🔍
            </span>
            <input
              type="text"
              placeholder="Search by name, email, or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              style={{
                backgroundColor: 'var(--bg-page)',
                color: 'var(--text-primary)',
                borderColor: 'var(--border)',
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-surface-2)', borderBottom: '1px solid var(--border)' }}>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Name</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Email</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Role</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Joined Date</th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const avatarColor = getAvatarColor(u.name);
                const isSelf = String(u._id) === String(user?.id);
                return (
                  <tr
                    key={u._id}
                    className="transition-colors hover:bg-surface-2"
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    {/* Name column with avatar */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-sm"
                          style={{ backgroundColor: avatarColor.bg, color: avatarColor.text }}
                        >
                          {getInitials(u.name)}
                        </div>
                        <div>
                          <div className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                            {u.name}
                            {isSelf && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                You
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    {/* Email column */}
                    <td className="px-6 py-4 text-xs font-mono" style={{ color: 'var(--text-primary)' }}>
                      {u.email}
                    </td>
                    {/* Role badge column */}
                    <td className="px-6 py-4">
                      <RoleBadge role={u.role} />
                    </td>
                    {/* Joined Date column */}
                    <td className="px-6 py-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {u.createdAt
                        ? new Date(u.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>
                    {/* Actions column */}
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => remove(u._id)}
                        disabled={isSelf}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold border transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: 'rgba(248, 81, 73, 0.05)',
                          borderColor: isSelf ? 'var(--border)' : 'rgba(248, 81, 73, 0.3)',
                          color: isSelf ? 'var(--text-muted)' : '#f85149',
                        }}
                      >
                        Delete User
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    No matching accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
