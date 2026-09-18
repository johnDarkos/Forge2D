# Подготовка Sprite Editor к Forge2D

Sprite Editor — самостоятельный инструмент. Текущее продуктовое название
в интерфейсе остаётся Sprite Cutter, имя репозитория не меняется.
Спецификация этапа: [Forge2D integration](docs/forge2d-sprite-editor-integration-spec.md).

```text
Сегодня: браузер → App → EditorPage → SpriteEditor → sprite domain
Позже:   Forge2D Editor → тот же SpriteEditor → sprite domain
```

Фактическая граница уже существует: `src/widgets/sprite-editor`, публичный
экспорт SpriteEditor. Он владеет сессией через useEditor. App — standalone shell,
подключающий EditorPage. Дублирующий редактор и массовый перенос модулей не нужны.

Domain состоит из чистых типов model/types.ts и функций lib в entities/sprite.
Отдельная точка входа `entities/sprite/domain.ts` позволяет использовать их без
загрузки React-компонентов. Браузерные ресурсы и props preview находятся отдельно
в model/browser-types.ts. Общий UI API entities/sprite сохраняется для MVP.
Domain не зависит от React, DOM, Canvas, Forge2D Engine или engine runtime.
Проверка tsconfig.domain.json компилирует этот граф без DOM и внешних ambient types.

## Граница данных

Публичные типы SpriteEditorSource и SpriteEditorResult экспортируются из
widgets/sprite-editor (type-only) и из domain. Source описывает только исходник:
fileName, width, height. Result содержит source и массив SpriteFrameGeometry:
id, row, column, x, y, width, height. В результате нет selected, File, Image,
Canvas, URL ресурса или состояния React.

Тип описывает передаваемые кадры; выбор состава результата и создание снимка
будут определены отдельной задачей Save. Сейчас не добавляются неработающие props
initialSource/onSave: одних метаданных initialSource недостаточно для загрузки
пикселей, а Save-flow явно отложен шагом 4 спецификации. Существующий
initialFrameSize продолжает работать. JSON-файлы и анимации не реализуются.

## Экспорт и сохранение

exportFrame(image, frame): Promise<Blob> остаётся браузерной утилитой feature
export-sprites. downloadBlob отдельно выполняет скачивание, а не формирует
метаданные. Domain не импортирует ни одну из этих функций.
Текущий редактор сохраняет PNG-экспорт. В будущем потребитель данных сможет
выбрать способ сохранения результата; полноценный embedded Save ещё не реализован.

## Ограничения этапа

Никаких engine/runtime/platform зависимостей, backend или plugin system.
Monorepo и извлечение sprite-core откладываются до появления второго реального
потребителя. На этапе подготовки интеграции v0.2 не добавлялся; затем
он реализован отдельной задачей, без изменения границы Forge2D.

Baseline до изменений: 52 Vitest, 4 Playwright, typecheck и lint GREEN.
Новые проверки касаются только границы редактора, domain и типа результата.
Архитектура приложения: [architecture.md](architecture.md).
