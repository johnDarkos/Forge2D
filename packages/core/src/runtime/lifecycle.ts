import { RuntimeLifecycleError } from './RuntimeLifecycleError'

const componentOwners = new WeakMap<Component, GameObject>()

export interface GameObjectOptions {
  readonly id: string
  readonly name: string
}

export type ComponentConstructor<T extends Component> = abstract new (...args: never[]) => T

/** Базовая возможность GameObject. Состояние компонента хранится в самом экземпляре. */
export abstract class Component {
  get isAttached() {
    return componentOwners.has(this)
  }

  get gameObject(): GameObject {
    const owner = componentOwners.get(this)
    if (!owner)
      throw new RuntimeLifecycleError(
        'component-not-attached',
        'Component is not attached to a GameObject',
      )
    return owner
  }
}

/** Component с минимальным MVP-жизненным циклом. */
export abstract class Behaviour extends Component {
  start(): void {}

  update(_dt: number): void {}

  onDestroy(): void {}
}

/** Контейнер компонентов и владелец их детерминированного жизненного цикла. */
export class GameObject {
  readonly id: string
  readonly name: string
  readonly #components: Component[] = []
  readonly #startedBehaviours = new Set<Behaviour>()
  readonly #destroyingComponents = new Set<Component>()
  #started = false
  #destroyed = false

  constructor(options: GameObjectOptions) {
    if (!options.id.trim())
      throw new RuntimeLifecycleError('invalid-object', 'GameObject id must be a non-empty string')
    if (!options.name.trim())
      throw new RuntimeLifecycleError(
        'invalid-object',
        'GameObject name must be a non-empty string',
      )
    this.id = options.id
    this.name = options.name
  }

  get components(): readonly Component[] {
    return [...this.#components]
  }

  get isStarted() {
    return this.#started
  }

  get isDestroyed() {
    return this.#destroyed
  }

  addComponent<T extends Component>(component: T): T {
    this.#assertAlive()
    if (componentOwners.has(component))
      throw new RuntimeLifecycleError(
        'component-already-attached',
        'Component is already attached to a GameObject',
      )
    componentOwners.set(component, this)
    this.#components.push(component)
    return component
  }

  removeComponent(component: Component): boolean {
    this.#assertAlive()
    const index = this.#components.indexOf(component)
    if (index < 0) return false
    if (this.#destroyingComponents.has(component)) return false

    this.#destroyingComponents.add(component)
    try {
      if (component instanceof Behaviour) component.onDestroy()
    } finally {
      const currentIndex = this.#components.indexOf(component)
      if (currentIndex >= 0) this.#components.splice(currentIndex, 1)
      this.#startedBehaviours.delete(component as Behaviour)
      componentOwners.delete(component)
      this.#destroyingComponents.delete(component)
    }
    return true
  }

  getComponent<T extends Component>(type: ComponentConstructor<T>): T | undefined {
    return this.#components.find((component): component is T => component instanceof type)
  }

  getComponents<T extends Component>(type: ComponentConstructor<T>): readonly T[] {
    return this.#components.filter((component): component is T => component instanceof type)
  }

  start() {
    this.#assertAlive()
    this.#started = true
    const pending = this.#components.filter(
      (component): component is Behaviour =>
        component instanceof Behaviour && !this.#startedBehaviours.has(component),
    )
    for (const behaviour of pending) {
      if (componentOwners.get(behaviour) !== this) continue
      behaviour.start()
      if (componentOwners.get(behaviour) === this) this.#startedBehaviours.add(behaviour)
    }
  }

  update(dt: number) {
    this.#assertAlive()
    if (!Number.isFinite(dt) || dt < 0)
      throw new RuntimeLifecycleError(
        'invalid-delta-time',
        'Delta time must be a finite number greater than or equal to zero',
      )

    this.start()
    const behaviours = this.#components.filter(
      (component): component is Behaviour => component instanceof Behaviour,
    )
    for (const behaviour of behaviours) {
      if (componentOwners.get(behaviour) === this && this.#startedBehaviours.has(behaviour))
        behaviour.update(dt)
    }
  }

  destroy() {
    if (this.#destroyed) return
    this.#destroyed = true
    const errors: unknown[] = []
    for (const component of [...this.#components]) {
      try {
        if (component instanceof Behaviour) component.onDestroy()
      } catch (error) {
        errors.push(error)
      } finally {
        componentOwners.delete(component)
      }
    }
    this.#components.length = 0
    this.#startedBehaviours.clear()
    this.#destroyingComponents.clear()

    if (errors.length === 1) throw errors[0]
    if (errors.length > 1)
      throw new AggregateError(errors, `Failed to destroy GameObject ${this.id}`)
  }

  #assertAlive() {
    if (this.#destroyed)
      throw new RuntimeLifecycleError(
        'object-destroyed',
        `GameObject ${this.id} has already been destroyed`,
      )
  }
}
