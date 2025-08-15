/**
 * React Testing Library setup
 */

// Import React Testing Library's extended Jest matchers
require('@testing-library/jest-dom');

// Mock the intersection observer (often needed for React components)
class MockIntersectionObserver {
  constructor() {
    this.observe = jest.fn();
    this.unobserve = jest.fn();
    this.disconnect = jest.fn();
  }
}

global.IntersectionObserver = MockIntersectionObserver;

// Mock fetch globally
global.fetch = jest.fn().mockImplementation(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve('')
  })
);

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock SpeechSynthesis API for ChatDock tests
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'speechSynthesis', {
    value: {
      speak: jest.fn(),
      cancel: jest.fn(),
      getVoices: jest.fn().mockReturnValue([]),
      onvoiceschanged: null,
    },
    writable: true
  });
  
  // Mock SpeechSynthesisUtterance
  window.SpeechSynthesisUtterance = jest.fn().mockImplementation((text) => ({
    text,
    voice: null,
    rate: 1,
    pitch: 1,
    lang: 'en-US',
    onend: null,
    onerror: null
  }));
  
  // Mock Web Speech Recognition
  window.SpeechRecognition = jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    abort: jest.fn(),
    onresult: null,
    onerror: null,
    onend: null,
  }));
  window.webkitSpeechRecognition = window.SpeechRecognition;
}

// Mock Vite specific environment variables
if (typeof process.env === 'undefined') {
  process.env = {};
}

// Add testing environment variables
process.env.NODE_ENV = 'test';
