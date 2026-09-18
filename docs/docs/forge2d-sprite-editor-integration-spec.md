# Forge2D — Техническое ТЗ на подготовку Sprite Editor к экосистеме

## 0. Назначение документа

Этот документ предназначен для работы coding-agent/ИИ внутри редактора кода над текущим проектом `sprite-cutter`.

Цель: **подготовить текущий Sprite Cutter к будущей экосистеме Forge2D, не ломая существующий MVP, тесты и архитектуру**.

Нельзя превращать текущий репозиторий в движок, monorepo или набор пустых пакетов. На этом этапе проект остаётся самостоятельным редактором спрайтов.

Рабочее продуктовое имя внутри архитектуры: **Sprite Editor**.

Текущее имя репозитория `sprite-cutter` можно сохранить.

---

# 1. Текущее состояние

Перед любыми изменениями изучить существующие документы проекта:

- `docs/mvp-spec.md`
- `docs/architecture.md`
- `docs/data-flow.md`
- `docs/test/testing.md`
- `docs/test/tdd.md` — если файл существует
- актуальную структуру `src/`
- существующие тесты Vitest и Playwright

Не переписывать принятые MVP-контракты без отдельной причины.

Текущий MVP уже реализует:

- загрузку PNG/JPEG/WebP;
- получение размеров изображения;
- настройку `frameWidth` / `frameHeight`;
- генерацию сетки;
- canvas-отрисовку;
- выбор кадров;
- preview;
- экспорт выбранных кадров;
- сброс состояния при замене изображения;
- обработку ошибок;
- браузерную проверку реального экспорта PNG.

---

# 2. Главная архитектурная цель

Sprite Editor должен стать независимым инструментом, который в будущем может работать в двух режимах:

```text
1. Standalone mode

Browser
  ↓
App
  ↓
SpriteEditor
  ↓
Sprite domain


2. Embedded mode

Forge2D Editor
  ↓
SpriteEditor
  ↓
Sprite domain
```

Направление зависимости должно быть только таким:

```text
Forge2D Editor
      ↓
Sprite Editor
      ↓
Sprite domain
```

Запрещённое направление:

```text
Sprite Editor
      ↓
Forge2D Engine
      ↓
Forge2D Editor
```

Sprite Editor не должен знать о будущем игровом движке.

---

# 3. Что НЕ делать сейчас

На этом этапе запрещено добавлять:

- `engine/`;
- `runtime/`;
- `renderer/`;
- `physics/`;
- `scene/`;
- `entity/`;
- `steam/`;
- `yandex/`;
- `platform-sdk/`;
- `build-system/`;
- PixiJS;
- Electron;
- ECS;
- monorepo;
- `pnpm-workspace.yaml`;
- отдельные npm-пакеты `@forge2d/*`;
- облачное хранение;
- backend;
- project database;
- plugin system.

Также не выполнять массовое переименование каталогов и импортов только ради будущей архитектуры.

Главный принцип:

> Не создавать abstraction до появления второго реального потребителя.

---

# 4. Архитектурные границы текущего проекта

Текущий проект необходимо рассматривать как три логических слоя.

## 4.1. Sprite domain

Чистая предметная логика.

Примеры:

```text
SpriteFrame
GridConfig
generateFrames()
grid validation
frame coordinates
frame selection rules
crop geometry
sprite metadata
```

Domain:

- не импортирует React;
- не работает с DOM;
- не знает о `HTMLCanvasElement`;
- не знает о Forge2D;
- не знает о Steam/Yandex;
- не зависит от UI.

Допустимая текущая область:

```text
src/entities/sprite/
```

Не требуется переносить код только ради смены названия слоя.

---

## 4.2. Sprite Editor UI

React-интерфейс редактора.

Примеры:

```text
SpriteCanvas
GridSettings
Preview
Frame selection UI
Upload UI
Export UI
```

UI использует domain, но domain не использует UI.

---

## 4.3. Standalone application shell

Оболочка самостоятельного приложения.

Ответственность:

- page layout;
- заголовок приложения;
- связывание feature-модулей;
- standalone download;
- верхнеуровневые сообщения об ошибках;
- точка входа Vite.

Текущий `App.tsx` может оставаться оболочкой.

В будущем Forge2D Editor заменит standalone shell, но сам `SpriteEditor` должен быть повторно используемым.

---

# 5. Целевое состояние после текущего этапа

После изменений приложение должно логически иметь следующую форму:

```text
App
 └── SpriteEditor
      ├── UploadSpriteSheet
      ├── GridSettings
      ├── SpriteCanvas
      ├── Preview
      └── ExportSprites
```

При этом текущие feature/domain-модули не должны переписываться без необходимости.

`App` остаётся default export, если этого требует существующий тестовый контракт.

---

# 6. Новый компонент SpriteEditor

Если текущая реализация уже фактически содержит один компонент-редактор, переиспользовать его.

Если нет — добавить композиционный компонент:

```text
src/widgets/sprite-editor/
```

или другое место, согласованное с текущей архитектурой.

Предпочтительный публичный контракт:

```ts
export interface SpriteEditorProps {
  initialSource?: SpriteEditorSource | null
  onSave?: (result: SpriteEditorResult) => void
}
```

На текущем этапе оба props могут быть необязательными.

Важно:

- standalone App не обязан сразу использовать `onSave`;
- существующий экспорт PNG должен продолжать работать;
- нельзя ради этого переписывать всю бизнес-логику.

---

# 7. Контракт данных для будущей интеграции

Добавить или подготовить типы, которые описывают результат работы редактора независимо от способа сохранения.

Минимальная форма:

```ts
export type SpriteEditorSource = {
  fileName: string
  width: number
  height: number
}

export type SpriteEditorResult = {
  source: SpriteEditorSource
  frames: SpriteFrame[]
}
```

Если текущий `SpriteFrame` содержит UI-состояние вроде:

```ts
selected: boolean
```

не включать UI-состояние в долгосрочный сериализуемый формат без необходимости.

Допускается разделить:

```ts
SpriteFrame
SpriteFrameViewState
```

только если это действительно упрощает текущий код.

Не делать такой рефакторинг исключительно «на будущее».

---

# 8. Будущий формат данных

Не реализовывать полностью сейчас, но архитектура не должна блокировать появление:

```ts
export type SpriteAnimation = {
  id: string
  name: string
  frameIds: number[]
  fps: number
  loop: boolean
}

export type SpriteMetadata = {
  source: SpriteEditorSource
  frames: SpriteFrame[]
  animations?: SpriteAnimation[]
}
```

Будущий файл может иметь вид:

```text
hero.sprite.json
```

Пример:

```json
{
  "source": {
    "file": "hero.png",
    "width": 256,
    "height": 128
  },
  "frames": [
    {
      "id": 0,
      "x": 0,
      "y": 0,
      "width": 32,
      "height": 32
    }
  ],
  "animations": {
    "idle": [0, 1, 2, 3]
  }
}
```

Это направление развития, а не задача текущего MVP.

---

# 9. Работа с экспортом

Не смешивать два понятия:

```text
1. Создать данные результата редактора
2. Скачать файл пользователю
```

Предпочтительное направление:

```text
SpriteEditor
   ↓
SpriteEditorResult
   ↓
Standalone adapter
   ↓
Browser download
```

В будущем:

```text
SpriteEditor
   ↓
SpriteEditorResult
   ↓
Forge2D Asset Database
```

Текущий `exportFrame(image, frame): Promise<Blob>` сохранить, если он уже является тестовым контрактом.

Не переносить download-логику внутрь domain.

---

# 10. Совместимость с существующим MVP

Все существующие пользовательские сценарии должны продолжить работать без изменений:

```text
Upload
  ↓
Configure grid
  ↓
Select frames
  ↓
Preview
  ↓
Export PNG
```

После рефакторинга пользователь не должен заметить функциональной разницы.

---

# 11. TDD и требования к тестам

Перед изменениями получить baseline:

```sh
pnpm test:run
pnpm typecheck
pnpm lint
pnpm test:e2e
```

Все проверки должны быть GREEN.

Во время работы соблюдать цикл:

```text
RED
 ↓
minimal implementation
 ↓
GREEN
 ↓
refactor
```

Запрещено:

- `skip`;
- `todo`;
- `test.fails`;
- удаление существующих проверок ради GREEN;
- ослабление assertions без причины;
- мокирование `generateFrames`, `exportFrame` или основного React-приложения для обхода поведения;
- изменение fixtures ради маскировки ошибки production-кода.

Существующие E2E должны оставаться настоящей проверкой браузера.

---

# 12. Новые тесты

Добавлять только тесты на новые архитектурные контракты.

Минимально допустимые новые проверки:

## 12.1. SpriteEditor можно отрендерить независимо от App

Проверить, что:

```tsx
render(<SpriteEditor />)
```

создаёт рабочий редактор.

Не проверять внутреннюю структуру DOM без необходимости.

---

## 12.2. App использует SpriteEditor

Тест должен проверять пользовательское поведение, а не конкретный import.

Не использовать snapshot огромного DOM.

---

## 12.3. onSave

Если `onSave` реализуется на этом этапе:

- вызвать `onSave` при явном пользовательском действии Save;
- передать сериализуемый `SpriteEditorResult`;
- не передавать DOM-объекты;
- не передавать `HTMLImageElement`;
- не передавать Canvas context.

Если Save UI пока не нужен — не добавлять его только ради теста.

---

# 13. Стабильные контракты

Сохранять существующие контракты MVP:

```text
generateFrames(...)
exportFrame(...)
default export App
accessible labels
grid counters
selection behavior
preview behavior
export file naming
```

Изменять их можно только если:

1. есть объективная архитектурная проблема;
2. обновлено ТЗ;
3. обновлена документация;
4. сначала изменены тесты контракта;
5. причина изменения явно зафиксирована.

---

# 14. Документация

Добавить документ:

```text
docs/ecosystem-integration.md
```

Он должен описывать:

```text
Sprite Editor — independent tool
      ↓
future Forge2D Editor integration
```

Зафиксировать в документе:

- Sprite Editor независим от engine runtime;
- Sprite Editor не импортирует Forge2D Engine;
- domain не зависит от React;
- App является standalone shell;
- SpriteEditor является потенциально встраиваемым UI-модулем;
- данные являются границей интеграции;
- monorepo откладывается до появления второго потребителя.

Не дублировать целиком `architecture.md`.

---

# 15. Будущий monorepo

Не создавать сейчас.

Целевое направление после появления engine-core:

```text
forge2d/

apps/
  sprite-editor/
  editor/

packages/
  sprite-core/
  engine-core/
  renderer/
  project-schema/

pnpm-workspace.yaml
```

Условие перехода к monorepo:

```text
существуют минимум два реальных приложения/пакета,
которым нужен общий код
```

До этого момента `sprite-cutter` остаётся самостоятельным репозиторием.

---

# 16. Будущее извлечение sprite-core

Не выполнять сейчас автоматически.

Кандидаты на будущее извлечение:

```text
SpriteFrame
GridConfig
generateFrames
grid validation
coordinate helpers
sprite metadata types
```

Будущий пакет:

```text
@forge2d/sprite-core
```

Извлечение выполняется только после появления второго реального потребителя.

---

# 17. Правила работы coding-agent

Перед каждым существенным изменением:

1. Прочитать существующий код.
2. Найти связанные тесты.
3. Определить текущий контракт.
4. Не придумывать новую архитектуру, если текущая решает задачу.
5. Сделать минимальное изменение.
6. Запустить локальные тесты затронутой области.
7. Запустить весь test suite.
8. Запустить typecheck.
9. Запустить lint.
10. Для пользовательского сценария — Playwright.
11. Обновить документацию, если изменён публичный контракт.

Coding-agent не должен:

- массово переписывать проект;
- менять структуру каталогов без необходимости;
- создавать speculative abstractions;
- внедрять паттерны только ради паттернов;
- заменять рабочий код новой реализацией без измеримой пользы;
- смешивать текущий Sprite Editor с будущим игровым движком.

---

# 18. Порядок реализации текущей задачи

## Шаг 0 — Freeze baseline

Проверить:

```sh
pnpm test:run
pnpm typecheck
pnpm lint
pnpm test:e2e
```

Если baseline не GREEN — не начинать архитектурный рефакторинг.

---

## Шаг 1 — Документ интеграции

Создать:

```text
docs/ecosystem-integration.md
```

Production-код не менять.

---

## Шаг 2 — Определить фактическую границу редактора

Проанализировать:

```text
App
pages/editor
widgets
features
entities/sprite
```

Ответить в отчёте:

```text
какой компонент сейчас фактически является Sprite Editor?
```

Если такая граница уже существует — не создавать дубль.

---

## Шаг 3 — Минимальное отделение App от Editor

Только если редактор сейчас целиком находится в `App.tsx`.

Цель:

```tsx
export default function App() {
  return <SpriteEditor />
}
```

Это пример направления, не требование точного кода.

Не менять пользовательское поведение.

---

## Шаг 4 — Публичный тип результата

Если это не вызывает лишний рефакторинг, определить:

```ts
SpriteEditorResult
```

Но не добавлять Save-flow до отдельной задачи.

---

## Шаг 5 — Regression

После изменений:

```sh
pnpm test:run
pnpm typecheck
pnpm lint
pnpm test:e2e
```

Все проверки должны быть GREEN.

---

# 19. Definition of Done

Текущая задача считается завершённой, когда:

- существующий MVP полностью работает;
- существующие тесты проходят;
- E2E проходят;
- App не содержит лишнюю предметную логику;
- Sprite Editor имеет понятную архитектурную границу;
- sprite domain остаётся независимым от React;
- Sprite Editor не зависит от Forge2D Engine;
- добавлен `docs/ecosystem-integration.md`;
- зафиксирован будущий data contract;
- monorepo не создан;
- engine/runtime/platform-код не добавлен;
- функциональность пользователя не изменилась.

---

# 20. Критерий качества

После выполнения задачи должно быть возможно сказать:

```text
Сегодня:
Sprite Editor работает как самостоятельное приложение.

Позже:
Forge2D Editor сможет встроить тот же Sprite Editor,
не копируя его бизнес-логику и не переписывая domain.
```

Если ради этого пришлось переписать половину работающего MVP — решение считается неправильным.

Главный принцип этапа:

> Подготовить точку интеграции, а не реализовывать интеграцию заранее.
