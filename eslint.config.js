// @ts-check

import eslint from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import importOrderPlugin from 'eslint-plugin-import';

export default [
  {
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'import': importOrderPlugin,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        AbortController: 'readonly',
        // Testing globals
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        // Node.js globals
        process: 'readonly',
        require: 'readonly'
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        },
      },
    },
    rules: {
      // React rules
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      'react/prop-types': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      
      // Import order rules
      'import/order': ['warn', {
        'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        'alphabetize': { 'order': 'asc', 'caseInsensitive': true }
      }],
      
      // Common rules
      'no-console': 'warn',
      'no-unused-vars': 'warn',
      'no-case-declarations': 'warn',
      'no-prototype-builtins': 'warn',
      'no-unreachable': 'warn',
    },
    settings: {
      react: {
        version: 'detect'
      }
    },
    ignores: ['dist/**', 'node_modules/**', '**/*.min.js', 'coverage/**']
  }
];
