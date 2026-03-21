import Anthropic from '@anthropic-ai/sdk';
import { BaseProvider } from './base.js';
import { Message, ChatOptions } from '../types.js';

export class AnthropicProvider extends BaseProvider {
  private client: Anthropic;

  constructor(apiKey: string, model: string = 'claude-sonnet-4-6') {
    super(apiKey, model);
    this.client = new Anthropic({ apiKey });
  }

  async chat(messages: Message[], options?: ChatOptions): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      messages: messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      })),
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 0.7
    });

    const block = response.content[0];
    if (block.type === 'text') {
      return block.text;
    }
    throw new Error('Unexpected response type');
  }
}
