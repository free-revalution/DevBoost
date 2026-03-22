/**
 * DevBoost Agent Runtime
 *
 * The main agent that orchestrates all components.
 */

import { Message, Role, Tool, ToolResult, AgentConfig } from './types.js';
import { ToolRegistry } from './registry.js';
import { IntentParser, IntentType } from './parser.js';
import { ContextManager, ContextOptions } from './context.js';
import { ProviderRegistry, AnthropicProvider, OpenAICompatibleProvider } from '@devboost/llm';
import {
  LLMTool,
  FlashToolClass,
  BuildToolClass,
  ProjectToolClass,
  ConfigTool,
  DetectToolClass
} from './tools/index.js';

export interface ModelConfig {
  provider: string;
  modelName: string;
  apiKey: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AgentOptions {
  config: AgentConfig;
  context?: ContextOptions;
  modelConfig?: ModelConfig;
}

export interface ProcessResult {
  response: string;
  toolUsed?: string;
  toolResult?: ToolResult;
  metadata?: Record<string, unknown>;
}

/**
 * DevBoost Agent class
 *
 * Orchestrates LLM interactions, tool execution, and context management.
 */
export class Agent {
  private config: AgentConfig;
  private registry: ToolRegistry;
  private parser: IntentParser;
  private context: ContextManager;
  private llmRegistry: ProviderRegistry;
  private initialized: boolean;
  private modelConfig?: ModelConfig;

  constructor(options: AgentOptions) {
    this.config = options.config;
    this.modelConfig = options.modelConfig;
    this.registry = new ToolRegistry();
    this.parser = new IntentParser();
    this.context = new ContextManager(options.context);
    this.llmRegistry = new ProviderRegistry();
    this.initialized = false;
  }

  /**
   * Initialize the agent
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Load context from disk
    await this.context.load();

    // Initialize LLM provider
    await this.initializeLLMProvider();

    // Register built-in tools
    this.registerBuiltinTools();

    this.initialized = true;
  }

  /**
   * Process a user message
   */
  async process(userMessage: string): Promise<ProcessResult> {
    if (!this.initialized) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    // Add user message to context
    await this.context.addMessage({
      role: Role.User,
      content: userMessage
    });

    // Parse intent
    const parseResult = this.parser.parse(userMessage);

    // Execute appropriate tool
    let toolResult: ToolResult | undefined;
    let toolUsed: string | undefined;

    if (parseResult.suggestedTool && this.registry.has(parseResult.suggestedTool)) {
      const tool = this.registry.get(parseResult.suggestedTool);
      if (tool) {
        toolUsed = tool.name;
        toolResult = await this.executeTool(tool, parseResult.intent.parameters);
      }
    }

    // Generate response
    let response: string;

    if (toolResult?.success) {
      // Tool executed successfully, generate response based on result
      response = await this.generateResponse(userMessage, toolResult, toolUsed);
    } else if (toolResult?.error) {
      // Tool execution failed, generate error response
      response = await this.generateErrorResponse(userMessage, toolResult.error);
    } else {
      // No tool was used or tool wasn't available, use LLM directly
      response = await this.generateLLMResponse(userMessage);
    }

    // Add assistant response to context
    await this.context.addMessage({
      role: Role.Assistant,
      content: response,
      metadata: {
        toolUsed,
        toolResult
      }
    });

    return {
      response,
      toolUsed,
      toolResult,
      metadata: {
        intent: parseResult.intent.type,
        confidence: parseResult.intent.confidence
      }
    };
  }

  /**
   * Execute a tool with error handling
   */
  async executeTool(tool: Tool, parameters: Record<string, unknown>): Promise<ToolResult> {
    try {
      const result = await tool.execute(parameters);

      // Log tool execution
      if (result.success) {
        console.log(`Tool '${tool.name}' executed successfully`);
      } else {
        console.error(`Tool '${tool.name}' failed: ${result.error}`);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Tool '${tool.name}' threw error: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Shutdown the agent
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    // Save context
    await this.context.save();

    // Cleanup
    this.initialized = false;
  }

  /**
   * Get the context manager
   */
  getContext(): ContextManager {
    return this.context;
  }

  /**
   * Get the tool registry
   */
  getToolRegistry(): ToolRegistry {
    return this.registry;
  }

  /**
   * Get the intent parser
   */
  getIntentParser(): IntentParser {
    return this.parser;
  }

  /**
   * Register a custom tool
   */
  registerTool(tool: Tool): void {
    this.registry.register(tool);
  }

  /**
   * Initialize LLM provider from config
   */
  private async initializeLLMProvider(): Promise<void> {
    // If modelConfig is provided, use it to create the provider
    if (this.modelConfig) {
      const { provider, modelName, apiKey, baseUrl, maxTokens, temperature } = this.modelConfig;

      // Create provider based on type
      let providerInstance;
      switch (provider) {
        case 'anthropic':
          providerInstance = new AnthropicProvider(apiKey, modelName);
          break;
        case 'openai':
        case 'openai-compatible':
          providerInstance = new OpenAICompatibleProvider(baseUrl, apiKey, modelName);
          break;
        case 'ollama':
          // Ollama typically runs on localhost:11434
          providerInstance = new OpenAICompatibleProvider(
            baseUrl || 'http://localhost:11434/v1',
            apiKey || 'ollama', // Ollama doesn't require API key
            modelName
          );
          break;
        default:
          throw new Error(`Unknown provider type: ${provider}`);
      }

      // Register the provider
      this.llmRegistry.register(provider, providerInstance);

      // Set as current
      this.llmRegistry.use(provider);

      console.log(`LLM Provider initialized: ${provider}/${modelName}`);
    } else {
      // Fallback to old config-based initialization
      const providerType = ConfigTool.getConfigValue('llm.provider') as string || this.config.llmProvider;
      const model = ConfigTool.getConfigValue('llm.model') as string || this.config.model;
      console.log(`LLM Provider: ${providerType}, Model: ${model} (config-based)`);
    }
  }

  /**
   * Register built-in tools
   */
  private registerBuiltinTools(): void {
    // LLM Tool
    this.registry.register(new LLMTool(this.llmRegistry));

    // Flash Tool
    this.registry.register(new FlashToolClass());

    // Build Tool
    this.registry.register(new BuildToolClass());

    // Project Tool
    const projectTool = new ProjectToolClass();
    projectTool.setContext(this.context);
    this.registry.register(projectTool);

    // Config Tool
    this.registry.register(new ConfigTool());

    // Detect Tool
    this.registry.register(new DetectToolClass());
  }

  /**
   * Generate a response based on tool result
   */
  private async generateResponse(
    userMessage: string,
    toolResult: ToolResult,
    toolUsed?: string
  ): Promise<string> {
    const context = this.context.toLegacy(this.config, this.registry.list());

    // Build prompt for LLM
    const prompt = this.buildResponsePrompt(userMessage, toolResult, toolUsed);

    // Get LLM response
    try {
      const provider = this.llmRegistry.getCurrent();
      if (!provider) {
        return this.formatToolResult(toolResult, toolUsed);
      }

      const response = await provider.chat([
        { role: 'system', content: this.getSystemPrompt() },
        ...context.messages.slice(-10).map(m => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content
        })),
        { role: 'user', content: prompt }
      ]);

      return response;
    } catch (error) {
      // Fallback to simple formatting if LLM fails
      return this.formatToolResult(toolResult, toolUsed);
    }
  }

  /**
   * Generate an error response
   */
  private async generateErrorResponse(userMessage: string, error: string): Promise<string> {
    try {
      const provider = this.llmRegistry.getCurrent();
      if (!provider) {
        return `I encountered an error: ${error}\n\nNote: No LLM provider is configured. Use "config set llm.provider <provider>" to configure one.`;
      }

      const context = this.context.toLegacy(this.config, this.registry.list());

      const prompt = `The user asked: "${userMessage}"\n\nAn error occurred: ${error}\n\nPlease provide a helpful response explaining the error and suggesting solutions.`;

      const response = await provider.chat([
        { role: 'system', content: this.getSystemPrompt() },
        ...context.messages.slice(-10).map(m => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content
        })),
        { role: 'user', content: prompt }
      ]);

      return response;
    } catch (providerError) {
      // If provider access fails, return simple error message
      return `I encountered an error: ${error}\n\nNote: No LLM provider is configured. Use "config set llm.provider <provider>" to configure one.`;
    }
  }

  /**
   * Generate a direct LLM response
   */
  private async generateLLMResponse(userMessage: string): Promise<string> {
    const provider = this.llmRegistry.getCurrent();
    if (!provider) {
      return 'I apologize, but no LLM provider is configured. Please configure an LLM provider first using "config set llm.provider <provider>".';
    }

    const context = this.context.toLegacy(this.config, this.registry.list());

    try {
      const response = await provider.chat([
        { role: 'system', content: this.getSystemPrompt() },
        ...context.messages.slice(-10).map(m => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content
        }))
      ]);

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return `I apologize, but I encountered an error: ${errorMessage}`;
    }
  }

  /**
   * Build a prompt for response generation
   */
  private buildResponsePrompt(
    userMessage: string,
    toolResult: ToolResult,
    toolUsed?: string
  ): string {
    let prompt = `The user asked: "${userMessage}"\n\n`;

    if (toolUsed) {
      prompt += `I executed the '${toolUsed}' tool.\n\n`;
      prompt += `Result: ${JSON.stringify(toolResult.data, null, 2)}\n\n`;
    }

    prompt += 'Please provide a helpful response to the user based on this result.';

    return prompt;
  }

  /**
   * Format tool result as a simple string
   */
  private formatToolResult(toolResult: ToolResult, toolUsed?: string): string {
    let response = '';

    if (toolUsed) {
      response += `Executed: ${toolUsed}\n\n`;
    }

    if (toolResult.data) {
      response += `Result:\n${JSON.stringify(toolResult.data, null, 2)}`;
    }

    return response || 'Operation completed successfully.';
  }

  /**
   * Get the system prompt for the LLM
   */
  private getSystemPrompt(): string {
    return `You are DevBoost, an intelligent assistant for embedded development.

Your capabilities include:
- Building embedded projects (Make, CMake, etc.)
- Flashing firmware to devices
- Managing project configurations
- Providing technical assistance

You are helpful, technical, and precise in your responses.`;
  }
}
