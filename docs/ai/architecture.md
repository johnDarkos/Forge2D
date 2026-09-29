# Рабочая карта архитектуры

Этот файл помогает быстро восстановить границы системы. Подробные решения находятся в
[Architecture v0.1](../Forge2D-Architecture-v0.1.md), фактические контракты — в
[документации проекта](../project.md).

## Слои и зависимости

```text
Forge Editor
  ├── использует @forge2d/core
  ├── использует @forge2d/runtime
  └── встраивает Sprite Editor через публичный adapter

@forge2d/runtime
  └── зависит от @forge2d/core

@forge2d/core
  └── не зависит от React, DOM и runtime backend

Sprite Editor
  ├── widgets/features/entities/shared по FSD
  ├── не импортирует Forge Editor или runtime
  └── общается с Forge2D через SpriteEditorProps/Result и asset adapter
```

Обратные зависимости запрещены. Core остаётся платформенно независимым. Runtime не знает
про React и конкретную графическую библиотеку. Forge Editor координирует подсистемы, но не
создаёт вторую модель сцены.

## Реализованные контракты

### Scene data

`SceneDocument` — immutable сериализуемый снимок. Объекты хранятся плоским списком,
иерархия задаётся `parentId`, компоненты имеют стабильные ID и `properties`. Все изменения
проходят через чистые операции Scene Model с валидацией JSON-значений, ссылок и циклов.

### Runtime lifecycle

`GameObject` владеет компонентами. `Behaviour` поддерживает `start`, `update(dt)` и
`onDestroy`; мутации во время обхода детерминированы. `Signal<T>` передаёт типизированные
события по стабильному снимку подписчиков.

### TypeScript → Inspector

`@field` отмечает только явно редактируемые публичные поля Component. Метаданные
наследуются. `getInspectorFields` возвращает замороженный снимок, а
`setInspectorFieldValue` проверяет тип, readonly и числовой диапазон. `min/max` ограничивают
правки Inspector, но не запрещают runtime-коду временно выйти за диапазон.

Core, Runtime и app используют один legacy-режим TypeScript `experimentalDecorators`.
App содержит project references на оба workspace-пакета, чтобы чистый `tsc -b` создавал
декларации зависимостей до проверки импортирующего приложения.

### Rendering

`Transform` и `SpriteRenderer` — компоненты Runtime. `TextureAsset` и `TextureRegion`
проверяются при создании/назначении. `Renderer` преобразует GameObject в immutable
`SpriteRenderCommand`, стабильно сортирует по `order` и передаёт команды в
`RendererBackend`. Конкретный Canvas/PixiJS backend пока отсутствует.

### Sprite Editor и assets

Sprite Editor возвращает `SpriteEditorResult`, не изменяя Project самостоятельно. Adapter
преобразует `SpriteAsset ↔ SpriteEditor`, а host отвечает за выбор asset, Save/Cancel и
хранение Project. `blob:` не считается постоянным URI проекта.

## Основные потоки данных

```text
Sprite editing:
Project → TextureAsset + SpriteAsset → adapter → SpriteEditor
SpriteEditorResult → adapter → новый SpriteAsset → Project Store

Scene editing:
Editor state → SceneDocument → GameObject/Components
selection → Inspector metadata → validated component update
GameObject[] → Renderer → SpriteRenderCommand[] → RendererBackend

Play flow (M0.6):
scene.json → runtime objects → Behaviour fields → update(dt) → rendered frame
```

## Инварианты

- ID сцен, объектов, компонентов, assets и спрайтов — стабильные строки.
- Сериализуемые данные не содержат DOM, React, функций и runtime-экземпляров.
- Пользовательский TypeScript — источник схемы Inspector; Forge не переписывает код.
- Editor и Game используют один runtime-контракт.
- Выбор backend не должен проникать в пользовательские компоненты.
- Новое решение, меняющее эти границы, сначала отражается здесь и в основной документации.

## Forge Editor workspace

`src/features/edit-forge-scene` связывает сериализуемые документы с runtime без второй
модели мира. `SceneDocument` остаётся источником истины; runtime-экземпляры пересоздаются из
него через registry фабрик. Встроенные фабрики понимают Transform и SpriteRenderer, host
может добавить пользовательские Component/Behaviour.

Сериализованный SpriteRenderer использует `assetId` и необязательный `frameId`. Asset может
быть текстурой или SpriteAsset; разрешённый TextureAsset/region передаётся runtime-компоненту.
Inspector сначала проверяет значение через Core API, затем создаёт новый SceneDocument.
Scene UI получает только команды общего Runtime Renderer.
