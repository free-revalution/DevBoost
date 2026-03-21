/**
 * Context Manager for DevBoost Agent
 *
 * Manages conversation history, project state, and context persistence.
 */

import { Message, Role, Tool, AgentConfig, Context } from './types.js';
import { promises as fs } from 'fs';
import { join } from 'path';

export interface ContextOptions {
  maxHistorySize?: number;
  persistPath?: string;
  autoSave?: boolean;
}

export interface ProjectState {
  path: string;
  name?: string;
  type?: string;
  lastBuild?: string;
  lastFlash?: string;
  metadata?: Record<string, unknown>;
}

export interface ConversationState {
  messages: Message[];
  currentProject?: ProjectState;
  variables: Map<string, unknown>;
}

/**
 * Context Manager class
 *
 * Manages the conversational context and project state throughout
 * the agent's lifecycle.
 */
export class ContextManager {
  private state: ConversationState;
  private options: Required<ContextOptions>;
  private dirty: boolean;

  constructor(options: ContextOptions = {}) {
    this.options = {
      maxHistorySize: options.maxHistorySize ?? 100,
      persistPath: options.persistPath ?? '.devboost',
      autoSave: options.autoSave ?? true
    };

    this.state = {
      messages: [],
      variables: new Map()
    };

    this.dirty = false;
  }

  /**
   * Add a message to the conversation history
   */
  async addMessage(message: Message): Promise<void> {
    this.state.messages.push({
      ...message,
      timestamp: message.timestamp ?? Date.now()
    });

    // Trim history if needed
    if (this.state.messages.length > this.options.maxHistorySize) {
      this.state.messages = this.state.messages.slice(-this.options.maxHistorySize);
    }

    this.markDirty();

    if (this.options.autoSave) {
      await this.save();
    }
  }

  /**
   * Get all messages from the conversation history
   */
  getMessages(): Message[] {
    return [...this.state.messages];
  }

  /**
   * Get the last N messages
   */
  getRecentMessages(count: number): Message[] {
    return this.state.messages.slice(-count);
  }

  /**
   * Get messages since a specific timestamp
   */
  getMessagesSince(timestamp: number): Message[] {
    return this.state.messages.filter(m => (m.timestamp ?? 0) >= timestamp);
  }

  /**
   * Clear all messages from the conversation history
   */
  async clearMessages(): Promise<void> {
    this.state.messages = [];
    this.markDirty();

    if (this.options.autoSave) {
      await this.save();
    }
  }

  /**
   * Set the current project
   */
  async setProject(project: ProjectState): Promise<void> {
    this.state.currentProject = project;
    this.markDirty();

    if (this.options.autoSave) {
      await this.save();
    }
  }

  /**
   * Get the current project
   */
  getProject(): ProjectState | undefined {
    return this.state.currentProject;
  }

  /**
   * Clear the current project
   */
  async clearProject(): Promise<void> {
    this.state.currentProject = undefined;
    this.markDirty();

    if (this.options.autoSave) {
      await this.save();
    }
  }

  /**
   * Set a variable in the context
   */
  async setVariable(key: string, value: unknown): Promise<void> {
    this.state.variables.set(key, value);
    this.markDirty();

    if (this.options.autoSave) {
      await this.save();
    }
  }

  /**
   * Get a variable from the context
   */
  getVariable(key: string): unknown | undefined {
    return this.state.variables.get(key);
  }

  /**
   * Get all variables
   */
  getVariables(): Record<string, unknown> {
    return Object.fromEntries(this.state.variables);
  }

  /**
   * Check if a variable exists
   */
  hasVariable(key: string): boolean {
    return this.state.variables.has(key);
  }

  /**
   * Delete a variable
   */
  async deleteVariable(key: string): Promise<boolean> {
    const deleted = this.state.variables.delete(key);
    if (deleted) {
      this.markDirty();
      if (this.options.autoSave) {
        await this.save();
      }
    }
    return deleted;
  }

  /**
   * Get a summary of the conversation
   */
  getSummary(): string {
    const messageCount = this.state.messages.length;
    const userMessages = this.state.messages.filter(m => m.role === Role.User).length;
    const assistantMessages = this.state.messages.filter(m => m.role === Role.Assistant).length;

    let summary = `Conversation: ${messageCount} messages\n`;
    summary += `  User: ${userMessages}, Assistant: ${assistantMessages}\n`;

    if (this.state.currentProject) {
      summary += `\nCurrent Project:\n`;
      summary += `  Path: ${this.state.currentProject.path}\n`;
      if (this.state.currentProject.name) {
        summary += `  Name: ${this.state.currentProject.name}\n`;
      }
      if (this.state.currentProject.type) {
        summary += `  Type: ${this.state.currentProject.type}\n`;
      }
    }

    const variableCount = this.state.variables.size;
    if (variableCount > 0) {
      summary += `\nVariables: ${variableCount}\n`;
    }

    return summary;
  }

  /**
   * Export the entire context state
   */
  export(): ConversationState {
    return {
      messages: [...this.state.messages],
      currentProject: this.state.currentProject
        ? { ...this.state.currentProject }
        : undefined,
      variables: new Map(this.state.variables)
    };
  }

  /**
   * Import context state
   */
  async import(state: ConversationState): Promise<void> {
    this.state = {
      messages: [...state.messages],
      currentProject: state.currentProject
        ? { ...state.currentProject }
        : undefined,
      variables: new Map(state.variables)
    };

    this.markDirty();

    if (this.options.autoSave) {
      await this.save();
    }
  }

  /**
   * Save context to disk
   */
  async save(): Promise<void> {
    if (!this.dirty) {
      return;
    }

    try {
      const persistDir = this.options.persistPath;
      const contextFile = join(persistDir, 'context.json');

      // Ensure directory exists
      await fs.mkdir(persistDir, { recursive: true });

      // Serialize state
      const serialized = {
        messages: this.state.messages,
        currentProject: this.state.currentProject,
        variables: Object.fromEntries(this.state.variables)
      };

      await fs.writeFile(contextFile, JSON.stringify(serialized, null, 2), 'utf-8');
      this.dirty = false;
    } catch (error) {
      // Log but don't throw - context persistence shouldn't break the app
      console.error('Failed to save context:', error);
    }
  }

  /**
   * Load context from disk
   */
  async load(): Promise<void> {
    try {
      const contextFile = join(this.options.persistPath, 'context.json');
      const data = await fs.readFile(contextFile, 'utf-8');
      const parsed = JSON.parse(data);

      this.state = {
        messages: parsed.messages || [],
        currentProject: parsed.currentProject,
        variables: new Map(Object.entries(parsed.variables || {}))
      };

      this.dirty = false;
    } catch (error) {
      // File doesn't exist or is invalid - start fresh
      this.state = {
        messages: [],
        variables: new Map()
      };
      this.dirty = false;
    }
  }

  /**
   * Clear all context data
   */
  async clear(): Promise<void> {
    this.state = {
      messages: [],
      variables: new Map()
    };

    this.markDirty();

    if (this.options.autoSave) {
      await this.save();
    }
  }

  /**
   * Reset context to initial state
   */
  async reset(): Promise<void> {
    await this.clear();

    try {
      const contextFile = join(this.options.persistPath, 'context.json');
      await fs.unlink(contextFile);
    } catch (error) {
      // File doesn't exist - that's fine
    }
  }

  /**
   * Create a context snapshot for rollback
   */
  createSnapshot(): ConversationState {
    return this.export();
  }

  /**
   * Restore from a snapshot
   */
  async restoreSnapshot(snapshot: ConversationState): Promise<void> {
    await this.import(snapshot);
  }

  /**
   * Get context statistics
   */
  getStats(): {
    messageCount: number;
    variableCount: number;
    hasProject: boolean;
    isDirty: boolean;
  } {
    return {
      messageCount: this.state.messages.length,
      variableCount: this.state.variables.size,
      hasProject: !!this.state.currentProject,
      isDirty: this.dirty
    };
  }

  /**
   * Mark context as dirty
   */
  private markDirty(): void {
    this.dirty = true;
  }

  /**
   * Convert context to the legacy Context format
   */
  toLegacy(config: AgentConfig, tools: Tool[]): Context {
    return {
      messages: this.state.messages,
      tools,
      config,
      projectPath: this.state.currentProject?.path
    };
  }
}
