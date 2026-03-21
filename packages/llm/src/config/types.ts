export type ProviderType = 'anthropic' | 'openai-compatible';

export interface BaseProviderConfig {
  name: string;
  type: ProviderType;
  apiKey: string;
  model: string;
}

export interface AnthropicProviderConfig extends BaseProviderConfig {
  type: 'anthropic';
}

export interface OpenAICompatibleProviderConfig extends BaseProviderConfig {
  type: 'openai-compatible';
  baseUrl: string;
}

export type ProviderConfigEntry = AnthropicProviderConfig | OpenAICompatibleProviderConfig;

export interface ProviderConfig {
  providers: ProviderConfigEntry[];
  defaultProvider: string;
}
