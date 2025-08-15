import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ROUTES } from '../utils/constants';

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


  const navigate = useNavigate();
  const { signIn, user, loading } = useAuth();

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
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="w-full max-w-md bg-zinc-900 rounded-2xl shadow-2xl p-8 md:p-12 border border-zinc-800">
        <div className="mb-8 text-center">
          <div className="text-2xl font-light tracking-tight text-white">Login to Boiler Brain</div>
        </div>
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <input
            className="rounded-lg px-4 py-3 bg-zinc-800 text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 border border-zinc-700"
            type="email"
            name="email"
            placeholder="Email Address"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
          />
          <input
            className="rounded-lg px-4 py-3 bg-zinc-800 text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 border border-zinc-700"
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            autoComplete="current-password"
          />
          {error && <div className="text-red-400 text-xs bg-zinc-800 p-3 rounded-lg">{error}</div>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 bg-ios-blue text-white rounded-lg font-medium text-base hover:bg-ios-blue-dark transition-colors disabled:opacity-50"
          >
            {submitting ? 'Signing In...' : 'Sign In'}
          </button>



          <div className="text-center mt-6">
            <span className="text-ios-label-secondary text-sm">
              Don't have an account?{' '}
            </span>
            <Link
              to={ROUTES.REGISTER}
              className="text-ios-blue font-medium text-sm hover:underline"
            >
              Create Account
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

// Default export for backward compatibility
export default Login;
