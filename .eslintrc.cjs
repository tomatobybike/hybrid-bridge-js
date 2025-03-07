module.exports = {
  extends: ['airbnb-base', 'prettier'],
  env: {
    browser: true,
    es2021: true
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'import/extensions': ['error', 'always', { ignorePackages: true }],
    'no-underscore-dangle': ['error', { allowAfterThis: true }],
    'no-console': ['warn', { allow: ['warn', 'error'] }]
  }
};