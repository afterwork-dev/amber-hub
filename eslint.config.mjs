import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import eslintConfigPrettier from 'eslint-config-prettier'

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      // App storage is derived build output, reconciled by the build's sync step. Linting it
      // means linting each app's bundled output, which is not source anyone can act on.
      '**/apps-data/**',
      '**/playwright-report/**',
      '**/test-results/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    rules: {
      'max-depth': ['warn', 3],
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    // Plain-JS fixtures under backend/ are executed by Node (they stand in for an App's
    // backend entry), so Node globals are defined for them.
    files: ['backend/**/__tests__/fixtures/**/*.js'],
    languageOptions: {
      globals: { process: 'readonly', console: 'readonly' },
    },
  },
  {
    // App boundary: apps/* are architecturally external residents of this repo. They may
    // import @amber-hub/app-sdk and their own dependencies — nothing else from the Hub.
    // This is what keeps any app extractable into its own repository later.
    files: ['apps/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@amber-hub/shared', '@amber-hub/shared/*'],
              message:
                'Apps must not import @amber-hub/shared directly. Use @amber-hub/app-sdk, which re-exports the parts of it that are part of the app contract.',
            },
            {
              group: ['**/backend/src/**', '**/frontend/src/**', '**/shared/src/**'],
              message:
                'Apps must not reach into Hub internals. Talk to the Hub only through the documented contracts (mount/unmount, registerRoute, registerTool, /app-api, /resources) via @amber-hub/app-sdk.',
            },
          ],
        },
      ],
    },
  },
  eslintConfigPrettier,
)
