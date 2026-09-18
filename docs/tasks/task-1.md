Ниже — локальное ТЗ, которое можно положить в `docs/features/sprite-editor-embedding.md` и использовать как рабочий контракт для следующего этапа.

# FEAT-001 — External SpriteEditor API

## 1. Цель

Подготовить `SpriteEditor` к использованию внутри экосистемы Forge2D как независимого встраиваемого инструмента.

После реализации этой задачи редактор должен уметь:

- работать как текущее самостоятельное приложение;
- получать изображение извне;
- получать начальное состояние спрайтов извне;
- возвращать результат редактирования наружу;
- уведомлять родительское приложение о сохранении и отмене;
- не зависеть от конкретного способа хранения проектов Forge2D.

В рамках задачи **не реализуется полноценное сохранение проекта Forge2D**.

---

# 2. Текущее состояние

На момент начала задачи `SpriteEditor` поддерживает:

- загрузку PNG;
- загрузку JPEG;
- загрузку WebP;
- обработку ошибок загрузки;
- grid slicing;
- настройку размера ячеек;
- offset;
- gap;
- выбор отдельных ячеек;
- Select All;
- Clear;
- ручное прямоугольное выделение;
- список ручных вырезок;
- preview;
- zoom;
- pan;
- rename;
- delete;
- экспорт PNG;
- экспорт нескольких кадров через ZIP;
- responsive UI.

Технологии:

- React;
- TypeScript;
- Vite;
- FSD;
- Vitest;
- Playwright;
- Oxlint;
- Prettier;
- Husky.

На момент постановки задачи:

- 132 теста Vitest;
- 12 Playwright-сценариев.

---

# 3. Основная архитектурная идея

`SpriteEditor` не должен владеть проектом Forge2D.

Его ответственность:

```text
input
  ↓
SpriteEditor
  ↓
редактирование
  ↓
SpriteEditorResult
```

Редактор:

- получает данные;
- редактирует данные;
- возвращает результат.

Редактор не должен самостоятельно решать:

- куда сохранять проект;
- используется ли IndexedDB;
- используется ли File System API;
- используется ли Zustand;
- где находится Forge2D Project Store;
- как устроен runtime движка.

---

# 4. Граница ответственности

## SpriteEditor отвечает за

- отображение изображения;
- grid slicing;
- manual slicing;
- управление спрайтами;
- создание `SpriteFrame`;
- переименование кадров;
- удаление кадров;
- взаимодействие пользователя с редактором;
- формирование `SpriteEditorResult`;
- вызов `onSave`;
- вызов `onCancel`.

## SpriteEditor не отвечает за

- сохранение проекта Forge2D;
- файловую систему;
- IndexedDB;
- сервер;
- облачное хранилище;
- импорт проекта;
- Asset Manager;
- Scene Editor;
- Animation Editor;
- runtime;
- историю проекта Forge2D.

---

# 5. Терминология

Не использовать `Cut` или `Crop` как публичную доменную сущность Forge2D.

Внутри UI допустимы внутренние понятия:

```text
ManualCut
GridCell
Selection
```

Но наружу они должны преобразовываться в единую сущность:

```ts
SpriteFrame
```

Таким образом:

```text
Grid Cell ──────┐
                ├──> SpriteFrame
Manual Cut ─────┘
```

Потребителю `SpriteEditor` не должно быть важно, каким способом был создан кадр.

---

# 6. Публичные типы

Рекомендуемое расположение:

```text
features/
  sprite-editor/
    model/
      types/
        sprite-editor.ts
```

или в соответствии с существующей FSD-структурой проекта.

## SpriteRect

```ts
export interface SpriteRect {
  x: number
  y: number
  width: number
  height: number
}
```

Требования:

- `x >= 0`;
- `y >= 0`;
- `width > 0`;
- `height > 0`.

Все значения задаются в пикселях исходного изображения.

---

## SpriteFrame

```ts
export interface SpriteFrame {
  id: string
  name: string
  rect: SpriteRect
}
```

### `id`

Стабильный идентификатор кадра.

Пример:

```text
frame-01
```

или UUID.

`id` не должен зависеть от текущего имени спрайта.

Переименование:

```text
player_idle
```

не должно менять:

```text
id
```

---

## SpriteSource

```ts
export interface SpriteSource {
  width: number
  height: number
}
```

Это информация об исходном изображении.

На данном этапе хранить бинарное содержимое изображения внутри результата не требуется.

---

# 7. Настройки slicing

```ts
export type SpriteEditorMode = 'grid' | 'manual'
```

Grid settings:

```ts
export interface SpriteGridSettings {
  cellWidth: number
  cellHeight: number

  offsetX: number
  offsetY: number

  gapX: number
  gapY: number
}
```

Все значения задаются в пикселях.

---

# 8. SpriteEditorResult

Главный контракт результата редактора:

```ts
export interface SpriteEditorResult {
  source: SpriteSource

  sprites: SpriteFrame[]

  settings: {
    mode: SpriteEditorMode
    grid?: SpriteGridSettings
  }
}
```

Пример:

```ts
const result: SpriteEditorResult = {
  source: {
    width: 512,
    height: 256,
  },

  sprites: [
    {
      id: 'idle-01',
      name: 'idle_01',

      rect: {
        x: 0,
        y: 0,
        width: 64,
        height: 64,
      },
    },

    {
      id: 'idle-02',
      name: 'idle_02',

      rect: {
        x: 64,
        y: 0,
        width: 64,
        height: 64,
      },
    },
  ],

  settings: {
    mode: 'grid',

    grid: {
      cellWidth: 64,
      cellHeight: 64,

      offsetX: 0,
      offsetY: 0,

      gapX: 0,
      gapY: 0,
    },
  },
}
```

---

# 9. Session State и Domain State

Необходимо явно разделить состояние редактора на две категории.

## Domain State

Эти данные потенциально являются частью проекта Forge2D:

```text
sprites
sprite names
sprite rects
grid settings
slicing mode
```

Они могут попадать в:

```ts
SpriteEditorResult
```

---

## Session State

Эти данные относятся только к текущему пользовательскому сеансу:

```text
zoom
pan
hover
active tool
active selection
opened sidebar
selected sprite
drag state
cursor position
temporary rectangle
```

Session State **не должен попадать в `SpriteEditorResult`**.

Например:

```ts
{
  zoom: 1.75,
  panX: 220,
  panY: 80,
}
```

не является частью проекта.

---

# 10. Публичный API компонента

Основной контракт:

```ts
export interface SpriteEditorProps {
  image?: SpriteEditorImage

  initialData?: SpriteEditorInitialData

  onSave?: (result: SpriteEditorResult) => void

  onCancel?: () => void
}
```

---

# 11. SpriteEditorImage

Предпочтительный контракт:

```ts
export interface SpriteEditorImage {
  src: string
  name?: string
}
```

Пример:

```tsx
<SpriteEditor
  image={{
    src: playerImageUrl,
    name: 'player.png',
  }}
/>
```

`src` может быть:

```text
blob:
data:
https:
```

если текущая архитектура загрузки это допускает.

---

# 12. initialData

```ts
export interface SpriteEditorInitialData {
  sprites?: SpriteFrame[]

  settings?: {
    mode?: SpriteEditorMode
    grid?: SpriteGridSettings
  }
}
```

Пример:

```tsx
<SpriteEditor
  image={image}
  initialData={{
    sprites: savedSprites,

    settings: {
      mode: 'grid',

      grid: {
        cellWidth: 32,
        cellHeight: 32,

        offsetX: 0,
        offsetY: 0,

        gapX: 0,
        gapY: 0,
      },
    },
  }}
/>
```

---

# 13. Полный пример использования

```tsx
const handleSave = (result: SpriteEditorResult) => {
  console.log(result)
}

const handleCancel = () => {
  closeEditor()
}

return (
  <SpriteEditor
    image={{
      src: imageUrl,
      name: 'player.png',
    }}
    initialData={{
      sprites: currentSprites,
    }}
    onSave={handleSave}
    onCancel={handleCancel}
  />
)
```

---

# 14. Режимы работы

Компонент должен поддерживать два сценария.

## Standalone mode

Текущий сценарий:

```tsx
<SpriteEditor />
```

Пользователь самостоятельно загружает изображение.

Существующий функционал должен продолжить работать.

---

## Embedded mode

Forge2D передаёт изображение:

```tsx
<SpriteEditor image={image} />
```

В таком случае изображение должно открываться автоматически.

Пользователю не требуется повторно загружать его через file picker.

---

# 15. Приоритет внешнего изображения

Если передан:

```ts
image
```

он считается текущим source изображения.

Компонент должен инициализироваться с ним.

При смене:

```ts
image.src
```

редактор должен корректно загрузить новый source.

Поведение при смене изображения должно быть детерминированным.

Рекомендуемое правило:

```text
новое изображение
      ↓
сброс текущего session state
      ↓
загрузка initialData нового изображения
```

Не переносить старые кадры автоматически на другое изображение.

---

# 16. Save

В UI должна появиться операция:

```text
Save
```

или её существующий аналог.

Она принципиально отличается от:

```text
Export PNG
Export ZIP
```

Экспорт создаёт физические файлы.

Save возвращает **метаданные редактора наружу**.

---

# 17. Поведение Save

При вызове Save:

```ts
onSave?.(result)
```

где:

```ts
result satisfies SpriteEditorResult
```

Пример:

```ts
const handleSave = () => {
  const result: SpriteEditorResult = createSpriteEditorResult({
    image,
    sprites,
    mode,
    gridSettings,
  })

  onSave?.(result)
}
```

---

# 18. Чистая функция создания результата

Рекомендуется не собирать результат непосредственно внутри React-компонента.

Создать чистую domain-функцию:

```ts
export function createSpriteEditorResult(state: SpriteEditorDomainState): SpriteEditorResult
```

Пример:

```ts
export function createSpriteEditorResult(state: SpriteEditorDomainState): SpriteEditorResult {
  return {
    source: {
      width: state.imageWidth,
      height: state.imageHeight,
    },

    sprites: state.sprites,

    settings: {
      mode: state.mode,

      ...(state.mode === 'grid'
        ? {
            grid: state.gridSettings,
          }
        : {}),
    },
  }
}
```

Эта функция не должна зависеть от React.

---

# 19. Cancel

Добавить публичный callback:

```ts
onCancel?: () => void
```

При нажатии Cancel:

```ts
onCancel?.()
```

Редактор самостоятельно не должен:

- закрывать страницу;
- менять route Forge2D;
- уничтожать modal;
- переключать workspace.

Это ответственность родителя.

---

# 20. Grid Selection → SpriteFrame

Выбранная ячейка grid должна преобразовываться в:

```ts
SpriteFrame
```

Например:

```ts
{
  id: 'frame-01',

  name: 'frame_01',

  rect: {
    x: 64,
    y: 32,

    width: 32,
    height: 32,
  },
}
```

---

# 21. Manual Selection → SpriteFrame

Manual selection должна выдавать тот же формат:

```ts
{
  id: 'player',

  name: 'player',

  rect: {
    x: 18,
    y: 14,

    width: 71,
    height: 92,
  },
}
```

После преобразования внешний код не должен отличать:

```text
grid frame
```

от:

```text
manual frame
```

---

# 22. Требования к ID

Каждый `SpriteFrame` должен иметь уникальный `id`.

ID должен:

- сохраняться при rename;
- сохраняться при изменении UI selection;
- не зависеть от позиции элемента в массиве.

Нельзя использовать индекс массива как доменный ID:

```ts
id: String(index)
```

если изменение порядка способно менять идентичность сущности.

---

# 23. Переименование

Rename должен менять:

```ts
frame.name
```

но не:

```ts
frame.id
```

Было:

```ts
{
  id: 'c75d',
  name: 'frame_01'
}
```

После rename:

```ts
{
  id: 'c75d',
  name: 'player_idle'
}
```

---

# 24. Удаление

При удалении SpriteFrame:

```ts
sprites
```

должен обновляться.

Удалённый кадр не должен попадать в:

```ts
SpriteEditorResult
```

---

# 25. Порядок кадров

На текущем этапе `sprites` хранится массивом:

```ts
SpriteFrame[]
```

Порядок элементов должен быть детерминированным.

Для grid selection рекомендуется:

```text
top → bottom
left → right
```

то есть row-major ordering.

Например:

```text
1 2 3
4 5 6
7 8 9
```

Для manual selection допустим порядок создания.

---

# 26. Validation

До формирования результата должны соблюдаться условия:

```ts
frame.rect.width > 0
frame.rect.height > 0
```

Прямоугольник не должен выходить за границы source:

```ts
x >= 0
y >= 0

x + width <= source.width
y + height <= source.height
```

---

# 27. Ошибочные состояния

Save не должен приводить к падению приложения.

Если изображение отсутствует, необходимо использовать существующую модель UI-ошибки.

Допустимые варианты:

```text
Save disabled
```

или:

```text
validation error
```

Предпочтительно отключать Save до наличия валидного source.

---

# 28. Что не входит в задачу

В FEAT-001 не реализовывать:

- IndexedDB;
- localStorage persistence;
- File System Access API;
- project.json;
- asset database;
- Asset Manager Forge2D;
- scenes;
- animation editor;
- undo/redo проекта;
- autosave;
- cloud sync;
- backend;
- экспорт Forge2D project;
- Steam integration;
- Yandex Games integration.

---

# 29. Требования к обратной совместимости

После изменений должен продолжать работать:

```tsx
<SpriteEditor />
```

Без обязательных props.

Существующие возможности standalone-приложения не должны быть удалены.

---

# 30. Тестирование

Разработка выполняется через существующий TDD-подход проекта.

## Unit tests

Добавить тесты для:

```text
createSpriteEditorResult
grid → SpriteFrame
manual → SpriteFrame
rename
delete
validation
```

---

## Component tests

Проверить:

```text
SpriteEditor принимает image prop
```

Проверить:

```text
initialData инициализирует состояние
```

Проверить:

```text
Save вызывает onSave
```

Проверить:

```text
onSave получает SpriteEditorResult
```

Проверить:

```text
Cancel вызывает onCancel
```

Проверить:

```text
session state не попадает в result
```

---

# 31. Минимальные тест-кейсы

## Case 1 — external image

```text
Given:
SpriteEditor получил image

When:
компонент был смонтирован

Then:
изображение отображается без ручной загрузки файла
```

---

## Case 2 — standalone compatibility

```text
Given:
SpriteEditor не получил image

When:
пользователь открывает приложение

Then:
доступен существующий механизм загрузки изображения
```

---

## Case 3 — Save

```text
Given:
загружено изображение
и создано 3 SpriteFrame

When:
пользователь нажимает Save

Then:
onSave вызывается один раз
и получает SpriteEditorResult
с тремя sprites
```

---

## Case 4 — session state

```text
Given:
zoom = 2
panX = 100
panY = 50

When:
вызывается Save

Then:
SpriteEditorResult не содержит
zoom
panX
panY
```

---

## Case 5 — rename

```text
Given:
SpriteFrame:
id = "abc"
name = "frame_01"

When:
кадр переименован в "player_idle"

Then:
name = "player_idle"
id = "abc"
```

---

## Case 6 — manual/grid normalization

```text
Given:
один frame создан через grid
и один через manual selection

When:
вызывается Save

Then:
оба находятся внутри
SpriteEditorResult.sprites

и имеют одинаковый тип SpriteFrame
```

---

# 32. Playwright

Добавить минимум один основной browser-сценарий.

## Embedded save flow

```text
1. открыть тестовый embedded SpriteEditor;
2. передать изображение извне;
3. создать несколько кадров;
4. переименовать один кадр;
5. нажать Save;
6. проверить вызов результата;
7. проверить количество sprites;
8. проверить rect;
9. проверить новое name.
```

Дополнительно рекомендуется:

```text
Cancel flow
```

---

# 33. Definition of Done

Задача считается завершённой, когда:

- [x] определён публичный `SpriteEditorProps`;
- [x] реализован `image` prop;
- [x] реализован `initialData`;
- [x] реализован `onSave`;
- [x] реализован `onCancel`;
- [x] создан `SpriteEditorResult`;
- [x] создан `SpriteFrame`;
- [x] grid selection преобразуется в `SpriteFrame`;
- [x] manual selection преобразуется в `SpriteFrame`;
- [x] UI/session state не попадает в результат;
- [x] rename сохраняет `id`;
- [x] delete корректно изменяет результат;
- [x] standalone mode продолжает работать;
- [x] существующие тесты проходят;
- [x] новые unit/component тесты проходят;
- [x] добавлен Playwright Save flow;
- [x] обновлена архитектурная документация;
- [x] публичные типы экспортируются из API модуля.

---

# 34. Рекомендуемый public API

Например:

```ts
export { SpriteEditor } from './ui/SpriteEditor'

export type {
  SpriteEditorProps,
  SpriteEditorResult,
  SpriteEditorInitialData,
  SpriteEditorImage,
  SpriteFrame,
  SpriteRect,
  SpriteGridSettings,
  SpriteEditorMode,
} from './model/types'
```

Потребитель не должен импортировать внутренние файлы:

```ts
// плохо
import { SpriteFrame } from '@/features/sprite-editor/model/internal/foo'
```

Он должен использовать публичный API:

```ts
import { SpriteEditor, type SpriteEditorResult } from '@/features/sprite-editor'
```

---

# 35. Целевой контракт

Финальный минимальный внешний API должен выглядеть примерно так:

```ts
export interface SpriteEditorProps {
  image?: SpriteEditorImage

  initialData?: SpriteEditorInitialData

  onSave?: (result: SpriteEditorResult) => void

  onCancel?: () => void
}

export interface SpriteEditorImage {
  src: string
  name?: string
}

export interface SpriteEditorInitialData {
  sprites?: SpriteFrame[]

  settings?: {
    mode?: SpriteEditorMode
    grid?: SpriteGridSettings
  }
}

export interface SpriteEditorResult {
  source: SpriteSource

  sprites: SpriteFrame[]

  settings: {
    mode: SpriteEditorMode
    grid?: SpriteGridSettings
  }
}

export interface SpriteSource {
  width: number
  height: number
}

export interface SpriteFrame {
  id: string
  name: string
  rect: SpriteRect
}

export interface SpriteRect {
  x: number
  y: number
  width: number
  height: number
}

export interface SpriteGridSettings {
  cellWidth: number
  cellHeight: number

  offsetX: number
  offsetY: number

  gapX: number
  gapY: number
}

export type SpriteEditorMode = 'grid' | 'manual'
```

---

# 36. Архитектурный результат задачи

До FEAT-001:

```text
SpriteEditor
    │
    ├── image
    ├── state
    ├── slicing
    ├── UI
    └── export
```

После FEAT-001:

```text
Forge2D / Standalone App
          │
          │ input
          ▼
    ┌──────────────┐
    │ SpriteEditor │
    │              │
    │ slicing      │
    │ editing      │
    │ preview      │
    └──────┬───────┘
           │
           │ SpriteEditorResult
           ▼
      external owner
```

Это становится первой стабильной интеграционной границей между SpriteEditor и будущим Forge2D.

---

# 37. Следующая задача после FEAT-001

После завершения этого этапа следующей логичной задачей является:

```text
FEAT-002 — Forge2D Asset Model
```

Она должна определить сущности:

```text
Project
Asset
TextureAsset
SpriteAsset
SpriteFrame
```

и уже после этого связывать:

```text
Asset Manager
      ↓
SpriteEditor
      ↓
SpriteEditorResult
      ↓
Project Store
```

Persistence следует реализовывать после появления этой модели, а не внутри SpriteEditor.

Я бы именно эту версию и использовал как контракт для разработки: она достаточно строгая, чтобы ИИ не начал самовольно тащить в редактор IndexedDB, глобальный store или половину будущего Forge2D, но при этом не переусложняет первый интеграционный шаг.

## Результат реализации FEAT-001

Внешний API реализован. Рабочий контракт и принятые правила:
[features/sprite-editor-embedding.md](../features/sprite-editor-embedding.md).
Проверки: 152 Vitest, 16 Playwright, TypeScript, Oxlint, Prettier и production-сборка проходят.
Тестовый хост: `/tests/fixtures/embedded.html` при запущенном Vite.
