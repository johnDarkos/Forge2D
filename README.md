# Sprite Cutter

React + TypeScript + Vite, менеджер пакетов — pnpm.

Версия Node.js зафиксирована в `.nvmrc` (22.19.0), pnpm — в `package.json`
(`packageManager: pnpm@12.3.4`). При использовании nvm выполните `nvm install`
и `nvm use` из корня проекта.

```sh
pnpm install
cp .env.example .env
pnpm dev
```

Команды:

- `pnpm dev` — сервер разработки на порту 5173.
- `pnpm build` — проверка TypeScript и production-сборка в `dist`.
- `pnpm preview` — просмотр сборки на порту 4173.
- `pnpm lint` — Oxlint; ошибки и предупреждения приводят к ненулевому коду выхода.
- `pnpm lint:fix` — автоматическое исправление поддерживаемых правил.
- `pnpm format` — форматирование исходников, тестов, конфигурации и документации через Prettier.
- `pnpm format:check` — проверка форматирования без изменения файлов.
- `pnpm typecheck` — проверка TypeScript без сборки приложения.
- `pnpm test` — запуск Vitest в режиме наблюдения.
- `pnpm test:run` — однократный запуск тестов, в том числе в CI.

Vitest использует алиасы и React-плагин из Vite, окружение `jsdom` и React Testing
Library. Размещайте тесты в файлах `*.test.ts` / `*.test.tsx` рядом с исходниками.
Импортируйте `test`, `expect`, `vi` из `vitest` явно. Матчеры `jest-dom`
(например, `toBeInTheDocument`) подключены в `src/test/setup.ts`, после каждого
теста DOM очищается автоматически. Для действий пользователя доступен
`@testing-library/user-event`.
Настройки описаны в [документации Vitest](https://vitest.dev/config/).

Алиасы настроены в Vite и TypeScript: `@/*` → `src/*`, `@assets/*` → `src/assets/*`.

`.env` содержит общие настройки. `.env.development` и `.env.production` переопределяют
их для соответствующего режима. Для личных настроек используйте `.env.local`
или `.env.[mode].local`. После изменения env перезапустите сервер разработки.
В Git сохраняется только `.env.example`; остальные env-файлы игнорируются.
На новой машине достаточно скопировать шаблон в `.env`, файлы режимов необязательны.

`VITE_APP_TITLE` задаёт заголовок вкладки; без него используется `Sprite Cutter`.
Переменные доступны через `import.meta.env`, типы объявлены в `src/vite-env.d.ts`.
Все переменные `VITE_*` попадают в клиентский код — секреты в них хранить нельзя.

Документация: [Vite env](https://vite.dev/guide/env-and-mode),
[Oxlint](https://oxc.rs/docs/guide/usage/linter/config).

TDD-тесты MVP, мок-данные, правила запуска RED-этапа и контракты будущей
реализации описаны в [docs/test/tdd.md](docs/test/tdd.md). Исходное ТЗ: [docs/mvp-spec.md](docs/mvp-spec.md).

Подробное [руководство по тестированию](docs/test/testing.md): команды, структура, моки, фикстуры и диагностика.

[Поток данных MVP](docs/data-flow.md): загрузка, сетка, выбор, preview и экспорт.

Git-хуки управляются Husky. После `pnpm install` скрипт `prepare` подключает
`.husky/_` через локальный `core.hooksPath`. Перед коммитом выполняются
`pnpm format:check`, `pnpm lint` и `pnpm typecheck`; ошибка любой проверки отменяет коммит.
Тесты запускаются отдельно: `pnpm test:run` и `pnpm test:e2e`.
Для повторного подключения хуков используйте `pnpm run prepare`.

GitHub Actions запускает [CI](.github/workflows/ci.yml) при push и pull request:
установка по lockfile → форматирование → lint → TypeScript → Vitest → сборка →
Playwright. Установка Chromium и его системных зависимостей выполняется автоматически.
Подробности и локальный запуск — в [руководстве тестирования](docs/test/testing.md#ci-github-actions).

Prettier настроен в `.prettierrc.json`: отступ 2 пробела, одинарные кавычки
в JavaScript/TypeScript, без точек с запятой, ширина строки 100, окончания LF.
`.prettierignore` исключает зависимости, сборку, отчёты, env-файлы и lockfile.
Prettier отвечает за форматирование, Oxlint — за проверки кода. Перед коммитом
выполните `pnpm format`; хук только проверяет результат и не переписывает файлы.

Настройки строгой проверки и контракты: [TypeScript](docs/typescript.md).

MVP реализует локальную загрузку → сетку → выбор → preview → PNG.
Начальный размер кадра — 32×32; неполные края игнорируются. Повторный клик снимает
выделение, последний выбранный кадр показывается в preview. Для клавиатуры:
сфокусируйте Canvas, двигайтесь стрелками и переключайте выбор Enter/Space.
Экспорт запускает несколько отдельных скачиваний; браузер может запросить их разрешение.

Проверки реальных PNG: `pnpm exec playwright install chromium`, затем `pnpm test:e2e`.
Подробности — в [руководстве тестирования](docs/test/testing.md#playwright-настоящие-png).

[Граница интеграции Forge2D](docs/ecosystem-integration.md): независимый SpriteEditor,
чистый domain API и результат без UI-состояния. Реализованы внешний image, initialData, Save/onSave и Cancel/onCancel.

Реализация и тесты: [v0.2 — контракты и история TDD](docs/test/v02.md).
После FEAT-001 полный набор: 152 Vitest и 16 Playwright, все GREEN.

## Возможности v0.2

- Offset X/Y задают начало сетки после полей и подписей.
- Gap X/Y задают промежутки между ячейками.
- Zoom in/out и Reset view управляют видом; средняя кнопка мыши перемещает изображение.
- Select All / Clear Selection управляют выделением.
- Export ZIP скачивает выбранные PNG одним архивом; Export selected сохраняет отдельные загрузки.

Для целого спрайта подберите ширину/высоту ячейки, смещения и промежутки так,
чтобы один персонаж полностью помещался в рамке. Автоматического распознавания нет.

Можно также нажать **Select region**, обвести персонажа мышью и скачать
**Download PNG**. Настройка сетки для этого не требуется.
Подробности: [ручное выделение целого спрайта](docs/manual-selection.md).

Для нескольких персонажей: обведите → **Add frame** → повторите → **Export ZIP**.
У каждого добавленного кадра есть миниатюра, поле имени и кнопка удаления.
Список сохраняется до загрузки другого изображения или перезагрузки страницы.

[Панель Tools](docs/architecture.md#панель-инструментов) слева объединяет загрузку, выбор, настройки,
масштаб, Preview и экспорт. На узком экране её инструменты можно свернуть.

[FEAT-001: встраивание SpriteEditor](docs/features/sprite-editor-embedding.md) —
внешнее изображение, начальные кадры, типизированный результат и callbacks.
Тестовый хост доступен при `pnpm dev` по `/tests/fixtures/embedded.html`.
Save возвращает метаданные владельцу; сохранение проекта Forge2D не реализовано.
