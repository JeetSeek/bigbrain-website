/**
 * Application-wide constants
 * Centralizes configuration values and magic strings to improve maintainability
 */

// Cache configuration
export const CACHE = {
  PREFIX: 'bb_cache_',
  DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes in milliseconds
  MANUFACTURER_TTL: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  BOILER_MODELS_TTL: 12 * 60 * 60 * 1000, // 12 hours in milliseconds,
  TTL: {
    ANALYTICS: 30 * 60 * 1000, // 30 minutes in milliseconds
  },
};

// API configuration
export const API = {
  TIMEOUT: 12000, // Increased timeout in milliseconds
  MAX_RETRIES: 3, // More retries for resilience
  BACKOFF_MAX: 5000, // Maximum backoff time in milliseconds
  RECONNECT_DELAY: 30000, // 30 seconds before trying to reconnect to API after failure
  CONNECTION_RECOVERY_CHECK: 120000, // Try main API again after 2 minutes even if using fallback
};

// Local storage keys
export const STORAGE_KEYS = {
  DEMO_SETTINGS: 'boilerbrain_demo_settings',
  DEMO_USER_LOGGED_IN: 'demoUserLoggedIn',
  ADMIN_USER_LOGGED_IN: 'adminUserLoggedIn',
  USER_PREFERENCES: 'bb_user_prefs',
};

// Demo data configuration
export const DEMO = {
  USER: {
    DEFAULT_NAME: 'Demo User',
    DEFAULT_EMAIL: 'demo@boilerbrain.com',
    DEFAULT_TIER: 'Pro',
    TEST_EMAIL: 'boilerbrain.test@gmail.com',
    TEST_PASSWORD: 'Test@123',
  },
  CHAT: {
    SIMULATED_DELAY: 800, // milliseconds
    GREETING_DELAY: 600, // milliseconds
  },
  VALID_INVITE_CODES: ['TEST123', 'ENGINEER001', 'DEMOACCESS'],
};

// Routes will be defined further down in the file

// UI configuration
export const UI = {
  TEXTAREA: {
    DEFAULT_HEIGHT: '38px',
    MAX_HEIGHT: 180, // pixels
  },
  DEBOUNCE: {
    SEARCH: 300, // milliseconds
    FORM_INPUT: 500, // milliseconds
    BUTTON_CLICK: 250, // milliseconds
  },
  ANIMATION: {
    TYPING_INDICATOR_DELAY: 0.3, // seconds
    FADE_IN_DURATION: 0.5, // seconds
    SLIDE_DURATION: 0.3, // seconds
  },
  VOICE: {
    AUTO_LISTEN_DELAY: 500, // milliseconds
  },
  LIST: {
    PAGE_SIZE: 20,
    MAX_PAGES: 10,
  },
  ERROR: {
    STACK_TRACE_HEIGHT: 300, // pixels
  },
};

// Authentication configuration
export const AUTH = {
  DEFAULT_TIER: 'Free',
  SESSION_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  REFRESH_THRESHOLD: 60 * 60 * 1000, // 1 hour before expiry
};

// Route paths - Centralized application routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  RESET_PASSWORD: '/reset-password',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  MANUALS: '/manuals',
  ADMIN: '/admin',
  SUPPORT: '/support',
  FEEDBACK: '/feedback',
  SETTINGS: '/settings',
  MANUAL_FINDER: '/manual-finder',
  CHAT: '/chat',
};

// Time constants
export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
};

// Default values
export const DEFAULTS = {
  VOICE_LANG: 'en-GB',
  VOICE_RATE: 1,
};

// Error handling configuration
export const ERROR = {
  TRACKING_ENABLED: false, // Set to true when using an error tracking service
  logError: null, // To be replaced with actual error logging service when implemented
};

// Tab identifiers for navigation
export const TAB_IDS = {
  AI_CHAT: 'aiChat',
  CHAT: 'chat', // Added dedicated chat tab ID
  SETTINGS: 'settings',
  SERVICE: 'service',
  PAYMENTS: 'payments',
  MANUAL_FINDER: 'manualFinder',
  TICKETS: 'tickets',
  FEEDBACK: 'feedback',
  SUPPORT: 'support', // Support (moved to settings/help)
  TOOLS: 'tools', // Tools page with calculators
  ADMIN: 'adminDashboard', // New admin dashboard tab
  KNOWLEDGE_MGMT: 'knowledgeManagement', // Knowledge Management tab
  GAS_RATE: 'gasRateCalculator', // Gas Rate Calculator tool
  ROOM_BTU: 'roomBtuCalculator', // Room BTU Calculator tool
  GAS_PIPE: 'gasPipeSizing', // UK Gas Pipe Sizing (BS 6891)
  CP12_FORM: 'cp12Form', // CP12 Landlord Gas Safety Record
  WARNING_NOTICE: 'warningNotice', // Gas Warning/Defect Notice
};

// Sorting options
export const SORT_OPTIONS = {
  FIELD: {
    UPLOAD_DATE: 'upload_date',
    POPULARITY: 'popularity',
  },
  ORDER: {
    ASC: 'asc',
    DESC: 'desc',
  },
};

// Routes constant moved to unified declaration above

// Validation constants
export const VALIDATION = {
  EMAIL_PATTERN: /^[^@]+@[^@]+\.[^@]+$/,
  PASSWORD_MIN_LENGTH: 8,
};

// Invitation codes
export const INVITE_CODES = {
  VALID_CODES: ['TEST123', 'ENGINEER001', 'DEMOACCESS'],
};
