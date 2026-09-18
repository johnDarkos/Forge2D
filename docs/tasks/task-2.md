# Forge2D — техническая стабилизация Sprite Editor

## Контекст

Sprite Editor уже прошёл этап MVP и FEAT-001 embedding.

Текущее состояние проекта считается рабочим baseline:

- TypeScript проходит;
- lint проходит без warnings;
- format check проходит;
- Vitest: 152 теста проходят;
- production build проходит;
- Playwright: 16/16 сценариев проходят;
- FSD-зависимости в текущем виде не нарушены;
- Sprite Editor имеет отдельный публичный embedding-контракт;
- предметная логика Sprite Editor отделена от браузерного UI.

Следующая цель — не добавлять большой объём новых возможностей, а стабилизировать архитектуру перед развитием Forge2D.

---

# ВАЖНО: режим выполнения

Не выполнять всё ТЗ за один проход.

Работать строго по этапам.

После завершения каждого этапа:

1. остановиться;
2. запустить предусмотренные проверки;
3. сообщить:

   - что изменено;
   - какие файлы изменены;
   - какие архитектурные решения приняты;
   - результаты тестов;
   - появились ли новые риски;

4. не переходить к следующему этапу самостоятельно.

Следующий этап выполнять только после отдельной команды пользователя.

Не объединять несколько этапов в один большой рефакторинг.

---

# Общие ограничения

На всём протяжении работы:

- сохранять текущую FSD-архитектуру;
- не переносить Forge2D-specific сущности внутрь Sprite Editor;
- Sprite Editor не должен знать о `Project`, Scene Editor, runtime или persistence Forge2D;
- направление зависимости:

```text
Forge2D host
      ↓
Sprite Editor
      ↓
sprite domain
```

но не наоборот;

- persistence должна находиться за пределами Sprite Editor;
- существующий `SpriteEditorResult` считать публичным контрактом;
- не переименовывать существующие публичные поля без отдельной необходимости;
- изменения контрактов делать backwards-compatible, если возможно;
- не переписывать рабочие модули «для красоты»;
- не добавлять абстракции без реальной необходимости;
- TDD применять для новой предметной логики;
- после каждого этапа проект должен оставаться запускаемым.

Без отдельной причины не изменять:

```text
gridGeometry.ts
generateFrames.ts
validateGrid.ts
selectionRect.ts
exportFrame.ts
```

На них завязано существующее пиксель-точное поведение и тесты.

---

# ЭТАП 0 — Зафиксировать baseline

## Цель

Перед архитектурными изменениями убедиться, что текущее рабочее состояние зафиксировано и воспроизводимо.

## Выполнить

Проверить git status.

Убедиться, что FEAT-001 и связанные изменения не остаются смешанными с будущими рефакторингами.

Если рабочее дерево содержит незакоммиченные изменения:

- определить, относятся ли они к завершённой FEAT-001;
- не удалять пользовательские изменения;
- подготовить логически цельное состояние для фиксации.

Не делать destructive git-команд.

Не выполнять reset, checkout или удаление пользовательской работы.

## Проверки

Запустить:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:run
pnpm build
pnpm test:e2e
```

Если Playwright browser отсутствует, явно сообщить об этом и использовать существующий предусмотренный проектом способ запуска через установленный Chromium либо указать необходимую установку.

## Результат этапа

Baseline должен быть зелёным.

На этом остановиться.

---

# ЭТАП 1 — Гигиена проекта и документации

## Цель

Убрать накопившийся мелкий технический мусор до серьёзных архитектурных изменений.

## Выполнить

### 1.1 Мёртвый CSS

Проверить:

```text
src/App.css
```

Если он действительно нигде не используется — удалить.

Не удалять CSS только на основании имени файла: сначала проверить imports/references.

### 1.2 Дублированная документация

Исследовать:

```text
docs/
docs/docs/
```

Определить каноническое местоположение документов.

Убрать лишнюю вложенную копию `docs/docs`, не ломая ссылки.

Обновить относительные ссылки.

### 1.3 Битая документационная ссылка

Сейчас README и/или architecture docs ссылаются на:

```text
docs/toolbar.md
```

а документа может не существовать.

Нужно:

- либо создать документ, если toolbar действительно требует отдельного описания;
- либо удалить/заменить ссылки на существующую документацию.

Не создавать пустой документ только ради исправления ссылки.

### 1.4 Дублирование публичного sprite API

Проверить:

```text
src/entities/sprite/domain.ts
src/entities/sprite/index.ts
```

Сейчас списки экспортируемых сущностей частично дублируются.

Организовать один источник истины там, где это возможно, сохранив:

- чистый domain entrypoint без DOM;
- browser/public entrypoint с UI/browser-сущностями.

`domain.ts` по-прежнему обязан собираться в среде без DOM.

## Не делать на этом этапе

- не трогать `useEditor`;
- не менять модель ID;
- не создавать Asset Model;
- не менять CSS architecture целиком;
- не менять публичный embedding API.

## Проверки

Все штатные проверки проекта.

После завершения остановиться.

---

# ЭТАП 2 — Добавить CI

## Цель

Сделать так, чтобы архитектурные регрессии обнаруживались автоматически, а не только локально.

## Выполнить

Добавить GitHub Actions workflow.

Минимальный pipeline:

```text
install
↓
format:check
↓
lint
↓
typecheck
↓
test:run
↓
build
↓
test:e2e
```

Использовать pnpm.

Учитывать lockfile.

Версии Node/pnpm должны быть зафиксированы или предсказуемо воспроизводимы.

Playwright должен корректно устанавливать необходимый browser в CI.

Использовать кэширование зависимостей, если оно не усложняет workflow.

## Желательно

CI должен запускаться хотя бы:

- на push;
- на pull request.

## Не делать

Не добавлять release/deploy/CD.

Сейчас нужен только CI качества.

После прохождения workflow остановиться.

---

# ЭТАП 3 — Унифицировать идентичность SpriteFrame

## Проблема

Сейчас существуют две идентичности:

```text
SpriteFrame.id: string
```

и отдельные UI-номера:

```text
spriteNumbers: Map<string, number>
```

Числовая идентичность начала проникать в feature-контракты, rename/remove/export.

Это нужно исправить до появления Asset Model.

## Цель

Настоящая идентичность SpriteFrame должна быть строковой и стабильной.

Числовые значения должны использоваться только как presentation/display order.

## Требования

### Domain

Основной идентификатор:

```ts
SpriteFrame.id: string
```

Он используется для:

- select;
- rename;
- remove;
- export selection;
- deduplication;
- internal lookup;
- взаимодействия между features.

### UI numbering

Числа вроде:

```text
1
2
3
4
```

не являются ID.

Они используются только:

- как отображаемый номер;
- при необходимости — для сортировки UI;
- возможно, для friendly filename, если контракт это допускает.

### Features

Проверить и привести к string id:

```text
manage-manual-frames
export-sprites
select-sprite
```

Особенно проверить:

```text
ManualFramesProps
ExportButtonProps
```

Убрать места, где `SpriteFrameId` фактически означает number.

Не оставлять тип с вводящим в заблуждение названием.

### Lookup

Убрать ненужные линейные преобразования:

```text
number → domainId
```

если после унификации они больше не нужны.

### Тесты

Сначала добавить/обновить тесты, фиксирующие:

- стабильность id после rename;
- стабильность id после изменения display number;
- удаление по string id;
- export selection по string id;
- отсутствие коллизий;
- manual frame не получает фиктивный `id: 0`.

Только после RED-тестов менять реализацию.

## Не делать

Не создавать Asset Model на этом этапе.

Не менять формат `SpriteEditorResult` без необходимости.

После завершения остановиться.

---

# ЭТАП 4 — FEAT-002: Forge2D Asset Model

## Цель

Создать минимальную модель assets будущего Forge2D.

Sprite Editor должен остаться независимым инструментом.

## Архитектура

Примерное направление:

```text
Project
│
├── TextureAsset
├── SpriteAsset
├── будущий SceneAsset
├── будущий AudioAsset
└── ...
```

Sprite Editor:

```text
Texture / Sprite data
       ↓
SpriteEditor
       ↓
SpriteEditorResult
       ↓
host adapter
       ↓
SpriteAsset
```

Sprite Editor НЕ должен импортировать Asset Model Forge2D.

---

## Минимальные сущности

Спроектировать:

```ts
Project
Asset
TextureAsset
SpriteAsset
```

Не проектировать сейчас:

- SceneAsset полностью;
- AudioAsset полностью;
- Prefab;
- ECS;
- runtime;
- scripting system;
- plugin system.

Допускается предусмотреть расширяемость через discriminated union, но без реализации будущих систем.

---

## Требования к Asset

Минимально рассмотреть:

```ts
type AssetId = string
```

и общие поля вроде:

```text
id
type
name
schemaVersion
```

Конкретный окончательный контракт определить после анализа проекта.

Не добавлять поля «на всякий случай».

---

## TextureAsset

Должен описывать исходную текстуру/изображение на уровне Project domain.

Не хранить browser-specific `HTMLImageElement`.

Не связывать domain с React.

---

## SpriteAsset

Должен представлять подготовленный спрайтовый ресурс Forge2D.

Определить способ хранения:

- source texture reference;
- sprite frames;
- grid/manual metadata, если оно действительно нужно;
- editor-relevant settings только если они нужны для повторного открытия.

---

## Mapping

Создать чистые функции преобразования:

```text
SpriteEditorResult → SpriteAsset
SpriteAsset → SpriteEditor initialData
```

Маппинг должен жить снаружи Sprite Editor.

---

## Версионирование

Предусмотреть минимальный:

```text
schemaVersion
```

Не создавать сложную migration system.

Нужно только создать фундамент, чтобы формат можно было версионировать позже.

---

## Persistence

НЕ реализовывать настоящий persistence.

Допускается:

```text
in-memory AssetStore
```

только для проверки архитектуры.

Никаких:

- IndexedDB;
- filesystem;
- cloud sync;
- backend.

Это отдельная будущая задача.

---

## TDD

Сначала тесты для:

- создания Asset;
- проверки AssetId;
- SpriteEditorResult → SpriteAsset;
- SpriteAsset → editor initial data;
- round-trip;
- schemaVersion;
- invalid input.

Затем реализация.

---

## Integration test

Создать простой test-host:

```text
open SpriteAsset
→ SpriteEditor
→ изменить
→ Save
→ map to SpriteAsset
→ сохранить in-memory
→ снова открыть
→ получить те же данные
```

---

## E2E

Добавить один Playwright сценарий этой цепочки.

Не раздувать E2E-набор без необходимости.

После завершения остановиться.

---

# ЭТАП 5 — Рефакторинг useEditor

## Проблема

`useEditor` сейчас является крупным orchestration hook примерно на 500+ строк.

Он одновременно управляет:

- session state;
- source;
- loading;
- grid;
- selection;
- manual frames;
- viewport;
- Save;
- Cancel;
- async state;
- IDs;
- export-related state;
- формированием props.

Состояние распределено между:

- EditorState;
- несколькими useState;
- несколькими useRef.

Busy-guards повторяются в обработчиках.

## Цель

Не сделать код «красивее», а уменьшить связанность и количество скрытых инвариантов.

## Перед рефакторингом

Добавить тесты на поведение состояния.

Не начинать большой reducer-refactor только с надеждой на существующие DOM-тесты.

---

## Предлагаемое направление

Рассмотреть:

```text
useEditor
│
├── session reducer
├── source/loading
├── domain state
├── viewport/interaction
└── async actions
```

Это не обязательное файловое разбиение.

Главное — разделить ответственности.

---

## reducer

Исследовать перевод стабильного session state в reducer.

Например события:

```text
SOURCE_LOADED
GRID_UPDATED
FRAME_SELECTED
SELECTION_CLEARED
MANUAL_FRAME_ADDED
MANUAL_FRAME_RENAMED
MANUAL_FRAME_REMOVED
VIEWPORT_CHANGED
SESSION_RESET
```

Не превращать reducer в гигантский switch на сотни строк.

Чистую transition-логику покрыть unit-тестами.

---

## Busy state

Свести разрозненные:

```text
saving
actionRunning
isExporting
...
```

к ясным правилам.

Если нужен derived state:

```ts
const isBusy = ...
```

он должен быть определён централизованно.

Не размазывать:

```ts
if (saving || actionRunning || ...)
```

по множеству обработчиков.

---

## Callbacks / props

Не заниматься premature optimization.

Но устранить ненужное создание тяжёлых derived collections, если их вычисление действительно происходит каждый render.

Использовать `useMemo`/`useCallback` только там, где есть понятная причина.

---

## key-remount

Проанализировать текущие key-remount:

```text
SpriteEditor
SpriteCanvas
ExportButton
```

Не убирать их механически.

Для каждого решить:

- это корректный lifecycle boundary;
- или скрытый reset state.

Документировать решение.

---

## Acceptance criteria

После рефакторинга:

- внешнее поведение Sprite Editor не изменилось;
- публичный API не сломан;
- все существующие тесты проходят;
- reducer/domain transition logic имеет прямые unit-тесты;
- `useEditor` становится orchestration layer, а не владельцем всей логики.

После завершения остановиться.

---

# ЭТАП 6 — Изоляция стилей Sprite Editor

## Проблема

`src/index.css` содержит глобальные селекторы:

```text
*
body
button
input
h1
h2
p
...
```

При embedding это может менять Forge2D host, а Forge2D CSS может менять Sprite Editor.

## Цель

Sprite Editor должен безопасно встраиваться в Forge2D UI.

## Предпочтительное решение

Исследовать:

```text
CSS Modules
```

или локально scoped CSS с корневым namespace.

Например:

```text
.spriteEditorRoot
```

Глобальные browser reset правила должны принадлежать standalone application shell, а не reusable editor widget.

---

## Разделить

### Standalone app styles

Могут содержать:

```text
body
html
root layout
```

### SpriteEditor component styles

Должны быть локализованы.

---

## Не использовать Shadow DOM автоматически

Shadow DOM вводить только если реальный host этого требует.

На текущем этапе предпочтительнее обычная CSS isolation.

---

## Проверить

После интеграции тестовый host должен содержать свои:

```text
button
input
h1
p
```

со своими стилями.

Sprite Editor не должен их изменять.

Host CSS также не должен ломать Sprite Editor.

Добавить integration/e2e проверку минимум для нескольких конфликтующих стилей.

После завершения остановиться.

---

# ЭТАП 7 — Реальная интеграция Sprite Editor в Forge2D

Выполнять только когда:

- ID унифицированы;
- Asset Model существует;
- CSS изолирован;
- embedding contract стабилен.

## Цель

Forge2D должен открыть SpriteAsset в Sprite Editor и получить назад обновлённый SpriteAsset.

Минимальный flow:

```text
Forge2D Project
      ↓
SpriteAsset
      ↓
adapter
      ↓
SpriteEditor initialData
      ↓
редактирование
      ↓
SpriteEditorResult
      ↓
adapter
      ↓
SpriteAsset
      ↓
Project
```

Persistence по-прежнему может быть временным/in-memory, если отдельное persistence ТЗ ещё не выполнено.

---

# ЭТАП 8 — Отложенные задачи

Следующие задачи НЕ выполнять сейчас автоматически.

Создать backlog.

---

## 8.1 Performance: большие sprite sheets

Проблема:

при 4096×4096 и сетке 8 px потенциально создаётся около 262k frame objects.

В будущем исследовать:

- safety limit;
- lazy frame representation;
- grid virtualization;
- canvas optimization;
- уменьшение количества strokeRect;
- spatial lookup.

Не оптимизировать без benchmark.

---

## 8.2 ZIP export worker

Сейчас ZIP собирается синхронно в main thread.

В будущем:

```text
Web Worker
progress
cancel
```

Добавить только когда размер реальных экспортов покажет необходимость.

---

## 8.3 Package / library build

Сейчас:

```text
private: true
```

и Sprite Editor используется внутри репозитория.

Не публиковать package только ради «профессиональности».

Lib build + package exports делать, когда появится второй реальный consumer или архитектура Forge2D потребует отдельного package boundary.

---

## 8.4 Error Boundary

Добавить позже на уровне application/editor boundary.

Не использовать как замену нормальной обработке ошибок.

---

## 8.5 i18n

UI-строки пока English-only.

Не внедрять полноценную i18n систему до появления требования локализации Forge2D.

Но новые строки не размазывать хаотично.

---

## 8.6 Undo / Redo

Отдельная будущая architectural feature.

Не добавлять её внутрь текущего reducer-refactor.

В дальнейшем command/history model должна проектироваться отдельно.

---

# Definition of Done для всей серии

После завершения всех основных этапов должно выполняться:

```text
Sprite Editor
├── имеет чистый domain
├── имеет стабильные string IDs
├── безопасно встраивается
├── не протекает CSS
├── не знает о Forge2D Project
├── не занимается persistence
├── возвращает стабильный SpriteEditorResult
└── полностью покрывается текущим quality pipeline

Forge2D
├── имеет Asset Model
├── владеет Project
├── владеет persistence
├── преобразует SpriteAsset ↔ SpriteEditor
└── может повторно открыть сохранённый SpriteAsset
```

---

# Главный архитектурный принцип

Sprite Editor — инструмент Forge2D, но не часть домена Forge2D Project.

Он должен оставаться автономным.

Новые зависимости не должны превращать:

```text
SpriteEditor
```

в:

```text
Forge2DSpriteEditor
```

---

# Формат отчёта после КАЖДОГО этапа

В конце этапа вывести:

```markdown
## Выполнено

...

## Изменённые файлы

...

## Архитектурные решения

...

## Тесты

- format:
- lint:
- typecheck:
- unit:
- build:
- e2e:

## Остались риски

...

## Следующий этап

Название следующего этапа.

НЕ начинал его.
```

И остановиться.
