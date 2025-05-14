module.exports = {
  env: {
    node: true,
    es6: true,
    jest: true
  },
  extends: [
    'standard',
    'plugin:jest/recommended'
  ],
  parserOptions: {
    ecmaVersion: 2022
  },
  rules: {
    semi: ['error', 'always'],
    'comma-dangle': ['error', 'only-multiline'],
    'space-before-function-paren': ['error', {
      anonymous: 'always',
      named: 'never',
      asyncArrow: 'always'
    }],
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off'
  }
};
