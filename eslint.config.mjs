import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettierConfig from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';

export default [
  { ignores: ['node_modules/**', 'dist/**', 'local/**', 'artifacts/**'] },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      import: importPlugin,
    },
    rules: {
      // === STRICT TYPE SAFETY ===
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true, // allows inline arrow fns in callbacks
          allowTypedFunctionExpressions: true,
        },
      ],
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',

      // === NO SHORTCUTS ===
      eqeqeq: ['error', 'always'], // no == or !=
      'no-var': 'error', // no var
      'prefer-const': 'error', // const over let
      '@typescript-eslint/no-inferrable-types': 'off', // allow explicit types even when inferrable
      'no-console': ['error', { allow: ['error', 'warn'] }], // no console.log

      // === EXPORTS ===
      'import/no-default-export': 'error', // named exports only
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc' },
        },
      ],

      // === CODE QUALITY ===
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': 'error',
      'no-return-await': 'off',
      '@typescript-eslint/return-await': ['error', 'in-try-catch'],
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-ignore': true, 'ts-nocheck': true, 'ts-expect-error': true },
      ],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-unreachable': 'error',
      'no-duplicate-imports': ['error', { allowSeparateTypeImports: true }],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSTypeReference[typeName.name="any"]',
          message: 'Do not use "any". Use "unknown" and narrow, or define a concrete type.',
        },
      ],
    },
  },
  prettierConfig,
];
