/**
 * LLM Tool
 *
 * Queries the LLM for assistance, explanations, and code generation.
 */

import { BaseTool } from './base.js';
import { ToolResult } from '../types.js';
import { ProviderRegistry } from '@devboost/llm';

export interface LLMToolParameters {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export class LLMTool extends BaseTool {
  name = 'llm';
  description = 'Query the LLM for assistance, explanations, and code generation';
  parameters = {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'The prompt to send to the LLM'
      },
      systemPrompt: {
        type: 'string',
        description: 'Optional system prompt to guide the LLM behavior'
      },
      temperature: {
        type: 'number',
        description: 'Temperature for response generation (0-1)'
      },
      maxTokens: {
        type: 'number',
        description: 'Maximum tokens to generate'
      }
    },
    required: ['prompt']
  };

  private llmRegistry: ProviderRegistry;

  constructor(llmRegistry: ProviderRegistry) {
    super();
    this.llmRegistry = llmRegistry;
  }

  async execute(params: Record<string, unknown>): Promise<ToolResult> {
    // Validate required parameters
    const validation = this.validateRequired(params, ['prompt']);
    if (validation) {
      return validation;
    }

    try {
      const typedParams = params as unknown as LLMToolParameters;
      const { prompt, systemPrompt, temperature, maxTokens } = typedParams;

      // Get the current provider
      const provider = this.llmRegistry.getCurrent();
      if (!provider) {
        return this.error('No LLM provider configured. Please configure an LLM provider first.');
      }

      // Build messages
      const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];

      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }

      messages.push({ role: 'user', content: prompt });

      // Generate response
      const options: { temperature?: number; maxTokens?: number } = {};
      if (temperature !== undefined) {
        options.temperature = temperature;
      }
      if (maxTokens !== undefined) {
        options.maxTokens = maxTokens;
      }

      const response = await provider.chat(messages, options);

      return this.success({
        response,
        model: 'llm'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.error(`LLM query failed: ${errorMessage}`);
    }
  }
}
