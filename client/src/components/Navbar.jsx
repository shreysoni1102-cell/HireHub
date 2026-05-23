import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const linkClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
  }`;

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="font-display text-xl font-bold text-brand-700">
          HireHub
        </Link>

        <nav className="flex flex-wrap items-center gap-1">
          <NavLink to="/" className={linkClass} end>
            Jobs
          </NavLink>

          {isAuthenticated && user?.role === 'user' && (
            <>
              <NavLink to="/seeker/applications" className={linkClass}>
                My applications
              </NavLink>
              <NavLink to="/ats-checker" className={linkClass}>
                🤖 ATS Checker
              </NavLink>
            </>
          )}

          {isAuthenticated && user?.role === 'recruiter' && (
            <NavLink to="/recruiter" className={linkClass}>
              Recruiter
            </NavLink>
          )}

          {isAuthenticated && user?.role === 'admin' && (
            <NavLink to="/admin" className={linkClass}>
              Admin
            </NavLink>
          )}

          {!isAuthenticated ? (
            <>
              <NavLink to="/login" className={linkClass}>
                Login
              </NavLink>
              <NavLink to="/register" className={linkClass}>
                Register
              </NavLink>
            </>
          ) : (
            <div className="ml-2 flex items-center gap-2">
              <span className="hidden text-xs text-slate-500 sm:inline">
                {user.name} · <span className="capitalize">{user.role}</span>
              </span>
              <button
                type="button"
                onClick={logout}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Log out
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
