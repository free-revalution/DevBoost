import { describe, it, expect, vi } from 'vitest';
import { AnthropicProvider } from '../src/providers/anthropic.js';
import { Message } from '../src/types.js';

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn()
    }
  }))
}));

describe('AnthropicProvider', () => {
  it('should create instance with apiKey and model', () => {
    const provider = new AnthropicProvider('test-key', 'claude-sonnet-4-6');
    expect(provider.apiKey).toBe('test-key');
    expect(provider.model).toBe('claude-sonnet-4-6');
  });

  it('should use default model when not provided', () => {
    const provider = new AnthropicProvider('test-key');
    expect(provider.model).toBe('claude-sonnet-4-6');
  });

  it('should call chat with messages and return text response', async () => {
    const Anthropic = await import('@anthropic-ai/sdk');
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Hello!' }]
    });
    (Anthropic.default as any).mockImplementation(() => ({
      messages: { create: mockCreate }
    }));

    const provider = new AnthropicProvider('test-key');
    const messages: Message[] = [
      { role: 'user', content: 'Hi' }
    ];

    const response = await provider.chat(messages);

    expect(mockCreate).toHaveBeenCalledWith({
      model: 'claude-sonnet-4-6',
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 4096,
      temperature: 0.7
    });
    expect(response).toBe('Hello!');
  });

  it('should use custom options when provided', async () => {
    const Anthropic = await import('@anthropic-ai/sdk');
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Custom response' }]
    });
    (Anthropic.default as any).mockImplementation(() => ({
      messages: { create: mockCreate }
    }));

    const provider = new AnthropicProvider('test-key');
    const messages: Message[] = [
      { role: 'user', content: 'Test' }
    ];

    await provider.chat(messages, { maxTokens: 1000, temperature: 0.5 });

    expect(mockCreate).toHaveBeenCalledWith({
      model: 'claude-sonnet-4-6',
      messages: [{ role: 'user', content: 'Test' }],
      max_tokens: 1000,
      temperature: 0.5
    });
  });

  it('should throw error on unexpected response type', async () => {
    const Anthropic = await import('@anthropic-ai/sdk');
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'image', source: {} }]
    });
    (Anthropic.default as any).mockImplementation(() => ({
      messages: { create: mockCreate }
    }));

    const provider = new AnthropicProvider('test-key');
    const messages: Message[] = [
      { role: 'user', content: 'Test' }
    ];

    await expect(provider.chat(messages)).rejects.toThrow('Unexpected response type');
  });
});
