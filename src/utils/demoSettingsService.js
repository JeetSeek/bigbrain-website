/**
 * Demo Settings Service
 * Mock service for handling user settings in demo mode
 */

export const demoSettingsService = {
  /**
   * Update user profile information
   * @param {Object} profile - Profile data to update
   * @param {string} profile.name - User's name
   * @param {string} profile.email - User's email
   * @returns {Promise<void>}
   */
  async updateUserProfile(profile) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Store in localStorage for demo purposes
    const currentUser = JSON.parse(localStorage.getItem('demo_user') || '{}');
    const updatedUser = { ...currentUser, ...profile };
    localStorage.setItem('demo_user', JSON.stringify(updatedUser));
    
  },

  /**
   * Reset user password
   * @param {string} newPassword - New password
   * @returns {Promise<void>}
   */
  async resetPassword(newPassword) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // In demo mode, just log the action
    
    // Simulate success
    return Promise.resolve();
  },

  /**
   * Upgrade/downgrade user plan
   * @param {string} newTier - New subscription tier
   * @returns {Promise<void>}
   */
  async upgradePlan(newTier) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Store in localStorage for demo purposes
    const currentUser = JSON.parse(localStorage.getItem('demo_user') || '{}');
    currentUser.tier = newTier;
    localStorage.setItem('demo_user', JSON.stringify(currentUser));
    
  },

  /**
   * Update notification preferences
   * @param {boolean} enabled - Whether notifications are enabled
   * @returns {Promise<void>}
   */
  async updateNotifications(enabled) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Store in localStorage for demo purposes
    const currentUser = JSON.parse(localStorage.getItem('demo_user') || '{}');
    currentUser.notifications_enabled = enabled;
    localStorage.setItem('demo_user', JSON.stringify(currentUser));
    
  }
};

export default demoSettingsService;
