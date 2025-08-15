/**
 * Demo Settings Service - simulates settings API responses for the demo environment
 * This allows the app to work without a backend server for development/demo purposes
 */
import { STORAGE_KEYS, DEMO, TIME } from './constants';

// Default demo user settings
const DEFAULT_DEMO_SETTINGS = {
  name: DEMO.USER.DEFAULT_NAME,
  email: DEMO.USER.DEFAULT_EMAIL,
  tier: DEMO.USER.DEFAULT_TIER,
  notifications_enabled: true,
  payment_method: 'Visa ending in 4242',
  account_created: '2024-01-15',
};

/**
 * Initialize or get settings from localStorage
 * @returns {Object} The stored settings or default settings
 */
const getStoredSettings = () => {
  const stored = localStorage.getItem(STORAGE_KEYS.DEMO_SETTINGS);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (err) {
      console.error('Error parsing stored settings:', err);
      return DEFAULT_DEMO_SETTINGS;
    }
  }
  return DEFAULT_DEMO_SETTINGS;
};

/**
 * Save settings to localStorage
 * @param {Object} settings - The settings to save
 * @returns {Object} The saved settings
 */
const saveSettings = settings => {
  localStorage.setItem(STORAGE_KEYS.DEMO_SETTINGS, JSON.stringify(settings));
  return settings;
};

// Named export for better consistency with other services
export const demoSettingsService = {
  /**
   * Get the user profile
   * @returns {Promise<Object>} User profile data
   */
  async getUserProfile() {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, DEMO.CHAT.GREETING_DELAY));
    return getStoredSettings();
  },

  /**
   * Update the user profile
   * @param {Object} updates - The profile updates
   * @returns {Promise<Object>} Updated user profile
   */
  async updateUserProfile(updates) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, DEMO.CHAT.SIMULATED_DELAY));

    const currentSettings = getStoredSettings();
    const updatedSettings = {
      ...currentSettings,
      ...updates,
    };

    return saveSettings(updatedSettings);
  },

  /**
   * Reset the user password (simulated)
   * @param {string} password - The new password
   * @returns {Promise<Object>} Success status
   */
  async resetPassword(password) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, TIME.SECOND));

    // In a demo, we don't actually store the password
    if (import.meta.env.DEV) {
    }

    return { success: true, message: 'Password updated successfully' };
  },

  /**
   * Upgrade the user plan
   * @param {string} newTier - The new plan tier
   * @returns {Promise<Object>} Updated settings
   */
  async upgradePlan(newTier) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1.2 * TIME.SECOND));

    const currentSettings = getStoredSettings();
    const updatedSettings = {
      ...currentSettings,
      tier: newTier,
    };

    return saveSettings(updatedSettings);
  },

  /**
   * Update notification preferences
   * @param {boolean} enabled - Whether notifications are enabled
   * @returns {Promise<Object>} Updated settings
   */
  async updateNotifications(enabled) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 0.6 * TIME.SECOND));

    const currentSettings = getStoredSettings();
    const updatedSettings = {
      ...currentSettings,
      notifications_enabled: enabled,
    };

    return saveSettings(updatedSettings);
  },
};
