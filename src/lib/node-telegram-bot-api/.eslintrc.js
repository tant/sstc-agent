module.exports = {
  env: {
    es2021: true,
    node: true,
  },
  extends: [
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  rules: {
    'no-underscore-dangle': 'off',
    'class-methods-use-this': 'off',
    'no-param-reassign': 'off',
    'no-console': 'off',
    'max-classes-per-file': 'off',
    'prefer-destructuring': 'off',
    'prefer-rest-params': 'off',
    'consistent-return': 'off',
    'no-restricted-syntax': 'off',
    'guard-for-in': 'off',
    'no-plusplus': 'off',
    'no-continue': 'off',
    'no-use-before-define': 'off',
    'no-shadow': 'off',
    'default-param-last': 'off',
    'max-len': ['error', { code: 150 }],
  },
};