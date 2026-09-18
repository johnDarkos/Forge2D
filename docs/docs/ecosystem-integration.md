Sprite Editor является независимым инструментом.

Он:

- не зависит от игрового runtime;
- не зависит от PixiJS;
- не зависит от Scene/Entity;
- не зависит от Steam/Yandex;
- работает только с изображениями и sprite metadata.

В дальнейшем Sprite Editor должен поддерживать:

1. standalone mode;
2. embedded mode внутри Forge2D Editor.
   Актуальный документ подготовки и границы данных:
   [docs/ecosystem-integration.md](../ecosystem-integration.md).

FEAT-001 реализует API встраивания: image, initialData, onSave и onCancel.
Связь с реальным Forge2D Project Store пока не реализована.
[Контракт FEAT-001](../features/sprite-editor-embedding.md).
