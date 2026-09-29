# Текущий этап: M0.6 — Living Scene

**Статус:** готов к TDD-реализации.
**Ветка:** `feat/milestone-0-living-scene`.
**База M0.6:** завершённый M0.5 в последнем коммите feature-ветки.
**Обновлено:** 29 сентября 2026 года.

## Что уже завершено

| Этап | Результат                                         | Коммит/состояние |
| ---- | ------------------------------------------------- | ---------------- |
| M0.1 | Scene Model v1                                    | `b30d542`        |
| M0.2 | GameObject, Component, Behaviour, Signal          | `43d8c37`        |
| M0.3 | `@field` и Inspector metadata                     | `59b9933`        |
| fix  | чтение runtime-значений вне Inspector-ограничений | `b494eca`        |
| M0.4 | Transform, SpriteRenderer и Renderer API          | `844d308`        |
| M0.5 | Forge Editor workspace и четыре связанные панели  | последний коммит |

M0.5 доступен по `/#forge`. Он использует SceneDocument, Project, runtime-компоненты,
Inspector API и Renderer без дублирования их правил. Baseline: 283 Vitest и 19 Playwright.

## Цель M0.6

Замкнуть первый вертикальный срез движка:

```text
PlayerController.ts с @field speed = 220
  → SceneDocument
  → Forge Editor Inspector показывает 220
  → пользователь вводит 350
  → обновлённый SceneDocument
  → ▶ Current Scene
  → runtime PlayerController получает speed === 350
```

## План TDD

- [ ] Зафиксировать тестом registry пользовательского Behaviour и гидратацию его `@field`.
- [ ] Добавить runtime-сессию сцены с явными `start`, `update(dt)` и `stop`.
- [ ] Проверить, что Play создаёт новые runtime-объекты из актуального SceneDocument.
- [ ] Добавить demo `PlayerController` со `speed = 220` и движением Transform.
- [ ] Реализовать ▶ Current Scene, остановку и понятный статус режима.
- [ ] Проверить редактирование Speed до 350 и получение значения runtime-компонентом.
- [ ] Не допустить переноса runtime-мутаций обратно в edit-сцену без отдельной команды.
- [ ] Добавить UI и браузерный приёмочный сценарий.
- [ ] Обновить `project.md` и `docs/ai/` по фактическому контракту.
- [ ] Прогнать frozen install, format, lint, typecheck, coverage, build и Playwright.

## Критерии готовности

1. Пользовательский Behaviour регистрируется по `ComponentData.type` без изменения Core.
2. Inspector показывает Speed 220 и записывает Speed 350 в SceneDocument через `@field` API.
3. Play всегда гидратирует отдельный runtime-снимок из последней edit-сцены.
4. `start` вызывается один раз, `update(dt)` получает валидный dt, Stop очищает runtime.
5. Runtime-экземпляр PlayerController видит `speed === 350`.
6. Изменение Transform во время Play не мутирует сериализуемый SceneDocument редактора.
7. Полный quality pipeline проходит, baseline обновлён.

## За пределами M0.6

- production Canvas/PixiJS backend и окончательный выбор библиотеки;
- файловая persistence и hot reload;
- production-интеграция Sprite Editor в Assets — M0.7;
- physics, animation, audio и nested scenes.
