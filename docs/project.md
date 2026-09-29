# Sprite Cutter / Forge2D Sprite Editor

Единая актуальная документация этого репозитория: Sprite Editor и его Forge2D Asset Model.
Она заменяет прежние отдельные файлы с ТЗ, архитектурой, потоком данных, описанием тестов и
отчётами по этапам. Архитектура самого движка описана отдельно — см.
[Forge2D — Architecture v0.1](Forge2D-Architecture-v0.1.md).

Состояние на 29 сентября 2026 года: MVP, v0.2, внешний API редактора, Forge2D Asset Model,
reducer сессии и CSS-изоляция реализованы. Предусловия этапа 7 выполнены, но первым идёт
Milestone 0 движка — Forge Core и Scene Runtime. Production persistence пока отсутствует.

## Содержание

- [Назначение и возможности](#назначение-и-возможности)
- [Запуск и команды](#запуск-и-команды)
- [Работа с редактором](#работа-с-редактором)
- [Публичный API Sprite Editor](#публичный-api-sprite-editor)
- [Forge2D Asset Model](#forge2d-asset-model)
- [Архитектура](#архитектура)
- [Поток данных и состояние](#поток-данных-и-состояние)
- [Экспорт и ресурсы браузера](#экспорт-и-ресурсы-браузера)
- [Изоляция стилей](#изоляция-стилей)
- [Тестирование и CI](#тестирование-и-ci)
- [Ограничения и roadmap](#ограничения-и-roadmap)

## Назначение и возможности

Sprite Cutter — локальный браузерный инструмент для разрезания sprite sheet. Он работает
как самостоятельное Vite-приложение и как встраиваемый React-компонент `SpriteEditor`.
Обработка изображения, Preview, PNG и ZIP выполняются в браузере без отправки файлов на
сервер.

Реализовано:

- загрузка PNG, JPEG и WebP;
- сетка с размером ячейки, Offset X/Y и Gap X/Y;
- выбор отдельных ячеек, Select All и Clear Selection;
- управление Canvas с клавиатуры;
- Zoom, Pan и Reset view;
- ручное выделение произвольной области;
- коллекция именованных кадров с добавлением, переименованием и удалением;
- Preview выбранной области;
- экспорт отдельных PNG и ZIP;
- стабильные строковые ID кадров;
- внешний `image`, `initialData`, `onSave` и `onCancel`;
- чистые `Project`, `TextureAsset` и `SpriteAsset`;
- адаптер `SpriteAsset ↔ SpriteEditor`;
- изоляция CSS редактора от стилей хоста;
- адаптивная панель инструментов.

Автоматического распознавания персонажей нет. Целостность спрайта определяется сеткой или
ручной рамкой пользователя.

## Запуск и команды

Требования:

- Node.js `22.19.0` из `.nvmrc`;
- pnpm `12.3.4` из `packageManager` в `package.json`.

```sh
nvm install
nvm use
pnpm install
cp .env.example .env
pnpm dev
```

Dev-сервер использует `http://localhost:5173`, preview — порт `4173`.

| Команда              | Назначение                              |
| -------------------- | --------------------------------------- |
| `pnpm dev`           | Vite dev-сервер                         |
| `pnpm build`         | TypeScript и production-сборка в `dist` |
| `pnpm preview`       | Просмотр production-сборки              |
| `pnpm format`        | Форматирование Prettier                 |
| `pnpm format:check`  | Проверка форматирования                 |
| `pnpm lint`          | Oxlint без допустимых warnings          |
| `pnpm lint:fix`      | Автоматические исправления Oxlint       |
| `pnpm typecheck`     | Все TypeScript project references       |
| `pnpm test`          | Vitest watch mode                       |
| `pnpm test:run`      | Однократный запуск Vitest               |
| `pnpm test:coverage` | Vitest и пороги покрытия                |
| `pnpm test:e2e`      | Playwright в Chromium                   |

### Переменные окружения

В Git хранится только `.env.example`:

```dotenv
VITE_APP_TITLE=Sprite Cutter
```

`.env`, `.env.local`, `.env.development`, `.env.production` и локальные варианты
игнорируются. Любая переменная `VITE_*` попадает в клиентский bundle, поэтому секреты в
ней хранить нельзя. После изменения env dev-сервер нужно перезапустить.

### Git hooks

`pnpm install` запускает Husky через script `prepare`. Перед коммитом выполняются:

```sh
pnpm format:check
pnpm lint
pnpm typecheck
```

Vitest и Playwright запускаются отдельно и полностью выполняются в CI.

## Работа с редактором

### Режим Grid

1. Загрузите PNG, JPEG или WebP.
2. Укажите Frame width и Frame height.
3. При необходимости настройте Offset X/Y и Gap X/Y.
4. Выберите кадры кликом либо Enter/Space на Canvas.
5. Используйте Preview, Export selected или Export ZIP.

Кадром становится только полная ячейка. Неполный правый или нижний край игнорируется.
Для целого персонажа размер ячейки должен включать весь спрайт, а Offset и Gap должны
совпадать с реальным расположением элементов на исходнике.

Расчёт сетки:

```text
columns = width  - offsetX < cellWidth
  ? 0
  : 1 + floor((width  - offsetX - cellWidth)  / (cellWidth  + gapX))

rows = height - offsetY < cellHeight
  ? 0
  : 1 + floor((height - offsetY - cellHeight) / (cellHeight + gapY))

x = offsetX + column × (cellWidth + gapX)
y = offsetY + row    × (cellHeight + gapY)
```

Размеры ячейки должны быть положительными безопасными целыми числами. Offset и Gap —
целыми числами не меньше нуля. Изменение параметров сетки очищает выбор, поскольку
прежние ID больше не описывают актуальную геометрию.

### Режим Manual

1. Нажмите **Select region**.
2. Обведите нужный спрайт на Canvas в любом направлении.
3. Проверьте область в Preview.
4. Нажмите **Add frame**, чтобы сохранить её в коллекцию.
5. Повторите для остальных спрайтов, задайте имена и скачайте ZIP.

Рамка ограничивается размерами изображения и округляется наружу до целых пикселей.
Клик или линия без площади не создают область. Escape и отмена pointer-жеста удаляют
только черновик и сохраняют предыдущую завершённую область.

Добавление создаёт стабильный строковый ID и имя `frame_NNN`. Удалённые номера не
переиспользуются. Rename меняет только имя; ID, прямоугольник и порядок сохраняются.
Список существует в памяти сессии до загрузки другого изображения или размонтирования
редактора.

### Canvas и панель инструментов

- стрелки перемещают клавиатурный фокус по сетке;
- Enter и Space переключают выбор;
- средняя кнопка мыши перемещает изображение;
- Zoom меняет только отображение, координаты экспорта остаются в пикселях исходника;
- смена режима сохраняет viewport;
- смена источника сбрасывает viewport, выбор, жест и коллекцию источника;
- сворачивание сайдбара не размонтирует инструменты и не сбрасывает данные.

## Публичный API Sprite Editor

Публичная точка входа:

```ts
import {
  SpriteEditor,
  type SpriteEditorProps,
  type SpriteEditorResult,
} from '@/widgets/sprite-editor'
```

### Props

```ts
interface SpriteEditorProps {
  readonly image?: {
    readonly src: string
    readonly name?: string
  }
  readonly initialData?: {
    readonly sprites?: readonly SpriteFrame[]
    readonly settings?: {
      readonly mode?: 'grid' | 'manual'
      readonly grid?: SpriteGridSettings
    }
  }
  readonly onSave?: (result: SpriteEditorResult) => void
  readonly onCancel?: () => void
  readonly initialFrameSize?: {
    readonly width: string
    readonly height: string
  }
}
```

Пример встраивания:

```tsx
<SpriteEditor
  image={{ src: textureUri, name: 'player.png' }}
  initialData={{
    sprites: [
      {
        id: 'idle-1',
        name: 'idle',
        rect: { x: 0, y: 0, width: 32, height: 32 },
      },
    ],
    settings: { mode: 'manual' },
  }}
  onSave={(result) => save(result)}
  onCancel={() => closeEditor()}
/>
```

`image.src` принимает `blob:`, `data:`, HTTP(S) и относительные браузерные URL. Внешний
URL принадлежит хосту и редактор его не отзывает. Для HTTP(S) загрузка выполняется с
`crossOrigin = 'anonymous'`, поэтому сервер изображения должен разрешать CORS, если нужен
Canvas-экспорт.

Новое значение `image.src` создаёт новую сессию. Новый объект props с тем же `src`
сохраняет пользовательские изменения. Если хост переключает два `SpriteAsset` одной
текстуры, он должен монтировать редактор с `key={spriteAsset.id}`.

`initialData` читается при создании сессии. Чтобы заново применить данные при том же URL,
хост должен изменить React key или размонтировать редактор.

### Результат Save

```ts
interface SpriteRect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

interface SpriteFrame {
  readonly id: string
  readonly name: string
  readonly rect: SpriteRect
}

interface SpriteGridSettings {
  readonly cellWidth: number
  readonly cellHeight: number
  readonly offsetX: number
  readonly offsetY: number
  readonly gapX: number
  readonly gapY: number
}

interface SpriteEditorResult {
  readonly source: {
    readonly width: number
    readonly height: number
  }
  readonly sprites: readonly SpriteFrame[]
  readonly settings: {
    readonly mode: 'grid' | 'manual'
    readonly grid?: SpriteGridSettings
  }
}
```

Результат — новый проверенный снимок без `File`, `Blob`, `HTMLImageElement`, object URL,
выделения, viewport и UI-номеров. ID непустые и уникальные; прямоугольники используют
целые пиксели и находятся внутри источника. В режиме Grid обязательно присутствует
валидный `settings.grid`.

Save добавляет выбранные grid-ячейки к сохранённой коллекции без повторения ID. В Manual
незавершённую текущую область нужно сначала добавить в коллекцию. `onSave` может быть
асинхронным: редактор блокирует изменяющие действия до завершения callback и показывает
ошибку при отклонении Promise.

Cancel вызывает `onCancel`; закрытие редактора и дальнейшая навигация принадлежат хосту.
Download PNG/ZIP — отдельная пользовательская операция и не вызывает `onSave`.

### Чистый domain API

`src/entities/sprite/domain.ts` не зависит от React и DOM. Он экспортирует:

- `generateFrames`, `validateGrid`, `selectionRect`;
- `createSpriteEditorResult`;
- `gridFrameToSprite`, `manualFrameToSprite`;
- `renameSprite`, `removeSprite`;
- публичные sprite-типы.

`tsconfig.domain.json` компилирует этот API без библиотек DOM и тем самым контролирует
границу предметного кода.

## Forge2D Asset Model

`src/entities/project/domain.ts` содержит минимальную сериализуемую модель Forge2D:

```ts
interface Project {
  readonly name: string
  readonly schemaVersion: 1
  readonly assets: readonly Asset[]
}

interface TextureAsset {
  readonly id: string
  readonly type: 'texture'
  readonly name: string
  readonly schemaVersion: 1
  readonly uri: string
  readonly width: number
  readonly height: number
}

interface SpriteAsset {
  readonly id: string
  readonly type: 'sprite'
  readonly name: string
  readonly schemaVersion: 1
  readonly textureId: string
  readonly sprites: readonly AssetSpriteFrame[]
  readonly settings: AssetSpriteSettings
}
```

Domain-функции:

- `createProject`;
- `createTextureAsset`;
- `createSpriteAsset`;
- `upsertProjectAsset`;
- `removeProjectAsset`;
- `findTextureAsset`;
- `findSpriteAsset`.

Операции возвращают новые объекты. ID assets уникальны внутри проекта. `SpriteAsset`
ссылается на существующий `TextureAsset`; удалить используемую текстуру нельзя.
Размеры и координаты валидируются относительно текстуры. `schemaVersion` проекта и assets
сейчас равен `1`.

URI текстуры должен переживать browser-сессию: разрешены относительные URI, `data:` и
HTTP(S); `blob:` отклоняется. Реальное сохранение URI, файла и project.json относится к
будущему persistence-слою.

### Адаптер редактора

`src/features/manage-sprite-asset` — единственная граница между Project domain и Sprite
Editor:

```ts
spriteAssetToEditorInput({ asset, texture })
// → { image, initialData }

spriteEditorResultToSpriteAsset({ id, name, texture, result })
// → SpriteAsset
```

Оба направления повторно валидируют версии, размеры, ссылки, настройки и кадры. Sprite
Editor не импортирует `Project` и не знает, где хост хранит assets.

Целевой поток этапа 7:

```text
Project
  → SpriteAsset + TextureAsset
  → spriteAssetToEditorInput
  → <SpriteEditor key={spriteAsset.id}>
  → SpriteEditorResult
  → spriteEditorResultToSpriteAsset
  → upsertProjectAsset
  → Project Store / persistence
```

Тестовый вариант потока доступен по `/tests/fixtures/asset-host.html`; production UI и
Project Store ещё не подключены.

## Архитектура

Проект следует Feature-Sliced Design:

```text
src/
├── app/                         подключение приложения
├── pages/editor/                standalone-страница
├── widgets/sprite-editor/       сессия, orchestration и компоновка
├── features/
│   ├── upload-sprite-sheet/     выбор файла
│   ├── configure-grid/          поля сетки и валидация
│   ├── select-sprite/           Canvas, выбор, Zoom/Pan
│   ├── manage-manual-frames/    список ручных кадров
│   ├── export-sprites/          PNG, ZIP и download
│   └── manage-sprite-asset/     адаптер Forge2D ↔ Editor
└── entities/
    ├── sprite/                  геометрия и публичный editor domain
    └── project/                 Project и Asset domain
```

Направление зависимостей:

```text
app → pages → widgets → features → entities

Forge2D host → manage-sprite-asset → sprite/project domains
Forge2D host → SpriteEditor → sprite domain
```

Sprite Editor не импортирует `Project`, persistence, Scene Editor или Forge2D runtime.
Project domain не импортирует React, DOM или Sprite Editor. Слайсы одного FSD-слоя не
связываются напрямую; widget компонует их через публичные `index.ts`.

Алиасы Vite и TypeScript:

```text
@/*       → src/*
@assets/* → src/assets/*
```

TypeScript работает в strict-режиме с `exactOptionalPropertyTypes`,
`noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax` и отдельными проектами
для приложения, Node-конфигурации, E2E и domain.

### Forge Core: Scene Model v1

Milestone 0 начинается с независимого workspace-пакета `@forge2d/core`. Его первый
контракт — сериализуемый снимок сцены без React, DOM и runtime-состояния:

```text
SceneDocument { version, id, name, objects[] }
└── GameObjectData { id, name, parentId?, components[] }
    └── ComponentData { id, type, properties }
```

`parentId` строит дерево внутри одной сцены. Корневой объект не содержит это поле.
`properties` — JSON-объект: разрешены строки, конечные числа, boolean, null, массивы и
вложенные объекты. Функции, `undefined`, `NaN`, бесконечность, экземпляры классов и циклы
отклоняются на границе.

Публичные операции `createScene`, `parseScene`, `serializeScene`, `addGameObject`,
`updateGameObject` и `removeGameObject` возвращают отделённый снимок и не меняют входные
данные. ID объектов уникальны в сцене, ID компонентов — в пределах объекта. Родитель
обязан существовать, циклы запрещены. Удаление объекта каскадно удаляет его потомков;
`parentId: null` в patch переносит объект в корень. Нарушения контракта представлены
`SceneValidationError` с машинным `code` и путём к полю.

`version: 1` резервирует миграции формата. Вложенные сцены и runtime-экземпляры входят в
следующие этапы Milestone 0 и не добавляются в сохранённый формат без отдельного решения.

### Forge Core: Runtime lifecycle

`GameObject` — runtime-контейнер компонентов. Один экземпляр `Component` одновременно
принадлежит только одному объекту; `getComponent` и `getComponents` находят компоненты по
классу. После удаления компонент можно присоединить снова, а после `destroy()` сам
`GameObject` переходит в терминальное состояние.

`Behaviour` расширяет `Component` тремя MVP-хуками:

```text
start()       один раз перед первым update
update(dt)    на каждом обновлении, dt — конечное число >= 0
onDestroy()   при удалении компонента или уничтожении GameObject
```

Порядок соответствует порядку компонентов. Добавленный во время обновления Behaviour
начинает работу на следующем обновлении; удалённый до своей очереди уже не вызывается.
`onDestroy` видит владельца до отсоединения. Очистка завершается даже при исключении:
одна ошибка пробрасывается после очистки, несколько объединяются в `AggregateError`.

`Signal<T>` передаёт типизированные локальные события в порядке подписки. `on` возвращает
идемпотентную функцию отписки; также доступны `off`, `clear` и `size`. Во время `emit`
используется стабильный снимок: новая подписка срабатывает со следующего события, а
удалённый до своей очереди listener пропускается.

## Поток данных и состояние

Данные идут вниз через props, пользовательские действия возвращаются через callbacks:

```text
App / Forge2D host
  → SpriteEditor
  → useEditor
  ↔ editorSessionReducer
  → SpriteEditorView
      ├── EditorSidebar
      │   ├── SpriteUploader
      │   ├── SpriteCanvasTools
      │   ├── GridSettings
      │   ├── SpritePreview
      │   └── ExportButton
      ├── SpriteCanvas
      └── ManualFrames
```

### Стабильное состояние

`editorSessionReducer` владеет:

- состоянием источника `idle | loading | ready | error`;
- строковыми значениями сетки;
- режимом `grid | manual`;
- выбранными ID и active frame;
- завершённой ручной областью;
- коллекцией `SpriteFrame`;
- UI-номерами карточек;
- реестром выданных ID и алиасами ячеек сетки;
- viewport;
- признаками drawing и exporting.

Идентичность целиком принадлежит reducer. `usedIds` пополняется каждым спрайтом, попавшим
в сессию, и не освобождает ID удалённой вырезки: удаление не должно воскресать на новом
кадре. `gridAliases` держит соответствие «геометрия ячейки → выданный ID», поэтому
повторный Save той же выборки возвращает host те же ID. Новый источник очищает обе
структуры вместе с коллекцией.

Reducer не выполняет I/O и не вызывает React callbacks. Его переходы проверяются прямыми
unit-тестами. `useEditor` координирует reducer с загрузкой изображения, чистым domain,
Save/Cancel и props дочерних компонентов.

Производные значения не дублируются в состоянии:

```text
source.ready → sheet
sheet + grid inputs → validateGrid → generateFrames
geometry + selectedIds → выбранные GridFrame
sprites + displayNumbers → карточки и элементы ZIP
mode + active selection → Preview
```

Единое правило занятости — Save или export. Общий `dispatchWhenIdle` блокирует изменение
источника, сетки, режима, выбора и коллекции. `actionRunning` закрывает синхронное окно
двойного клика Save до следующего React render.

### Локальное состояние UI

- `useRegionSelection` хранит начало pointer-жеста и draft рамки;
- `SpriteCanvas` хранит focus и текущий pan-жест;
- `EditorSidebar` хранит только состояние сворачивания;
- `ExportButton` хранит статус и ошибку конкретного экспорта.

### Границы жизненного цикла

| Компонент             | React key                            | Причина сброса                                            |
| --------------------- | ------------------------------------ | --------------------------------------------------------- |
| `SpriteEditorSession` | внешний `image.src` или `standalone` | новый источник создаёт новую сессию                       |
| `SpriteCanvas`        | `sheet.url` или `empty`              | draft, focus и pan относятся к конкретному изображению    |
| `ExportButton`        | `sheet.url` или `empty`              | ошибка и статус экспорта не переносятся между источниками |

Сетка, режим, viewport и коллекция key не меняют. Их изменения выражены событиями reducer.

## Экспорт и ресурсы браузера

Preview и экспорт используют исходный `HTMLImageElement`, а не Canvas с сеткой и
подсветкой. `drawImage` получает координаты в исходных пикселях, поэтому Zoom/Pan и CSS
масштабирование не влияют на результат.

- Grid / Export selected: отдельный PNG для каждой выбранной ячейки;
- Grid / Export ZIP: один архив с выбранными ячейками;
- Manual / Download PNG: текущая завершённая область;
- Manual / Export ZIP: сохранённая коллекция кадров.

PNG кодируются через `canvas.toBlob('image/png')` без сглаживания. ZIP создаётся `fflate`
в режиме STORE, поскольку PNG уже сжат. Элементы сортируются по UI-номеру, затем ID.
Имена очищаются от запрещённых символов, ограничиваются 80 символами и получают суффикс
при совпадении без учёта регистра. Дубликаты ID в одном ZIP запрещены.

Для локального файла редактор создаёт object URL и отзывает его при смене источника или
размонтировании. Внешний URL остаётся собственностью хоста. Download создаёт временный URL,
запускает клик ссылки и отзывает URL на следующей задаче event loop. Завершение старого
асинхронного запроса не изменяет новую сессию.

## Изоляция стилей

`src/index.css` принадлежит только standalone shell и содержит правила документа для
`:root` и `body`. Компонент сам подключает
`src/widgets/sprite-editor/ui/SpriteEditor.css`.

Все селекторы редактора начинаются с `.sprite-editor`. Локальный reset
`.sprite-editor :where(*) { all: revert }` снимает обычные глобальные правила хоста, а
шрифт, цвет, фон и `color-scheme` явно заданы на корне. Shadow DOM не используется.

Проверяется изоляция в обе стороны: тестовый host задаёт конфликтующие `*`, `button`,
`input`, `h1`, `h2`, `p` и `label`; его оформление сохраняется, а вычисленные стили
редактора совпадают со standalone-страницей.

Ограничение namespace-подхода: специфичное классовое правило хоста с тем же именем может
изменить свойство, которое редактор явно не задаёт. CSS Modules или отдельный package
нужны только при появлении реального конфликта или второго consumer.

## Тестирование и CI

Актуальный полный набор после M0.2:

- **245 Vitest** в 22 файлах;
- **18 Playwright**;
- statements: **94.49%**;
- branches: **91.05%**;
- functions: **97.09%**;
- lines: **97.65%**.

Пороги `vitest.config.ts`:

```text
statements 90%
branches   85%
functions  95%
lines      94%
```

Основные наборы:

| Путь                      | Проверка                                           |
| ------------------------- | -------------------------------------------------- |
| `src/test/mvp`            | загрузка, сетка, UI и PNG domain                   |
| `src/test/v02`            | Offset/Gap, Zoom/Pan и ZIP                         |
| `src/test/manual`         | ручная геометрия и коллекция                       |
| `src/test/embedding`      | внешний API, callbacks и CSS scope                 |
| `src/test/asset`          | Project, assets, adapter и host flow               |
| `src/test/editor-session` | чистые переходы reducer                            |
| `tests/browser`           | настоящие изображения, Canvas, PNG/ZIP и embedding |

Моки jsdom проверяют управление и параметры Browser API. Пиксельную корректность нельзя
подтвердить условными байтами моков, поэтому Playwright декодирует настоящие PNG и
сравнивает размеры, RGBA-пиксели и CRC ZIP. В E2E используется реальный `test.png`, а
также PNG, JPEG, WebP и лист 4096×4096.

Локальная установка браузера:

```sh
pnpm exec playwright install chromium
pnpm test:e2e
```

Если используется системный Chrome:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/google-chrome pnpm test:e2e
```

GitHub Actions на каждый push и pull request выполняет frozen install, Prettier, Oxlint,
TypeScript, Vitest с покрытием, build и Playwright. При ошибке браузерных тестов
`test-results/` сохраняется как artifact на 7 дней. Timeout job — 20 минут; устаревший
запуск той же ветки отменяется.

## Ограничения и roadmap

### Прогресс Milestone 0

Единый трекер реализации. Галочка ставится только после полного прогона проверок этапа.

- [x] Подготовка: Architecture v0.1, актуальный baseline и отдельная feature-ветка.
- [x] **M0.1 — Forge Core / Scene Model v1**
  - [x] workspace и пакет `@forge2d/core`;
  - [x] RED-тесты Scene Model;
  - [x] сериализуемые `SceneDocument`, `GameObjectData`, `ComponentData`;
  - [x] валидация ID, иерархии, компонентов и JSON-значений;
  - [x] immutable add/update/remove и JSON round-trip;
  - [x] общий quality pipeline.
- [x] **M0.2 — Runtime lifecycle**
  - [x] владение и поиск `Component` в `GameObject`;
  - [x] детерминированные `start`, `update` и `onDestroy`;
  - [x] безопасные мутации и очистка при ошибках lifecycle;
  - [x] типизированный `Signal` с управлением подписками;
  - [x] общий quality pipeline.
- [ ] **M0.3 — TypeScript → Inspector:** технический spike и минимальный `@field`.
- [ ] **M0.4 — Renderer:** API, Transform, SpriteRenderer и TextureAsset.
- [ ] **M0.5 — Forge Editor:** минимальные Hierarchy, Scene, Inspector и Assets.
- [ ] **M0.6 — Living Scene:** сквозной сценарий `speed 220 → 350 → runtime`.
- [ ] **M0.7 — Sprite Editor integration:** production Asset host flow после Milestone 0.

### Порядок работ: сначала Milestone 0

Предварительные условия этапа 7 выполнены: string ID унифицированы, Asset Model существует,
embedding contract стабилен, сессия отделена от I/O, CSS изолирован.

Тем не менее следующим идёт Milestone 0 движка — Forge Core и Scene Runtime
(Architecture v0.1, раздел 21). Этап 7 в исходной формулировке требует хост-интерфейса, в
котором пользователь выбирает `SpriteAsset`, а такого интерфейса не существует: Forge Editor
появляется вместе с Milestone 0 и позже. Пока роль хоста играет только тестовый
`tests/fixtures/AssetHost.tsx`.

Milestone 0 реализуется в этом репозитории отдельными пакетами Core и Runtime. Sprite Editor
остаётся автономным, `SpriteEditorResult` — стабильным, adapter уже готов к вызову из хоста.

### Этап 7 после Milestone 0

Когда Forge Editor умеет открывать asset, этап 7 добавляет production host flow:

1. выбрать `SpriteAsset` в интерфейсе Forge2D;
2. найти связанную `TextureAsset`;
3. открыть `SpriteEditor` через adapter;
4. обработать Save и Cancel;
5. записать обновлённый asset в Project Store;
6. повторно открыть asset из состояния Project.

Persistence на этом этапе может оставаться in-memory, если для него нет отдельного ТЗ.
Sprite Editor по-прежнему не должен импортировать Forge2D Project или решать, где хранить
результат.

### Открытые вопросы к Architecture v0.1

Решить до подключения редактора к `Asset` API:

- Animation. Раздел 13 ставит Animation между кадрами и `SpriteRenderer`, раздел 20 числит
  её в MVP. В `SpriteAsset` нет ни клипов, ни порядка кадров, ни fps, а пример имён
  `idle_01`, `walk_01` переносит группировку в соглашение об именах. Нужно решить, кто
  владеет клипами: редактор, отдельный AnimationAsset или вывод из имён на стороне Forge2D.
  Это единственный известный кандидат на изменение `SpriteEditorResult`.
- Место `SpriteAsset` в таксономии. По разделу 4 `Asset` — изображение, звук или шрифт, а
  `DataAsset` — структурированные игровые данные. `SpriteAsset` описывает производные данные
  над текстурой и не попадает чисто ни в одну категорию; вероятный ответ — артефакт импорта
  в `.forge/imported`.
- Persistence. Текущий `Project` — in-memory модель без хранения, а раздел 10 описывает
  проект на файловой системе с `assets/`, `scenes/` и `.forge/`. Относительный путь вида
  `assets/characters/player.png` текущую проверку `TextureAsset.uri` проходит: отклоняются
  только `blob:` и незнакомые схемы.

### Отложено

- backend, IndexedDB, project.json и постоянное хранение текстур;
- Asset Manager и полноценный production Project Store;
- расширенные инструменты Scene Editor за пределами vertical slice;
- ECS и Prefab как отдельные пользовательские модели — Architecture v0.1 их не вводит;
- plugin system;
- safety limit, lazy geometry и virtualization для очень больших сеток;
- Web Worker, progress и cancel для тяжёлого ZIP;
- library build и публикация package до появления второго consumer;
- Error Boundary на уровне приложения;
- i18n;
- Undo/Redo как отдельная history/command model.

Главный архитектурный принцип: Sprite Editor является автономным инструментом Forge2D,
но не частью домена Forge2D Project. Persistence и жизненный цикл assets принадлежат хосту.
