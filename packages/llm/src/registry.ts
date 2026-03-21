import { BaseProvider } from './providers/base.js';

export class ProviderRegistry {
  private providers = new Map<string, BaseProvider>();
  private current: BaseProvider | null = null;

  register(name: string, provider: BaseProvider): void {
    this.providers.set(name, provider);
  }

  use(name: string): BaseProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider '${name}' not found`);
    }
    this.current = provider;
    return provider;
  }

  getCurrent(): BaseProvider {
    if (!this.current) {
      throw new Error('No provider selected');
    }
    return this.current;
  }

  has(name: string): boolean {
    return this.providers.has(name);
  }

  list(): string[] {
    return Array.from(this.providers.keys());
  }
}
