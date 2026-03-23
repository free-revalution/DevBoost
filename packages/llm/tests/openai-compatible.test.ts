import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAICompatibleProvider } from '../src/providers/openai-compatible.js';
import { Message } from '../src/types.js';

describe('OpenAICompatibleProvider', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create instance with baseUrl, apiKey and model', () => {
    const provider = new OpenAICompatibleProvider('https://api.example.com', 'test-key', 'gpt-4');
    expect(provider.apiKey).toBe('test-key');
    expect(provider.model).toBe('gpt-4');
    expect(provider.baseUrl).toBe('https://api.example.com');
  });

  it('should use default baseUrl when not provided', () => {
    const provider = new OpenAICompatibleProvider(undefined, 'test-key', 'gpt-4');
    expect(provider.baseUrl).toBe('https://api.openai.com/v1');
  });

  it('should call chat and return response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Hello!' } }]
      })
    });

    const provider = new OpenAICompatibleProvider('https://api.example.com', 'test-key', 'gpt-4');
    const messages: Message[] = [
      { role: 'user', content: 'Hi' }
    ];

    const response = await provider.chat(messages);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-key'
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Hi' }],
          temperature: 0.7,
          max_tokens: 4096
        })
      }
    );
    expect(response).toBe('Hello!');
  });

  it('should use custom options when provided', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Custom response' } }]
      })
    });

    const provider = new OpenAICompatibleProvider('https://api.example.com', 'test-key', 'gpt-4');
    const messages: Message[] = [
      { role: 'user', content: 'Test' }
    ];

    await provider.chat(messages, { maxTokens: 1000, temperature: 0.5 });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-key'
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Test' }],
          temperature: 0.5,
          max_tokens: 1000
        })
      }
    );
  });

  it('should throw error on API error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500
    });

    const provider = new OpenAICompatibleProvider('https://api.example.com', 'test-key', 'gpt-4');
    const messages: Message[] = [
      { role: 'user', content: 'Test' }
    ];

    await expect(provider.chat(messages)).rejects.toThrow('API error: 500');
  });

  it('should return empty string when no content in response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: []
      })
    });

    const provider = new OpenAICompatibleProvider('https://api.example.com', 'test-key', 'gpt-4');
    const messages: Message[] = [
      { role: 'user', content: 'Test' }
    ];

    const response = await provider.chat(messages);
    expect(response).toBe('');
  });
});
