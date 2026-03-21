import { describe, it, expect } from 'vitest';
import { BaseProvider } from '../src/providers/base.js';
import { Message } from '../src/types.js';

class TestProvider extends BaseProvider {
  async chat(messages: Message[]): Promise<string> {
    return this.formatMessages(messages);
  }
}

describe('BaseProvider', () => {
  it('should store apiKey and model', () => {
    const provider = new TestProvider('test-key', 'test-model');
    expect(provider.apiKey).toBe('test-key');
    expect(provider.model).toBe('test-model');
  });

  it('should use default model when not provided', () => {
    const provider = new TestProvider('test-key');
    expect(provider.model).toBe('default');
  });

  it('should format messages correctly', () => {
    const provider = new TestProvider('test-key');
    const messages: Message[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' }
    ];
    const formatted = provider.formatMessages(messages);
    expect(formatted).toBe('user: Hello\nassistant: Hi there');
  });

  it('should require chat implementation', () => {
    const provider = new TestProvider('test-key');
    expect(typeof provider.chat).toBe('function');
  });
});
