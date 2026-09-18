# Sprite Cutter — техническое задание MVP

## 1. Название проекта

**Sprite Cutter**

Веб-приложение для загрузки sprite sheet изображения, разметки его по сетке и нарезки на отдельные игровые спрайты.

---

# 2. Цель проекта

Создать браузерное приложение, в котором пользователь может:

1. загрузить изображение со sprite sheet;
2. указать размер одного кадра;
3. увидеть сетку кадров поверх изображения;
4. выбрать нужные кадры;
5. предварительно просмотреть выбранный кадр;
6. скачать выбранные кадры как отдельные PNG-файлы.

Основная цель MVP — реализовать полный рабочий сценарий:

```text
Upload image
      ↓
Configure grid
      ↓
Generate frames
      ↓
Select frames
      ↓
Preview
      ↓
Export PNG
```

---

# 3. Целевая аудитория

Разработчики игр, которым нужно быстро нарезать sprite sheet на отдельные изображения.

Пример:

Есть файл:

```text
player.png
```

размером:

```text
256 × 128 px
```

Каждый кадр:

```text
32 × 32 px
```

Приложение должно определить:

```text
8 колонок
4 строки
32 кадра
```

и позволить пользователю работать с этими кадрами.

---

# 4. Ограничения MVP

В первой версии НЕ реализуются:

- автоматическое определение спрайтов;
- упаковка PNG обратно в sprite sheet;
- animation timeline;
- collision boxes;
- pivot/origin;
- экспорт JSON;
- ZIP-архив;
- drag-and-drop кадров;
- сохранение проекта;
- backend;
- авторизация;
- облачное хранилище;
- история изменений;
- undo/redo.

MVP должен оставаться небольшим.

---

# 5. Технологический стек

## Основной стек

```text
React
TypeScript
Vite
pnpm
CSS
Canvas API
Browser File API
```

Backend отсутствует.

Вся обработка выполняется локально в браузере.

---

# 6. Создание проекта

```bash
pnpm create vite sprite-cutter --template react-ts

cd sprite-cutter

pnpm install

pnpm dev
```

---

# 7. Основной пользовательский сценарий

Пользователь открывает приложение.

На экране отображается:

```text
Sprite Cutter

[ Upload sprite sheet ]

No image loaded
```

Пользователь выбирает файл:

```text
player.png
```

После загрузки приложение показывает:

```text
player.png

256 × 128 px
```

Изображение отображается в рабочей области.

Пользователь вводит:

```text
Frame width: 32
Frame height: 32
```

Приложение рассчитывает сетку.

Получается:

```text
columns = 8
rows = 4
frames = 32
```

Поверх sprite sheet отображается сетка.

Пользователь нажимает на определённые кадры.

Например:

```text
frame 0
frame 1
frame 2
frame 3
```

Они выделяются.

Пользователь может выбрать один из них для preview.

После этого нажимает:

```text
Export selected
```

и получает PNG-файлы выбранных кадров.

---

# 8. Интерфейс

Примерная структура интерфейса:

```text
┌───────────────────────────────────────────────────────┐
│ Sprite Cutter                                        │
├───────────────────────────────────────────────────────┤
│                                                       │
│ [ Upload image ]                                      │
│                                                       │
│ player.png — 256 × 128                                │
│                                                       │
├──────────────────────────────────┬────────────────────┤
│                                  │ Settings           │
│                                  │                    │
│                                  │ Frame width        │
│                                  │ [32]               │
│            CANVAS                │                    │
│                                  │ Frame height       │
│                                  │ [32]               │
│                                  │                    │
│                                  │ Columns: 8         │
│                                  │ Rows: 4            │
│                                  │ Frames: 32         │
│                                  │                    │
├──────────────────────────────────┴────────────────────┤
│ Selected frames: 4                                   │
│                                                       │
│ [ Export selected ]                                  │
└───────────────────────────────────────────────────────┘
```

---

# 9. Функциональные требования

## FR-01 — загрузка изображения

Пользователь должен иметь возможность выбрать изображение через:

```html
<input type="file" />
```

Допустимые типы:

```text
image/png
image/jpeg
image/webp
```

Предпочтительный формат:

```text
PNG
```

Input должен ограничивать выбор изображениями.

Пример:

```html
accept="image/*"
```

---

# 10. FR-02 — получение файла

После выбора изображения приложение должно получить объект:

```ts
File
```

Необходимо сохранить минимум:

```ts
name
type
size
```

---

# 11. FR-03 — загрузка изображения в браузер

Из `File` необходимо создать локальный URL:

```ts
URL.createObjectURL(file)
```

После этого необходимо загрузить изображение.

Приложение должно получить:

```ts
naturalWidth
naturalHeight
```

Например:

```text
256 × 128
```

---

# 12. FR-04 — отображение информации о файле

После загрузки показать:

```text
File name
Image width
Image height
```

Пример:

```text
player.png
256 × 128 px
```

---

# 13. FR-05 — Canvas

Загруженное изображение должно отображаться через:

```html
<canvas></canvas>
```

Использовать:

```ts
CanvasRenderingContext2D
```

Изображение рисуется через:

```ts
drawImage()
```

---

# 14. FR-06 — параметры кадра

Пользователь должен иметь возможность задать:

```text
Frame width
Frame height
```

Оба значения:

- обязательные;
- целые;
- больше 0.

Например:

```text
Frame width: 32
Frame height: 32
```

---

# 15. FR-07 — расчёт сетки

Количество колонок:

```ts
columns = Math.floor(imageWidth / frameWidth)
```

Количество строк:

```ts
rows = Math.floor(imageHeight / frameHeight)
```

Количество кадров:

```ts
frames = rows * columns
```

---

# 16. FR-08 — генерация кадров

Для каждого кадра необходимо сформировать объект.

Тип:

```ts
type SpriteFrame = {
  id: number
  row: number
  column: number

  x: number
  y: number

  width: number
  height: number

  selected: boolean
}
```

Пример:

```ts
{
  id: 5,
  row: 0,
  column: 5,

  x: 160,
  y: 0,

  width: 32,
  height: 32,

  selected: false
}
```

---

# 17. FR-09 — вычисление координат

Для кадра:

```ts
x = column * frameWidth
```

```ts
y = row * frameHeight
```

Например:

```text
column = 3
row = 2

frameWidth = 32
frameHeight = 32
```

получаем:

```text
x = 96
y = 64
```

---

# 18. FR-10 — отображение сетки

Поверх изображения необходимо нарисовать линии сетки.

Вертикальные линии:

```text
0
32
64
96
128
...
```

Горизонтальные:

```text
0
32
64
96
...
```

Сетка должна соответствовать `frameWidth` и `frameHeight`.

---

# 19. FR-11 — выбор кадра

Пользователь должен иметь возможность кликнуть по области canvas.

Необходимо определить:

```text
какая колонка нажата
какая строка нажата
```

Формула:

```ts
column = Math.floor(mouseX / frameWidth)
```

```ts
row = Math.floor(mouseY / frameHeight)
```

После этого определить соответствующий кадр.

---

# 20. FR-12 — выделение кадра

После клика:

```ts
selected = true
```

Повторный клик:

```ts
selected = false
```

Выделенный кадр должен визуально отличаться.

Например:

```text
полупрозрачная заливка
```

или:

```text
рамка
```

---

# 21. FR-13 — выбор нескольких кадров

Пользователь может одновременно выбрать любое количество кадров.

Например:

```text
1
2
3
7
8
9
```

Приложение должно показывать:

```text
Selected: 6
```

---

# 22. FR-14 — предварительный просмотр кадра

После выбора кадра пользователь должен иметь возможность увидеть его отдельно.

Например:

```text
Preview

┌────────────┐
│            │
│   sprite   │
│            │
└────────────┘
```

Для preview можно использовать второй canvas.

---

# 23. FR-15 — нарезка изображения

Для нарезки выбранного кадра необходимо создать временный canvas.

Размер:

```ts
canvas.width = frame.width
canvas.height = frame.height
```

Затем:

```ts
ctx.drawImage(
  image,

  frame.x,
  frame.y,
  frame.width,
  frame.height,

  0,
  0,
  frame.width,
  frame.height,
)
```

---

# 24. FR-16 — экспорт PNG

Для экспортируемого кадра использовать:

```ts
canvas.toBlob()
```

Результат должен скачиваться как PNG.

Название:

```text
frame_001.png
frame_002.png
frame_003.png
```

---

# 25. FR-17 — экспорт выбранных кадров

Кнопка:

```text
Export selected
```

Должна скачать все выбранные кадры.

На MVP допустимо, чтобы браузер инициировал несколько отдельных загрузок.

ZIP пока не требуется.

---

# 26. FR-18 — сброс изображения

Пользователь должен иметь возможность загрузить другое изображение.

При этом должны быть очищены:

```text
frames
selection
preview
image metadata
```

После чего создаётся новая сетка.

---

# 27. Валидация

## Frame width

Недопустимо:

```text
0
-32
text
```

## Frame height

Аналогично.

При ошибке приложение не должно падать.

---

# 28. Поведение при неправильном размере

Например:

```text
Image:

100 × 100

Frame:

32 × 32
```

Получаем:

```text
3 × 3 frames
```

Оставшиеся пиксели:

```text
4 px
```

на MVP можно просто игнорировать.

То есть использовать:

```ts
Math.floor()
```

---

# 29. Состояние приложения

Минимальная модель состояния:

```ts
type EditorState = {
  file: File | null

  imageUrl: string | null

  imageWidth: number
  imageHeight: number

  frameWidth: number
  frameHeight: number

  frames: SpriteFrame[]

  activeFrameId: number | null
}
```

Использование Redux/Zustand не требуется.

Можно использовать:

```text
useState
useMemo
useRef
useEffect
```

---

# 30. Компоненты

Предлагаемая структура:

```text
src/

  app/
    App.tsx

  features/

    upload/
      SpriteUploader.tsx

    editor/
      SpriteEditor.tsx
      SpriteCanvas.tsx

    settings/
      GridSettings.tsx

    preview/
      SpritePreview.tsx

    export/
      ExportButton.tsx

  entities/

    sprite/
      types.ts

  shared/

    utils/
      generateFrames.ts
      exportFrame.ts
```

---

# 31. SpriteUploader

Ответственность:

```text
выбрать файл
проверить его тип
вернуть File родительскому компоненту
```

Не должен:

```text
рисовать canvas
считать сетку
экспортировать PNG
```

---

# 32. SpriteCanvas

Ответственность:

```text
отрисовать изображение
отрисовать сетку
отрисовать выделение
обрабатывать click
```

---

# 33. GridSettings

Содержит:

```text
Frame width
Frame height
```

Может также отображать:

```text
Columns
Rows
Total frames
```

---

# 34. SpritePreview

Ответственность:

```text
показать активный выбранный sprite
```

---

# 35. ExportButton

Ответственность:

```text
получить выбранные frames
нарезать изображение
создать PNG
инициировать download
```

---

# 36. Utils

## generateFrames

Пример интерфейса:

```ts
generateFrames(imageWidth, imageHeight, frameWidth, frameHeight)
```

Возвращает:

```ts
SpriteFrame[]
```

---

# 37. Архитектурное правило

Бизнес-логика не должна быть целиком написана внутри React-компонентов.

Плохо:

```ts
function App() {
  // 200 строк расчётов кадров
}
```

Лучше:

```ts
const frames = generateFrames(...)
```

---

# 38. Работа с Canvas

Canvas должен использоваться через:

```ts
useRef<HTMLCanvasElement>(null)
```

Получение контекста:

```ts
const ctx = canvas.getContext('2d')
```

---

# 39. Побочные эффекты

Перерисовку Canvas можно выполнять через:

```ts
useEffect
```

при изменении:

```text
image
frames
selection
frameWidth
frameHeight
```

---

# 40. Освобождение object URL

Если используется:

```ts
URL.createObjectURL()
```

необходимо после использования вызывать:

```ts
URL.revokeObjectURL()
```

чтобы не создавать утечки памяти.

---

# 41. UI состояния

Приложение должно учитывать следующие состояния.

## Empty

```text
No image loaded
```

## Image loaded

```text
Image loaded
```

## Invalid settings

```text
Invalid frame size
```

## Frames generated

```text
32 frames
```

## Selection exists

```text
4 selected
```

---

# 42. Ошибки

Пользователь не должен видеть stack trace.

Пример сообщений:

```text
Unable to load image
```

```text
Frame width must be greater than 0
```

```text
Frame size is larger than image
```

---

# 43. Нефункциональные требования

Приложение должно работать без backend.

Все изображения остаются локально в браузере.

Файлы не должны отправляться на сервер.

---

# 44. Производительность

MVP должен нормально работать с изображениями примерно до:

```text
4096 × 4096 px
```

Не требуется оптимизация очень больших изображений.

---

# 45. TypeScript

Запрещено использовать `any`, если этого можно избежать.

Например:

```ts
const handleChange = (event: ChangeEvent<HTMLInputElement>) => {}
```

Типы данных должны быть явно определены там, где это улучшает читаемость.

---

# 46. CSS

На MVP не требуется сложная дизайн-система.

Достаточно:

```text
flex/grid layout
buttons
inputs
canvas container
basic responsive layout
```

---

# 47. Адаптивность

Минимальная ширина комфортной работы:

```text
1024px
```

Мобильная версия на MVP не является приоритетом.

---

# 48. Основные сущности

Главная сущность:

```ts
SpriteFrame
```

```ts
type SpriteFrame = {
  id: number

  row: number
  column: number

  x: number
  y: number

  width: number
  height: number

  selected: boolean
}
```

---

# 49. Критерии готовности MVP

Проект считается завершённым, если выполняется следующий сценарий.

Пользователь:

1. открывает приложение;
2. загружает PNG;
3. видит изображение;
4. видит размеры изображения;
5. вводит размер кадра;
6. видит корректную сетку;
7. нажимает на кадры;
8. выбранные кадры подсвечиваются;
9. может отменить выбор повторным нажатием;
10. видит количество выбранных кадров;
11. может посмотреть отдельный кадр;
12. нажимает `Export selected`;
13. получает корректные PNG;
14. PNG соответствует выбранной области исходного изображения.

---

# 50. Пример тестового сценария

Исходное изображение:

```text
256 × 128
```

Настройки:

```text
Frame width: 32
Frame height: 32
```

Ожидается:

```text
Columns: 8

Rows: 4

Frames: 32
```

Нажатие на:

```text
column = 2
row = 1
```

должно выбрать кадр:

```text
x = 64
y = 32

width = 32
height = 32
```

---

# 51. Этапы разработки

## Этап 1

Создание проекта.

```text
React
TypeScript
Vite
pnpm
```

---

## Этап 2

`SpriteUploader`.

Результат:

```text
пользователь выбирает файл
```

---

## Этап 3

Загрузка изображения.

Результат:

```text
получены width / height
```

---

## Этап 4

Canvas.

Результат:

```text
изображение отображается на canvas
```

---

## Этап 5

Настройки сетки.

Результат:

```text
frameWidth
frameHeight
```

---

## Этап 6

Функция:

```text
generateFrames()
```

Результат:

```text
SpriteFrame[]
```

---

## Этап 7

Отрисовка сетки.

---

## Этап 8

Определение кадра по click.

---

## Этап 9

Выбор нескольких кадров.

---

## Этап 10

Preview.

---

## Этап 11

Нарезка одного кадра.

---

## Этап 12

Экспорт PNG.

---

## Этап 13

Экспорт нескольких кадров.

---

## Этап 14

Рефакторинг.

Проверить:

```text
компоненты
типы
дублирование
названия
ответственность функций
```

---

# 52. Definition of Done

MVP считается законченным только тогда, когда приложение можно использовать без DevTools и без изменения исходного кода.

То есть обычный пользователь должен пройти:

```text
Upload
   ↓
Configure
   ↓
Select
   ↓
Export
```

полностью через интерфейс.

---

# 53. Что добавить после MVP

Следующий этап развития:

```text
v0.2
```

может включать:

```text
gapX
gapY

offsetX
offsetY

zoom
pan

Select All
Clear Selection

ZIP export
```

После этого:

```text
v0.3
```

может включать:

```text
automatic sprite detection

transparent pixel trimming

animation groups

animation preview

JSON metadata export
```

И только после этого стоит рассматривать полноценный:

```text
Sprite Editor
```

с:

```text
animation timeline
sprite atlas packing
pivot
collision boxes
project saving
```

---

# 54. Главный принцип разработки

Каждый новый этап должен оставлять приложение в рабочем состоянии.

Не делать одновременно:

```text
upload
canvas
grid
selection
export
```

Нужно идти последовательно:

```text
Upload работает
       ↓
Image работает
       ↓
Canvas работает
       ↓
Grid работает
       ↓
Selection работает
       ↓
Export работает
```

Только после проверки одного этапа переходить к следующему.

---

# 55. Итоговый MVP

В финале Sprite Cutter должен представлять собой небольшой браузерный инструмент:

```text
             Sprite Cutter

                   │
                   ▼

             Upload image

                   │
                   ▼

             Sprite sheet

                   │
                   ▼

          Configure frame size

                   │
                   ▼

              Draw grid

                   │
                   ▼

            Select frames

                   │
                   ▼

               Preview

                   │
                   ▼

             Export PNG
```

Главная задача MVP:

**правильно и надёжно нарезать sprite sheet на отдельные игровые кадры непосредственно в браузере.**
