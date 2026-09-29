# Контекст Forge2D

**Обновлено:** 29 сентября 2026 года, после завершения M0.5.

Forge2D — web-native 2D-движок и визуальный редактор для обычных TypeScript/npm-проектов.
Цель проекта — сократить путь от идеи до работающей сцены, сохранив понятный public API,
тестируемую архитектуру и полный контроль пользователя над игровым кодом.

## Что находится в репозитории

Репозиторий развивается из готового Sprite Cutter в Forge2D:

- **Sprite Editor** — самостоятельное Vite-приложение и встраиваемый React-компонент;
- **Forge2D Asset Model** — сериализуемые Project, TextureAsset и SpriteAsset;
- **`@forge2d/core`** — Scene Model, GameObject, Component, Behaviour, Signal и `@field`;
- **`@forge2d/runtime`** — нейтральный Renderer API, Transform и SpriteRenderer;
- **Forge Editor** — минимальная оболочка Hierarchy, Scene, Inspector и Assets на тех же
  Core и Runtime.

Sprite Editor уже поддерживает grid/manual-разметку, Zoom/Pan, коллекцию кадров, PNG/ZIP,
внешние `image`/`initialData`/`onSave`/`onCancel`, стабильные ID и CSS-изоляцию. Обработка
изображений выполняется локально в браузере.

## Текущее состояние

- M0.1 Scene Model завершён.
- M0.2 Runtime lifecycle завершён.
- M0.3 TypeScript → Inspector завершён.
- M0.4 Renderer завершён.
- M0.5 минимальный Forge Editor завершён.
- Следующий этап — M0.6, сквозной Play-сценарий `speed 220 → 350 → runtime`.
- Production persistence, игровой backend рендера и полноценный Game Loop ещё не реализованы.
- PixiJS рассматривается как кандидат, но архитектурно не выбран.

Актуальный baseline: **283 Vitest в 26 файлах**, **19 Playwright**; statements **94.31%**,
branches **90.11%**, functions **96.96%**, lines **97.69%**.

## Принципы

- TypeScript-first и code-first;
- Component-based модель;
- editor и runtime используют одну модель мира;
- editor optional: проект должен запускаться без Forge Editor;
- обычные npm, ESM и Git workflow;
- минимальная магия и отсутствие параллельных schema-файлов;
- immutable сериализуемые данные на границах;
- постепенное усложнение только по подтверждённой необходимости;
- TDD для новых контрактов и проверка реальными браузерными данными там, где mock недостаточен.

## Источники истины

1. [Architecture v0.1](../Forge2D-Architecture-v0.1.md) задаёт целевое направление и границы.
2. [Документация проекта](../project.md) описывает фактически реализованное поведение,
   команды, тесты и roadmap.
3. `docs/ai/` хранит короткий рабочий контекст и должен обновляться после изменений.
4. При расхождении документации с кодом сначала проверяются тесты и реализация, затем
   исправляются оба уровня документации.
