import { BaseProvider } from './base.js';
import { Message, ChatOptions } from '../types.js';

export class OpenAICompatibleProvider extends BaseProvider {
  public readonly baseUrl: string;

  constructor(baseUrl: string | undefined, apiKey: string, model: string) {
    super(apiKey, model);
    this.baseUrl = baseUrl ?? 'https://api.openai.com/v1';
  }

  async chat(messages: Message[], options?: ChatOptions): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 4096
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json() as { choices: Array<{ message?: { content?: string } }> };
    return data.choices[0]?.message?.content ?? '';
  }
}
