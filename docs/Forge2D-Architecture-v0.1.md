# Forge2D — Architecture v0.1

**Статус:** Draft для утверждения
**Основа:** Competitive Matrix v1 (анализ шести конкурентов)
**Следующий этап:** Milestone 0 — Living Scene

---

## Содержание

1. [Резюме](#1-резюме)
2. [Конкурентный анализ](#2-конкурентный-анализ)
3. [Архитектурные принципы](#3-архитектурные-принципы)
4. [Базовая модель](#4-базовая-модель)
5. [Композиция сцен вместо Prefab](#5-композиция-сцен-вместо-prefab)
6. [GameObject и Inspector](#6-gameobject-и-inspector)
7. [Behaviour и жизненный цикл](#7-behaviour-и-жизненный-цикл)
8. [TypeScript → Inspector](#8-typescript--inspector)
9. [Разделение данных сцены и игрового кода](#9-разделение-данных-сцены-и-игрового-кода)
10. [Структура проекта](#10-структура-проекта)
11. [npm-проект и Editor-optional](#11-npm-проект-и-editor-optional)
12. [Forge Editor](#12-forge-editor)
13. [Assets и SpriteEditor](#13-assets-и-spriteeditor)
14. [Smart Drag & Drop](#14-smart-drag--drop)
15. [Готовые компоненты и Progressive Complexity](#15-готовые-компоненты-и-progressive-complexity)
16. [События](#16-события)
17. [Renderer и Physics](#17-renderer-и-physics)
18. [Структура пакетов и Runtime](#18-структура-пакетов-и-runtime)
19. [Play Workflow и Hot Reload](#19-play-workflow-и-hot-reload)
20. [Границы MVP](#20-границы-mvp)
21. [Следующий шаг: Milestone 0 — Living Scene](#21-следующий-шаг-milestone-0--living-scene)

---

## 1. Резюме

Forge2D — **code-first игровая IDE** для 2D-игр на TypeScript. Проект сочетает скорость визуального конструктора с полноценным программным workflow и остаётся обычным npm/Git-проектом.

Ключевой вывод конкурентного анализа: **ни одна отдельная функция Forge2D не является новой**. Это важно было выяснить на раннем этапе. Уникальность проекта лежит не в «секретной функции», а в **другом developer experience** — в сочетании:

> TypeScript-native + скорость визуального конструктора + полноценный code-first workflow + component model + composable scenes + обычный npm/Git-проект + редактор, который проекту помогает, но им не владеет.

---

## 2. Конкурентный анализ

### 2.1. Ключевые наблюдения

| Продукт           | Что важно для Forge2D                                                                                                                                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phaser Editor** | Сцены компилируются в читаемый Phaser-код; проект — обычная папка; для серьёзной работы с кодом рекомендуется VS Code. Редактор использует сам Phaser для отображения сцены, поэтому editor и game не расходятся визуально. |
| **Cocos**         | Глубокая связь TypeScript-компонентов с Inspector через `@property` и сериализацию.                                                                                                                                         |
| **Godot**         | Архитектура на Nodes, вложенных Scenes и Signals; формат `.tscn` остаётся преимущественно человекочитаемым.                                                                                                                 |
| **Construct**     | Layouts/Event Sheets, готовые Behaviors, TypeScript; запуск текущего Layout для preview.                                                                                                                                    |
| **ct.js**         | Composable Behaviors и визуальное редактирование структурированных игровых данных.                                                                                                                                          |
| **Defold**        | Компонентная архитектура, редактируемые script properties, text-based Git workflow, полноценный hot reload кода и ресурсов.                                                                                                 |

### 2.2. Competitive Matrix v1

| Область                         | Phaser Editor      | Cocos         | Godot                    | Construct          | ct.js                 | Defold              | **Forge2D**                |
| ------------------------------- | ------------------ | ------------- | ------------------------ | ------------------ | --------------------- | ------------------- | -------------------------- |
| Основной подход                 | framework + editor | engine/editor | scene/node               | visual-first       | integrated game maker | compact engine      | **code-first game IDE**    |
| Основной язык                   | JS/TS              | TS            | GDScript/C#              | Events + JS/TS     | JS/TS/Catnip          | Lua                 | **TypeScript**             |
| GameObject + Components         | частично           | ✅            | Node-модель              | Object + Behaviors | Template + Behaviors  | ✅                  | **✅ ядро**                |
| Code → Inspector                | частично           | ✅ сильный    | ✅                       | иной подход        | Behavior fields       | ✅                  | **✅ фундамент**           |
| Вложенные сцены                 | ✅                 | ✅            | ✅ очень сильные         | ограниченнее       | Rooms                 | Collections         | **✅**                     |
| Отдельный Prefab                | ✅                 | ✅            | не обязателен            | Templates          | Templates             | GO prototypes       | **нет в v0.1**             |
| Полноценный code-first workflow | частично           | частично      | ✅                       | гибрид             | гибрид                | ✅                  | **✅**                     |
| Обычный TS-экосистема           | ✅                 | ограниченнее  | ❌                       | частично           | частично              | ❌                  | **✅ npm/ESM/Vite**        |
| Editor optional                 | фактически да      | слабее        | привязан к Godot runtime | слабее             | слабее                | runtime Defold      | **обязательно**            |
| Git-friendly                    | ✅                 | средне        | ✅                       | ✅ folder projects | слабее                | ✅                  | **core requirement**       |
| Быстрый прототип                | хорошо             | средне        | хорошо                   | **отлично**        | отлично               | хорошо              | **цель: отлично**          |
| Готовые behaviors               | частично           | Components    | Nodes                    | **очень сильные**  | ✅                    | Components          | **✅ TS-компоненты**       |
| Hot reload                      | есть workflow      | есть          | есть                     | preview            | есть                  | **очень сильный**   | **высокий приоритет**      |
| Zero-config                     | средне             | хорошо        | хорошо                   | **отлично**        | хорошо                | **отлично**         | **обязательно**            |
| Asset pipeline                  | Asset Packs        | AssetDB       | filesystem/import        | integrated         | integrated            | integrated          | **автоимпорт + tools**     |
| Data tooling                    | ограниченнее       | assets        | Resources                | data structures    | **Content subsystem** | resources           | **DataAsset**              |
| Собственный язык                | нет                | нет           | GDScript                 | Events             | Catnip                | Lua                 | **нет**                    |
| 3D                              | не цель            | ✅            | ✅                       | ✅                 | в основном 2D         | ✅                  | **нет в первой стратегии** |
| Web-native                      | **✅**             | частично      | частично                 | ✅                 | ✅                    | HTML5 target        | **✅ фундамент**           |
| npm                             | ✅                 | не центр      | ❌                       | не центр           | ❌                    | ❌                  | **✅**                     |
| AI                              | ✅                 | развивается   | ecosystem                | развивается        | —                     | automation-friendly | **позже, не USP**          |

---

## 3. Архитектурные принципы

```text
1. TypeScript-first
2. Code-first
3. Component-based
4. Scene composition
5. Fast-first
6. Git-first / Editor-optional
7. Zero-config by default
```

Это не декларативные лозунги. **Архитектурное решение, противоречащее любому из принципов, требует очень веской причины.**

---

## 4. Базовая модель

Принцип: минимум сущностей.

```text
Project
│
├── Assets
├── Scenes
├── Code
└── Data

Scene
│
└── GameObject
      │
      ├── Component
      ├── Component
      └── Behaviour
```

### Пользовательские понятия

| Понятие      | Назначение                                      |
| ------------ | ----------------------------------------------- |
| `Scene`      | Дерево объектов, которое можно переиспользовать |
| `GameObject` | Объект игрового мира                            |
| `Component`  | Возможность или данные объекта                  |
| `Behaviour`  | Component с пользовательской логикой            |
| `Asset`      | Изображение, звук, шрифт и т. д.                |
| `DataAsset`  | Структурированные игровые данные                |
| `Signal`     | Типизированное событие                          |

### Не вводятся как пользовательские понятия

`Entity`, `Actor`, `Node`, `Template`, `Copy`, `Prefab`, `GameBehaviour`, `VisualObject`, `Room`, `Collection`.

---

## 5. Композиция сцен вместо Prefab

Отдельной сущности Prefab нет. Любая Scene может использоваться внутри другой Scene.

```text
scenes/
├── player.scene.json
├── enemy.scene.json
├── door.scene.json
└── level01.scene.json
```

`player.scene.json`:

```text
Player
└── Components
    ├── Transform
    ├── SpriteRenderer
    ├── Collider
    ├── Health
    └── PlayerController
```

`level01.scene.json`:

```text
Level01
├── Player   → player.scene
├── Enemy01  → enemy.scene
├── Enemy02  → enemy.scene
└── Door     → door.scene
```

`player.scene` фактически выполняет роль prefab, но пользователю не нужно изучать ещё одну систему. Этот вывод основан на опыте Godot и Defold.

---

## 6. GameObject и Inspector

`GameObject` — простой контейнер. Важно не копировать Godot буквально.

**Hierarchy** отвечает на вопрос _«что существует в мире?»_:

```text
Level01
│
├── Player
│   └── Weapon
│
├── Enemy01
├── Enemy02
└── Door
```

**Inspector** отвечает на вопрос _«что умеет выбранный объект?»_:

```text
Player
────────────────────
Transform
SpriteRenderer
Animator
RigidBody
Collider
Health
PlayerController
```

Это разделение — одно из ключевых решений Architecture v0.1.

---

## 7. Behaviour и жизненный цикл

`Behaviour` — не отдельная архитектура, а специализированный `Component` с жизненным циклом.

```ts
export class PlayerController extends Behaviour {
  update(dt: number) {
    // ...
  }
}
```

Полный набор методов жизненного цикла:

```ts
onCreate()
start()
update(dt)
fixedUpdate(dt)
onDestroy()
```

**В MVP:** только `start()`, `update(dt)`, `onDestroy()`. Остальное добавляется по реальной необходимости.

---

## 8. TypeScript → Inspector

Решение принято: поля компонентов отображаются в Inspector автоматически на основе TypeScript-кода.

```ts
export class Health extends Component {
  @field({ min: 1 })
  max = 100

  @field({ readonly: true })
  current = 100
}
```

```text
Health
────────────────
Max       [ 100 ]
Current   [ 100 ]
```

```ts
export class EnemyAI extends Behaviour {
  @field({ min: 0 })
  detectionRange = 300

  @field()
  aggressive = true
}
```

```text
Enemy AI
────────────────
Detection Range     300
Aggressive          ☑
```

> **Правило: схема не существует отдельно от TypeScript.**
> Источник истины — `EnemyAI.ts`, а не пара `enemy-ai.schema.json` + `EnemyAI.ts`.

---

## 9. Разделение данных сцены и игрового кода

Принципиальное отличие от подхода с генерацией основного исходного кода.

**Данные сцены** — `player.scene.json`:

```json
{
  "version": 1,
  "id": "scene_player",
  "name": "Player",
  "objects": [
    {
      "id": "player",
      "name": "Player",
      "components": [
        { "id": "transform", "type": "Transform", "properties": { "x": 100, "y": 200 } },
        {
          "id": "sprite",
          "type": "SpriteRenderer",
          "properties": { "asset": "asset_player" }
        },
        { "id": "controller", "type": "PlayerController", "properties": { "speed": 220 } }
      ]
    },
    {
      "id": "weapon",
      "name": "Weapon",
      "parentId": "player",
      "components": []
    }
  ]
}
```

Формат уточнён при реализации Scene Model v1 (M0.1). Два решения отличаются от первого
черновика этого раздела:

- **`id` у компонента.** Нужен, чтобы на компонент можно было ссылаться и чтобы Inspector
  и будущие миграции опирались на стабильную идентичность, а не на позицию в массиве.
- **Свойства в `properties`.** Вложенность на один уровень глубже, зато поле игрового
  компонента с именем `type`, `id` или `properties` не конфликтует со служебными полями.
  Без неё любое такое имя пришлось бы запрещать в пользовательском коде.

Оба решения делают файл, который правят руками, чуть более многословным. Это осознанная
плата за отсутствие зарезервированных имён свойств и за стабильные ссылки на компоненты.

**Иерархия внутри сцены плоская.** Дерево из раздела 6 хранится списком объектов, где
дочерний указывает на родителя через `parentId`; корневой объект поля не содержит. Так
перенос объекта между родителями меняет в diff одну строку, а не переформатирует поддерево.
Вложенные сцены — отдельная сущность и в этот формат пока не входят.

**Игровой код** — `PlayerController.ts` — целиком принадлежит пользователю:

```ts
export class PlayerController extends Behaviour {
  @field()
  speed = 220

  update(dt: number) {
    const x = Input.axis('horizontal')
    this.transform.x += x * this.speed * dt
  }
}
```

> **Forge не переписывает пользовательский код.** Никаких маркеров вида `// DO NOT EDIT`, `// GENERATED CODE`, `// USER CODE START` — за исключением узких инфраструктурных задач, где это действительно неизбежно.

---

## 10. Структура проекта

```text
space-game/
│
├── assets/
│   ├── characters/
│   │   └── player.png
│   ├── enemies/
│   ├── audio/
│   └── ui/
│
├── scenes/
│   ├── player.scene.json
│   ├── enemy.scene.json
│   └── level01.scene.json
│
├── src/
│   ├── components/
│   │   └── Health.ts
│   ├── behaviours/
│   │   ├── PlayerController.ts
│   │   └── EnemyAI.ts
│   ├── systems/
│   └── main.ts
│
├── data/
│   ├── weapons.json
│   └── enemies.json
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── forge.config.ts
│
└── .forge/
    ├── cache/
    └── imported/
```

Каталог `.forge/` по умолчанию добавляется в `.gitignore`. Пользователь, как правило, в него не заходит.

---

## 11. npm-проект и Editor-optional

Forge2D-проект — настоящий npm-проект:

```json
{
  "scripts": {
    "dev": "forge dev",
    "build": "forge build",
    "test": "vitest"
  },
  "dependencies": {
    "@forge2d/core": "...",
    "@forge2d/runtime": "..."
  }
}
```

Команда `npm run dev` должна работать **без запуска Forge Editor**. Именно в этом выражается принцип _Editor-optional_.

---

## 12. Forge Editor

```text
┌──────────────┬─────────────────────────┬────────────────┐
│ HIERARCHY    │                         │ INSPECTOR      │
│              │                         │                │
│ Level01      │       SCENE             │ Player         │
│ ├─ Player    │                         │                │
│ ├─ Enemy     │                         │ Transform      │
│ ├─ Enemy     │                         │ Sprite         │
│ └─ Door      │                         │ Health         │
│              │                         │ Controller     │
├──────────────┴─────────────────────────┴────────────────┤
│ ASSETS                                                  │
├─────────────────────────────────────────────────────────┤
│ PlayerController.ts                                     │
│                                                         │
│ update(dt) { ... }                                      │
└─────────────────────────────────────────────────────────┘
```

Это не пять отдельных программ, а единая среда. При выборе `Player` редактор знает связанные с ним: Scene, GameObject, Components, исходник Behaviour, Assets и References.

---

## 13. Assets и SpriteEditor

Существующий **SpriteEditor** становится частью asset pipeline Forge2D и подключается к `Asset` API. Это не отдельное приложение, а **asset processor**.

```text
spritesheet.png
       │
       ▼
     Assets
       │
       ▼
  Sprite Editor
       │
       ├── idle_01
       ├── idle_02
       ├── walk_01
       └── walk_02
       │
       ▼
   Animation
       │
       ▼
 SpriteRenderer
       │
       ▼
  GameObject
```

---

## 14. Smart Drag & Drop

Подход заимствован у Construct. При перетаскивании `player.png` на Scene Forge автоматически выполняет:

1. Import Asset
2. Create GameObject
3. Add SpriteRenderer
4. Assign `player.png`

Результат:

```text
Player
└── SpriteRenderer
```

Одно действие вместо четырёх — это и есть **Fast-first**.

---

## 15. Готовые компоненты и Progressive Complexity

### 15.1. Каталог компонентов

```text
Add Component
──────────────────────
Rendering
  Sprite Renderer
  Animator

Physics
  Collider
  RigidBody

Movement
  Platform Controller
  Top Down Movement

Gameplay
  Health
  Lifetime

Camera
  Camera
  Camera Follow
```

Это **не** «магические» no-code behaviours: они написаны на тех же API, что доступны пользователю. Со временем желательно открыть их исходный код (Open Source).

### 15.2. Progressive Complexity

```text
USE → CONFIGURE → UNDERSTAND → EXTEND → WRITE YOUR OWN
```

| Этап           | Действие                                     |
| -------------- | -------------------------------------------- |
| Use            | Добавить `TopDownMovement` и играть          |
| Configure      | Изменить `Speed = 300`                       |
| Understand     | Прочитать код компонента                     |
| Extend         | Наследовать или комбинировать                |
| Write your own | `class MyMovement extends Behaviour { ... }` |

На всём пути модель программирования не меняется.

---

## 16. События

Не копируем Message Passing из Defold и избегаем строковых событий вида `emit("enemy_dead")`. TypeScript позволяет лучше:

```ts
export class Health extends Component {
  readonly died = new Signal<void>()
  readonly changed = new Signal<number>()
}
```

```ts
health.died.on(() => {
  score.add(100)
})
```

Для глобальных событий (позже):

```ts
Events.emit(EnemyDied, { enemy })
```

Итоговая модель:

```text
direct component API
+
typed Signals
+
global event bus (when necessary)
```

---

## 17. Renderer и Physics

### 17.1. Renderer

**PixiJS пока окончательно не фиксируется.** Это серьёзный кандидат (web/2D, опыт ct.js), но выбор должен подтвердить отдельный технический spike.

```text
Forge Runtime
      │
 Renderer API
      │
implementation  (первая — PixiJS)
```

### 17.2. Physics

Собственная физика не разрабатывается.

```text
Physics API
     ↓
  adapter
     ↓
existing engine
```

Backend выбирается отдельным исследованием. Пользовательский код (`body.velocity.x = 200;`) не должен жёстко зависеть от конкретной библиотеки — её замена должна оставаться возможной.

---

## 18. Структура пакетов и Runtime

| Пакет              | Содержимое                                                                                      |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| `@forge2d/core`    | `GameObject`, `Component`, `Behaviour`, `Scene`, `Signal`, `Asset`, `DataAsset`                 |
| `@forge2d/runtime` | Game loop, Scene runtime, Input, Renderer, Audio, Asset loading, Animation, Physics integration |
| **Forge Editor**   | Отдельное приложение, использующее **тот же runtime**                                           |

Editor не реализует второй игровой мир. Это урок Phaser Editor: использование того же движка для представления сцены исключает визуальное расхождение между редактором и игрой.

---

## 19. Play Workflow и Hot Reload

### 19.1. Запуск

Две кнопки:

```text
▶ Current Scene
▶ Game
```

Запуск текущей сцены (пример Construct) нужен с первых полноценных версий.

### 19.2. Hot Reload

Defold задаёт высокую планку: обновление кода и ресурсов в уже запущенной игре.

```text
изменение → < 1 сек → результат
```

Это архитектурная цель, а не обещание миллисекундной скорости для любого проекта. **Скорость итерации считается характеристикой движка.**

---

## 20. Границы MVP

### Входит в MVP

| Возможность              | Решение |
| ------------------------ | ------- |
| Project creation         | **MVP** |
| TypeScript               | **MVP** |
| Scene format             | **MVP** |
| Nested Scenes            | **MVP** |
| GameObject               | **MVP** |
| Components               | **MVP** |
| Behaviour                | **MVP** |
| `@field` → Inspector     | **MVP** |
| Transform                | **MVP** |
| SpriteRenderer           | **MVP** |
| Assets                   | **MVP** |
| SpriteEditor integration | **MVP** |
| Input                    | **MVP** |
| Current Scene Play       | **MVP** |
| Camera                   | **MVP** |
| Basic collision          | **MVP** |
| Animation                | **MVP** |
| Basic audio              | **MVP** |
| Basic hot reload         | **MVP** |

### Отложено

| Возможность   | Решение        |
| ------------- | -------------- |
| DataAsset     | После core MVP |
| TileMap       | Позже          |
| Particles     | Позже          |
| Plugin SDK    | Позже          |
| Marketplace   | Позже          |
| AI            | Позже          |
| Mobile export | Позже          |
| Consoles      | Очень далеко   |

### Исключено

| Возможность                   | Решение               |
| ----------------------------- | --------------------- |
| 3D                            | Не планировать сейчас |
| Visual scripting              | Не планировать        |
| Собственный язык              | Нет                   |
| Собственный package manager   | Нет                   |
| Глубокое Scene inheritance    | Нет                   |
| Генерация gameplay-кода на TS | Избегать              |

---

## 21. Следующий шаг: Milestone 0 — Living Scene

Следующий модуль — **Forge Core + Scene Runtime**. Не physics, не AI, не TileMap и не ещё один визуальный инструмент.

### 21.1. Vertical technical slice

```text
CREATE PROJECT
      ↓
Main.scene.json
      ↓
CREATE GAME OBJECT
      ↓
ADD Transform
      ↓
ADD SpriteRenderer
      ↓
ASSIGN asset
      ↓
ADD PlayerController.ts
      ↓
@field speed appears in Inspector
      ↓
▶ Current Scene
      ↓
PLAYER APPEARS
```

### 21.2. Критерий готовности

Milestone считается выполненным, когда изменение проходит через всю цепочку:

```text
Visual Editor
      ↕
scene.json
      ↕
GameObject
      ↕
Components
      ↕
TypeScript Behaviour
      ↕
Inspector
      ↕
Runtime
```

**Приёмочный сценарий:**

1. В коде объявлено `@field() speed = 220;`
2. Inspector показывает `Speed [220]`
3. Пользователь меняет значение на `Speed [350]`
4. Нажимает ▶
5. Runtime получает `this.speed === 350`

### 21.3. Интеграция SpriteEditor

После Milestone 0 существующий SpriteEditor подключается к `Asset` API, а не переписывается и не развивается изолированно. Это сохраняет проделанную работу и связывает её с главной архитектурой проекта.
