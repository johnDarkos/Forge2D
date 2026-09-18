# Архитектура MVP: FSD

Рабочий MVP построен по FSD. Поток данных описан в [data-flow.md](data-flow.md),
контракты TypeScript — в [typescript.md](typescript.md).

| Слой / слайс                 | Модули                                                            | Ответственность                                           |
| ---------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------- |
| app                          | App                                                               | Подключение страницы                                      |
| pages/editor                 | EditorPage                                                        | Рабочий экран                                             |
| widgets/sprite-editor        | useEditor, SpriteEditor, SpriteEditorView                         | Ресурс изображения, состояние сессии, связывание features |
| features/upload-sprite-sheet | SpriteUploader                                                    | Выбор и проверка MIME файла                               |
| features/configure-grid      | GridSettings                                                      | Управляемые поля размера и сообщения валидации            |
| features/select-sprite       | SpriteCanvas                                                      | Отрисовка сетки, выбор мышью и клавиатурой                |
| features/export-sprites      | ExportButton, exportFrame, downloadBlob                           | Нарезка исходника, PNG, отдельные скачивания              |
| entities/sprite              | SpritePreview, generateFrames, validateGrid, isSupportedImageType | Сущность кадра и её независимая логика                    |

Зависимости направлены вниз: app → pages → widgets → features → entities.
Слайсы одного слоя не импортируют друг друга; внешний код использует `index.ts`.
Shared пока не нужен: предметная логика размещена в соответствующих слайсах.
Это соответствует [правилам публичного API FSD](https://fsd.how/docs/reference/public-api/).

`src/main.tsx` подключает App. SpriteEditor получает состояние и обработчики
из useEditor, затем передаёт их внутреннему SpriteEditorView. Модель хранит
исходные значения, а кадры, selected и счётчики вычисляются. Effect загрузки
освобождает URL и игнорирует результат отменённого запроса.

ExportButton владеет статусом экспорта, передаёт isExporting в редактор и
фиксирует выбранные кадры на старте. Смена файла, размеров и выделения
блокируется до завершения операции. PNG создаётся из Image, а не рабочего
canvas; линии сетки не попадают в скачанный файл.

Тестовые загрузчики contracts.ts обращаются к публичным API entities/sprite
и features/export-sprites. Изначально предложенные пути shared/utils заменены
при реализации FSD без ослабления поведенческих проверок.

## Граница будущей интеграции

SpriteEditor уже является самостоятельным UI-модулем; App/EditorPage остаются
standalone shell. Domain API `entities/sprite/domain.ts` импортирует только чистые
типы и функции. DOM-ресурсы выделены в `model/browser-types.ts`; прежний UI API
сохранён. Результат интеграции описан типами SpriteEditorSource/SpriteEditorResult,
без selected и браузерных объектов. Save-flow не добавлен; v0.2 реализован отдельным этапом.
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

`NamedSpriteFrame` в entities/sprite добавляет имя к геометрии кадра.
`SpriteThumbnail` рисует вырезку из исходного изображения без Blob/Object URL.
Новая feature `manage-manual-frames` показывает список и отправляет события
добавления, переименования и удаления. Состояние списка и следующий ID принадлежат
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
Список сохранённых кадров остаётся под холстом. [Инструкция](toolbar.md).
