import css from '@eslint/css'
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs'
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'
import prettierRecommended from 'eslint-plugin-prettier/recommended'
import { defineConfig, globalIgnores } from 'eslint/config'
import kebabCaseFilename from './eslint-rules/kebab-case-filename.mjs'
import noHardcodedColorsCss from './eslint-rules/no-hardcoded-colors-css.mjs'
import noHardcodedColors from './eslint-rules/no-hardcoded-colors.mjs'

// Reglas de la casa: lo que dice AGENTS.md, bloqueado por lint.
const house = {
  rules: {
    'kebab-case-filename': kebabCaseFilename,
    'no-hardcoded-colors': noHardcodedColors,
    'no-hardcoded-colors-css': noHardcodedColorsCss,
  },
}

export default defineConfig([
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'public/**',
    'next-env.d.ts',
  ]),
  {
    files: ['**/*.{js,jsx,mjs,ts,tsx}'],
    plugins: { house },
    extends: [
      ...nextCoreWebVitals,
      ...nextTypescript,
      comments.recommended,
      prettierRecommended,
    ],
    rules: {
      'house/kebab-case-filename': 'error',
      'house/no-hardcoded-colors': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': true,
          'ts-expect-error': true,
          'ts-nocheck': true,
          'ts-check': false,
        },
      ],
      // Prohibido silenciar reglas con comentarios.
      '@eslint-community/eslint-comments/no-use': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  // Las reglas citan colores en sus propios mensajes.
  {
    files: ['eslint-rules/**'],
    rules: { 'house/no-hardcoded-colors': 'off' },
  },
  // Único lugar para colores en TS (ver docs/css.md).
  {
    files: ['src/lib/constants/colors.ts'],
    rules: { 'house/no-hardcoded-colors': 'off' },
  },
  // CSS: solo se usa para la regla de colores.
  {
    files: ['**/*.css'],
    language: 'css/css',
    languageOptions: { tolerant: true },
    plugins: { css, house },
    rules: { 'house/no-hardcoded-colors-css': 'error' },
  },
  // Única fuente de verdad de colores.
  {
    files: ['src/app/globals.css'],
    rules: { 'house/no-hardcoded-colors-css': 'off' },
  },
])
