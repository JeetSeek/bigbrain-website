/**
 * Tailwind CSS Configuration
 * Customizes the default Tailwind design system for BoilerBrain
 * @see https://tailwindcss.com/docs/configuration
 */

module.exports = {
  // Files to scan for class usage
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  // Theme customization
  theme: {
    // Extend default Tailwind theme rather than override
    extend: {
      // Custom color palette for BoilerBrain
      colors: {
        'ai-blue': '#3751FF',
        'ai-purple': '#7B61FF',
        'ai-bg': '#0a0a23',
        'primary': {
          DEFAULT: '#2388FF',
          '50': '#E9F3FF',
          '100': '#D5E8FF',
          '200': '#A0CFFF',
          '300': '#6FB5FF',
          '400': '#479CFF',
          '500': '#2388FF',
          '600': '#006DF0',
          '700': '#0055BD',
          '800': '#003D85',
          '900': '#00264F',
        },
        'slate': {
          DEFAULT: '#151A21',
          'light': '#1E2532',
          'dark': '#0D1117',
        },
        'off-white': '#F0F4FF',
      },
      // Typography configuration
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        futuristic: ['Orbitron', 'sans-serif'],
      },
      // Custom shadow definitions
      boxShadow: {
        'card': '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
      // Custom border radius sizes
      borderRadius: {
        'card': '12px',
      },
    },
  },
  plugins: [],
};
