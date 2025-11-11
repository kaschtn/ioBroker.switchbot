module.exports = {
    root: true,
    env: {
        es6: true,
        node: true,
        mocha: true
    },
    extends: [
        'eslint:recommended'
    ],
    parserOptions: {
        ecmaVersion: 2020
    },
    rules: {
        'indent': ['error', 4],
        'no-console': 'off',
        'no-unused-vars': ['error', { 'ignoreRestSiblings': true, 'argsIgnorePattern': '^_' }],
        'no-trailing-spaces': 'error',
        'quotes': ['error', 'single'],
        'semi': ['error', 'always']
    }
};