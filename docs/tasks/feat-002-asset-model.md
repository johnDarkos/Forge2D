# FEAT-002 — Forge2D Asset Model

## Цель

Создать минимальную сериализуемую модель Project/Asset и адаптер результата
Sprite Editor. Направление зависимости остаётся односторонним:

```text
Forge2D Project → host adapter → SpriteEditor → sprite domain
```

Sprite Editor не импортирует Forge2D domain. Persistence, Asset Manager, сцены,
runtime, ECS, migrations и backend не входят в этап.

## Контракт

- `Project`: `name`, `schemaVersion: 1`, массив assets.
- `TextureAsset`: строковые `id`/`name`, `schemaVersion: 1`, `uri`, размеры.
- `SpriteAsset`: строковые `id`/`textureId`, frames и grid/manual settings.
- ID задаёт host; domain не генерирует их.
- Project и assets версии 1 принимаются вместе; другая версия отклоняется.
- Сохраняемый `uri` принимает относительные адреса, HTTP(S) и data URL.
  `blob:` отклоняется как сессионный и непригодный после перезагрузки.

Asset-типы не переиспользуют типы Sprite Editor. Граница преобразования находится
в `features/manage-sprite-asset`, который импортирует оба чистых entity-domain API.

## Операции

- создание TextureAsset, SpriteAsset и Project с runtime-валидацией;
- typed lookup текстуры и sprite asset;
- immutable upsert;
- удаление sprite asset;
- запрет удаления текстуры, на которую ссылается SpriteAsset;
- `SpriteEditorResult → SpriteAsset`;
- `SpriteAsset + TextureAsset → image + initialData`.

В manual settings поле `grid` отсутствует, а не имеет значение `undefined`.
Адаптер копирует вложенные данные и проверяет совпадение размеров результата
редактора с TextureAsset.

## Host flow

Host хранит Project в памяти, сам перехватывает ошибки адаптера и показывает их
отдельно от общей ошибки `onSave` редактора. Редактор монтируется с
`key={spriteAsset.id}`: два SpriteAsset на одной текстуре получают независимые
сессии, а повторное открытие читает данные из Project.

## Проверки

- unit/type-level: schema, ID, URI, ссылки, rect/grid, immutable-операции;
- один корпус невалидной геометрии проходит через оба валидатора;
- round-trip явно сохраняет frame ID и имя;
- интеграция настоящего SpriteEditor с Project в памяти;
- один Playwright-сценарий переключает два SpriteAsset на одной TextureAsset,
  сохраняет первый и повторно открывает его из Project.

Тесты этапа находятся в `src/test/asset`, host — в `tests/fixtures/AssetHost.tsx`,
браузерный сценарий — в `tests/browser/assets.spec.ts`.
