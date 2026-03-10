import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ROUTES } from '../utils/constants';
import '../styles/login.css';

/**
 * Login Page Component
 * Handles user authentication with email and password
 * Supports demo account authentication simulation
 * @component
 */
export function Login() {
  // User enters their own credentials
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  const navigate = useNavigate();
  const { signIn, user, loading } = useAuth();

  useEffect(() => { setMounted(true); }, []);

  /**
   * Redirect authenticated users to dashboard
   */
  React.useEffect(() => {
    if (user && !loading) {
      navigate(ROUTES.HOME, { replace: true });
    }
  }, [user, loading, navigate]);

  /**
   * Handle input field changes
   * @param {Event} e - Change event from input field
   */
  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    setError('');
  };

  /**
   * Handle form submission for login
   * @param {Event} e - Form submit event
   */
  const handleSubmit = async e => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      // Use proper Supabase authentication
      const { user, session } = await signIn(form.email, form.password);
      
      if (user && session) {
        // Authentication successful - AuthContext will handle state updates
        // Navigation will happen automatically via useEffect
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Invalid email or password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Demo info functionality removed for production security

  return (
    <div className="login-page min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="login-bg-gradient" />
      <div className="login-bg-orb login-bg-orb-1" />
      <div className="login-bg-orb login-bg-orb-2" />
      <div className="login-bg-orb login-bg-orb-3" />

      {/* Main card */}
      <div className={`w-full max-w-[400px] relative z-10 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
        {/* Logo + brand */}
        <div className="text-center mb-8">
          <div className="login-logo-glow inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-4 relative">
            <img src="/brain-icon-nBG.png" alt="BoilerBrain" className="w-14 h-14 relative z-10" />
          </div>
          <h1 className="text-[28px] font-bold text-white tracking-tight">BoilerBrain</h1>
          <p className="text-[15px] text-white/50 mt-1">AI-Powered Gas Engineer Assistant</p>
        </div>

        {/* Login card */}
        <div className="login-card rounded-2xl p-6 md:p-8">
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-white/60 pl-1">Email</label>
              <input
                className="login-input w-full rounded-xl px-4 py-3.5 text-white text-[16px] placeholder:text-white/25 focus:outline-none"
                type="email"
                name="email"
                placeholder="your@email.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-white/60 pl-1">Password</label>
              <input
                className="login-input w-full rounded-xl px-4 py-3.5 text-white text-[16px] placeholder:text-white/25 focus:outline-none"
                type="password"
                name="password"
                placeholder="Enter password"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <span className="text-red-400 text-sm flex-shrink-0">&#9888;</span>
                <span className="text-red-300 text-[13px]">{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="login-btn-primary w-full py-3.5 px-4 rounded-xl font-semibold text-[16px] text-white mt-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="login-spinner" />
                  Signing In...
                </span>
              ) : 'Sign In'}
            </button>

            {/* Forgot password */}
            <div className="text-center mt-3">
              <Link
                to={ROUTES.RESET_PASSWORD}
                className="text-white/40 text-[13px] hover:text-white/60 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Register link */}
            <div className="text-center mt-4">
              <span className="text-white/40 text-[14px]">
                Don't have an account?{' '}
              </span>
              <Link
                to={ROUTES.REGISTER}
                className="text-[#007AFF] font-medium text-[14px] hover:text-[#4DA3FF] transition-colors"
              >
                Create Account
              </Link>
            </div>
          </form>
        </div>

        {/* Trust signals */}
        <div className={`flex items-center justify-center gap-4 mt-6 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex items-center gap-1.5 text-white/30 text-[12px]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="m7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Encrypted
          </div>
          <div className="w-px h-3 bg-white/10" />
          <div className="flex items-center gap-1.5 text-white/30 text-[12px]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Gas Safe
          </div>
          <div className="w-px h-3 bg-white/10" />
          <div className="flex items-center gap-1.5 text-white/30 text-[12px]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            5,670+ Manuals
          </div>
        </div>
      </div>
    </div>
  );
}

// Default export for backward compatibility
export default Login;
