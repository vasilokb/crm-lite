import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // A7: запрет сырого prisma вне db.ts/auth (tenant-изоляция)
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    ignores: ['src/lib/db.ts', 'src/lib/auth/**'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{
          name: '@/lib/db',
          importNames: ['prisma'],
          message: "Импортируйте getTenantPrisma() из '@/lib/auth/session', не сырой prisma",
        }],
      }],
    },
  },
]);

export default eslintConfig;