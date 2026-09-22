# Sprite Editor и граница Forge2D

Sprite Editor — независимый инструмент, продуктовое название в интерфейсе —
Sprite Cutter. Подготовка описана в [исходной спецификации](forge2d-sprite-editor-integration-spec.md).
Этап **FEAT-001 реализован**: [публичный API и правила](features/sprite-editor-embedding.md).
Минимальная модель Project/Asset этапа **FEAT-002** описана в
[контракте Asset Model](features/forge2d-asset-model.md).

```text
Standalone: App → EditorPage → SpriteEditor → sprite domain
Embedded:   внешний React-хост → SpriteEditor → sprite domain
                     ↑                │
                     └─ onSave(result)┘
```

Публичная точка входа — `src/widgets/sprite-editor`. Компонент принимает `image`,
`initialData`, `onSave`, `onCancel`; прежний `initialFrameSize` сохранён.
Без props работает standalone загрузка и PNG/ZIP-экспорт.

Чистые типы FEAT-001 находятся в `entities/sprite/model/editor-types.ts`,
геометрия сетки — в `model/types.ts`. `entities/sprite/domain.ts` предоставляет
типы и функции без React, DOM, Canvas или engine runtime. Браузерный ресурс
выделен в `model/browser-types.ts`. `tsconfig.domain.json` проверяет чистый граф
без DOM и внешних ambient types.

## Данные и сохранение

Публичный `SpriteFrame` содержит `id: string`, `name`, `rect`.
`SpriteEditorResult` содержит `source: { width, height }`, `sprites` и `settings`.
`createSpriteEditorResult` валидирует данные и создаёт независимый снимок.
В результате нет File, Image, URL, selected, zoom/pan или состояния панели.

Save передаёт метаданные через `onSave`, Cancel вызывает `onCancel`.
Куда сохранять результат и закрывать ли редактор, решает родитель.
`exportFrame` и `downloadBlob` по-прежнему относятся к браузерному экспорту
и не импортируются domain. Экспорт PNG/ZIP не подменяет Save.

Изменён предварительный контракт результата: вместо `frames` с внутренней
геометрией используются `sprites` с именами и строковыми ID. Внутренние ячейки
`GridFrame` тоже имеют строковый ID; их `displayNumber` остаётся только частью UI.

## Что остаётся за пределами редактора

Зависимостей от Forge2D Engine, PixiJS, игровых Scene/Entity, Steam/Yandex нет.
Добавлены чистый Project domain, TextureAsset/SpriteAsset и host adapter.
Не добавлены production Project Store, Asset Manager, IndexedDB, backend,
project.json, autosave или plugin system. Подключение к реальному Forge2D UI ещё предстоит.
Стили редактора изолированы корнем `.sprite-editor` и локальным reset
([architecture.md](architecture.md#изоляция-стилей)); глобальные правила остаются у хоста.
Monorepo и извлечение sprite-core откладываются до второго реального потребителя.

Тестовые хосты: `/tests/fixtures/embedded.html` и
`/tests/fixtures/asset-host.html` при запуске Vite. Проверки FEAT-002:
`src/test/asset` и `tests/browser/assets.spec.ts`.
Архитектура: [architecture.md](architecture.md). Поток данных: [data-flow.md](data-flow.md).
