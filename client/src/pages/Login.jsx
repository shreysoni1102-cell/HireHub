import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login, verifyEmail, resendCode, forgotPassword, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from     = location.state?.from?.pathname || '/';

  // Login Form States
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  
  // Verification States
  const [showVerify, setShowVerify] = useState(false);
  const [code,       setCode]       = useState('');
  const [regEmail,   setRegEmail]   = useState('');

  // Forgot Password States
  const [forgotFlow,  setForgotFlow]  = useState('login'); // 'login' | 'forgot' | 'reset'
  const [resetCode,   setResetCode]   = useState('');
  const [newPassword, setNewPassword] = useState('');
  
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
      const u = await login(email, password);
      if (u.role === 'admin')          navigate('/admin',     { replace: true });
      else if (u.role === 'recruiter') navigate('/recruiter', { replace: true });
      else                             navigate(from,          { replace: true });
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.isVerified === false) {
        setRegEmail(email);
        setShowVerify(true);
        setMessage(err.response?.data?.message || 'Please verify your email address first.');
      } else {
        setError(err.response?.data?.message || 'Login failed');
      }
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
      else                             navigate(from,          { replace: true });
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

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      await forgotPassword(email);
      setForgotFlow('reset');
      setMessage('A password reset code has been sent to your email.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset code');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      await resetPassword(email, resetCode, newPassword);
      setForgotFlow('login');
      setPassword('');
      setResetCode('');
      setNewPassword('');
      setMessage('Password reset successful! You can now log in.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    backgroundColor: 'var(--bg-page)',
    borderColor: 'var(--border)',
    color: 'var(--text-primary)',
  };

  const verifyInputClass = "w-full rounded-lg px-4 py-3 text-sm border focus:outline-none transition-colors text-center font-semibold tracking-wider";

  return (
    <div
      className="flex flex-1 items-center justify-center px-4 py-16 transition-colors duration-200"
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
            {showVerify 
              ? 'Verify your email' 
              : forgotFlow === 'forgot' 
              ? 'Reset your password' 
              : forgotFlow === 'reset' 
              ? 'Enter reset code' 
              : 'Welcome back'}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {showVerify 
              ? `We sent a 6-digit code to ${regEmail}` 
              : forgotFlow === 'forgot'
              ? 'Enter your email address to receive a reset code.'
              : forgotFlow === 'reset'
              ? `We sent a code to ${email}`
              : 'Sign in to apply or manage listings.'}
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
                  className={verifyInputClass}
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={(e)  => (e.target.style.borderColor  = 'var(--border)')}
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
                    Back to Login
                  </button>
                </p>
              </div>
            </form>
          ) : forgotFlow === 'forgot' ? (
            /* Forgot Password Request Form */
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <label htmlFor="forgot-email"
                  className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
                  style={{ color: 'var(--text-muted)' }}>
                  Email Address
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg px-4 py-3 text-sm border focus:outline-none transition-colors"
                  style={inputStyle}
                  placeholder="you@example.com"
                  onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={(e)  => (e.target.style.borderColor  = 'var(--border)')}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-60 transition-colors mt-2"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Sending Code...
                  </span>
                ) : 'Send Reset Code'}
              </button>

              <div className="text-center pt-2">
                <button 
                  type="button" 
                  onClick={() => {
                    setForgotFlow('login');
                    setError('');
                    setMessage('');
                  }}
                  className="text-xs font-medium hover:underline text-accent"
                >
                  Back to Login
                </button>
              </div>
            </form>
          ) : forgotFlow === 'reset' ? (
            /* Reset Password Form */
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div>
                <label htmlFor="reset-code"
                  className="block text-xs font-semibold uppercase tracking-widest mb-1.5 text-center"
                  style={{ color: 'var(--text-muted)' }}>
                  Reset Code (OTP)
                </label>
                <input
                  id="reset-code"
                  type="text"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  inputMode="numeric"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className={verifyInputClass}
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={(e)  => (e.target.style.borderColor  = 'var(--border)')}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="new-password"
                  className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
                  style={{ color: 'var(--text-muted)' }}>
                  New Password
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg px-4 py-3 text-sm border focus:outline-none transition-colors"
                  style={inputStyle}
                  placeholder="••••••••"
                  onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={(e)  => (e.target.style.borderColor  = 'var(--border)')}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting || resetCode.length !== 6}
                className="w-full rounded-lg py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-60 transition-colors mt-2"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Resetting...
                  </span>
                ) : 'Reset Password'}
              </button>

              <div className="text-center pt-2">
                <button 
                  type="button" 
                  onClick={() => {
                    setForgotFlow('login');
                    setError('');
                    setMessage('');
                  }}
                  className="text-xs font-medium hover:underline text-accent"
                >
                  Back to Login
                </button>
              </div>
            </form>
          ) : (
            /* Standard Login Form */
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  className="w-full rounded-lg px-4 py-3 text-sm border focus:outline-none transition-colors"
                  style={inputStyle}
                  placeholder="you@example.com"
                  onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={(e)  => (e.target.style.borderColor  = 'var(--border)')}
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label htmlFor="password"
                    className="block text-xs font-semibold uppercase tracking-widest"
                    style={{ color: 'var(--text-muted)' }}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotFlow('forgot');
                      setError('');
                      setMessage('');
                    }}
                    className="text-xs font-semibold text-blue-500 hover:underline focus:outline-none"
                    style={{ color: 'var(--accent)' }}
                  >
                    Forgot Password?
                  </button>
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg px-4 py-3 text-sm border focus:outline-none transition-colors"
                  style={inputStyle}
                  placeholder="••••••••"
                  onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={(e)  => (e.target.style.borderColor  = 'var(--border)')}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-60 transition-colors mt-2"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Signing in...
                  </span>
                ) : 'Sign in'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-5 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          {showVerify || forgotFlow !== 'login' ? '' : (
            <>
              No account?{' '}
              <Link to="/register" className="font-medium hover:underline" style={{ color: 'var(--accent)' }}>
                Register
              </Link>
            </>
          )}
        </p>

        {/* Demo hint */}
        {!showVerify && forgotFlow === 'login' && (
          <div
            className="mt-4 rounded-xl border p-4 text-xs"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}
          >
            <p className="font-semibold mb-2" style={{ color: 'var(--accent)' }}>
              Demo accounts (password: Password123!)
            </p>
            <p style={{ color: 'var(--text-muted)' }}>🎓  seeker@hirehub.demo</p>
            <p style={{ color: 'var(--text-muted)' }}>💼 recruiter@hirehub.demo</p>
            <p style={{ color: 'var(--text-muted)' }}>🛡️ admin@hirehub.demo</p>
          </div>
        )}
      </div>
    </div>
  );
}
