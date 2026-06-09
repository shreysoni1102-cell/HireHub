import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useState, useEffect, useRef } from 'react';
import api from '../api/axios.js';

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const mobileLinkClass = ({ isActive }) =>
    `flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
      isActive
        ? 'text-[var(--accent)] bg-[var(--accent-muted)]'
        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]'
    }`;

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  // Fetch applicant's shortlisted notifications
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'user') {
      setNotifications([]);
      return;
    }

    const fetchNotifications = async () => {
      try {
        const { data } = await api.get('/applications/my');
        // Filter applications where status is 'shortlisted'
        const shortlisted = data.filter(app => app.status === 'shortlisted');
        setNotifications(shortlisted);
      } catch (err) {
        console.error('Failed to load notifications:', err.message);
      }
    };

    fetchNotifications();
    // Poll every 30 seconds for live updates
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const linkClass = ({ isActive }) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'text-[var(--navbar-active)] bg-[var(--accent-muted)]'
        : 'text-[var(--navbar-text)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-3)]'
    }`;

return (
  <>
    <header
      className="sticky top-0 z-50 flex items-center justify-between px-6 h-14 border-b transition-colors duration-200"
      style={{ backgroundColor: 'var(--navbar-bg)', borderColor: 'var(--navbar-border)' }}
    >
      <div className="flex items-center gap-2">
        {/* Hamburger Button */}
        <button
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="flex md:hidden items-center justify-center p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--navbar-text)' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-3)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          aria-label="Toggle mobile menu"
        >
          {isMenuOpen ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center shadow-lg">
            <span className="text-white font-black text-sm select-none">H</span>
          </div>
          <span className="font-bold text-lg tracking-tight" style={{ color: 'var(--text-primary)' }}>HireHub</span>
        </Link>
      </div>

      {/* Nav Links */}
      <nav className="hidden md:flex items-center gap-1">
        <NavLink to="/" end className={linkClass}>Jobs</NavLink>

        {isAuthenticated && user?.role === 'user' && (
          <>
            <NavLink to="/ats-checker"       className={linkClass}>ATS Checker</NavLink>
            <NavLink to="/seeker/interview"  className={linkClass}>Interview Bot</NavLink>
            <NavLink to="/seeker/profile"    className={linkClass}>Profile</NavLink>
            <NavLink to="/seeker/applications" className={linkClass}>Applications</NavLink>
          </>
        )}
        {isAuthenticated && user?.role === 'recruiter' && (
          <NavLink to="/recruiter" className={linkClass}>Dashboard</NavLink>
        )}
        {isAuthenticated && user?.role === 'admin' && (
          <NavLink to="/admin" className={linkClass}>Admin</NavLink>
        )}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-2">

        {/* ── Theme Toggle ── */}
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{
            color: 'var(--navbar-text)',
            backgroundColor: 'transparent',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-3)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          {theme === 'dark' ? (
            /* Sun icon for switching to light */
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"
              />
            </svg>
          ) : (
            /* Moon icon for switching to dark */
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          )}
        </button>

        {!isAuthenticated ? (
          <>
            <Link
              to="/login"
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border"
              style={{ color: 'var(--navbar-text)', borderColor: 'var(--navbar-border)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'white')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--navbar-text)')}
            >
              Login
            </Link>
            <Link
              to="/register"
              className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors"
            >
              Register
            </Link>
          </>
        ) : (
          <>
            {/* Bell Notifications Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors relative"
                style={{ color: 'var(--navbar-text)' }}
                title="Notifications"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border border-[var(--navbar-bg)] animate-pulse" />
                )}
              </button>

              {/* Notification Dropdown List */}
              {showNotifications && (
                <div 
                  className="absolute right-0 mt-2 w-72 rounded-xl border shadow-xl overflow-hidden z-50 transition-all"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
                >
                  <div className="p-3.5 border-b" style={{ borderColor: 'var(--border)' }}>
                    <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                      Notifications ({notifications.length})
                    </h4>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y" style={{ borderColor: 'var(--border)' }}>
                    {notifications.length > 0 ? (
                      notifications.map((n) => (
                        <div 
                          key={n._id}
                          onClick={() => {
                            setShowNotifications(false);
                            navigate(`/chat/${n._id}`);
                          }}
                          className="p-3.5 text-xs cursor-pointer hover:bg-slate-500/5 transition-colors text-left"
                        >
                          <p style={{ color: 'var(--text-primary)' }} className="font-semibold leading-normal">
                            🎉 Shortlisted for "{n.jobId?.title || 'Position'}"
                          </p>
                          <p style={{ color: 'var(--text-muted)' }} className="mt-1">
                            {n.jobId?.company} • Click to chat with recruiter
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="p-4 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                        No new updates. We will notify you when you get shortlisted!
                      </p>
                    )}
                  </div>
                  <div className="p-2.5 bg-[var(--bg-surface-2)] text-center border-t" style={{ borderColor: 'var(--border)' }}>
                    <Link 
                      to="/seeker/applications" 
                      onClick={() => setShowNotifications(false)}
                      className="text-xs font-semibold hover:underline"
                      style={{ color: 'var(--accent)' }}
                    >
                      View all applications
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* User info + avatar Link to Account settings */}
            <Link
              to="/account"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              title="Account Settings"
            >
              <div className="hidden sm:block text-right">
                <p className="text-xs font-semibold leading-tight animate-in fade-in" style={{ color: 'var(--text-primary)' }}>{user?.name}</p>
                <p className="text-xs capitalize leading-tight" style={{ color: 'var(--navbar-text)' }}>{user?.role}</p>
              </div>
              <div
                className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold select-none"
              >
                {initials}
              </div>
            </Link>
            <button
              onClick={logout}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
              style={{ color: 'var(--navbar-text)', borderColor: 'var(--navbar-border)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--danger)';
                e.currentTarget.style.borderColor = 'var(--danger)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--navbar-text)';
                e.currentTarget.style.borderColor = 'var(--navbar-border)';
              }}
            >
              Logout
            </button>
          </>
        )}
      </div>
    </header>

    {/* Mobile Drawer Overlay */}
    {isMenuOpen && (
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden"
        onClick={() => setIsMenuOpen(false)}
      />
    )}

    {/* Mobile Drawer Menu */}
    <div
      className={`fixed top-0 bottom-0 left-0 z-50 w-72 max-w-[80vw] transform transition-transform duration-300 ease-in-out md:hidden flex flex-col`}
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        boxShadow: 'var(--shadow-xl)',
        transform: isMenuOpen ? 'translateX(0)' : 'translateX(-100%)'
      }}
    >
      {/* Drawer Header */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-xs">H</span>
          </div>
          <span className="font-bold text-[var(--text-primary)] text-base">HireHub</span>
        </div>
        <button
          type="button"
          onClick={() => setIsMenuOpen(false)}
          className="p-1 rounded-lg hover:bg-[var(--bg-surface-3)] transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* User Info (if logged in) - Clicking it opens Account Settings */}
        {isAuthenticated && (
          <Link
            to="/account"
            onClick={() => setIsMenuOpen(false)}
            className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-surface-2)] border w-full hover:bg-[var(--bg-surface-3)] transition-colors text-left"
            style={{ borderColor: 'var(--border)' }}
            title="Account Settings"
          >
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold shadow shrink-0">
              {initials}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-[var(--text-primary)] truncate">{user?.name}</p>
              <p className="text-xs text-[var(--text-muted)] truncate">{user?.email}</p>
              <span className="inline-flex mt-1 items-center px-2 py-0.5 rounded-full text-3xs font-medium uppercase bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                {user?.role}
              </span>
            </div>
          </Link>
        )}

        {/* Links */}
        <div className="flex flex-col gap-1">
          <NavLink to="/" end onClick={() => setIsMenuOpen(false)} className={mobileLinkClass}>
            Jobs
          </NavLink>

          {isAuthenticated && user?.role === 'user' && (
            <>
              <NavLink to="/ats-checker" onClick={() => setIsMenuOpen(false)} className={mobileLinkClass}>
                ATS Checker
              </NavLink>
              <NavLink to="/seeker/interview" onClick={() => setIsMenuOpen(false)} className={mobileLinkClass}>
                Interview Bot
              </NavLink>
              <NavLink to="/seeker/profile" onClick={() => setIsMenuOpen(false)} className={mobileLinkClass}>
                Profile
              </NavLink>
              <NavLink to="/seeker/applications" onClick={() => setIsMenuOpen(false)} className={mobileLinkClass}>
                Applications
              </NavLink>
            </>
          )}

          {isAuthenticated && user?.role === 'recruiter' && (
            <>
              <NavLink to="/recruiter" onClick={() => setIsMenuOpen(false)} className={mobileLinkClass}>
                Dashboard
              </NavLink>
            </>
          )}

          {isAuthenticated && user?.role === 'admin' && (
            <>
              <NavLink to="/admin" onClick={() => setIsMenuOpen(false)} className={mobileLinkClass}>
                Admin
              </NavLink>
            </>
          )}
        </div>
      </div>

      {/* Drawer Footer */}
      <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
        {isAuthenticated ? (
          <button
            onClick={() => {
              setIsMenuOpen(false);
              logout();
            }}
            className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors shadow-sm"
          >
            Logout
          </button>
        ) : (
          <div className="flex gap-2">
            <Link
              to="/login"
              onClick={() => setIsMenuOpen(false)}
              className="flex-1 text-center px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
              style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}
            >
              Login
            </Link>
            <Link
              to="/register"
              onClick={() => setIsMenuOpen(false)}
              className="flex-1 text-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-sm"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </div>
  </>
  );
}
