# FEAT-001 — External SpriteEditor API

Реализовано по [task-1](../tasks/task-1.md). SpriteEditor принимает изображение
и начальные метаданные, возвращает результат владельцу через Save и уведомляет
о Cancel. Сохранение проекта, маршрутизация, Asset Manager и persistence остаются
ответственностью внешнего приложения.

## Использование

```tsx
import { SpriteEditor, type SpriteEditorResult, type SpriteFrame } from '@/widgets/sprite-editor'

function Host({ imageUrl, sprites }: { imageUrl: string; sprites: SpriteFrame[] }) {
  const handleSave = (result: SpriteEditorResult) => {
    console.log(result) // Здесь хост обновляет собственные данные.
  }

  return (
    <SpriteEditor
      image={{ src: imageUrl, name: 'player.png' }}
      initialData={{ sprites, settings: { mode: 'manual' } }}
      onSave={handleSave}
      onCancel={() => console.log('cancel')}
    />
  )
}
```

Все props необязательны. `<SpriteEditor />` сохраняет прежнюю загрузку файлов
и экспорт PNG/ZIP. `initialFrameSize` также поддерживается; явные значения
`initialData.settings.grid` имеют приоритет над ним.
Save виден только при наличии `onSave`, Cancel — при наличии `onCancel`.

## Контракт данных

Публичный API widget экспортирует `SpriteEditorProps`, `SpriteEditorImage`,
`SpriteEditorInitialData`, `SpriteEditorResult`, `SpriteFrame`, `SpriteRect`,
`SpriteSource`, `SpriteGridSettings`, `SpriteEditorMode`.
Чистые типы и `createSpriteEditorResult` доступны также из entity domain API.

```ts
interface SpriteEditorImage {
  src: string
  name?: string
}
interface SpriteRect {
  x: number
  y: number
  width: number
  height: number
}
interface SpriteFrame {
  id: string
  name: string
  rect: SpriteRect
}
interface SpriteGridSettings {
  cellWidth: number
  cellHeight: number
  offsetX: number
  offsetY: number
  gapX: number
  gapY: number
}
interface SpriteEditorResult {
  source: { width: number; height: number }
  sprites: readonly SpriteFrame[]
  settings: { mode: 'grid' | 'manual'; grid?: SpriteGridSettings }
}
```

В реализации поля readonly: редактор не меняет входные объекты. Результат —
новый независимый снимок, включая вложенные rect, source и grid.
Он не содержит File, URL, Image, Canvas, selected, zoom, pan или состояния панели.
В manual-режиме `settings.grid` отсутствует. Имя источника не входит в результат;
хост уже владеет изображением и его идентичностью.

## Инициализация и смена источника

- `image.src` загружается автоматически. Поддерживаются blob/data/http/https,
  а также относительные URL. Для HTTP(S) используется `crossOrigin = 'anonymous'`:
  удалённый сервер должен разрешать CORS, иначе показывается ошибка загрузки.
- Пока есть `image`, file picker заблокирован: внешнее изображение имеет приоритет.
- Новое значение `image.src` создаёт новую сессию, сбрасывает viewport/жесты/выбор
  и применяет переданные для этого источника `initialData`.
- Новые объекты props с тем же src не перезаписывают пользовательские изменения.
  `initialData` — начальное, а не управляемое состояние. Для повторной инициализации
  того же src хост может изменить React `key` редактора.
- Удаление prop `image` создаёт новую standalone-сессию. В standalone initialData
  применяется к первому принятому локальному файлу; последующие загрузки очищают кадры.
- Переданные кадры копируются, а после декодирования проверяются по реальным
  размерам изображения. Ошибочные ID, rect, mode или заданные grid settings
  дают сообщение Invalid initial data и блокируют Save; кадры не обрезаются молча.
- URL, созданные редактором для локальных File, освобождаются им. Внешние URL,
  включая blob URL, не отзываются редактором: ими владеет родитель.
- Поздняя загрузка старого src не может перезаписать новый. Незавершённый Save
  старой сессии не меняет состояние новой.

## Какие кадры сохраняются

Редактор хранит единую коллекцию `sprites` для импортированных и добавленных
кадров. Она доступна для переименования и удаления в обоих режимах.

- В **grid** Save объединяет коллекцию с текущими выбранными ячейками.
  Новые ячейки идут в row-major порядке. Переход из grid в manual переносит
  выбранные ячейки в коллекцию, чтобы они не потерялись при добавлении ручных кадров.
- В **manual** Save возвращает коллекцию. Рамку сначала нужно добавить через
  Add frame или очистить: пока она не добавлена, Save заблокирован с подсказкой.
- Если ячейка совпадает с rect уже существующего кадра, используется его ID
  и имя; повторной записи не возникает. При совпадении нескольких rect используется
  первый кадр коллекции. Явно импортированные дубликаты геометрии не удаляются.
- Clear Selection очищает текущий выбор сетки, но не удаляет ранее добавленные
  в коллекцию кадры. Для удаления кадра коллекции используется Remove.
- Смена размеров сетки очищает текущий выбор, но сохраняет коллекцию.
- Удаление убирает кадр из результата, а также снимает выбор совпадающей ячейки.
- Пустая коллекция допустима: Save может вернуть `sprites: []`, например после
  удаления всех кадров. Для Save нужны готовый источник и валидные настройки
  текущего режима, не требуется хотя бы один кадр.

Строковые ID не меняются при rename, удалении соседей, Zoom/Pan или повторном
выборе той же ячейки. Идентичность новых ячеек учитывает их rect, а не позицию
в массиве. Коллизии с импортированными ID разрешаются без перезаписи.
Числа в подписях карточек — отдельные стабильные UI-номера, не domain ID.

## Save, Cancel и экспорт

`createSpriteEditorResult` проверяет целые положительные размеры источника,
уникальные непустые ID, имена-строки и rect в границах изображения. Координаты
должны быть целыми неотрицательными, размеры rect — целыми положительными.
В grid-режиме проверяются размеры ячеек, смещения и промежутки.

Save вызывает `onSave(result)` один раз и не запускает скачивание. Синхронные
ошибки и rejected Promise обрабатываются сообщением с возможностью повтора.
Если обработчик возвращает Promise, редактор ожидает его: повторный Save,
Cancel, изменение кадров и файловый экспорт временно блокируются.

Cancel только вызывает `onCancel()` и не закрывает страницу, не меняет маршрут
и не сбрасывает сессию. Реакцию определяет хост. Ошибки callback показываются в UI.

PNG/ZIP продолжают работать отдельно. В grid они экспортируют выбранные ячейки;
в manual PNG экспортирует текущую рамку, ZIP — коллекцию. Добавленные из grid
кадры входят в этот ZIP наравне с ручными.

## Совместимость типов

Предварительный `SpriteEditorResult { source, frames }` заменён утверждённым
FEAT-001 контрактом `{ source, sprites, settings }`. Прежний тип ячейки с числовым
ID и selected переименован в `GridFrame`. Новый `SpriteFrame` — публичная доменная
сущность со строковым ID. `generateFrames` и `exportFrame` сохранили поведение
и геометрию; старые тесты используют GridFrame без изменения ожиданий.
`SpriteEditorSource` сохранён как прежний тип описания файла, но не используется
в новом результате; актуальный тип источника результата — `SpriteSource`.

## Проверки и ограничения

`src/test/embedding` проверяет чистый результат, нормализацию обоих способов
нарезки, rename/delete, валидацию, инициализацию, владение URL, гонки загрузки,
Save/Cancel, ошибки callback и изоляцию состояния от мутаций потребителя.
Первый RED-прогон: 18 новых тестов падают. После реализации добавлены также
проверки асинхронного Save и возврата к standalone.

`tests/fixtures/embedded.html` — тестовый хост. Он не входит в production-сборку.
На запущенном Vite его можно открыть по `/tests/fixtures/embedded.html`.
`tests/browser/embedding.spec.ts` проверяет смешанный Save flow, rename/delete,
Cancel, замену источника и реальные data/HTTPS изображения с PNG-экспортом.
HTTPS-ответ отдаётся локальным перехватчиком Playwright с CORS-заголовком.

```sh
pnpm exec vitest run src/test/embedding
pnpm exec playwright test tests/browser/embedding.spec.ts
```

Подключение к самому Forge2D Project Store, Asset Model и persistence не входят
в FEAT-001. Компонент React готов к встраиванию; текущие общие стили приложения
пока не изолированы отдельным CSS-пакетом или Shadow DOM.
