import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ROUTES, TIME, VALIDATION, INVITE_CODES } from '../utils/constants';

/**
 * Registration Page Component
 * Handles user registration, form validation, and payment method selection
 * Creates user accounts in Supabase auth and additional profile information
 */
export function Register() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    inviteCode: '',
    agree: false,
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Payment method selection (default: card)
  const [paymentMethod, setPaymentMethod] = useState('card');

  // Use valid invite codes from constants
  const validInviteCodes = INVITE_CODES.VALID_CODES;

  const navigate = useNavigate();
  const { signUp, createUserProfile, user } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate(ROUTES.HOME);
    }
  }, [user, navigate]);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
    // Clear specific error when field is changed
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const handlePaymentMethod = e => setPaymentMethod(e.target.value);

  /**
   * Validate form fields
   * @returns {Object} Object containing validation errors
   */
  const validate = () => {
    const errs = {};
    if (!form.name) errs.name = 'Full name required';
    if (!form.email) errs.email = 'Email required';
    if (!VALIDATION.EMAIL_PATTERN.test(form.email)) errs.email = 'Invalid email';
    if (!form.password) errs.password = 'Password required';
    if (form.password.length < VALIDATION.PASSWORD_MIN_LENGTH)
      errs.password = `Min ${VALIDATION.PASSWORD_MIN_LENGTH} characters`;
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    // Make invitation code optional - if provided, validate it, but don't require it
    if (form.inviteCode && !validInviteCodes.includes(form.inviteCode.trim().toUpperCase()))
      errs.inviteCode = 'Invalid invitation code';
    if (!form.agree) errs.agree = 'You must agree to the terms';
    return errs;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);

    if (Object.keys(errs).length === 0) {
      setSubmitting(true);

      try {
        // Sign up with Supabase Auth
        const { data, error } = await signUp(form.email, form.password, {
          name: form.name,
          tier: 'Free', // Default tier for new users
          inviteCode: form.inviteCode,
        });

        if (error) throw error;

        // Create profile record in the users table
        if (data?.user) {
          await createUserProfile(data.user.id, form.name, form.email);
        }

        // Show success message (we might need to verify email first)
        setSuccess(true);

        // Redirect to dashboard if confirmed immediately, or stay on page with success message
        if (data?.session) {
          setTimeout(() => navigate(ROUTES.HOME), TIME.REDIRECT_DELAY);
        }
      } catch (error) {
        console.error('Registration error:', error);
        setErrors({ submit: error.message || 'Failed to register. Please try again.' });
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="w-full max-w-md bg-zinc-900 rounded-2xl shadow-2xl p-8 md:p-12 border border-zinc-800">
        {success ? (
          <div className="py-8 text-center">
            <div className="text-green-400 text-4xl mb-3">✓</div>
            <h2 className="text-xl font-light tracking-tight text-white mb-4">
              Registration Successful!
            </h2>
            <p className="text-zinc-400 mb-8">
              Your account has been created. You can now log in to access Boiler Brain.
            </p>
            <Link
              to={ROUTES.LOGIN}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg block text-center transition-colors"
            >
              Continue to Sign In
            </Link>
          </div>
        ) : (
          <>
            {/* Free Trial Offer */}
            <div className="mb-8 text-center">
              <div className="text-xl md:text-2xl font-light tracking-tight text-white">
                3 Day Free Trial
              </div>
              <div className="mt-2 text-md text-zinc-400">
                Then only <span className="font-medium text-blue-400">£5/mo</span> (50% off) after
                your trial.
              </div>
            </div>

            {errors.submit && (
              <div className="bg-zinc-800 rounded-xl p-5 mb-6 text-red-400 text-sm">
                {errors.submit}
              </div>
            )}

            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <input
                className="rounded-lg px-4 py-3 bg-zinc-800 text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 border border-zinc-700"
                type="text"
                name="inviteCode"
                placeholder="Invitation Code (Optional)"
                value={form.inviteCode}
                onChange={handleChange}
                autoComplete="off"
              />
              {errors.inviteCode && (
                <span className="text-red-400 text-xs mt-1">{errors.inviteCode}</span>
              )}
              <input
                className="rounded-lg px-4 py-3 bg-zinc-800 text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 border border-zinc-700"
                type="text"
                name="name"
                placeholder="Full Name"
                value={form.name}
                onChange={handleChange}
                autoComplete="name"
              />
              {errors.name && <span className="text-red-400 text-xs mt-1">{errors.name}</span>}

              <input
                className="rounded-lg px-4 py-3 bg-zinc-800 text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 border border-zinc-700"
                type="email"
                name="email"
                placeholder="Email Address"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
              />
              {errors.email && <span className="text-red-400 text-xs mt-1">{errors.email}</span>}

              <input
                className="rounded-lg px-4 py-3 bg-zinc-800 text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 border border-zinc-700"
                type="password"
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
              />
              {errors.password && (
                <span className="text-red-400 text-xs mt-1">{errors.password}</span>
              )}

              <input
                className="rounded-lg px-4 py-3 bg-zinc-800 text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 border border-zinc-700"
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password"
                value={form.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <span className="text-red-400 text-xs mt-1">{errors.confirmPassword}</span>
              )}

              {/* Payment Methods */}
              <div className="flex flex-col gap-2 bg-white/5 p-3 rounded">
                <div className="font-semibold text-ai-blue mb-1">Payment Method</div>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={handlePaymentMethod}
                  />
                  <span>Credit/Debit Card</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="paypal"
                    checked={paymentMethod === 'paypal'}
                    onChange={handlePaymentMethod}
                  />
                  <span>PayPal</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="apple"
                    checked={paymentMethod === 'apple'}
                    onChange={handlePaymentMethod}
                  />
                  <span>Apple Pay</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="google"
                    checked={paymentMethod === 'google'}
                    onChange={handlePaymentMethod}
                  />
                  <span>Google Pay</span>
                </label>
              </div>

              {/* Terms and Trial Note */}
              <div className="flex flex-col gap-2 mt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="agree"
                    className="text-blue-500 rounded focus:ring-0 bg-zinc-800 border-zinc-700"
                    checked={form.agree}
                    onChange={handleChange}
                  />
                  <span className="text-zinc-400 text-sm">
                    I agree to the{' '}
                    <a href="#" className="text-blue-400">
                      Terms
                    </a>{' '}
                    and{' '}
                    <a href="#" className="text-blue-400">
                      Privacy Policy
                    </a>
                  </span>
                </label>
                {errors.agree && <span className="text-red-400 text-xs mt-1">{errors.agree}</span>}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 mt-6"
              >
                {submitting ? 'Creating Account...' : 'Start Free Trial'}
              </button>
            </form>

            <div className="mt-8 text-center">
              <span className="text-zinc-400 text-sm">Already have an account? </span>
              <Link to={ROUTES.LOGIN} className="text-blue-400 font-medium">
                Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Default export for backward compatibility
export default Register;
