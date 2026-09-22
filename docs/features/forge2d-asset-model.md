# FEAT-002 — Forge2D Asset Model

FEAT-002 добавляет чистую модель проекта вокруг независимого Sprite Editor.
Production UI приложения не изменяется; пример владельца находится только в
тестовом host `/tests/fixtures/asset-host.html`.

## Публичные типы

```ts
type AssetId = string
type Asset = TextureAsset | SpriteAsset

interface TextureAsset {
  id: AssetId
  type: 'texture'
  name: string
  schemaVersion: 1
  uri: string
  width: number
  height: number
}

interface SpriteAsset {
  id: AssetId
  type: 'sprite'
  name: string
  schemaVersion: 1
  textureId: AssetId
  sprites: readonly AssetSpriteFrame[]
  settings: AssetSpriteSettings
}

interface Project {
  name: string
  schemaVersion: 1
  assets: readonly Asset[]
}
```

Типы и операции экспортируются из `entities/project/domain`. Этот entrypoint,
как и adapter, проверяется `tsconfig.domain.json` без DOM и React.

## Операции Project

`createTextureAsset`, `createSpriteAsset` и `createProject` валидируют и копируют
входные данные. `upsertProjectAsset` возвращает новый Project. `removeProjectAsset`
не позволяет удалить используемую текстуру. `findTextureAsset` и
`findSpriteAsset` возвращают уже суженный тип без cast.

Project требует уникальные AssetId. SpriteAsset требует существующую
TextureAsset, уникальные frame ID, целочисленные rect внутри текстуры и валидные
grid settings. Пустой список frames допустим.

URI текстуры должен переживать сериализацию: разрешены относительные URI,
HTTP(S) и data URL. `blob:` относится к текущей browser-сессии и отклоняется.

## Адаптер Sprite Editor

```ts
spriteEditorResultToSpriteAsset({ id, name, texture, result })
spriteAssetToEditorInput({ asset, texture })
```

Адаптер находится в `features/manage-sprite-asset` и импортирует Editor-типы
только из `entities/sprite/domain`. Он проверяет версии, texture reference и
совпадение размеров, затем копирует разрешённые поля поштучно. Type-level тесты
фиксируют структурное соответствие кадров и grid settings на этой границе.

Обратное преобразование возвращает `image` и `initialData`. В manual-режиме
`grid` полностью отсутствует, что соответствует `exactOptionalPropertyTypes`.

## Владение сессией и ошибки

`SpriteEditor` сохраняет сессию при неизменном `image.src`. Поэтому host обязан
использовать `key={spriteAsset.id}` или размонтировать редактор между assets.
Это особенно важно для нескольких SpriteAsset, использующих один атлас.

Host перехватывает ошибки адаптера внутри `onSave` и показывает собственное
сообщение. Если позволить исключению выйти из callback, SpriteEditor намеренно
заменит его общей ошибкой сохранения.

Project пока хранится только в памяти host. Файловый формат, IndexedDB, backend,
миграции и production Asset Manager остаются отдельными этапами.
