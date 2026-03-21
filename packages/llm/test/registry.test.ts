import { describe, it, expect, beforeEach } from 'vitest';
import { ProviderRegistry } from '../src/registry.js';
import { BaseProvider } from '../src/providers/base.js';
import { Message } from '../src/types.js';

class MockProvider extends BaseProvider {
  async chat(messages: Message[]): Promise<string> {
    return `Mock response: ${messages.length} messages`;
  }
}

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry;
  let provider1: MockProvider;
  let provider2: MockProvider;

  beforeEach(() => {
    registry = new ProviderRegistry();
    provider1 = new MockProvider('key1', 'model1');
    provider2 = new MockProvider('key2', 'model2');
  });

  it('should register providers', () => {
    registry.register('provider1', provider1);
    expect(registry.has('provider1')).toBe(true);
  });

  it('should list all registered providers', () => {
    registry.register('provider1', provider1);
    registry.register('provider2', provider2);
    const list = registry.list();
    expect(list).toHaveLength(2);
    expect(list).toContain('provider1');
    expect(list).toContain('provider2');
  });

  it('should use a registered provider', () => {
    registry.register('provider1', provider1);
    const provider = registry.use('provider1');
    expect(provider).toBe(provider1);
  });

  it('should throw error when using non-existent provider', () => {
    expect(() => registry.use('nonexistent')).toThrow("Provider 'nonexistent' not found");
  });

  it('should get current provider after use', () => {
    registry.register('provider1', provider1);
    registry.use('provider1');
    const current = registry.getCurrent();
    expect(current).toBe(provider1);
  });

  it('should throw error when no provider is selected', () => {
    expect(() => registry.getCurrent()).toThrow('No provider selected');
  });

  it('should switch current provider', () => {
    registry.register('provider1', provider1);
    registry.register('provider2', provider2);
    registry.use('provider1');
    expect(registry.getCurrent()).toBe(provider1);
    registry.use('provider2');
    expect(registry.getCurrent()).toBe(provider2);
  });

  it('should check if provider exists', () => {
    registry.register('provider1', provider1);
    expect(registry.has('provider1')).toBe(true);
    expect(registry.has('provider2')).toBe(false);
  });
});
