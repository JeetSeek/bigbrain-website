import React, { useState } from 'react';
import { demoSettingsService } from '../utils/demoSettingsService';
import { DEMO } from '../utils/constants';

/**
 * SettingsPanel Component
 * User profile and account settings interface
 * Allows users to update personal details, change password, manage subscription tier and notification preferences
 *
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.userData - User profile data
 * @param {string} props.userData.name - User's name
 * @param {string} props.userData.email - User's email
 * @param {string} props.userData.tier - Current subscription tier ('Free', 'Plus', 'Pro')
 * @param {boolean} props.userData.notifications_enabled - Notification preferences
 * @param {string} props.userName - User's display name
 * @returns {React.ReactElement} Settings interface
 */
export function SettingsPanel({ userData, userName }) {
  const [name, setName] = useState(userData.name || '');
  const [email, setEmail] = useState(userData.email || '');
  const [tier, setTier] = useState(userData.tier || DEMO.USER.DEFAULT_TIER);
  const [notifications, setNotifications] = useState(userData.notifications_enabled ? true : false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [pw, setPw] = useState('');

  /**
   * Save user profile changes
   */
  const handleSave = async () => {
    setLoading(true);
    setSuccess('');
    setError('');

    try {
      await demoSettingsService.updateUserProfile({ name, email });
      setSuccess('Profile updated!');
    } catch (e) {
      setError(e.message);
    }

    setLoading(false);
  };

  /**
   * Handle password reset request
   */
  const handlePasswordReset = async () => {
    if (!pw) return setError('Enter a new password.');

    setLoading(true);
    setSuccess('');
    setError('');

    try {
      await demoSettingsService.resetPassword(pw);
      setSuccess('Password reset!');
      setPw('');
    } catch (e) {
      setError(e.message);
    }

    setLoading(false);
  };

  /**
   * Handle plan tier upgrade/downgrade
   * @param {string} newTier - The new subscription tier
   */
  const handleUpgrade = async newTier => {
    setLoading(true);
    setSuccess('');
    setError('');

    try {
      await demoSettingsService.upgradePlan(newTier);
      setTier(newTier);
      setSuccess(
        `Plan ${newTier === DEMO.USER.DEFAULT_TIER ? 'downgraded to' : 'upgraded to'} ${newTier}!`
      );
    } catch (e) {
      setError(e.message);
    }

    setLoading(false);
  };

  /**
   * Toggle notification preferences
   * @param {boolean} enabled - Whether notifications should be enabled
   */
  const handleNotifications = async enabled => {
    setNotifications(enabled);
    setLoading(true);
    setSuccess('');
    setError('');

    try {
      await demoSettingsService.updateNotifications(enabled);
      setSuccess(enabled ? 'Notifications enabled!' : 'Notifications disabled.');
    } catch (e) {
      setError(e.message);
    }

    setLoading(false);
  };

  const canSave = name !== userData.name || email !== userData.email;

  return (
    <div className="max-w-xl mx-auto bg-white/90 rounded-xl shadow-2xl p-8 mt-8 border-2 border-blue-700">
      <h2 className="text-2xl font-bold mb-6 text-blue-800">Settings</h2>
      <div className="mb-4">
        <label className="block text-blue-900 font-semibold mb-1">Name</label>
        <input
          className="w-full rounded px-3 py-2 border border-blue-300"
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </div>
      <div className="mb-4">
        <label className="block text-blue-900 font-semibold mb-1">Email</label>
        <input
          className="w-full rounded px-3 py-2 border border-blue-300"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
      </div>
      {/* Plan section */}
      <div className="mb-4 flex items-center gap-2">
        <label className="block text-blue-900 font-semibold mb-1">Plan</label>
        <span
          className={`px-2 py-1 rounded-full text-xs font-bold ${tier === 'Pro' ? 'bg-yellow-400 text-yellow-900' : tier === 'Plus' ? 'bg-blue-300 text-blue-900' : 'bg-gray-200 text-gray-700'}`}
        >
          {tier}
        </span>
        <button
          className="ml-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => handleUpgrade(tier === 'Pro' ? 'Free' : tier === 'Plus' ? 'Pro' : 'Plus')}
          disabled={loading}
        >
          {tier === 'Free' ? 'Upgrade to Plus' : tier === 'Plus' ? 'Upgrade to Pro' : 'Downgrade'}
        </button>
      </div>
      {/* Notification preferences */}
      <div className="mb-4 flex items-center gap-2">
        <label className="block text-blue-900 font-semibold mb-1">Notifications</label>
        <input
          type="checkbox"
          checked={notifications}
          onChange={e => handleNotifications(e.target.checked)}
          disabled={loading}
          className="accent-blue-600 w-5 h-5"
        />
        <span className="text-xs text-blue-700">{notifications ? 'Enabled' : 'Disabled'}</span>
      </div>
      {/* Password reset */}
      <div className="mb-4 flex items-center gap-2">
        <label className="block text-blue-900 font-semibold mb-1">Reset Password</label>
        <input
          type="password"
          className="rounded px-3 py-2 border border-blue-300"
          placeholder="New password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          disabled={loading}
        />
        <button
          className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
          onClick={handlePasswordReset}
          disabled={loading || !pw}
        >
          Reset
        </button>
      </div>
      {/* Save button and feedback */}
      <div className="flex flex-col gap-2 mt-6">
        <button
          className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 font-bold disabled:opacity-60"
          onClick={handleSave}
          disabled={!canSave || loading}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
        {success && <div className="text-green-700 font-semibold text-sm">{success}</div>}
        {error && <div className="text-red-600 font-semibold text-sm">{error}</div>}
      </div>
    </div>
  );
}

// Default export for backward compatibility
export default SettingsPanel;
