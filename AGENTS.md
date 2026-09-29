# CV
**Summary**: сайт-резюме на GitHub Pages — Astro, статичный HTML без клиентского JS.

<!-- CLAUDE.md — симлинк на этот файл (так создал create-astro). Локальные правила автора — CLAUDE.local.md, вне git. -->

## Стек и запуск
- Astro 7, без UI-фреймворков и без клиентского JS; Node >= 22.12.
- `npm run dev` — локально (в фоне: `npx astro dev --background`, стоп `npx astro dev stop`).
- `npm test` — тесты гейта приватности (`node --test`).
- `npm run check` — сборка + гейт приватности по `dist/` и по всем файлам, которые уйдут в коммит. Локально требует `.privacy-denylist`.
- Выкладка: пуш в `main` → GitHub Actions (`.github/workflows/deploy.yml`, `withastro/action`: `npm test && npm run check`) → Pages.
- Перед пушем: `trivy fs --scanners vuln,secret,misconfig --skip-dirs node_modules --skip-dirs dist .`

## Структура
- `src/data/profile.json` — кто я, статус, цифры, контакты. Тексты правятся здесь, не в вёрстке.
- `src/content/cases/*.md` — кейсы (коллекция `cases`, схема в `src/content.config.ts`), порядок полем `order`.
- `src/pages/index.astro` + `src/layouts/Base.astro` + `src/styles/global.css` — вёрстка; цвета и шрифты — токенами в `:root`.
- `scripts/check-privacy.mjs` — гейт приватности, тесты рядом.

## Правила
- Ревью перед коммитом; логика в `scripts/` — сначала падающий тест. Вёрстка и тексты проверяются сборкой и гейтом.
- Документация Astro: https://docs.astro.build — сверяться перед работой с роутингом, коллекциями, стилями.
