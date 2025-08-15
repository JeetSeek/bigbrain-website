/**
 * Frontend Jest configuration
 */

export default {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': './jestTransformer.js'
  },
  moduleNameMapper: {
    // Handle CSS imports (with CSS modules)
    '\\.css$': 'identity-obj-proxy',
    // Handle image imports
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
    // Mock Vite environment variables
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/server/'],
  moduleFileExtensions: ['js', 'jsx', 'json', 'node'],
  // Setup global test environment
  globals: {
    // Mock Vite's import.meta.env
    'import.meta': {
      env: {
        VITE_SUPABASE_URL: 'https://test-supabase-url.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'test-anon-key',
        VITE_APP_MODE: 'test',
        VITE_APP_VERSION: '1.0.0-test',
        VITE_ADMIN_EMAIL: 'admin@boilerbrain.com'
      }
    }
  }
};
