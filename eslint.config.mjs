// eslint.config.mjs
import { defineConfig, globalIgnores } from 'eslint/config';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

export default defineConfig([
  // Base Next.js + React + Core Web Vitals rules
  ...nextCoreWebVitals,
  // TypeScript rules from Next.js config
  ...nextTypescript,
  // Global ignores (build artifacts, generated files, config)
  globalIgnores([
    'node_modules/**',
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'eslint.config.mjs',
  ]),
]);
