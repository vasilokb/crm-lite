# Phase 2 — Воспроизводимый локальный запуск · D

> Детальный план для фазы 2 из `../Plan.md` §10. Открывается агентом непосредственно перед фазой 2.
>
> **Контекст для агента (M15):** прочитай `../Plan.md` §7 (окружение) + §7.5 (точные версии) + `package.json` (если есть в `home-work/`).

## 0. Цель

Другой человек поднимает CRM-lite **по README без правки кода под окружение**: `.env.example`, `.gitignore`, `package.json` с точными версиями Prisma/Chart.js/tsx, npm-скрипты `db:*`, явный запрет `@prisma/adapter-pg`/`PrismaPg`/`prisma.config.ts` (final-mvp §1).

## 1. `.env.example`

Файл `.env.example` в корне проекта — **одна** переменная, безопасный placeholder:

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/crm_dev?schema=public"
```

Реальный пароль — **только** в локальном `.env` (создаётся через `cp .env.example .env`). Реальный `DATABASE_URL` НЕ выводить в чат, README или коммит (запрет §7.2).

## 2. `.gitignore`

Минимум строк (Plan.md §7.2):

```
.env
.env.local
node_modules/
.next/
*.tsbuildinfo
```

**Проверка:** `.env.example` НЕ в `.gitignore` (коммитится), `.env` — в `.gitignore`.

## 3. `package.json` — точные версии

Установить через `--save-exact` (Plan.md §7.5):

```bash
# Точные фиксированные версии
npm install --save-exact @prisma/client@6.19.3
npm install -D --save-exact prisma@6.19.3
npm install --save-exact chart.js@4.5.1 react-chartjs-2@5.3.1

# Без --save-exact (можно с caret, не критично)
npm install zod tsx
```

После установки в `package.json` должно быть (**БЕЗ `^` и `~` для зафиксированных пакетов**):

- `"prisma": "6.19.3"` (devDependencies)
- `"@prisma/client": "6.19.3"` (dependencies)
- `"chart.js": "4.5.1"`
- `"react-chartjs-2": "5.3.1"`
- `"tsx": "4.x.x"` (точная минорная версия для запуска `prisma/seed.ts`)
- `"zod": "^3.x.x"` (можно с caret)

## 4. Запреты (D11 — СТРОГИЙ ПОРЯДОК)

Если в проекте уже есть `prisma.config.ts` или установлены `@prisma/adapter-pg`/`PrismaPg` (проверить `home-work/package.json`):

```bash
# Шаг 1 — удалить зависимости
npm uninstall @prisma/adapter-pg PrismaPg

# Шаг 2 — проверить, что их нет
grep -E "adapter-pg|PrismaPg|prisma.config" package.json
# Ожидание: пусто

# Шаг 3 — удалить сам файл
rm prisma.config.ts
ls prisma.config.ts 2>/dev/null
# Ожидание: "No such file or directory"

# Шаг 4 — чистая установка
rm -rf node_modules package-lock.json && npm install
```

**⚠ Не менять порядок:** сначала `npm uninstall`, потом `rm` — иначе зависимые импорты побьются.

## 5. npm-скрипты (db:*)

В секции `"scripts"` в `package.json`:

```json
{
  "dev":        "next dev",
  "build":      "next build",
  "start":      "next start",
  "db:migrate": "prisma migrate dev",
  "db:seed":    "tsx prisma/seed.ts",
  "db:reset":   "prisma migrate reset --force && npm run db:seed",
  "db:studio":  "prisma studio"
}
```

- `db:reset` пересоздаёт БД и перезапускает seed (Plan.md §7.4). Только в dev-контуре и только после явного подтверждения пользователя.
- `db:studio` — Prisma Studio (удобно для отладки).

> **⚠ Все скрипты `db:*` регистрируются здесь, но `db:migrate` и `db:seed` заработают только после фазы 3 (создание `prisma/schema.prisma`) и фазы 4 (создание `prisma/seed.ts`) соответственно. В фазе 2 проверяется только наличие скриптов в `package.json` через `grep`, НЕ их запуск.**
>
> `db:reset` = `prisma migrate reset --force && npm run db:seed` — только после фазы 4, иначе вторая команда упадёт на отсутствующем `seed.ts`.

## 6. Секция «Как запустить» в README

Дополнить README (созданный в фазе 1) блоком:

```bash
# macOS / Windows (PowerShell)
cp .env.example .env       # указать реальный DATABASE_URL
npm install
npm run db:migrate         # применить схему (фаза 3)
npm run db:seed            # контрольные данные 6/4/5/6/8 (фаза 4)
npm run dev                # http://localhost:3000
```

**Подсекции:**
- **macOS / Linux (bash):** команды выше как есть.
- **Windows (PowerShell):** `Copy-Item .env.example .env` вместо `cp`, остальные команды одинаковые.
- **Если PostgreSQL не установлен** (Plan.md §14 A2):** добавить в README краткую секцию «Установка PostgreSQL»:
  - **macOS:** `brew install postgresql@16 && brew services start postgresql@16`
  - **Windows:** скачать с https://www.postgresql.org/download/windows/, установить, запустить сервис.
  - **Linux:** `sudo apt install postgresql postgresql-contrib && sudo systemctl start postgresql`.
  - После установки — создать dev-БД: `createdb crm_dev` (или через `psql -c "CREATE DATABASE crm_dev;"`).
  - Проверить подключение: `psql -d crm_dev -c "SELECT 1;"`.

## 7. Test-критерии (для отметки [x])

```bash
# .env.example безопасен (нет реального пароля)
cat .env.example
# Ожидание: только DATABASE_URL с placeholder USER:PASSWORD

# .env в .gitignore, .env.example НЕ в .gitignore
git check-ignore -v .env
# Ожидание: выводит .gitignore
git check-ignore -v .env.example
# Ожидание: НЕ выводит ничего (не игнорируется)

# Точные версии в package.json
grep -E '"prisma":|"@prisma/client":|"chart.js":|"react-chartjs-2":|"tsx":' package.json
# Ожидание: prisma 6.19.3, @prisma/client 6.19.3, chart.js 4.5.1,
# react-chartjs-2 5.3.1, tsx — любая минорная

# Запреты соблюдены
grep -E "adapter-pg|PrismaPg|prisma.config" package.json
# Ожидание: пусто
ls prisma.config.ts 2>/dev/null
# Ожидание: "No such file or directory"

# Скрипты db:* есть
grep -E '"db:migrate"|"db:seed"|"db:reset"|"db:studio"|"dev"|"build"' package.json
# Ожидание: все 6 найдены

# npm install проходит
npm install
# Ожидание: exit 0, без ошибок про adapter-pg/PrismaPg
```

## 8. Коммит после фазы

```bash
git add .env.example .gitignore package.json package-lock.json README.md
git commit -m "chore: .env.example, .gitignore, точные версии Prisma/Chart.js/tsx, скрипты db:*"
```
