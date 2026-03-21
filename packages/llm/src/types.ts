export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  role: MessageRole;
  content: string;
}

export interface ChatOptions {
  maxTokens?: number;
  temperature?: number;
}
