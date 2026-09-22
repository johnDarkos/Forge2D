# Поток данных Sprite Cutter

Документ описывает текущую реализацию: сетку с Offset/Gap, ручное выделение,
список именованных кадров, сайдбар, Zoom/Pan, экспорт PNG/ZIP и внешний API FEAT-001.
Все изображения обрабатываются в браузере. Сессия хранится в памяти;
перезагрузка страницы очищает её. Backend и сохранение проекта не реализованы.

Связанные документы: [архитектура FSD](architecture.md),
[типы](typescript.md),
[ручное выделение](manual-selection.md), [тестирование](test/testing.md).

## 1. Общая схема

Данные идут вниз через props, действия возвращаются вверх через callbacks.
Стабильным состоянием сессии владеет `editorSessionReducer`, а `useEditor`
координирует его с браузерными операциями и вызывается компонентом `SpriteEditor`.
`App` и `EditorPage` только подключают редактор.

```text
App / внешний React-хост → SpriteEditor → SpriteEditorSession
                      │
                   useEditor ← callbacks от компонентов
                      ↕ dispatch / EditorState
              editorSessionReducer
                      │
               SpriteEditorView
                      │
          ┌───────────┴────────────────────┐
          ▼                                ▼
     EditorSidebar                  Рабочая область
     ├─ SpriteUploader              ├─ SpriteCanvas
     ├─ SpriteCanvasTools           │  исходник, сетка или рамка
     ├─ GridSettings                └─ ManualFrames
     │  только режим grid              список ручных вырезок
     ├─ SpritePreview                  └─ SpriteThumbnail
     ├─ Add frame                      миниатюры из исходника
     │  только режим manual
     ├─ Save / Cancel → onSave(result) / onCancel()
     └─ ExportButton
          ├─ PNG → exportFrame → downloadBlob
          └─ ZIP → exportFramesZip → downloadBlob
```

Features не импортируют друг друга. Widget связывает загрузку, выбор,
управление списком и экспорт. Чистая геометрия находится в `entities/sprite`.
Ни Preview, ни экспорт не читают пиксели рабочего Canvas с подсветкой:
оба используют исходный `HTMLImageElement` и координаты вырезки.

## 2. Владельцы состояния

### Сессия: reducer и useEditor

`EditorState` хранится в `useReducer(editorSessionReducer, initial)`:

- `source`: `idle`, `loading`, `ready` или `error`. В `ready` находится `sheet`
  с Image, URL и метаданными. Для локальной загрузки есть File, для внешнего URL file = null.
- `frameSizeInput`: строки ширины и высоты ячейки.
- `gridOptionsInput`: строки Offset X/Y и Gap X/Y.
- `selectionMode`: `grid` или `manual`.
- `selectedIds` и `activeFrameId`: выбор ячеек и кадр для Preview в режиме сетки.
- `manualRegion`: завершённая ручная область или `null`.
- `sprites`: единая коллекция публичных `SpriteFrame` — строковый ID, имя и rect.
- `displayNumbers`: соответствие строковых ID номерам карточек и friendly filename.
- `nextDisplayNumber`: следующий номер карточки; удаление не уменьшает его.
- `viewport`: `{ zoom, x, y }` — масштаб и сдвиг отображения.
- `isDrawing`: выполняется ли ручной жест.
- `isExporting`: сигнал от экспортёра для блокировки изменений сессии.

Reducer принимает явные события изменения источника, сетки, выбора, режима,
ручных кадров, viewport и статусов взаимодействия. Он не выполняет I/O и не
вызывает callbacks. Изменения сетки централизованно очищают выбор, смена источника
сбрасывает принадлежащие источнику данные, а UI-номера не переиспользуются.

Отдельно внутри `useEditor` находятся запрос загрузки `request`, счётчик запросов
`sequence`, ошибка проверки файла `uploadError`, состояние Save, ошибка callbacks
и реестры идентичности кадров. Чистые сохраняемые данные отделены от session-полей
при вызове createSpriteEditorResult; сама функция не зависит от React.

`isEditorBusy(state, saving)` — единое производное правило занятости: Save или
экспорт блокируют изменения сессии. Обработчики переходов используют общий
`dispatchWhenIdle`. Ref `actionRunning` закрывает только короткое окно между двумя
синхронными кликами Save и обновлением React-состояния.

### Производные данные

`useEditor` рассчитывает их из состояния, а не хранит отдельные изменяемые копии:

```text
source.ready → sheet
sheet + frameSizeInput + gridOptionsInput → validateGrid
валидная сетка → generateFrames → geometry
geometry + selectedIds → frames с флагом selected → selectedFrames
sprites + displayNumbers → savedFrames для карточек и PNG/ZIP
manualRegion → SpriteRect для Preview и exportFrame без ID
режим + выбор → preview.frame и exportButton.frames
```

В ручном режиме текущая область остаётся обычным `SpriteRect` без ID. ID создаётся
только при Add frame, когда область становится элементом коллекции.
Количество кадров и подписи состояния также вычисляются из текущих данных.

### Локальное состояние компонентов

- `useRegionSelection`: начальная точка, pointer ID и черновик рамки. Завершённая
  область передаётся в сессию через `onRegionChange`.
- `SpriteCanvas`: клавиатурный фокус, ID навигации и начало жеста Pan.
  Сам масштаб и сдвиг находятся в `useEditor.viewport`.
- `EditorSidebar`: только флаг `collapsed` для узкого экрана. Скрытие инструментов
  через CSS не размонтирует компоненты и не сбрасывает сессию.
- `ExportButton`: состояние выполнения и ошибка экспорта, защита от повторного
  запуска и признак размонтирования. `onExportingChange` сообщает статус сессии.

### Границы размонтирования

`key` применяются только при смене источника или внешней asset-сессии:

| Компонент             | Key                                   | Что сбрасывается                            | Почему это граница жизненного цикла                                           |
| --------------------- | ------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------- |
| `SpriteEditorSession` | внешний `image.src` либо `standalone` | весь reducer, запрос и реестры ID           | новый внешний источник начинает независимую сессию; прежний effect отменяется |
| `SpriteCanvas`        | `sheet.url` либо `empty`              | draft выделения, локальный focus и pan-жест | эти данные относятся к конкретному декодированному изображению                |
| `ExportButton`        | `sheet.url` либо `empty`              | локальный статус и ошибка экспорта          | результат и ошибка старого источника не переносятся на новый                  |

Сетка, режим, viewport и список кадров key не меняют. Их жизненный цикл выражен
событиями reducer, поэтому скрытого remount-reset для обычного редактирования нет.

## 3. Загрузка изображения

```text
Внешний image.src ─────────────────────┐
Tools / Image → onFileSelected(File) ──┘
  → source.loading + новый request
  → useEffect: object URL + Image
  → onload → source.ready(sheet)
  → Canvas, расчёт сетки, доступные инструменты
```

1. Uploader проверяет MIME: PNG, JPEG или WebP. Отмена диалога ничего не меняет.
   Неподдерживаемый файл вызывает `onError`; текущий источник остаётся в сессии.
2. Принятый файл сразу очищает выбор сетки, ручную область и список вырезок,
   сбрасывает ID списка, `isDrawing` и вид до `{ zoom: 1, x: 0, y: 0 }`.
   Режим и введённые параметры сетки сохраняются.
3. Эффект создаёт object URL, устанавливает обработчики Image и присваивает `src`.
4. Успешная загрузка сохраняет `naturalWidth/naturalHeight` и ресурс изображения.
   При ошибке источник получает статус `error`, URL освобождается.
5. Очистка эффекта помечает предыдущий запрос отменённым. Поздний `onload`
   старого файла не может перезаписать новую загрузку.

### Внешний источник и initialData

Если передан `image`, он загружается автоматически, а file picker заблокирован.
`SpriteEditorSession` имеет key по `image.src`: смена src размонтирует старую
сессию и создаёт новую с актуальными initialData. Одинаковый src сохраняет правки,
даже если родитель передаёт новые объекты props; для принудительной повторной
инициализации того же src используется React key на SpriteEditor.

Начальные sprites и grid копируются. После декодирования проверяются ID,
прямоугольники и заданные grid settings. Ошибка инициализации отображается в UI
и блокирует Save. В standalone initialData применяется к первому локальному файлу.
Последующие локальные файлы очищают кадры; удаление image prop возвращает новую
standalone-сессию. Внешний blob URL редактор не отзывает.

HTTP(S) загружается с anonymous CORS; сервер должен разрешать чтение изображения.
MIME/размер внешнего файла неизвестны (null), размеры source берутся из Image.

## 4. Сайдбар и управление видом

`EditorSidebar` получает подготовленные `uploader`, `settings`, `canvas`,
`preview`, `manualFrames` и `exportButton` из `SpriteEditorViewProps`.
Он размещает инструменты, но не рассчитывает геометрию и не копирует состояние.

```text
SpriteCanvasTools: Zoom / Reset view ──┐
                                      ├─ onViewportChange → useEditor.viewport
SpriteCanvas: Pan средней кнопкой ─────┘                          │
                                                                ▼
                                    props → CSS translate/scale на Canvas
```

Zoom ограничен диапазоном 25–800%. Reset view возвращает 100% и нулевой сдвиг,
не меняя выбранные кадры. Переключение режима сохраняет вид; новый файл сбрасывает.
Процент в панели и преобразование Canvas читают один `viewport`.

Координаты событий переводятся из экрана в исходные пиксели с учётом текущего
`getBoundingClientRect()`, который уже включает масштаб и сдвиг:

```text
imageX = (clientX - rect.left) × imageWidth  / rect.width
imageY = (clientY - rect.top)  × imageHeight / rect.height
```

Поэтому увеличение картинки не увеличивает размеры экспортируемого PNG.
Во время ручного жеста изменение режима и вида блокируется до завершения
или отмены через Escape. Сворачивание панели меняет только её видимость.

## 5. Режим сетки

### Настройки и геометрия

`GridSettings` вызывает `onFrameWidthChange`, `onFrameHeightChange` и
`onSpacingChange`. Значения сохраняются строками, затем проверяются `validateGrid`:
ширина/высота — целые положительные числа, смещения/промежутки — целые неотрицательные.
Изменение поля очищает `selectedIds` и `activeFrameId`.

Для допустимых параметров `generateFrames` рассчитывает полные ячейки:

```text
columns = max(0, floor((imageWidth  - offsetX + gapX) / (frameWidth  + gapX)))
rows    = max(0, floor((imageHeight - offsetY + gapY) / (frameHeight + gapY)))
id = "grid-{x}-{y}-{frameWidth}-{frameHeight}"
displayNumber = row × columns + column + 1
x  = offsetX + column × (frameWidth + gapX)
y  = offsetY + row    × (frameHeight + gapY)
```

Неполные края не становятся кадрами. При невалидной сетке UI показывает ошибку,
выбор ячеек и их экспорт недоступны. Ручное выделение от валидности сетки не зависит.

### Выбор и Preview

```text
Клик / Enter / Space → SpriteCanvas.onFrameClick(id)
  → useEditor переключает ID в selectedIds
  → frames.selected + selectedFrames
  → Canvas: подсветка
  → SpritePreview: выбранный activeFrameId
  → ExportButton: selectedFrames
```

Canvas ищет попадание в готовые прямоугольники: Offset, Gap и неполные края
не выбираются. Стрелки перемещают клавиатурный фокус; Enter/Space переключают кадр.
Новый выбранный кадр становится активным. Повторный выбор снимает выделение;
если удалён активный кадр, Preview очищается, остальные выбранные ID сохраняются.

Select All выбирает все полные ячейки, сохраняя текущий активный кадр.
Clear Selection очищает и набор, и активный кадр.

## 6. Ручная рамка и список вырезок

### От жеста до завершённой области

```text
Select region → selectionMode = manual
Pointer down → захват указателя, начальная точка, onDrawingChange(true)
Pointer move → selectionRect → локальный draft → рамка на Canvas
Pointer up   → onDrawingChange(false) + onRegionChange(CropRect)
             → useEditor.manualRegion → Preview и Download PNG
```

`selectionRect` нормализует направление, ограничивает прямоугольник размерами
изображения и округляет внешние границы до целых пикселей: левую/верхнюю вниз,
правую/нижнюю вверх. Клик или линия без площади не заменяют прежнюю область.
Escape, pointer cancellation и потеря захвата удаляют черновик, сохраняя
предыдущую завершённую область. Во время рисования Preview остаётся на ней;
экспорт и Add frame недоступны.

### Добавление, имя и удаление

```text
Add frame в сайдбаре → manualFrames.onAdd
  → manualFrameToSprite: rect + уникальный строковый ID + имя frame_NNN
  → sprites + displayNumbers, следующий UI-номер, manualRegion = null
  → ManualFrames под холстом → SpriteThumbnail из исходного Image

Поле имени → onRename(id, name) → renameSprite → новый объект в sprites
Remove     → onRemove(id)       → removeSprite → коллекция без указанного ID
```

Новая рамка не изменяет добавленные вырезки. ID и порядок оставшихся кадров
сохраняются при удалении; имена не перенумеровываются. Переименование меняет
только имя. Экспорт не очищает список.

В коллекцию также входят initialData.sprites и выбранные ячейки сетки при переходе
в manual. Они отображаются теми же карточками в обоих режимах. gridFrameToSprite
преобразует ячейку в тот же публичный формат; совпадение с rect имеющегося кадра
использует его ID и имя. UI-номера карточек не попадают в публичный результат.

## 7. Preview и экспорт PNG/ZIP

`SpritePreview` рисует область исходного Image через девятиаргументный `drawImage`.
`SpriteThumbnail` делает то же для каждого кадра списка. При отсутствии текущего
кадра Preview показывает подсказку; сохранённые миниатюры остаются.

Источник данных зависит от режима и кнопки:

- **Grid / Export selected**: `selectedFrames` → отдельные `frame_NNN.png`.
- **Grid / Export ZIP**: `selectedFrames` → один архив.
- **Manual / Download PNG**: только `manualRegion` → `selection.png`.
- **Manual / Export ZIP**: только `savedFrames` → один архив. Текущая область,
  не добавленная через Add frame, в архив не входит.

Пустой соответствующий выбор блокирует кнопку. Для ручного ZIP текущая рамка
не требуется. Для сетки дополнительно нужна валидная геометрия.

```text
ExportButton → снимок выбранного списка, сортировка по displayNumber
  → running = true, onExportingChange(true)
  → exportFrame(Image, frame)
      → временный Canvas размером width × height
      → drawImage: исходная область → (0, 0, width, height)
      → toBlob(image/png)
  ├─ PNG → downloadBlob для каждого результата
  └─ ZIP → PNG bytes → fflate.zipSync (STORE) → ZIP Blob → downloadBlob
  → finally: снять блокировку
```

Сетка, подсветка и масштаб просмотра не попадают в PNG. Сохраняются исходные
пиксели и прозрачность; фон автоматически не удаляется.

Архив называется `<имя исходника без расширения>_sprites.zip`.
`frameFileNames` формирует плоские имена PNG: заменяет недопустимые символы,
подставляет номер при пустом имени, обрабатывает зарезервированные имена.
Совпадения без учёта регистра получают суффиксы: `idle.png`, `idle_2.png`.
Текст в полях не переписывается. Номер сетки 11 соответствует `frame_011.png`;
строковый ID остаётся внутренней идентичностью кадра.

Во время экспорта UI блокирует загрузку, смену режима, поля сетки, изменение
выбора, добавление, переименование и удаление кадров. Снимок экспорта не зависит
от отображения; Zoom/Pan могут менять вид, не затрагивая координаты вырезок.

Ошибка показывается в ExportButton, выбор и список сохраняются для повтора.
При ошибке любого PNG частичный ZIP не скачивается. В режиме отдельных
скачиваний уже полученные файлы не откатываются. После размонтирования
экспортёр не начинает новые скачивания, хотя начатое кодирование может завершиться.

## 8. Правила сброса

- **Новый поддерживаемый файл**: очищает оба вида выбора и список, сбрасывает ID
  списка, жест и viewport. Режим и параметры сетки остаются.
- **Смена режима**: перед переходом из grid выбранные ячейки добавляются в sprites;
  текущий выбор сетки и ручная рамка очищаются. Коллекция, параметры сетки и viewport
  остаются. Нажатие уже активного режима ничего не меняет.
- **Изменение сетки**: очищает текущий выбор ячеек и активный кадр, но не коллекцию.
- **Clear region**: очищает только текущую ручную область.
- **Add frame**: добавляет её копию в список и очищает текущую область.
- **Escape во время жеста**: отменяет черновик, сохраняя прежнюю область и список.
- **Reset view**: сбрасывает только масштаб и сдвиг.
- **Hide tools / Show tools**: меняет только видимость инструментов на узком экране.
- **Перезагрузка страницы**: создаёт новую сессию без сохранённых данных.

## 9. Жизненный цикл ресурсов

- Object URL исходного файла создаётся эффектом загрузки. Освобождается при ошибке,
  замене запроса или размонтировании; очистка эффекта также снимает обработчики Image.
- Рабочий Canvas, Preview и миниатюры принадлежат React-компонентам. Их содержимое
  перерисовывается из исходника; смена источника пересоздаёт SpriteCanvas через key.
- Захват указателя освобождается при завершении или отмене ручного жеста.
- Временные Canvas и PNG Blob создаются экспортёром. После окончания операции
  и удаления ссылок их память может освободить браузер.
- `downloadBlob` создаёт object URL и временную ссылку, инициирует скачивание,
  затем в `finally` удаляет ссылку и освобождает URL после следующей задачи браузера.

## 10. Сквозной пример

```text
Загрузить test.png → Select region
  → обвести персонажа → Preview → Add frame → sprites[0]
  → имя idle
  → обвести следующего → Add frame → sprites[1]
  → имя idle
  → Export ZIP
  → test_sprites.zip: idle.png + idle_2.png
```

Обе записи содержат пиксели соответствующих областей исходника. Панель и Canvas
могут отображаться в другом масштабе — геометрия сохранённых кадров остаётся прежней.

## 11. Save и Cancel

```text
Save в EditorSidebar → actions.onSave
  → снимок sprites + текущих выбранных ячеек grid (без повторения ID)
  → createSpriteEditorResult: валидация и копирование разрешённых полей
  → { source: { width, height }, sprites: [{ id, name, rect }], settings }
  → внешний onSave(result)

Cancel → actions.onCancel → внешний onCancel()
```

Кнопки отображаются при наличии соответствующих callbacks. Save недоступен
без готового изображения, при невалидной сетке в grid-режиме, во время жеста,
экспорта и предыдущего Save. Ручную рамку перед Save нужно добавить или очистить.
Пустой массив sprites допустим. Для manual результат не содержит settings.grid.
В результате нет File, Image, URL, selected, временной рамки, zoom/pan или sidebar.

Хост получает независимые вложенные объекты и не может их изменением испортить
редактор. Если onSave возвращает Promise, редактор ожидает завершения и блокирует
изменения кадров/источника, PNG/ZIP и повторные Save/Cancel. Ошибки callbacks
перехватываются, показываются в UI и допускают повтор. Завершение старого callback
после смены src не меняет новую сессию. Cancel не закрывает страницу и не сбрасывает
данные: действие определяется хостом. Save не создаёт файлов и не вызывает downloadBlob.

## 12. Проверки и граница Forge2D

`src/test/mvp` проверяет базовый поток, `src/test/v02` — Offset/Gap, Zoom и ZIP,
`src/test/manual` — геометрию рамки, список, имена, блокировки и ошибки.
Моки проверяют вызовы и события, но не доказывают правильность настоящих PNG.

Playwright в `tests/browser` проверяет пиксели реального `test.png`, в том числе
после Zoom/Pan и внутри ZIP. `sidebar.spec.ts` проверяет сайдбар на 1280 и 390 px,
клавиатуру, сворачивание и отсутствие горизонтального переполнения.
Команды и ограничения приведены в [руководстве тестирования](test/testing.md).

FEAT-001 реализует публичный результат и его передачу через onSave. Начальные
данные и изображение приходят от хоста; Project Store и сохранение проекта
по-прежнему не входят в SpriteEditor. API проверяется в src/test/embedding,
браузерный хост — tests/fixtures/embedded.html, сценарии — tests/browser/embedding.spec.ts.
Подробности: [контракт FEAT-001](features/sprite-editor-embedding.md) и
[граница интеграции](ecosystem-integration.md).

## 13. Forge2D Asset Model

```text
Project.assets
  → findSpriteAsset + findTextureAsset
  → spriteAssetToEditorInput
  → { image, initialData }
  → <SpriteEditor key={spriteAsset.id}>

Save(result)
  → host try/catch
  → spriteEditorResultToSpriteAsset
  → проверка source против TextureAsset
  → upsertProjectAsset
  → новый immutable Project
```

`key` связан с ID SpriteAsset, а не URI текстуры. Поэтому переключение между
idle/run assets одного атласа создаёт отдельные сессии. Ошибку адаптера отображает
host: исключение, выпущенное наружу из `onSave`, редактор заменил бы общей ошибкой.
В production persistence пока отсутствует. [Контракт FEAT-002](features/forge2d-asset-model.md).
