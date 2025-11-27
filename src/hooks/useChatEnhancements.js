import React from 'react';
import { Smartphone, Tablet, Monitor, Sun, Moon } from 'lucide-react';

/**
 * Mobile Responsive Enhancements Hook
 * Provides utilities for Apple HIG compliance and adaptive layouts
 */
export const useMobileResponsive = () => {
  const [deviceType, setDeviceType] = React.useState('desktop');
  const [orientation, setOrientation] = React.useState('portrait');
  const [safeAreaInsets, setSafeAreaInsets] = React.useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0
  });

  React.useEffect(() => {
    const updateDeviceType = () => {
      const width = window.innerWidth;

      if (width <= 640) {
        setDeviceType('mobile');
      } else if (width <= 1024) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    };

    const updateOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };

    const updateSafeAreaInsets = () => {
      // Check for iOS Safari safe area
      const testEl = document.createElement('div');
      testEl.style.cssText = `
        position: fixed;
        top: env(safe-area-inset-top);
        bottom: env(safe-area-inset-bottom);
        left: env(safe-area-inset-left);
        right: env(safe-area-inset-right);
        visibility: hidden;
      `;
      document.body.appendChild(testEl);

      const computedStyle = getComputedStyle(testEl);
      const insets = {
        top: parseInt(computedStyle.top) || 0,
        bottom: parseInt(computedStyle.bottom) || 0,
        left: parseInt(computedStyle.left) || 0,
        right: parseInt(computedStyle.right) || 0
      };

      document.body.removeChild(testEl);
      setSafeAreaInsets(insets);
    };

    updateDeviceType();
    updateOrientation();
    updateSafeAreaInsets();

    window.addEventListener('resize', updateDeviceType);
    window.addEventListener('orientationchange', updateOrientation);

    return () => {
      window.removeEventListener('resize', updateDeviceType);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, []);

  return {
    deviceType,
    orientation,
    safeAreaInsets,
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop',
    hasSafeArea: Object.values(safeAreaInsets).some(inset => inset > 0)
  };
};

/**
 * Dark Mode Hook with Professional Theme Support
 */
export const useDarkMode = () => {
  const [isDark, setIsDark] = React.useState(() => {
    // Check for saved theme preference or default to system preference
    const saved = localStorage.getItem('chat-theme');
    if (saved) return saved === 'dark';

    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  React.useEffect(() => {
    const root = document.documentElement;

    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    localStorage.setItem('chat-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleDarkMode = React.useCallback(() => {
    setIsDark(prev => !prev);
  }, []);

  return { isDark, toggleDarkMode };
};

/**
 * Voice Enhancement Hook with Noise Cancellation
 */
export const useVoiceEnhancement = () => {
  const [isEnhancing, setIsEnhancing] = React.useState(false);
  const [enhancementLevel, setEnhancementLevel] = React.useState('medium');
  const audioContextRef = React.useRef(null);
  const noiseGateRef = React.useRef(null);

  const startEnhancement = React.useCallback(async (stream) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }

    const audioContext = audioContextRef.current;

    try {
      setIsEnhancing(true);

      // Create audio nodes for noise reduction
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      const gainNode = audioContext.createGain();

      // Configure analyser for noise detection
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;

      // Simple noise gate implementation
      noiseGateRef.current = audioContext.createScriptProcessor(4096, 1, 1);
      noiseGateRef.current.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer;
        const outputBuffer = event.outputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        const outputData = outputBuffer.getChannelData(0);

        const threshold = enhancementLevel === 'high' ? 0.01 :
                         enhancementLevel === 'low' ? 0.05 : 0.03;

        for (let i = 0; i < inputBuffer.length; i++) {
          // Apply noise gate
          if (Math.abs(inputData[i]) < threshold) {
            outputData[i] = inputData[i] * 0.1; // Reduce noise floor
          } else {
            outputData[i] = inputData[i];
          }
        }
      };

      // Connect audio nodes
      source.connect(analyser);
      analyser.connect(noiseGateRef.current);
      noiseGateRef.current.connect(gainNode);
      gainNode.connect(audioContext.destination);

    } catch (error) {
      console.error('Failed to start voice enhancement:', error);
      setIsEnhancing(false);
    }
  }, [enhancementLevel]);

  const stopEnhancement = React.useCallback(() => {
    if (noiseGateRef.current) {
      noiseGateRef.current.disconnect();
      noiseGateRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsEnhancing(false);
  }, []);

  const setEnhancement = React.useCallback((level) => {
    setEnhancementLevel(level);
  }, []);

  React.useEffect(() => {
    return () => {
      stopEnhancement();
    };
  }, [stopEnhancement]);

  return {
    isEnhancing,
    enhancementLevel,
    startEnhancement,
    stopEnhancement,
    setEnhancement
  };
};

/**
 * Accessibility Hook for Screen Reader and Keyboard Navigation
 */
export const useAccessibility = () => {
  const [announcements, setAnnouncements] = React.useState([]);
  const [focusTraps, setFocusTraps] = React.useState(new Map());

  // Announce messages for screen readers
  const announce = React.useCallback((message, priority = 'polite') => {
    const announcement = {
      id: Date.now(),
      message,
      priority,
      timestamp: new Date()
    };

    setAnnouncements(prev => [...prev, announcement]);

    // Remove old announcements after 5 seconds
    setTimeout(() => {
      setAnnouncements(prev => prev.filter(a => a.id !== announcement.id));
    }, 5000);
  }, []);

  // Create focus trap for modal-like components
  const createFocusTrap = React.useCallback((elementId, options = {}) => {
    const element = document.getElementById(elementId);
    if (!element) return null;

    const trapId = `trap_${elementId}_${Date.now()}`;

    const trap = {
      id: trapId,
      element,
      options: {
        initialFocus: options.initialFocus || element.querySelector('[tabindex], button, input, select, textarea'),
        returnFocus: options.returnFocus !== false,
        ...options
      }
    };

    setFocusTraps(prev => new Map(prev).set(trapId, trap));

    return trapId;
  }, []);

  // Remove focus trap
  const removeFocusTrap = React.useCallback((trapId) => {
    setFocusTraps(prev => {
      const newTraps = new Map(prev);
      newTraps.delete(trapId);
      return newTraps;
    });
  }, []);

  // Handle keyboard navigation
  const handleKeyboardNavigation = React.useCallback((event, options = {}) => {
    const { onEscape, onEnter, onArrowUp, onArrowDown, onTab } = options;

    switch (event.key) {
      case 'Escape':
        onEscape?.(event);
        break;
      case 'Enter':
        onEnter?.(event);
        break;
      case 'ArrowUp':
        onArrowUp?.(event);
        break;
      case 'ArrowDown':
        onArrowDown?.(event);
        break;
      case 'Tab':
        onTab?.(event);
        break;
    }
  }, []);

  return {
    announce,
    announcements,
    createFocusTrap,
    removeFocusTrap,
    handleKeyboardNavigation
  };
};

/**
 * Professional Theme Provider with Apple HIG Compliance
 */
export const useProfessionalTheme = () => {
  const { isDark, toggleDarkMode } = useDarkMode();
  const { deviceType, isMobile, safeAreaInsets, hasSafeArea } = useMobileResponsive();

  // Professional color schemes following Apple HIG
  const themes = {
    light: {
      primary: '#007AFF',      // Apple blue
      secondary: '#5856D6',    // Apple purple
      success: '#34C759',      // Apple green
      warning: '#FF9500',      // Apple orange
      error: '#FF3B30',        // Apple red
      background: '#FFFFFF',
      surface: '#F2F2F7',
      text: '#1C1C1E',
      textSecondary: '#8E8E93'
    },
    dark: {
      primary: '#0A84FF',      // Dark mode blue
      secondary: '#5E5CE6',    // Dark mode purple
      success: '#30D158',      // Dark mode green
      warning: '#FF9F0A',      // Dark mode orange
      error: '#FF453A',        // Dark mode red
      background: '#000000',
      surface: '#1C1C1E',
      text: '#FFFFFF',
      textSecondary: '#8E8E93'
    }
  };

  const currentTheme = themes[isDark ? 'dark' : 'light'];

  // Apply safe area insets for iOS devices
  const safeAreaStyles = hasSafeArea ? {
    paddingTop: `${safeAreaInsets.top}px`,
    paddingBottom: `${safeAreaInsets.bottom}px`,
    paddingLeft: `${safeAreaInsets.left}px`,
    paddingRight: `${safeAreaInsets.right}px`
  } : {};

  return {
    theme: currentTheme,
    isDark,
    toggleDarkMode,
    deviceType,
    isMobile,
    safeAreaInsets,
    hasSafeArea,
    safeAreaStyles
  };
};

export default {
  useMobileResponsive,
  useDarkMode,
  useVoiceEnhancement,
  useAccessibility,
  useProfessionalTheme
};
