# Документация по проекту Career Hub Report

Центральный документ с описанием структуры, данных, скриптов и API.

---

## 1. Назначение проекта

Аналитический отчёт по динамике подписчиков 12 Telegram-каналов в папке Career Hub. Данные: начальный срез (база), промежуточные волны и финальный снапшот с экрана «Добавить папку». Отчёт показывает прирост по волнам, типы каналов (донор/бенефициар/стабильный), интерактивные графики и карточки инсайтов.

---

## 2. Стек и окружение

| Технология | Назначение |
|------------|------------|
| React 18 | UI |
| TypeScript | Типизация |
| Vite 6 | Сборка и dev-сервер |
| Tailwind CSS v4 | Стили |
| Motion (Framer Motion) | Анимации |
| Recharts | Графики |
| Express | Локальный API (порт 3001) |

**Переменные окружения:** в корне создайте `.env` (см. `.env.example`). Обязательно для скриптов и API: `OPENAI_API_KEY=sk-...`.

---

## 3. Структура репозитория

```
/
├── index.html              # Точка входа приложения
├── report.html             # Статическая версия отчёта (опционально)
├── package.json
├── vite.config.ts          # Прокси /api → localhost:3001
├── vercel.json             # Rewrites: /api/(.*) → /api/$1; /(.*) → /index.html
├── .env, .env.example
├── career_hub_channels.csv # Субъективные заметки по каналам (сырой источник профилей)
├── api/
│   └── generate-channel-insight.js  # Vercel Serverless: инсайты по каналу (продакшен)
├── server/
│   └── index.js            # Локальный API при npm run dev (порт 3001)
├── scripts/
│   ├── generate-conclusion.ts   # Генерация вывода (conclusion.ts)
│   ├── generate-channel-insight.ts  # CLI: инсайт по одному каналу
│   └── test-parse-snapshot.js   # Тест эндпоинта parse-snapshot (не используется в UI)
├── src/
│   ├── main.tsx
│   ├── app/
│   │   ├── App.tsx             # Главный компонент: данные, таблица, инсайты, графики
│   │   ├── components/         # LazySection, LoadingScreen, UI (radix), figma
│   │   └── utils/
│   ├── data/
│   │   ├── snapshot.ts         # Снапшот: дата/время, snapshotMembers (username → число)
│   │   ├── channelBase.ts      # Базовые данные: base, wave1, wave2, current по каналам
│   │   ├── channelProfiles.ts  # Краткие текстовые профили каналов для промпта инсайтов
│   │   ├── conclusion.ts       # Текстовый вывод (генерируется скриптом)
│   │   └── insights.ts         # Вспомогательные тексты инсайтов (по необходимости)
│   └── styles/
└── docs/
    ├── PROJECT.md              # Этот файл
    └── PROMPT-UPDATE-KEY-INSIGHTS.md  # Промпт для обновления инсайтов в report.html
```

---

## 4. Источники данных

### 4.1. Снапшот — `src/data/snapshot.ts`

- **REPORT_START_DATETIME / REPORT_START_LABEL** — начало периода наблюдения.
- **SNAPSHOT_DATETIME / SNAPSHOT_LABEL / SNAPSHOT_TIME** — дата и время последнего снапшота.
- **SNAPSHOT_WAVE_NUMBER** — номер волны для текущего среза (например, 3).
- **snapshotMembers** — объект `Record<string, number>`: ключ — username канала без `@`, значение — число участников на момент скрина.

Данные с экрана «Добавить папку» вводятся вручную в `snapshotMembers`. Соответствие отображаемых названий и username описано в комментариях в начале файла.

### 4.2. Базовые данные — `src/data/channelBase.ts`

- **BASE_CHANNEL_DATA** — массив объектов по каждому каналу: `channel` (например `@tooltipp`), `base`, `wave1`, `wave2`, `current`, а также `growth1`, `growth2`, `growth3`, `total`, `type` ('donor' | 'beneficiary' | 'stable').
- Поля `final`, `growth3` и пересчитанный `total` в рантайме подставляются из `snapshot.ts` (см. `App.tsx`: `channelData` строится из `BASE_CHANNEL_DATA` и `snapshotMembers`).

### 4.3. Вывод — `src/data/conclusion.ts`

Текстовый блок «Финальный вывод»; генерируется скриптом `npm run generate-conclusion` по данным снапшота и channelBase.

### 4.4. Профили каналов — `src/data/channelProfiles.ts` / `career_hub_channels.csv`

- **career_hub_channels.csv** — исходный CSV с субъективными описаниями каналов (колонки `folder,channel_title,handle,author,my_characteristic`).
- **`CHANNEL_PROFILES` в `src/data/channelProfiles.ts`** — компактная карта `handle → 1–3 предложения`, собранная вручную из CSV.
- Эти профили не участвуют в расчёте метрик и используются только как OPTIONAL_PROFILE в промпте для AI-инсайтов по каналу.

---

## 5. Сборка данных в приложении

В `App.tsx`:

- **activeSnapshot** = `snapshotMembers` (из `snapshot.ts`).
- **channelData** = `BASE_CHANNEL_DATA.map(...)`: для каждого канала из `row.channel` извлекается ключ без `@`, по нему берётся `snapshotFinal` из `activeSnapshot`; считаются `growth3 = snapshotFinal - row.current` и обновлённый `total`; в объект подставляются `final: snapshotFinal` и новые `growth3`, `total`.

Графики, таблица и карточки инсайтов используют этот `channelData`.

---

## 6. Скрипты (package.json)

| Команда | Описание |
|---------|----------|
| `npm run dev` | Запускает Vite и API (`node server/index.js`) через concurrently. Сайт — localhost:5173, API — 3001. |
| `npm run dev:server` | Только API на порту 3001. |
| `npm run build` | Сборка в `dist/`. |
| `npm run generate-conclusion` | Генерация `src/data/conclusion.ts` через OpenAI по snapshot + channelBase. |
| `npm run generate-channel-insight` | CLI: передайте username, например `npx tsx scripts/generate-channel-insight.ts @tooltipp` — выводит инсайт по каналу в консоль. |
| `npm run test:parse-snapshot` | Отправляет тестовый запрос на `/api/parse-snapshot-image` (нужен запущенный dev с API). |

---

## 7. API

**Локально (npm run dev):** запросы к `/api` проксируются на `server/index.js` (порт 3001).

**На Vercel (продакшен):** запросы к `/api/generate-channel-insight` и `/api/parse-snapshot-image` обрабатывают серверные функции из `api/generate-channel-insight.js` и `api/parse-snapshot-image.js` (ESM, `export default function handler`). Файл `vercel.json` задаёт rewrites: `/api/(.*)` → `/api/$1`, затем `/(.*)` → `/index.html`. Чтобы инсайты и «Обновить по скрину» работали на career-hub-report.vercel.app, в Vercel добавьте переменную окружения `OPENAI_API_KEY` (см. DEPLOY.md).

| Метод | Путь | Назначение |
|-------|------|------------|
| GET | `/api/health` | Проверка доступности API. Ответ: `{ "ok": true }`. |
| POST | `/api/generate-channel-insight` | Тело: `{ "prompt": "..." }`. Генерация инсайта по каналу через OpenAI (gpt-4o-mini). Ответ: `{ "content": "..." }`. |
| POST | `/api/parse-snapshot-image` | Тело: `{ "image": "<base64 или data URL>" }`. Распознавание скриншота «Добавить папку» через OpenAI Vision, возврат `{ "members": { "username": number, ... } }`. Вызывается кнопкой «Обновить по скрину» в UI. |

Для всех POST-маршрутов нужен `OPENAI_API_KEY` в `.env`.

---

## 8. Функции в интерфейсе

- Таблица лидеров роста с колонками: канал, база, волна 1, волна 2, текущее, финал, прирост по волнам, тип.
- Кнопка ✨ в строке канала — открывает модалку с AI-инсайтами по каналу (запрос к `/api/generate-channel-insight`).
  - В промпт передаются данные по волнам (из `channelBase.ts` + `snapshot.ts`), список каналов папки и OPTIONAL_PROFILE из `channelProfiles.ts`.
  - Ответ структурирован в секции A/B/C/D/F: TL;DR, метрики, инсайты, гипотезы и контекст сравнения (рекомендации «что делать» не запрашиваются).
- Графики по волнам, блок «Наблюдение», карточки «Ключевые инсайты» (строятся по `channelData` и данным из snapshot/channelBase).
- Футер: период отчёта, текущая дата, дата актуализации данных (из snapshot).
- Кнопка «Добавить папку» — ссылка на добавление папки в Telegram.
- Диагностика доступности (кнопка «Диагностика» внизу).

---

## 9. Обновление данных после нового скрина

1. Откройте экран «Добавить папку» в Telegram и сделайте скрин.
2. В `src/data/snapshot.ts` обновите:
   - `snapshotMembers` — значения по каждому каналу (ключи без `@`).
   - При необходимости `SNAPSHOT_DATETIME`, `SNAPSHOT_LABEL`, `SNAPSHOT_TIME`, `SNAPSHOT_WAVE_NUMBER`.
3. Если менялись границы периода — обновите `REPORT_START_DATETIME` / `REPORT_START_LABEL`.
4. Базовые точки волн (wave1, wave2, current) при необходимости правятся в `src/data/channelBase.ts`.
5. Для статического `report.html`: обновить блок «Ключевые инсайты» по инструкции из `docs/PROMPT-UPDATE-KEY-INSIGHTS.md`.

---

## 10. Связанные документы

- **README.md** — обзор проекта, быстрый старт, деплой, доступность.
- **docs/PROMPT-UPDATE-KEY-INSIGHTS.md** — промпт для обновления инсайтов в report.html.
- **PERFORMANCE.md**, **DIAGNOSTICS.md**, **ALTERNATIVE_HOSTING.md**, **DEPLOY.md**, **ATTRIBUTIONS.md** — в корне проекта.

---

*Последнее обновление: 11 февраля 2026. Деплой: https://career-hub-report.vercel.app*
