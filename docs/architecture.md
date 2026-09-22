# Архитектура MVP: FSD

Рабочий MVP построен по FSD. Поток данных описан в [data-flow.md](data-flow.md),
контракты TypeScript — в [typescript.md](typescript.md).

| Слой / слайс                 | Модули                                                            | Ответственность                                |
| ---------------------------- | ----------------------------------------------------------------- | ---------------------------------------------- |
| app                          | App                                                               | Подключение страницы                           |
| pages/editor                 | EditorPage                                                        | Рабочий экран                                  |
| widgets/sprite-editor        | useEditor, session reducer, SpriteEditor, SpriteEditorView        | Оркестрация сессии и связывание features       |
| features/upload-sprite-sheet | SpriteUploader                                                    | Выбор и проверка MIME файла                    |
| features/configure-grid      | GridSettings                                                      | Управляемые поля размера и сообщения валидации |
| features/select-sprite       | SpriteCanvas                                                      | Отрисовка сетки, выбор мышью и клавиатурой     |
| features/export-sprites      | ExportButton, exportFrame, downloadBlob                           | Нарезка исходника, PNG, отдельные скачивания   |
| features/manage-sprite-asset | spriteAssetAdapter                                                | Граница между Forge2D assets и Sprite Editor   |
| entities/sprite              | SpritePreview, generateFrames, validateGrid, isSupportedImageType | Сущность кадра и её независимая логика         |
| entities/project             | Project, TextureAsset, SpriteAsset                                | Чистая сериализуемая модель assets Forge2D     |

Зависимости направлены вниз: app → pages → widgets → features → entities.
Слайсы одного слоя не импортируют друг друга; внешний код использует `index.ts`.
Shared пока не нужен: предметная логика размещена в соответствующих слайсах.
Это соответствует [правилам публичного API FSD](https://fsd.how/docs/reference/public-api/).

`src/main.tsx` подключает App. SpriteEditor получает состояние и обработчики
из useEditor, затем передаёт их внутреннему SpriteEditorView. Чистый
`editorSessionReducer` выполняет переходы стабильного состояния: источник,
настройки, выбор, коллекция кадров, viewport и признаки взаимодействия.
`useEditor` координирует reducer с загрузкой изображения, доменными функциями,
Save/Cancel и формированием props. Вычисляемые кадры не дублируются в состоянии.
Effect загрузки освобождает URL и игнорирует результат отменённого запроса.

ExportButton владеет статусом экспорта, передаёт isExporting в редактор и
фиксирует выбранные кадры на старте. Смена файла, размеров и выделения
блокируется до завершения операции. PNG создаётся из Image, а не рабочего
canvas; линии сетки не попадают в скачанный файл.

Тесты напрямую обращаются к публичным API entities/sprite и
features/export-sprites. Временные загрузчики RED-фазы удалены после реализации.
Изначально предложенные пути shared/utils заменены при реализации FSD без
ослабления поведенческих проверок.

## Граница будущей интеграции

SpriteEditor уже является самостоятельным UI-модулем; App/EditorPage остаются
standalone shell. Domain API `entities/sprite/domain.ts` импортирует только чистые
типы и функции. `domain.ts` — единственный список общих экспортов;
`index.ts` переэкспортирует его через `export *` и добавляет только UI-компоненты
и browser-типы. Обратной зависимости из domain в браузерный API нет. DOM-ресурсы выделены в `model/browser-types.ts`; прежний UI API
сохранён. Результат интеграции теперь реализован по FEAT-001: SpriteSource/SpriteEditorResult,
без selected и браузерных объектов. Save/Cancel возвращают управление внешнему хосту.
Подробности: [подготовка к Forge2D](ecosystem-integration.md).

## v0.2

GridOptions, gridGeometry, generateFrames и validateGrid остаются чистым domain.
GridSettings редактирует размеры, смещения и промежутки. SpriteCanvas отображает
готовые прямоугольники, применяет Zoom/Pan и передаёт события выбора
в useEditor. Сессия владеет массовым выбором и блокировкой при экспорте.

exportFramesZip в features/export-sprites собирает PNG в ZIP через fflate;
скачивание по-прежнему выполняется downloadBlob. Обе кнопки экспорта разделяют
статус операции, поэтому параллельные экспорты не запускаются.
Контракты и результаты: [v0.2](test/v02.md).

## Ручное выделение

В entities/sprite добавлена чистая геометрия `selectionRect` и типы
`ImagePoint`/`CropRect`. Feature select-sprite содержит `useRegionSelection`:
захват указателя, преобразование координат, черновик и отмена жеста.
Сессия `useEditor` хранит режим и завершённую область, связывает её с Preview
и существующим экспортом PNG. SpriteCanvas рисует черновик поверх исходника.
Feature export-sprites выбирает имя `selection.png` для ручной области.
Зависимости FSD сохранены. [Поведение и проверки](manual-selection.md).

## Список ручных вырезок

`SpriteFrame` описывает публичный кадр: строковый ID, имя и rect.
`GridFrame` и `NamedSpriteFrame` также используют строковый ID. Числовой
`displayNumber` нужен только для подписей, порядка и friendly filename.
`SpriteThumbnail` рисует вырезку из исходного изображения без Blob/Object URL.
Новая feature `manage-manual-frames` показывает список и отправляет события
добавления, переименования и удаления по строковому ID. Состояние списка и следующий номер принадлежат
`useEditor`; feature не импортирует select-sprite или export-sprites.

`ExportButton` использует общий статус операции для текущей области и списка.
`exportFramesZip` принимает также именованные кадры, нормализует имена и устраняет
совпадения через `frameFileNames`. Старый экспорт сетки сохраняет прежние имена.
Список хранит геометрию исходника, PNG создаются только при экспорте.

## Панель инструментов

`EditorSidebar` внутри widget собирает загрузку, `SpriteCanvasTools`, настройки
сетки, Preview, Add frame и экспорт. `SpriteCanvasTools` принадлежит feature
select-sprite и управляет режимом, массовым выбором и масштабом через callbacks.
`SpriteCanvas` отвечает за отрисовку и жесты. Единственное состояние `viewport`
находится в `useEditor`, чтобы холст и вынесенные кнопки использовали один масштаб
и сдвиг. Загрузка источника сбрасывает вид; переключение режима его сохраняет.

На desktop панель закреплена слева, инструменты прокручиваются внутри неё,
экспорт остаётся внизу. На узком экране панель располагается над холстом,
Hide tools / Show tools сворачивают инструменты без сброса данных.
Список сохранённых кадров остаётся под холстом. [Инструкция по вырезке](manual-selection.md).

## External API (FEAT-001)

`SpriteEditor` создаёт `SpriteEditorSession` с key по внешнему `image.src`.
Внутри сессии `useEditor` владеет изображением, domain-коллекцией `sprites` и
отдельными session-полями. Новые объекты props с тем же src не сбрасывают изменения.
Входные URL принадлежат хосту; локальные object URL — загрузчику.

`createSpriteEditorResult`, нормализация сетки/ручных рамок, rename/delete находятся
в чистом domain. Save/Cancel компонует widget через `actions` в сайдбаре.
Экспорт файлов остаётся отдельной feature. Родитель получает проверенный снимок
с именами и ID, без браузерных ресурсов, UI-состояния и решения о месте хранения.
Кадры initialData, ручные вырезки и сохранённые при смене режима ячейки образуют
одну коллекцию; карточки видны в обоих режимах.

[Контракт и пограничные случаи](features/sprite-editor-embedding.md).

## Forge2D Asset Model (FEAT-002)

`entities/project` не импортирует Sprite Editor и содержит собственные
`AssetRect`/`AssetSpriteFrame`. `features/manage-sprite-asset` является явной
границей: он импортирует project domain и sprite domain, преобразует результат
Save в SpriteAsset и готовит image/initialData для открытия.

Project изменяется immutable-операциями и пока хранится только в памяти host.
Тестовый `AssetHost` монтирует SpriteEditor с key по SpriteAsset ID, поэтому два
assets одного атласа не разделяют session state. [Полный контракт](features/forge2d-asset-model.md).

## Состояние сессии редактора

Стабильное состояние находится в `EditorState` и изменяется только через
`editorSessionReducer`. В reducer нет React, DOM-загрузки, скачиваний и вызовов
хоста, поэтому переходы тестируются напрямую. `useEditor` оставляет локальными
только состояние внешних асинхронных операций и служебные реестры: текущий запрос,
ошибки UI, Save, последовательность загрузок и таблицы стабильных ID.

Единое правило занятости — `isEditorBusy(state, saving)`: редактор занят во время
Save или экспорта. `actionRunning` остаётся синхронным предохранителем двойного
Save до следующего React render и не является отдельным UI-состоянием.

Три React `key` являются осознанными границами жизненного цикла:

- `SpriteEditorSession` получает key по внешнему `image.src`. Смена источника
  создаёт новую сессию и отменяет старую загрузку; тот же src сохраняет правки.
- `SpriteCanvas` получает key по `sheet.url`. Новый источник очищает локальный
  draft жеста, клавиатурный фокус кадра и состояние pan.
- `ExportButton` получает key по `sheet.url`. Новый источник очищает локальную
  ошибку и статус завершённого экспорта; состояние общей сессии меняется через
  `onExportingChange`.

Эти key не используются для обычного обновления сетки, режима или коллекции,
поэтому такие изменения не размонтируют компоненты и не скрывают переходы reducer.
[Подробный поток](data-flow.md#2-владельцы-состояния).

## Изоляция стилей

Стили редактора лежат в `widgets/sprite-editor/ui/SpriteEditor.css` и подключаются
самим `SpriteEditorView`. Каждый селектор начинается с корня `.sprite-editor`, поэтому
редактор не меняет разметку хоста. Локальный reset `.sprite-editor :where(*) { all: revert }`
снимает с элементов редактора типовые правила хоста (`*`, `button`, `p`…): его
специфичность (0,1,0) выше, чем у них, а собственные правила редактора (от (0,1,1))
перекрывают сам reset. Шрифт, цвет, фон и `color-scheme` заданы на корне явно и не
наследуются из `body` хоста.

`src/index.css` — только оболочка standalone-приложения (`:root`, `body`). Тестовые хосты
его не подключают: у них собственный конфликтующий `tests/fixtures/host.css`.

Выбран namespace, а не CSS Modules: он не требует переписывать `className` в features.
Shadow DOM не используется — реальный хост его пока не требует. Ограничение: имена классов
редактора (`.panel`, `.muted`…) не уникальны, и классовое правило хоста с тем же именем
может изменить свойства, которые редактор сам не задаёт. Переход на CSS Modules
закроет это, когда появится package boundary или реальный конфликт.

## Расположение документации

Общие документы находятся непосредственно в `docs/`: архитектура, поток данных,
TypeScript, MVP и интеграция. Каноническое описание интеграции —
[ecosystem-integration.md](ecosystem-integration.md); исходная спецификация —
[forge2d-sprite-editor-integration-spec.md](forge2d-sprite-editor-integration-spec.md).
`docs/features/` содержит контракты возможностей, `docs/test/` — руководство и
историю тестирования, `docs/tasks/` — задания. Дублирующий каталог `docs/docs/`
удалён; описание панели остаётся в разделе «Панель инструментов» этого документа.
