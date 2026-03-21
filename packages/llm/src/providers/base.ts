import { Message, ChatOptions } from '../types.js';

export abstract class BaseProvider {
  constructor(
    public readonly apiKey: string,
    public readonly model: string = 'default'
  ) {}

  abstract chat(messages: Message[], options?: ChatOptions): Promise<string>;

  protected formatMessages(messages: Message[]): string {
    return messages.map(m => `${m.role}: ${m.content}`).join('\n');
  }
}
