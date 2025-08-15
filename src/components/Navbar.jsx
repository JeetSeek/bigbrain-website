import React from 'react';
import { useNavigate } from 'react-router-dom';
import { STORAGE_KEYS, ROUTES } from '../utils/constants';

/**
 * Navigation Bar Component
 * Displays the app header with logo and navigation controls
 * Handles user authentication state and navigation
 */
export function Navbar() {
  const navigate = useNavigate();

  /**
   * Handles user logout
   * Clears authentication state and redirects to login page
   */
  const handleLogout = () => {
    // Clear the demo login state
    localStorage.removeItem(STORAGE_KEYS.DEMO_USER_LOGGED_IN);
    // Navigate to login
    navigate(ROUTES.LOGIN);
  };

  return (
    <div className="bg-slate-default px-4 py-3 border-b border-slate-light flex justify-between items-center">
      <div className="flex items-center">
        <span className="text-lg font-medium text-off-white">
          <span className="mr-2">🧠</span>
          Boiler Brain
        </span>
      </div>

      <button
        onClick={handleLogout}
        className="body-sm text-gray-300 hover:text-off-white bg-slate-light hover:bg-slate-dark px-4 py-2 rounded-lg transition-colors min-h-[44px]"
      >
        Sign Out
      </button>
    </div>
  );
}

// Default export for backward compatibility
export default Navbar;
