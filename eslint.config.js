const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = [
  ...expoConfig,
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'app-store-screenshots/**',
      'coverage/**',
    ],
  },
  {
    files: ['src/**/*.{js,jsx}', 'App.js'],
    rules: {
      'no-console': 'warn',
      'react/no-unescaped-entities': 'warn',
    },
  },
  {
    files: ['test/**/*.js'],
    languageOptions: {
      globals: globals.jest,
    },
  },
  {
    files: ['src/utils/logger.js'],
    rules: {
      'no-console': 'off',
    },
  },
];
