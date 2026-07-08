
# DEPLOY-GUIDE — CRM-lite (Vercel + Neon)

Продакшн-деплой CRM-lite на Vercel с базой PostgreSQL на Neon.

- **URL продакшна:** https://crm-lite-azure.vercel.app/dashboard
- **GitHub-репозиторий (зеркало для Vercel):** `github.com/vasilokb/crm-lite.git` (`origin`)
- **Канал сдачи курса:** SourceCraft (`sourcecraft` remote, slug `bvm-3-7-1`)
- **Стек:** Next.js 16.2.10, Prisma 6.19.3, PostgreSQL (Neon)

---

## 1. Переменные окружения

`prisma/schema.prisma` в рантайме читает **только** два ключа:

| Переменная | Назначение | Обязательна? |
|---|---|---|
| `POSTGRES_PRISMA_URL` | Neon pooled-подключение (с `?pgbouncer=true`) — для рантайма приложения | ✅ да |
| `POSTGRES_URL_NON_POOLING` | Neon direct-подключение — для `prisma migrate deploy` (миграции нельзя через pgbouncer) | ✅ да |
| `DATABASE_URL` | Приложение его не читает; нужен только для `prisma studio` / удобства | ⛔ опционально |

> В `schema.prisma`: `url = env("POSTGRES_PRISMA_URL")`, `directUrl = env("POSTGRES_URL_NON_POOLING")`. Без обоих ключей приложение упадёт с `Environment variable not found`.

---

## 2. Локальная разработка

- Порт: **3001** (3000 занят). `npm run dev` → `next dev -p 3001`.
- Локально все три переменные указывают на один URL без pooling (см. `.env.example`).
- `.env` — в `.gitignore`, не коммитить.
- `postinstall: prisma generate` генерирует Prisma-клиент после `npm install`.

---

## 3. Деплой на Vercel

1. **Import** репозитория с GitHub в Vercel (New Project → импорт `crm-lite`). Проект уже развёрнут — конфигурация сохранена.
2. **Подключить Neon** через Vercel Storage integration (Storage → Connect Database → Neon). Это автоматически создаёт `POSTGRES_PRISMA_URL` (pooled) и `POSTGRES_URL_NON_POOLING` (direct) в Environment Variables.
   - Альтернатива: ввести переменные вручную в Settings → Environment Variables.
   - Проверить, что `POSTGRES_PRISMA_URL` содержит `?pgbouncer=true`.
3. **Install command:** `npm install` (выполнит `postinstall: prisma generate`).
4. **`vercel link`** локально (опционально) для привязки проекта к CLI.
5. **Миграции БД** (один раз и при изменениях `schema.prisma`):
   ```bash
   npx prisma migrate deploy
   ```
   Использует `POSTGRES_URL_NON_POOLING` (direct). Через pooled-URL миграции упадут.
6. **Сидирование** (один раз, для демо-данных):
   ```bash
   npm run db:seed
   ```
7. **Деплой:** push в `main` репозитория `origin` (GitHub) → авто-деплой Vercel. URL: https://crm-lite-azure.vercel.app/dashboard.
8. **Проверка:** открыть `/dashboard` — рендерятся KPI, графики, списки с реальными данными.

---

## 4. Troubleshooting

| Симптом | Причина / Решение |
|---|---|
| `Environment variable not found` при `npm run dev` / build | Не задан `POSTGRES_PRISMA_URL` или `POSTGRES_URL_NON_POOLING`. Локально — скопировать из `.env.example` в `.env`. На Vercel — проверить Environment Variables. |
| Миграции падают с ошибкой pgbouncer | Миграции идут через pooled-URL. Prisma берёт `directUrl` (`POSTGRES_URL_NON_POOLING`) — убедиться, что это **direct** (без `?pgbouncer=true`). |
| Cold start медленный (Neon suspend) | Neon free-tier приостанавливает БД при простое. Первый запрос после простоя — ~1–3 c (прогрев). Решения: Vercel Cron ping / Neon Always-ON. |
| Prisma client не сгенерирован на Vercel | Отсутствует `postinstall: prisma generate` в `package.json`. Проверить наличие. |
| Данные не обновляются после мутации | Server actions вызывают `safeRevalidate(...)`. На ISR-страницах кэш инвалидируется принудительно. |

---

## 5. Канал сдачи

- **SourceCraft** (`sourcecraft` remote) — официальный канал курса.
- **GitHub** (`origin`) — зеркало, с него деплоит Vercel.
- `[DELIVERED]` в `TEST_REPORT.md` фиксирует SourceCraft как канал сдачи (дата + ссылка на продакшн).
