/**
 * Core type definitions for DevBoost Agent
 */

export enum Role {
  User = 'user',
  Assistant = 'assistant',
  System = 'system'
}

export interface Message {
  role: Role;
  content: string;
  timestamp?: number;
  metadata?: Record<string, unknown>;
}

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (params: Record<string, unknown>) => Promise<ToolResult>;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface AgentConfig {
  llmProvider: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface Context {
  messages: Message[];
  tools: Tool[];
  config: AgentConfig;
  projectPath?: string;
}
