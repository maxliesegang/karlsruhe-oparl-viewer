import type { Entity } from "../types/entity";

/**
 * Base store class that implements common functionality for all stores.
 * This class uses the Singleton pattern and provides methods for fetching and accessing data.
 */
export abstract class BaseStore<T extends Entity> {
  protected data: Map<string, T> = new Map();
  protected readonly initialized: Promise<void>;

  protected constructor(protected dataUrl: string) {
    this.initialized = this.initialize();
  }

  /**
   * Initializes the store by fetching data from the specified URL.
   */
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

  /**
   * Processes the fetched data and stores it in the data map.
   * This method can be overridden by subclasses to provide custom data processing.
   */
  protected processData(data: Array<T>): void {
    this.data = new Map(
      data
        .filter(
          (item) =>
            this.getItemKey(item) !== "" &&
            this.getItemKey(item) !== undefined &&
            this.getItemKey(item) !== null,
        )
        .map((item) => [this.getItemKey(item), item]),
    );
  }

  /**
   * Gets the key to use for storing the item in the data map.
   * By default, this is the item's id, but subclasses can override this method.
   */
  protected getItemKey(item: T): string {
    return item.id;
  }

  /**
   * Gets an item by its key.
   */
  public async getById(id: string): Promise<T | undefined> {
    await this.initialized;
    return this.data.get(id);
  }

  /**
   * Gets all items in the store.
   */
  public async getAll(): Promise<T[]> {
    await this.initialized;
    return Array.from(this.data.values());
  }
}
