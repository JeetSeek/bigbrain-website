import React, { useState } from 'react';
import { TAB_IDS } from '../utils/constants';

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

  // Tab configuration with iOS SF Symbols-style icons
  const tabs = [
    {
      id: TAB_IDS.MANUAL_FINDER,
      label: 'Manuals',
      icon: '📖',
      sfSymbol: 'book.fill',
      description: 'Find boiler manuals'
    },
    {
      id: TAB_IDS.CHAT,
      label: 'Chat',
      icon: '🧠',
      sfSymbol: 'message.badge.fill',
      description: 'Fault finder chat assistant'
    },
    {
      id: TAB_IDS.GAS_RATE,
      label: 'Gas Rate',
      icon: '🔥',
      sfSymbol: 'flame.fill',
      description: 'Calculate gas consumption'
    },
    {
      id: TAB_IDS.TOOLS,
      label: 'Tools',
      icon: '🛠️',
      sfSymbol: 'wrench.and.screwdriver.fill',
      description: 'Engineering calculators and tools'
    },
    ...(isAdmin ? [{
      id: TAB_IDS.ADMIN,
      label: 'Admin',
      icon: '⚙️',
      sfSymbol: 'gearshape.fill',
      description: 'Admin dashboard'
    }] : [])
  ];

  return (
    <nav 
      className="ios-tab-bar ios-safe-area"
      role="tablist"
      aria-label="Main navigation"
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
            className={`
              flex flex-col items-center justify-center
              min-w-0 flex-1 px-1
              transition-all duration-150 ease-out
              ${isPressed ? 'transform scale-95' : ''}
              ${isActive ? 'opacity-100' : 'opacity-60'}
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
              rounded-lg mx-1
            `}
            style={{
              minHeight: 'var(--touch-target-min)',
              color: isActive ? 'var(--ios-blue)' : 'var(--ios-label-secondary)',
            }}
            onClick={() => handleTabPress(tab.id)}
            onTouchStart={() => setPressedTab(tab.id)}
            onTouchEnd={() => setPressedTab(null)}
          >
            {/* Icon */}
            <div 
              className={`
                text-xl mb-1 transition-transform duration-150
                ${isPressed ? 'scale-90' : ''}
                ${isActive ? 'scale-110' : ''}
              `}
              aria-hidden="true"
            >
              {tab.icon}
            </div>
            
            {/* Label */}
            <span 
              className={`
                ios-caption2 font-medium leading-none text-center
                ${isActive ? 'font-semibold' : ''}
              `}
              style={{
                color: 'inherit',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </span>
            
            {/* Active indicator */}
            {isActive && (
              <div 
                className="absolute -top-1 left-1/2 transform -translate-x-1/2"
                style={{
                  width: '4px',
                  height: '4px',
                  borderRadius: '2px',
                  backgroundColor: 'var(--ios-blue)'
                }}
                aria-hidden="true"
              />
            )}
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
    <header className="ios-navigation-bar ios-safe-area">
      {/* Left Action */}
      <div className="absolute left-4 flex items-center">
        {leftAction}
      </div>
      
      {/* Title */}
      <h1 
        className="ios-headline font-semibold text-center px-16"
        style={{ color: 'var(--ios-label-primary)' }}
      >
        {title}
      </h1>
      
      {/* Right Action */}
      <div className="absolute right-4 flex items-center">
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
