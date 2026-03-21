import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

export class ProjectManager {
  readonly projectPath: string;
  readonly configPath: string;

  constructor(projectPath: string = process.cwd()) {
    this.projectPath = projectPath;
    this.configPath = path.join(projectPath, '.devboost');
  }

  async init(): Promise<void> {
    await fs.mkdir(this.configPath, { recursive: true });
    const dirs = ['skills', 'history', 'context', 'cache'];
    for (const dir of dirs) {
      await fs.mkdir(path.join(this.configPath, dir), { recursive: true });
    }
    const configPath = path.join(this.configPath, 'config.json');
    try { await fs.access(configPath); } catch {
      await fs.writeFile(configPath, JSON.stringify({
        version: '0.1.0',
        llmProvider: 'anthropic',
        createdAt: new Date().toISOString()
      }, null, 2));
    }
  }

  isInitialized(): boolean {
    try { return existsSync(this.configPath); }
    catch { return false; }
  }
}
