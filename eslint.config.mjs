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
  // A7: запрет сырого prisma вне db.ts/auth (tenant-изоляция).
  // src/auth.ts тоже исключён: PrismaAdapter требует сырой prisma.
  // + Auth-flow файлы A9: register/invite/witch/layout (до сессии или над tenant-границами).
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    ignores: [
      'src/lib/db.ts',
      'src/lib/auth/**',
      'src/auth.ts',
      'src/app/register/**',
      'src/app/invite/**',
      'src/app/login/**',
      'src/app/actions/**',
      'src/app/layout.tsx',
    ],
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
  // scripts/* — это smoke/utility-скрипты, не часть приложения.
  // Лояльнее к 'any' и неиспользованным переменным.
  {
    files: ['scripts/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
]);

export default eslintConfig;