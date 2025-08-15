import React from 'react';
import { TAB_IDS } from '../utils/constants';
import { useAuth } from '../contexts/AuthContext';
import { isUserAdmin } from '../services/authUtils';

/**
 * Sidebar Component
 * Provides navigation between different sections of the application
 * Supports both desktop sidebar and mobile dropdown menu layouts
 *
 * @component
 * @param {Object} props - Component props
 * @param {string} props.activeTab - The currently active tab ID
 * @param {Function} props.setActiveTab - Function to change the active tab
 * @param {boolean} props.isMobile - Whether to render in mobile-friendly format
 */
export const Sidebar = ({ activeTab, setActiveTab, isMobile = false }) => {
  const { user } = useAuth();

  /**
   * Navigation tabs configuration
   * @type {Array<{id: string, label: string, icon: string}>}
   */
  const allNavigationItems = [
    { id: TAB_IDS.CHAT, label: 'Chat', icon: '💬' },
    { id: TAB_IDS.MANUAL_FINDER, label: 'Manuals', icon: '📚' },
    { id: TAB_IDS.TICKETS, label: 'Support', icon: '🔧' },
    { id: TAB_IDS.FEEDBACK, label: 'Feedback', icon: '📝' },
    { id: TAB_IDS.GAS_RATE, label: 'Gas Rate', icon: '🔥' }, // Gas Rate Calculator tool
    { id: TAB_IDS.ROOM_BTU, label: 'Room BTU', icon: '🏠' }, // Room BTU Calculator tool
    { id: TAB_IDS.KNOWLEDGE_MGMT, label: 'Knowledge', icon: '🧠' }, // Knowledge Management
    { id: TAB_IDS.SETTINGS, label: 'Settings', icon: '⚙️' },
    { id: TAB_IDS.ADMIN, label: 'Admin', icon: '🔒' }, // Admin dashboard access
  ];

  // Filter navigation items - hide Admin and Knowledge Management for non-admin users
  const navigationItems = allNavigationItems.filter(item => {
    if (item.id === TAB_IDS.ADMIN || item.id === TAB_IDS.KNOWLEDGE_MGMT) {
      return isUserAdmin(user);
    }
    return true;
  });

  // Mobile layout - compact dropdown menu with text labels
  if (isMobile) {
    return (
      <div className="py-3">
        <div className="grid grid-cols-2 gap-3">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`px-3 py-4 rounded-xl transition-all duration-200 flex flex-col items-center gap-1 text-sm font-medium
                ${
                  activeTab === item.id
                    ? 'bg-blue-600 text-white shadow-md transform scale-105'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
                }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-xs font-semibold">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Desktop layout - traditional sidebar
  return (
    <div className="flex flex-col p-5 bg-slate-default min-h-screen text-off-white w-64 border-r border-slate-light">
      <h1 className="text-xl font-medium mb-10 flex items-center gap-2">
        <span className="mr-1">🧠</span> Boiler Brain
      </h1>

      <div className="flex flex-col gap-1">
        {navigationItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full text-left px-4 py-3 rounded-lg mb-1 transition-all duration-200 flex items-center gap-3 min-h-[44px]
              ${
                activeTab === item.id
                  ? 'bg-primary text-white btn-label'
                  : 'text-off-white/80 hover:bg-slate-light'
              }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// Default export for backward compatibility
export default Sidebar;
