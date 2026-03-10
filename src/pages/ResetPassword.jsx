import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { ROUTES, VALIDATION } from '../utils/constants';

/**
 * Password Reset Page
 * Handles two flows:
 * 1. Request reset — user enters email, gets a reset link
 * 2. Set new password — user arrives via reset link with a session token
 */
export function ResetPassword() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  const navigate = useNavigate();
  const { resetPassword } = useAuth();

  // Detect if user arrived via a password reset link (Supabase sets a session)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setHasSession(true);
      }
    };
    checkSession();

    // Listen for auth state changes (Supabase fires PASSWORD_RECOVERY event)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setHasSession(true);
      }
    });
    return () => subscription?.unsubscribe();
  }, []);

  // Flow 1: Request password reset email
  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email) { setError('Please enter your email address'); return; }
    if (!VALIDATION.EMAIL_PATTERN.test(email)) { setError('Please enter a valid email address'); return; }

    setSubmitting(true);
    try {
      await resetPassword(email);
      setSuccess('Password reset link sent! Check your inbox (and spam folder).');
    } catch (err) {
      setError(err.message || 'Failed to send reset link. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Flow 2: Set new password
  const handleSetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newPassword) { setError('Please enter a new password'); return; }
    if (newPassword.length < VALIDATION.PASSWORD_MIN_LENGTH) {
      setError(`Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`); return;
    }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setSuccess('Password updated successfully! Redirecting to login...');
      setTimeout(() => navigate(ROUTES.LOGIN), 2000);
    } catch (err) {
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="w-full max-w-md bg-zinc-900 rounded-2xl shadow-2xl p-5 sm:p-8 md:p-12 border border-zinc-800">
        <div className="mb-8 text-center">
          <span className="text-4xl mb-3 block">🔐</span>
          <h1 className="text-xl font-light tracking-tight text-white">
            {hasSession ? 'Set New Password' : 'Reset Password'}
          </h1>
          <p className="text-zinc-400 text-sm mt-2">
            {hasSession
              ? 'Enter your new password below.'
              : 'Enter your email and we\'ll send you a reset link.'}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6 text-green-400 text-sm">
            {success}
          </div>
        )}

        {hasSession ? (
          <form onSubmit={handleSetPassword} className="flex flex-col gap-4">
            <input
              className="rounded-lg px-4 py-3 bg-zinc-800 text-white text-[16px] placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 border border-zinc-700"
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              autoFocus
            />
            <input
              className="rounded-lg px-4 py-3 bg-zinc-800 text-white text-[16px] placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 border border-zinc-700"
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 mt-2"
            >
              {submitting ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRequestReset} className="flex flex-col gap-4">
            <input
              className="rounded-lg px-4 py-3 bg-zinc-800 text-white text-[16px] placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 border border-zinc-700"
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 mt-2"
            >
              {submitting ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <div className="mt-8 text-center">
          <Link to={ROUTES.LOGIN} className="text-blue-400 text-sm hover:text-blue-300 transition-colors">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
