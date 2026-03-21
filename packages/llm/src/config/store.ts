import { promises as fs } from 'fs';
import { ProviderConfig } from './types.js';

export class ConfigStore {
  constructor(private readonly configPath: string) {}

  async save(config: ProviderConfig): Promise<void> {
    await fs.writeFile(
      this.configPath,
      JSON.stringify(config, null, 2),
      'utf-8'
    );
  }

  async load(): Promise<ProviderConfig> {
    const content = await fs.readFile(this.configPath, 'utf-8');
    return JSON.parse(content) as ProviderConfig;
  }
}
