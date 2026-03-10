import React, { useState } from 'react';
import { TAB_IDS } from '../utils/constants';
import { FiHome, FiBook, FiMessageCircle, FiFileText, FiTool, FiSettings } from 'react-icons/fi';

/**
 * Mobile Navigation Component
 * iOS-style tab bar navigation following Apple Human Interface Guidelines
 * Features:
 * - 49px height (iOS standard)
 * - Touch-friendly targets (44px minimum)
 * - iOS system colors and typography
 * - Haptic feedback simulation
 * - Safe area support
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} props.activeTab - Currently active tab ID
 * @param {Function} props.onTabChange - Tab change handler
 * @param {boolean} props.isAdmin - Whether user has admin privileges
 * @returns {React.ReactElement} iOS-style mobile navigation
 */
const MobileNavigation = ({ activeTab, onTabChange, isAdmin = false }) => {
  const [pressedTab, setPressedTab] = useState(null);

  // iOS-style haptic feedback simulation
  const handleTabPress = (tabId) => {
    setPressedTab(tabId);
    // Simulate iOS haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(10); // Light haptic feedback
    }
    onTabChange(tabId);
    
    // Reset pressed state after animation
    setTimeout(() => setPressedTab(null), 150);
  };

  // Tab configuration with professional icons
  const tabs = [
    {
      id: TAB_IDS.HOME,
      label: 'Home',
      Icon: FiHome,
      description: 'Feature overview'
    },
    {
      id: TAB_IDS.MANUAL_FINDER,
      label: 'Manuals',
      Icon: FiBook,
      description: 'Find boiler manuals'
    },
    {
      id: TAB_IDS.CHAT,
      label: 'Chat',
      Icon: FiMessageCircle,
      description: 'Fault finder chat assistant'
    },
    {
      id: TAB_IDS.CP12_FORM,
      label: 'CP12',
      Icon: FiFileText,
      description: 'CP12 Gas Safety Record'
    },
    {
      id: TAB_IDS.TOOLS,
      label: 'Tools',
      Icon: FiTool,
      description: 'Engineering calculators and tools'
    },
    ...(isAdmin ? [{
      id: TAB_IDS.ADMIN,
      label: 'Admin',
      Icon: FiSettings,
      description: 'Admin dashboard'
    }] : [])
  ];

  return (
    <nav 
      className="ios-tab-bar ios-safe-area"
      role="tablist"
      aria-label="Main navigation"
      style={{
        background: 'rgba(255, 255, 255, 0.88)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        borderTop: '0.5px solid rgba(0, 0, 0, 0.12)',
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const isPressed = pressedTab === tab.id;
        
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-label={tab.description}
            className="flex flex-col items-center justify-center min-w-0 flex-1 px-1 py-1 relative focus:outline-none rounded-lg mx-0.5"
            style={{
              minHeight: 'var(--touch-target-min)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: isPressed ? 'scale(0.92)' : 'scale(1)',
            }}
            onClick={() => handleTabPress(tab.id)}
            onTouchStart={() => setPressedTab(tab.id)}
            onTouchEnd={() => setPressedTab(null)}
          >
            {/* Active background pill */}
            {isActive && (
              <div
                className="absolute inset-x-1 top-0.5 bottom-0.5 rounded-xl"
                style={{
                  background: 'rgba(0, 122, 255, 0.08)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
            )}

            {/* Icon */}
            <div className="relative mb-0.5" aria-hidden="true">
              <tab.Icon 
                size={22} 
                strokeWidth={isActive ? 2.5 : 1.5}
                style={{
                  color: isActive ? '#007AFF' : '#8E8E93',
                  transition: 'all 0.2s ease',
                  transform: isActive ? 'scale(1.08)' : 'scale(1)',
                }}
              />
            </div>
            
            {/* Label */}
            <span 
              className="text-[10px] leading-none text-center relative"
              style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, sans-serif',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#007AFF' : '#8E8E93',
                letterSpacing: '-0.02em',
                transition: 'all 0.2s ease',
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

/**
 * Mobile Header Component
 * iOS-style navigation bar with title and optional actions
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} props.title - Header title
 * @param {React.ReactNode} props.leftAction - Optional left action button
 * @param {React.ReactNode} props.rightAction - Optional right action button
 * @returns {React.ReactElement} iOS-style mobile header
 */
export const MobileHeader = ({ title, leftAction, rightAction }) => {
  return (
    <header 
      className="ios-navigation-bar ios-safe-area"
      style={{
        background: 'rgba(255, 255, 255, 0.88)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        borderBottom: '0.5px solid rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* Left Action */}
      <div className="flex-shrink-0 pl-3 flex items-center min-w-0">
        {leftAction}
      </div>
      
      {/* Title */}
      <h1 
        className="font-semibold text-center flex-1 truncate px-2"
        style={{ 
          color: 'var(--ios-label-primary)',
          fontSize: '17px',
          letterSpacing: '-0.4px',
        }}
      >
        {title}
      </h1>
      
      {/* Right Action */}
      <div className="flex-shrink-0 pr-3 flex items-center min-w-0">
        {rightAction}
      </div>
    </header>
  );
};

/**
 * Mobile Container Component
 * iOS-style safe area container with proper spacing
 * 
 * @component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {boolean} props.hasTabBar - Whether container should account for tab bar
 * @param {boolean} props.hasHeader - Whether container should account for header
 * @returns {React.ReactElement} iOS-style mobile container
 */
export const MobileContainer = ({ children, hasTabBar = true, hasHeader = true }) => {
  return (
    <div 
      className="w-full h-full overflow-hidden"
      style={{
        // Account for header + safe area (notch)
        paddingTop: hasHeader ? 'calc(44px + env(safe-area-inset-top, 0px))' : 'env(safe-area-inset-top, 0px)',
        // Account for tab bar + safe area (home indicator)
        paddingBottom: hasTabBar ? 'calc(49px + env(safe-area-inset-bottom, 0px))' : 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
        backgroundColor: 'var(--ios-bg-grouped-primary)'
      }}
    >
      <div className="h-full overflow-y-auto overscroll-contain">
        {children}
      </div>
    </div>
  );
};

export default MobileNavigation;
