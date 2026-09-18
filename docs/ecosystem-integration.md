# Sprite Editor и граница Forge2D

Sprite Editor — независимый инструмент, продуктовое название в интерфейсе —
Sprite Cutter. Подготовка описана в [исходной спецификации](forge2d-sprite-editor-integration-spec.md).
Следующий этап **FEAT-001 реализован**: [публичный API и правила](features/sprite-editor-embedding.md).

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
называются `GridFrame`; runtime-контракт генерации сетки не изменён.

## Что остаётся за пределами редактора

Зависимостей от Forge2D Engine, PixiJS, игровых Scene/Entity, Steam/Yandex нет.
Не добавлены Project Store, Asset Manager, IndexedDB, backend, project.json,
autosave или plugin system. Подключение Save к реальному Forge2D ещё предстоит.
Общие CSS-стили пока требуют согласования с оформлением хоста.
Monorepo и извлечение sprite-core откладываются до второго реального потребителя.

Тестовый хост: `/tests/fixtures/embedded.html` при запуске Vite.
Проверки API: `src/test/embedding` и `tests/browser/embedding.spec.ts`.
Архитектура: [architecture.md](architecture.md). Поток данных: [data-flow.md](data-flow.md).
