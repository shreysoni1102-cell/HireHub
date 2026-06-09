import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const { register, verifyEmail, resendCode } = useAuth();
  const navigate = useNavigate();

  // Registration Form States
  const [name,       setName]       = useState('');
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [role,       setRole]       = useState('user');
  
  // Verification States
  const [showVerify, setShowVerify] = useState(false);
  const [code,       setCode]       = useState('');
  const [regEmail,   setRegEmail]   = useState('');
  
  // Status States
  const [error,      setError]      = useState('');
  const [message,    setMessage]    = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      const res = await register({ name, email, password, role });
      setRegEmail(email);
      setShowVerify(true);
      setMessage(res.message || 'Verification code sent to your email.');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      const u = await verifyEmail(regEmail, code);
      if (u.role === 'admin')          navigate('/admin',     { replace: true });
      else if (u.role === 'recruiter') navigate('/recruiter', { replace: true });
      else                             navigate('/',           { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setMessage('');
    try {
      const res = await resendCode(regEmail);
      setMessage(res.message || 'Verification code has been resent.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code');
    }
  };

  const inputClass = "w-full rounded-lg px-4 py-3 text-sm border focus:outline-none transition-colors text-center font-semibold tracking-wider";
  const inputStyle = {
    backgroundColor: 'var(--bg-page)',
    borderColor: 'var(--border)',
    color: 'var(--text-primary)',
  };
  const onFocus  = (e) => (e.target.style.borderColor = 'var(--accent)');
  const onBlur   = (e) => (e.target.style.borderColor = 'var(--border)');

  return (
    <div
      className="flex flex-1 items-center justify-center px-4 py-12 transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg-page)' }}
    >
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg">
              <span className="text-white font-black text-base">H</span>
            </div>
            <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>HireHub</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {showVerify ? 'Verify your email' : 'Create an account'}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {showVerify 
              ? `We sent a 6-digit code to ${regEmail}` 
              : 'Join HireHub as a job seeker or recruiter.'}
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border p-6 shadow-lg transition-colors duration-200"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          {error && (
            <div className="mb-4 rounded-lg border px-4 py-3 text-sm"
                 style={{ borderColor: 'var(--danger)', backgroundColor: 'var(--danger-muted)', color: 'var(--danger)' }}>
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 rounded-lg border px-4 py-3 text-sm text-green-700 bg-green-50 dark:bg-green-900/10 dark:text-green-400"
                 style={{ borderColor: 'rgba(16, 185, 129, 0.2)' }}>
              {message}
            </div>
          )}

          {showVerify ? (
            /* Verification Code Form */
            <form onSubmit={handleVerifySubmit} className="space-y-4">
              <div>
                <label htmlFor="code"
                  className="block text-xs font-semibold uppercase tracking-widest mb-1.5 text-center"
                  style={{ color: 'var(--text-muted)' }}>
                  Verification Code (OTP)
                </label>
                <input
                  id="code"
                  type="text"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className={inputClass}
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={submitting || code.length !== 6}
                className="w-full rounded-lg py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-60 transition-colors mt-2"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Verifying...
                  </span>
                ) : 'Verify Account'}
              </button>

              <div className="flex flex-col gap-2 pt-2 text-center text-xs text-muted-style" style={{ color: 'var(--text-muted)' }}>
                <p>
                  Didn't receive the code?{' '}
                  <button 
                    type="button" 
                    onClick={handleResend}
                    className="font-semibold hover:underline text-blue-500"
                    style={{ color: 'var(--accent)' }}
                  >
                    Resend Code
                  </button>
                </p>
                <p>
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowVerify(false);
                      setError('');
                      setMessage('');
                    }}
                    className="font-medium hover:underline text-accent"
                  >
                    Change email / Back to Register
                  </button>
                </p>
              </div>
            </form>
          ) : (
            /* Standard Registration Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label htmlFor="name"
                  className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
                  style={{ color: 'var(--text-muted)' }}>
                  Full Name
                </label>
                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full rounded-lg px-4 py-3 text-sm border focus:outline-none transition-colors"
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email"
                  className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
                  style={{ color: 'var(--text-muted)' }}>
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg px-4 py-3 text-sm border focus:outline-none transition-colors"
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
                  style={{ color: 'var(--text-muted)' }}>
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  className="w-full rounded-lg px-4 py-3 text-sm border focus:outline-none transition-colors"
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  required
                />
              </div>

              {/* Role selection */}
              <div>
                <span className="block text-xs font-semibold uppercase tracking-widest mb-3"
                      style={{ color: 'var(--text-muted)' }}>
                  I am a
                </span>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'user',      label: '🎓  Job Seeker',  desc: 'Browse & apply to jobs' },
                    { value: 'recruiter', label: '💼 Recruiter',   desc: 'Post jobs & hire talent' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRole(opt.value)}
                      className="rounded-xl border-2 p-3 text-left transition-all"
                      style={{
                        borderColor: role === opt.value ? 'var(--accent)' : 'var(--border)',
                        backgroundColor: role === opt.value ? 'var(--accent-muted)' : 'var(--bg-page)',
                      }}
                    >
                      <p className="text-sm font-semibold" style={{ color: role === opt.value ? 'var(--accent)' : 'var(--text-primary)' }}>
                        {opt.label}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {opt.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-60 transition-colors mt-2"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Creating account...
                  </span>
                ) : 'Create Account'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-5 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          {showVerify ? '' : (
            <>
              Already have an account?{' '}
              <Link to="/login" className="font-medium hover:underline" style={{ color: 'var(--accent)' }}>
                Login
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
