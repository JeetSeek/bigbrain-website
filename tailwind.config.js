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
        // Apple HIG System Colors (iOS 18)
        'ios': {
          'blue': '#007AFF',
          'blue-dark': '#0051D5',
          'green': '#34C759',
          'red': '#FF3B30',
          'orange': '#FF9500',
          'yellow': '#FFCC00',
          'purple': '#AF52DE',
          'pink': '#FF2D55',
          'teal': '#5AC8FA',
          'indigo': '#5856D6',
        },
        // Apple HIG Gray Scale (Dark Mode)
        'system': {
          'bg': '#000000',
          'bg-secondary': '#1C1C1E',
          'bg-tertiary': '#2C2C2E',
          'bg-elevated': '#1C1C1E',
          'fill': '#787880',
          'fill-secondary': '#636366',
          'separator': '#38383A',
          'label': '#FFFFFF',
          'label-secondary': '#EBEBF5',
          'label-tertiary': '#8E8E93',
          'label-quaternary': '#48484A',
        },
        // Legacy colors
        'ai-blue': '#3751FF',
        'ai-purple': '#7B61FF',
        'ai-bg': '#0a0a23',
        'primary': {
          DEFAULT: '#007AFF',
          '50': '#E5F2FF',
          '100': '#CCE5FF',
          '200': '#99CCFF',
          '300': '#66B2FF',
          '400': '#3399FF',
          '500': '#007AFF',
          '600': '#0051D5',
          '700': '#0040A8',
          '800': '#002E7A',
          '900': '#001D4D',
        },
        'slate': {
          DEFAULT: '#1C1C1E',
          'light': '#2C2C2E',
          'dark': '#000000',
        },
        'off-white': '#F0F4FF',
      },
      // Typography configuration - Apple SF Pro first
      fontFamily: {
        'sf': ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text', 'system-ui', 'sans-serif'],
        'sf-rounded': ['SF Pro Rounded', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'Inter', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        futuristic: ['Orbitron', 'sans-serif'],
      },
      // Apple HIG Font Sizes
      fontSize: {
        'ios-caption2': ['11px', { lineHeight: '13px', letterSpacing: '0.07px' }],
        'ios-caption1': ['12px', { lineHeight: '16px' }],
        'ios-footnote': ['13px', { lineHeight: '18px', letterSpacing: '-0.08px' }],
        'ios-subhead': ['15px', { lineHeight: '20px', letterSpacing: '-0.24px' }],
        'ios-callout': ['16px', { lineHeight: '21px', letterSpacing: '-0.32px' }],
        'ios-body': ['17px', { lineHeight: '22px', letterSpacing: '-0.41px' }],
        'ios-headline': ['17px', { lineHeight: '22px', letterSpacing: '-0.41px', fontWeight: '600' }],
        'ios-title3': ['20px', { lineHeight: '25px', letterSpacing: '0.38px' }],
        'ios-title2': ['22px', { lineHeight: '28px', letterSpacing: '0.35px' }],
        'ios-title1': ['28px', { lineHeight: '34px', letterSpacing: '0.36px' }],
        'ios-largetitle': ['34px', { lineHeight: '41px', letterSpacing: '0.37px' }],
      },
      // Custom shadow definitions
      boxShadow: {
        'card': '0 2px 4px rgba(0, 0, 0, 0.1)',
        'ios-button': '0 2px 8px rgba(0, 122, 255, 0.3)',
        'ios-card': '0 2px 12px rgba(0, 0, 0, 0.15)',
        'ios-modal': '0 25px 50px rgba(0, 0, 0, 0.5)',
      },
      // Apple HIG Border Radius
      borderRadius: {
        'card': '12px',
        'ios-sm': '8px',
        'ios-md': '10px',
        'ios-lg': '12px',
        'ios-xl': '16px',
        'ios-2xl': '20px',
        'ios-3xl': '22px',
        'ios-full': '9999px',
      },
      // Apple HIG Spacing (8pt grid)
      spacing: {
        'ios-1': '4px',
        'ios-2': '8px',
        'ios-3': '12px',
        'ios-4': '16px',
        'ios-5': '20px',
        'ios-6': '24px',
        'ios-8': '32px',
        'ios-10': '40px',
        'ios-touch': '44px', // Minimum touch target
      },
    },
  },
  plugins: [],
};
