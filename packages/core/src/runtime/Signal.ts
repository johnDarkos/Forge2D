export type SignalListener<T> = (value: T) => void
export type Unsubscribe = () => void

type SignalArguments<T> = [T] extends [void] ? [] : [value: T]

/** Небольшой синхронный типизированный канал событий без строковых имён. */
export class Signal<T = void> {
  readonly #listeners = new Set<SignalListener<T>>()

  get size() {
    return this.#listeners.size
  }

  on(listener: SignalListener<T>): Unsubscribe {
    this.#listeners.add(listener)
    return () => {
      this.#listeners.delete(listener)
    }
  }

  off(listener: SignalListener<T>) {
    return this.#listeners.delete(listener)
  }

  emit(...args: SignalArguments<T>) {
    const value = args[0] as T
    for (const listener of [...this.#listeners]) {
      if (this.#listeners.has(listener)) listener(value)
    }
  }

  clear() {
    this.#listeners.clear()
  }
}
