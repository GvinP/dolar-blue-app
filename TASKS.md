# DolarBlue — план работ (backlog)

> Сверено с кодом 2026-09-18. Статусы ниже отражают то, что реально лежит в репозитории,
> а не изначальный план — там, где реализация разошлась с задумкой, это отмечено.

Архитектура:

- **Бэкенд:** Supabase. Парсинг dolarhoy.com внутри **Edge Function на Deno**, fallback и
  кросс-проверка через `api.argentinadatos.com`, нормализация и отдача готовых данных на клиент.
- **Клиент:** Expo (CNG/dev builds, EAS Build). OTA-обновления пока не подключены.
- **Уведомления:** Expo Notifications + бэкенд (хранение токенов, сравнение с порогом по расписанию).
- **Виджеты:** Android — нативный RemoteViews-провайдер (Jetpack Glance не понадобился);
  iOS — не начат.

Текущий стек: Expo SDK 52 / React Native 0.76.5, TypeScript 5, React Navigation 7, react-native-gifted-charts.

M1–M5 закрыты. Осталось: iOS-виджет, OTA, и сквозные треки качества и UX.

---

## M1 — Бэкенд на Supabase (Edge Function на Deno) ✅

- [x] **Завести проект Supabase и схему БД.**
  - Таблицы `quotes_latest` и `quotes_history` созданы и работают.

- [x] **Edge Function: парсинг dolarhoy.com на Deno.**
  - `supabase/functions/scrape-quotes/index.ts` — fetch HTML → deno-dom → нормализация.

- [x] **Валидация и fallback/кросс-проверка.**
  - `isPlausible()` проверяет диапазон значений; кросс-проверка blue с argentinadatos (порог 20%);
    fallback через argentinadatos при поломке парсера.

- [x] **Запуск по расписанию (pg_cron).**
  - `scrape-dolar-quotes`: `*/5 * * * *`.

- [x] **Контракт API для клиента.**
  - `quotes_latest` отдаётся через PostgREST; клиент читает через `src/api/quotes.ts`.

- [x] **Вежливость к источнику и базовый мониторинг.**
  - User-Agent, таймаут 10с заданы.
  - ⚠️ Мониторинг устаревших данных так и не сделан: если скрейпер молча сломается,
    приложение будет показывать старые цифры без предупреждения. Кандидат в UX-трек
    вместе с «Обновлено в HH:MM».

## M2 — Миграция клиента на Expo ✅ (кроме OTA)

- [x] **Перевести проект на Expo (bare workflow + expo-modules).**
  - `expo@~52.0.0` через `install-expo-modules`; `index.js` на `registerRootComponent`,
    `app.json` в формате Expo config.

- [x] **Настроить EAS Build.**
  - `eas.json` с профилями `development` / `staging` / `production`.

- [ ] **Настроить EAS Update (OTA).**
  - `expo-updates` не установлен. Требует привязанного EAS-проекта.
  - Внешняя зависимость: нужен аккаунт EAS, кодом в одиночку не закрывается.

- [x] **Проверить совместимость зависимостей.**
  - Все зависимости совместимы с Expo SDK 52.

## M3 — Рефактор клиента под новый бэкенд ✅

- [x] **Слой данных: `src/api/` (fetchLatestQuotes, fetchQuoteHistory).**
- [x] **`code` в ChartScreen вместо `title` (убран хрупкий convertTitle).**
- [x] **Единый тип котировки (QuoteCode, QuoteRow, Cotizacion).**
- [x] **Подключить TanStack Query (React Query).**
- [x] **Состояния загрузки / ошибки / пусто на UI.**
- [x] **Guard'ы графика от пустых данных (Math.max/min на пустом массиве).**
- [x] **История из `quotes_history_daily` (Supabase-вьюха с дневными агрегатами).**
  - Переход с argentinadatos на собственную историю произошёл автоматически ~20.07.2026.

## M4 — Пуш-уведомления о пороге цены ✅

- [x] **Клиент: Expo Notifications.**
  - `src/notifications.ts` — запрос разрешений, `getExpoPushTokenAsync`, синк настроек.

- [x] **Бэкенд: хранение токенов.**
  - Вместо задуманных `devices` + `alerts` получилась одна таблица `push_tokens`:
    токен + `watch_code` + `threshold_pct`. Порог per-device, отдельная сущность «алерт»
    не понадобилась. Токен сам по себе является секретом (RLS: anon INSERT + UPDATE
    только двух колонок).
  - Плюс Edge Function `register-push-token`, которой не было в плане.

- [x] **Бэкенд: рассылка по расписанию через cron.**
  - `send-notifications` группирует токены по `watch_code`, считает дельту один раз
    на код и шлёт тем, у кого пройден свой порог.
  - `send-notifications-after-scrape`: запускается через минуту после скрейпа.

- [x] **Настройки в UI.**
  - `SettingsScreen`: выбор отслеживаемого курса и порога в %.

## M5 — Виджеты на домашний экран

- [x] **Android-виджет.**
  - ⚠️ Сделан не так, как планировалось: вместо config-плагина + Jetpack Glance —
    нативный `WidgetProvider` на RemoteViews прямо в `android/`. Glance не понадобился,
    виджет статический и перерисовывается целиком.
  - 2×1, по строке на курс (имя · venta · pill), палитра и шрифты приложения.
  - Кнопка ⟳ гоняет Headless JS задачу без открытия приложения.
  - Проверено на устройстве.

- [x] **Доставка данных в виджет (Android).**
  - SharedPreferences: `HomeScreen` и headless-задача пушат через `WidgetModule`.

- [ ] **iOS-виджет** (expo-widgets / @bacons/apple-targets, SwiftUI).
  - Не начат. Потребует Apple-таргетов и, скорее всего, prebuild.

- [ ] **Доставка данных в виджет (iOS)** — App Group, вместе с iOS-виджетом.

## Качество и здоровье проекта (сквозное)

- [x] **CI: lint + typecheck + staging build на каждый PR.**

- [ ] **Починить `__tests__/App.test.tsx`.**
  - Падает с «Element type is invalid» независимо от кода компонентов — похоже на
    несовместимость `@react-navigation/stack` + `react-native-screens` +
    `react-test-renderer`. Не блокирует CI (jest туда не входит).
  - Вероятное решение: перейти на `@testing-library/react-native`.

- [ ] **Тесты на чистые функции** (`calculateLabelIndexes`, парсинг в api-слое).
  - Сейчас в `__tests__/` лежит только сломанный App.test.tsx.

- [ ] **Чистка мёртвого кода.**
  - Осталось только `src/icons/RefershIcon.tsx` — нигде не импортируется, плюс опечатка
    в имени. Закомментированные блоки в `WidgetModule` уже вычищены.

- [ ] **README** — описание проекта, архитектура, шаги запуска.

## UX и продукт

- [ ] **«Обновлено в HH:MM»** на главном экране.
  - Виджет это уже показывает, само приложение — нет.

- [x] **Единая тема — цвета и шрифты.**
  - `assets/colors/colors.ts` (палитра «casa de cambio») и `assets/fonts/index.ts`.
  - ⚠️ Для виджета палитра и шрифты **продублированы** в `res/values/widget_colors.xml`
    и `res/font/` — RemoteViews не читает JS-бандл. Менять надо в обоих местах.

- [ ] **Единая тема — отступы и радиусы.**
  - Не вынесены, живут числами по компонентам.

- [ ] **Доступность.**
  - `accessibilityLabel` / `accessibilityRole` в коде отсутствуют полностью (0 вхождений).
  - Рост/падение: в приложении есть стрелки ▲/▼, в виджете их пришлось убрать ради
    ширины — там направление несут цвет и знак минуса.

- [ ] **График:** вторая линия (venta) или переключатель compra/venta + мини-сводка.

- [ ] **Локализация (i18n).**
  - Библиотека не установлена, строки захардкожены по-испански.

- [ ] **Офлайн-кэш** последних значений.
  - Сейчас без сети главный экран пустой: TanStack Query держит кэш только в памяти.
