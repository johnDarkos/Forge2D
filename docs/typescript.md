# TypeScript и контракты компонентов

Для приложения и конфигурационных файлов включены `strict`,
`exactOptionalPropertyTypes`, `noImplicitOverride` и
`forceConsistentCasingInFileNames`. Сохраняются проверки неиспользуемых переменных
и параметров, запрет fallthrough в switch и режим без генерации JS.
Для браузера доступны DOM и DOM.Iterable, для Vite/Vitest config — типы Node.

`strict` включает проверку null/undefined и неявного any. Опциональный prop
означает, что его можно не передавать; явный undefined не допускается, если
он не указан в типе. Проверка выполняется через `pnpm typecheck`, а также при
сборке и в pre-commit.

## Размещение типов

| Модуль                                      | Типы                                                                                    |
| ------------------------------------------- | --------------------------------------------------------------------------------------- |
| entities/sprite/model/types.ts              | GridFrame, внутренняя геометрия и числовые ID, метаданные файла, размеры и ошибки сетки |
| features/upload-sprite-sheet/model/types.ts | SpriteUploaderProps, UploadStatus, UploadError                                          |
| features/configure-grid/model/types.ts      | GridSettingsProps                                                                       |
| features/select-sprite/model/types.ts       | SpriteCanvasProps                                                                       |
| features/export-sprites/model/types.ts      | ExportButtonProps, ExportState, ExportError, ExportFrame                                |
| widgets/sprite-editor/model/types.ts        | ImageLoadState, EditorState, SpriteEditorProps, SpriteEditorViewProps                   |

`entities/sprite/model/editor-types.ts` содержит публичные типы FEAT-001;
`model/browser-types.ts` — LoadedSpriteSheet и SpritePreviewProps.

Между слайсами типы импортируются через `index.ts` и `import type`.
Внутренний SpriteEditorViewProps не экспортируется наружу widget.
App и EditorPage не принимают данные, поэтому пустые интерфейсы для них не нужны.
Тестовые контракты сетки используют общий GridFrame; публичный SpriteFrame относится к FEAT-001.

## Правила модели

- FrameSizeInput содержит строки: пустой ввод не превращается в ноль.
- FrameSize содержит числа; целочисленность и положительность требуют runtime-валидации.
- ImageLoadState — объединение idle/loading/ready/error с разными обязательными данными.
- EditorState хранит выбранные ID в ReadonlySet; готовые кадры и счётчики вычисляются из состояния.
- Массивы входных кадров readonly: дочерние компоненты не меняют коллекции владельца.
- GridFrame.selected сохранён для совместимости с ТЗ и проверкой независимости кадров; в сессии он должен вычисляться из выбранных ID.
- ExportState принадлежит feature; isExporting в редактор передаётся через onExportingChange для блокировки смены источника.
- Ошибки имеют машинный code и пользовательское message.
- null явно означает отсутствие изображения или активного кадра.

## Компоненты

Внутренние props данных и callbacks обязательны; настройки с default могут
быть необязательными. Публичный SpriteEditorProps допускает вызов без props
для standalone, а image/initialData/onSave/onCancel включают внешний API.
DOM-события остаются внутри UI; наружу передаются File, ID или строка поля.

SpriteEditorView связывает компоненты типизированными props. SpriteEditor
владеет моделью сессии через useEditor и подготавливает обязательные props.
Проверяемые модули реализованы без no-op обработчиков и фиктивных данных.

## Domain без браузера

`entities/sprite/model/types.ts` теперь содержит только чистые данные.
LoadedSpriteSheet и SpritePreviewProps находятся в `model/browser-types.ts`;
импорты через публичный index.ts остаются совместимыми.
SpriteEditorSource и SpriteEditorResult доступны как type-only экспорты widget.
Их определения и чистые функции доступны через `entities/sprite/domain.ts`.
`tsconfig.domain.json` проверяет этот граф с lib ES2023 и types [], без DOM.
Он включён в общую команду typecheck; это не отдельный пакет.

## Типы v0.2

GridOptions содержит числовые offsetX/offsetY/gapX/gapY, GridOptionsInput — их
строковые значения для полей. Они экспортируются из чистого domain API.
GenerateFrames принимает необязательный пятый аргумент; прежние четыре
аргумента означают нулевые смещения и промежутки.
EditorState хранит gridOptionsInput. GridSettingsProps передаёт spacing и
onSpacingChange; SpriteCanvasProps — onSelectAll и onClearSelection.
Тип результата интеграции и геометрия кадра не менялись.

## Типы ручного выделения

Чистый domain экспортирует `ImagePoint` (x/y), `CropRect` (x/y/width/height)
и `selectionRect(...): CropRect | null`. Они не зависят от DOM или React.
Feature select-sprite экспортирует `SelectionMode = 'grid' | 'manual'`.
`SpriteCanvasProps` передаёт режим, область, блокировку переключения и callbacks
`onModeChange`, `onRegionChange`, `onDrawingChange`. DOM-события обрабатываются
внутри feature. `EditorState` хранит `selectionMode`, `manualRegion`, `isDrawing`.
Необязательные `SpritePreviewProps.region` и `ExportButtonProps.regionExport`
меняют подписи и имя скачивания; по умолчанию сохраняется режим сетки.

## Типы списка кадров

`NamedSpriteFrame extends SpriteFrameGeometry` добавляет readonly `name` и
экспортируется через domain и entity API. `EditorState.sprites` — readonly
массив публичных кадров; `savedFrames` вычисляется как адаптер для существующего UI; `nextManualFrameId` обеспечивает стабильные ID после удаления.
`ManualFramesProps` передаёт список, источник, разрешение добавления, блокировку
и callbacks `onAdd`, `onRename`, `onRemove`. `SpriteEditorViewProps.manualFrames`
связывает новую feature с моделью сессии.

`ExportButtonProps.savedFrames` необязателен для совместимости с экспортом сетки.
`ExportFrameItem` внутри feature экспорта расширяет геометрию необязательным
именем: одна функция `exportFramesZip` принимает обычные и именованные кадры.
Контракт `SpriteEditorResult` обновлён отдельным этапом FEAT-001, описан ниже.

## Панель инструментов и вид холста

`CanvasViewport` содержит readonly `zoom`, `x`, `y` и принадлежит UI feature
select-sprite. `EditorState.viewport` хранит его единственный экземпляр.
`SpriteCanvasProps` передаёт `viewport`, `onViewportChange`, `isDrawing`.
`SpriteCanvasToolsProps` выбирает нужные поля через `Pick`, поэтому контракты
кнопок и холста не расходятся. `EditorSidebar` получает `SpriteEditorViewProps`
и компонует существующие features без новых зависимостей между слайсами.

## Публичный контракт FEAT-001

В `entities/sprite/model/editor-types.ts` определены SpriteRect, SpriteFrame
(строковый id, name, rect), SpriteSource, SpriteGridSettings, SpriteEditorMode,
SpriteEditorInitialData, SpriteEditorImage, SpriteEditorResult и domain-состояние.
Они доступны из `entities/sprite/domain.ts`; типы внешнего API экспортируются
также через `widgets/sprite-editor`. Прежняя ячейка с selected теперь GridFrame.

`SpriteEditorProps` принимает необязательные image, initialData, onSave, onCancel
и совместимый initialFrameSize. `SpriteEditorViewProps.actions` связывает Save/Cancel
с видимостью кнопок, блокировками и ошибками.
`LoadedSpriteSheet.file` допускает null для внешнего URL; MIME и размер файла
для него неизвестны и тоже представлены null, размеры изображения берутся после load.

`SpriteEditorResult` — source, sprites, settings. Все поля readonly, runtime-граница
проверяет целочисленные размеры, границы rect и уникальность ID. Результат копируется
по разрешённым полям, поэтому дополнительные свойства входных объектов не утекают.
[Полное описание API](features/sprite-editor-embedding.md).
