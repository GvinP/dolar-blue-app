# DolarBlue — план работ (backlog)

Обновлённый план под выбранную архитектуру:

- **Бэкенд:** Supabase. Парсинг dolarhoy.com внутри **Edge Function на Deno**, fallback и
  кросс-проверка через `api.argentinadatos.com`, нормализация и отдача готовых данных на клиент.
- **Клиент:** миграция с bare React Native на **Expo** (CNG/dev builds, EAS Build, EAS Update/OTA).
- **Уведомления:** Expo Notifications + бэкенд (хранение токенов, сравнение с порогом по расписанию).
- **Виджеты:** iOS — expo-widgets / @bacons/apple-targets; Android — config-плагин + Jetpack Glance.

Текущий стек: Expo SDK 52 / React Native 0.76.5, TypeScript 5, React Navigation 7, react-native-gifted-charts.

Порядок майлстоунов: **M1 (бэкенд)** можно делать сразу и независимо → **M2 (миграция на Expo)** →
**M3 (рефактор клиента на новый бэкенд)** → **M4 (пуши)** и **M5 (виджеты)**. Качество и UX — сквозные.

---

## M1 — Бэкенд на Supabase (Edge Function на Deno)

- [x] **Завести проект Supabase и схему БД.**
  - Таблицы `quotes_latest` и `quotes_history` созданы и работают.

- [x] **Edge Function: парсинг dolarhoy.com на Deno.**
  - `supabase/functions/scrape-quotes/index.ts` — fetch HTML → deno-dom → нормализация.

- [x] **Валидация и fallback/кросс-проверка.**
  - `isPlausible()` проверяет диапазон значений; кросс-проверка blue с argentinadatos (порог 20%);
    fallback через argentinadatos при поломке парсера.

- [x] **Запуск по расписанию (pg_cron).**
  - Настроен, работает.

- [x] **Контракт API для клиента.**
  - `quotes_latest` отдаётся через PostgREST; клиент читает через `src/api/quotes.ts`.

- [x] **Вежливость к источнику и базовый мониторинг.**
  - User-Agent, таймаут 10с заданы. Мониторинг устаревших данных — не реализован (оставить на потом).

## M2 — Миграция клиента на Expo

- [x] **Перевести проект на Expo (bare workflow + expo-modules).**
  - Установлен `expo@~52.0.0` через `install-expo-modules`.
  - Обновлены: `android/` (MainApplication, MainActivity, build.gradle, settings.gradle),
    `ios/` (AppDelegate, Podfile), `babel.config.js` (`babel-preset-expo`),
    `metro.config.js` (`expo/metro-config`).
  - `index.js` переведён на `registerRootComponent`.
  - `app.json` переведён в формат Expo config.

- [x] **Настроить EAS Build.**
  - Создан `eas.json` с профилями: `development` (dev client, APK), `staging` (internal APK),
    `production` (AAB).
  - Следующий шаг: `eas build:configure` и привязка к Expo проекту (нужен аккаунт EAS).

- [ ] **Настроить EAS Update (OTA).**
  - Требует привязанного EAS проекта и `expo-updates` пакета.

- [x] **Проверить совместимость зависимостей.**
  - Все зависимости совместимы с Expo SDK 52: gifted-charts, reanimated, svg, screens,
    gesture-handler, safe-area-context, react-navigation, linear-gradient.

## M3 — Рефактор клиента под новый бэкенд

- [x] **Слой данных: `src/api/` (fetchLatestQuotes, fetchQuoteHistory).**
- [x] **`code` в ChartScreen вместо `title` (убран хрупкий convertTitle).**
- [x] **Единый тип котировки (QuoteCode, QuoteRow, Cotizacion).**
- [ ] **История из `quotes_history` (сейчас всё ещё argentinadatos).**
- [ ] **Подключить TanStack Query (React Query).**
- [ ] **Состояния загрузки / ошибки / пусто на UI.**
- [ ] **Guard'ы графика от пустых данных (Math.max/min на пустом массиве).**

## M4 — Пуш-уведомления о пороге цены

- [ ] **Клиент: Expo Notifications.**
- [ ] **Бэкенд: таблицы `devices` и `alerts`.**
- [ ] **Бэкенд: рассылка по расписанию через cron.**

## M5 — Виджеты на домашний экран

- [ ] **iOS-виджет** (expo-widgets / @bacons/apple-targets, SwiftUI).
- [ ] **Android-виджет** (config-плагин + Jetpack Glance).
- [ ] **Доставка данных в виджет** (App Group / SharedPreferences).

## Качество и здоровье проекта (сквозное)

- [x] **CI: lint + typecheck + staging build на каждый PR.**
- [ ] **Тесты на чистые функции** (`calculateLabelIndexes`, логика api-слоя).
- [ ] **Чистка мёртвого кода.**
  - `src/icons/RefershIcon.tsx` (опечатка → `RefreshIcon`, не используется).
  - Закомментированные блоки в WidgetModule, старые URL.
- [ ] **README** — описание проекта, архитектура, шаги запуска.

## UX и продукт

- [ ] **«Обновлено в HH:MM»** на главном экране (из `updatedAt` ответа бэкенда).
- [ ] **Единая тема** (вынести цвета и отступы).
- [ ] **Доступность** (`accessibilityLabel`, рост/падение не только цветом).
- [ ] **График:** вторая линия (venta) или переключатель compra/venta + мини-сводка.
- [ ] **Локализация (i18n).**
- [ ] **Офлайн-кэш** последних значений.
