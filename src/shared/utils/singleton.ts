/**
 * A mixin that adds Singleton pattern functionality to a class.
 * This ensures that only one instance of the class exists.
 *
 * @example
 * class MyStore extends Singleton(BaseClass) {
 *   // Your implementation
 * }
 */
export function Singleton<T extends new (...args: any[]) => any>(Base: T) {
  return class extends Base {
    private static instance: any = null;

    constructor(...args: any[]) {
      if (new.target.instance) {
        return new.target.instance;
      }
      super(...args);
      new.target.instance = this;
    }

    public static getInstance(...args: any[]): InstanceType<T> {
      if (!this.instance) {
        this.instance = new this(...args);
      }
      return this.instance;
    }
  };
}
