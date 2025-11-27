/**
 * Professional Dark Mode Theme for BoilerBrain
 * Warmer color palette optimized for field technician use
 * Reduces eye strain during prolonged fieldwork in low-light conditions
 */

export const professionalDarkTheme = {
  // Background colors - warmer grays with subtle blue accents
  background: {
    primary: '#0F1419',      // Deep charcoal (warmer than pure black)
    secondary: '#1A1F23',    // Dark slate gray with blue undertone
    tertiary: '#23272B',     // Medium gray for surfaces
    accent: '#2A3441'        // Subtle blue-gray for highlights
  },

  // Text colors - improved contrast and readability
  text: {
    primary: '#F8FAFC',      // Off-white for main text (warmer than pure white)
    secondary: '#CBD5E1',    // Muted gray-blue for secondary text
    tertiary: '#94A3B8',     // Light gray for hints and labels
    accent: '#60A5FA'        // Soft blue for interactive elements
  },

  // Border colors - subtle and non-harsh
  border: {
    primary: '#374151',      // Warm gray border
    secondary: '#4B5563',    // Medium gray for dividers
    accent: '#3B82F6'        // Soft blue for focus states
  },

  // Status colors - professional and accessible
  status: {
    success: '#10B981',      // Emerald green
    warning: '#F59E0B',      // Warm amber (less harsh than pure yellow)
    error: '#EF4444',        // Red for errors
    info: '#3B82F6'          // Blue for information
  },

  // Interactive elements
  interactive: {
    hover: '#1E293B',        // Dark blue-gray on hover
    active: '#334155',       // Medium blue-gray when pressed
    focus: '#3B82F6',        // Blue focus ring
    disabled: '#475569'      // Muted gray for disabled states
  },

  // Chat-specific colors
  chat: {
    userMessage: '#1E40AF',  // Professional blue for user messages
    assistantMessage: '#1F2937', // Dark slate for assistant
    emergency: '#DC2626',   // Red for emergency alerts
    typing: '#60A5FA',      // Blue for typing indicator
    confidence: {
      high: '#10B981',      // Green for high confidence
      medium: '#F59E0B',    // Amber for medium confidence
      low: '#EF4444'        // Red for low confidence
    }
  },

  // Shadows - subtle and warm
  shadow: {
    sm: '0 1px 2px 0 rgba(15, 20, 25, 0.15)',
    md: '0 4px 6px -1px rgba(15, 20, 25, 0.2)',
    lg: '0 10px 15px -3px rgba(15, 20, 25, 0.25)'
  }
};

/**
 * CSS Custom Properties for the Professional Dark Theme
 * Can be applied to :root or .dark class
 */
export const darkThemeCSS = `
  .professional-dark {
    /* Background Colors */
    --bg-primary: ${professionalDarkTheme.background.primary};
    --bg-secondary: ${professionalDarkTheme.background.secondary};
    --bg-tertiary: ${professionalDarkTheme.background.tertiary};
    --bg-accent: ${professionalDarkTheme.background.accent};

    /* Text Colors */
    --text-primary: ${professionalDarkTheme.text.primary};
    --text-secondary: ${professionalDarkTheme.text.secondary};
    --text-tertiary: ${professionalDarkTheme.text.tertiary};
    --text-accent: ${professionalDarkTheme.text.accent};

    /* Border Colors */
    --border-primary: ${professionalDarkTheme.border.primary};
    --border-secondary: ${professionalDarkTheme.border.secondary};
    --border-accent: ${professionalDarkTheme.border.accent};

    /* Status Colors */
    --status-success: ${professionalDarkTheme.status.success};
    --status-warning: ${professionalDarkTheme.status.warning};
    --status-error: ${professionalDarkTheme.status.error};
    --status-info: ${professionalDarkTheme.status.info};

    /* Interactive Colors */
    --interactive-hover: ${professionalDarkTheme.interactive.hover};
    --interactive-active: ${professionalDarkTheme.interactive.active};
    --interactive-focus: ${professionalDarkTheme.interactive.focus};
    --interactive-disabled: ${professionalDarkTheme.interactive.disabled};

    /* Chat Colors */
    --chat-user: ${professionalDarkTheme.chat.userMessage};
    --chat-assistant: ${professionalDarkTheme.chat.assistantMessage};
    --chat-emergency: ${professionalDarkTheme.chat.emergency};
    --chat-typing: ${professionalDarkTheme.chat.typing};
    --chat-confidence-high: ${professionalDarkTheme.chat.confidence.high};
    --chat-confidence-medium: ${professionalDarkTheme.chat.confidence.medium};
    --chat-confidence-low: ${professionalDarkTheme.chat.confidence.low};

    /* Shadows */
    --shadow-sm: ${professionalDarkTheme.shadow.sm};
    --shadow-md: ${professionalDarkTheme.shadow.md};
    --shadow-lg: ${professionalDarkTheme.shadow.lg};
  }
`;

/**
 * React Hook for Professional Dark Mode
 * Provides the theme object and utilities for field technician use
 */
export const useProfessionalDarkMode = () => {
  const [isDark, setIsDark] = React.useState(() => {
    // Check for saved theme preference or system preference
    const saved = localStorage.getItem('boilerbrain-theme');
    if (saved) return saved === 'professional-dark';

    // Default to professional dark for field technicians
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  React.useEffect(() => {
    const root = document.documentElement;

    if (isDark) {
      root.classList.add('professional-dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('professional-dark');
      root.classList.add('light');
    }

    localStorage.setItem('boilerbrain-theme', isDark ? 'professional-dark' : 'light');
  }, [isDark]);

  const toggleDarkMode = React.useCallback(() => {
    setIsDark(prev => !prev);
  }, []);

  // Get current theme object
  const theme = isDark ? professionalDarkTheme : {
    // Light theme would be defined separately
    background: { primary: '#FFFFFF', secondary: '#F8FAFC', tertiary: '#F1F5F9' },
    text: { primary: '#1E293B', secondary: '#475569', tertiary: '#64748B' },
    // ... other light theme properties
  };

  return {
    isDark,
    toggleDarkMode,
    theme,
    themeName: isDark ? 'professional-dark' : 'light'
  };
};

/**
 * Apply Professional Dark Theme to DOM
 * Injects CSS custom properties for the theme
 */
export const applyProfessionalDarkTheme = () => {
  const styleId = 'professional-dark-theme';

  // Remove existing theme if present
  const existingStyle = document.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }

  // Create and inject new theme
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = darkThemeCSS;
  document.head.appendChild(style);
};

/**
 * Professional Theme Presets for Different Use Cases
 */
export const themePresets = {
  'field-technician': {
    name: 'Field Technician',
    description: 'Optimized for low-light fieldwork with warm colors',
    theme: professionalDarkTheme
  },

  'office-professional': {
    name: 'Office Professional',
    description: 'Standard professional appearance for office use',
    theme: {
      ...professionalDarkTheme,
      background: {
        ...professionalDarkTheme.background,
        primary: '#0A0A0A' // Slightly darker for office screens
      }
    }
  },

  'accessibility': {
    name: 'High Contrast',
    description: 'Enhanced contrast for accessibility compliance',
    theme: {
      ...professionalDarkTheme,
      text: {
        ...professionalDarkTheme.text,
        primary: '#FFFFFF', // Pure white for maximum contrast
        secondary: '#E5E7EB' // Lighter gray
      },
      background: {
        ...professionalDarkTheme.background,
        primary: '#000000' // Pure black
      }
    }
  }
};

export default {
  professionalDarkTheme,
  darkThemeCSS,
  useProfessionalDarkMode,
  applyProfessionalDarkTheme,
  themePresets
};
