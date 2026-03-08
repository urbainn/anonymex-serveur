// @ts-check

import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: ["built/**", "jest.config.js", "test/**"],
  },
  eslint.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  {
    files: ["src/**/*.ts"],
    rules: {
      "@typescript-eslint/no-extraneous-class": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  }
);