import { readFile, watch } from "fs/promises"
import type { Provider, Unsubscribe } from "./types"

export class FileProvider<T> implements Provider<T> {
  constructor(private path: string) {}

  onChange(callback: (value: T) => void): Unsubscribe {
    const ac = new AbortController()

    this.loadAndWatch(callback, ac.signal)

    return () => ac.abort()
  }

  private async loadAndWatch(
    callback: (value: T) => void,
    signal: AbortSignal,
  ): Promise<void> {
    const load = async () => {
      const content = await readFile(this.path, "utf-8")
      callback(JSON.parse(content) as T)
    }

    await load()

    try {
      const watcher = watch(this.path, { signal })
      for await (const _ of watcher) {
        await load()
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return
      throw err
    }
  }
}
