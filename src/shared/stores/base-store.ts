import type { Entity } from "../types/entity";

/**
 * Base store class that fetches JSON data from a URL and provides Map-based lookups.
 * Subclasses can override `processData` and `getItemKey` for custom behavior.
 */
export class BaseStore<T extends Entity> {
  protected data: Map<string, T> = new Map();
  protected readonly initialized: Promise<void>;

  constructor(protected dataUrl: string) {
    this.initialized = this.initialize();
  }

  protected async initialize(): Promise<void> {
    try {
      const response = await fetch(this.dataUrl);

      if (response.ok) {
        const result: Array<T> = await response.json();
        this.processData(result);
      } else {
        console.error(`Failed to fetch data. Status: ${response.status}`);
      }
    } catch (error) {
      console.error(
        `Error fetching ${this.constructor.name.replace("Store", "").toLowerCase()}s:`,
        error,
      );
    }
  }

  protected processData(data: Array<T>): void {
    this.data = new Map(
      data.flatMap((item) => {
        const key = this.getItemKey(item);
        return key ? [[key, item] as [string, T]] : [];
      }),
    );
  }

  protected getItemKey(item: T): string {
    return item.id;
  }

  public async getById(id: string): Promise<T | undefined> {
    await this.initialized;
    return this.data.get(id);
  }

  public async getAll(): Promise<T[]> {
    await this.initialized;
    return Array.from(this.data.values());
  }
}
