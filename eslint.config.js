export default [
  {
    files: ['**/*.js'],
    languageOptions: {
      // n8n Code nodes run inside an async function wrapper,
      // so top-level return/await are valid. Using 'module'
      // sourceType allows top-level await parsing.
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        Date: 'readonly',
        Math: 'readonly',
        JSON: 'readonly',
        Set: 'readonly',
        String: 'readonly',
        Promise: 'readonly',
        setTimeout: 'readonly',
        fetch: 'readonly',
        Error: 'readonly',
        // n8n Code node globals
        $input: 'readonly',
        $env: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-constant-condition': 'warn',
      'no-unreachable': 'error',
      'eqeqeq': ['error', 'always'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
    },
  },
];
