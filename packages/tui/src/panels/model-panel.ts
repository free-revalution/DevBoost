/**
 * Model Panel
 *
 * Displays configured models and allows switching/adding/removing.
 */

import blessed from 'blessed';
import { BasePanel, PanelConfig } from './base-panel.js';
import { EventManager } from '../core/event-manager.js';
import { Theme } from '../theme.js';

/**
 * Model configuration (re-exported from CLI)
 */
export interface ModelConfig {
  id: string;
  provider: string;
  modelName: string;
  apiKey: string;
  maxTokens: number;
  temperature: number;
  baseUrl?: string;
  createdAt: string;
  isDefault?: boolean;
}

/**
 * Model panel configuration
 */
export interface ModelPanelConfig extends PanelConfig {
  getModels: () => ModelConfig[];
  getCurrentModelId: () => string | null;
  switchModel: (modelId: string) => void | Promise<void>;
  addModel?: () => void | Promise<void>;
  removeModel?: (modelId: string) => void | Promise<void>;
}

/**
 * Model Panel class
 */
export class ModelPanel extends BasePanel {
  private getModels: () => ModelConfig[];
  private getCurrentModelId: () => string | null;
  private switchModel: (modelId: string) => void | Promise<void>;
  private addModel?: () => void | Promise<void>;
  private removeModel?: (modelId: string) => void | Promise<void>;
  private modelList: ReturnType<typeof blessed.list>;
  private selectedIndex: number = 0;

  constructor(
    screen: ReturnType<typeof blessed.screen>,
    eventManager: EventManager,
    config: ModelPanelConfig
  ) {
    super(screen, eventManager, config);
    this.getModels = config.getModels;
    this.getCurrentModelId = config.getCurrentModelId;
    this.switchModel = config.switchModel;
    this.addModel = config.addModel;
    this.removeModel = config.removeModel;

    // Create model list
    this.modelList = blessed.list({
      parent: this.container,
      top: 2,
      left: 2,
      width: '100%-4',
      height: '100%-8',
      tags: true,
      style: {
        bg: this.theme.bg,
        fg: this.theme.fg,
        selected: {
          bg: this.theme.bgLight,
          fg: this.theme.mauve
        }
      },
      border: {
        type: 'line',
        fg: this.theme.border as any
      },
      scrollable: true,
      keys: true,
      vi: true,
      mouse: true
    });

    // Setup key bindings
    this.setupKeyBindings();

    // Initial render
    this.renderContent();
  }

  /**
   * Setup key bindings for this panel
   */
  private setupKeyBindings(): void {
    this.eventManager.registerKey(
      ['enter'],
      async () => {
        await this.selectModel();
      },
      'Switch to model',
      this.id
    );

    this.eventManager.registerKey(
      ['a'],
      async () => {
        await this.addNewModel();
      },
      'Add model',
      this.id
    );

    this.eventManager.registerKey(
      ['d'],
      async () => {
        await this.deleteModel();
      },
      'Delete model',
      this.id
    );
  }

  /**
   * Render the panel content
   */
  protected renderContent(): void {
    const models = this.getModels();
    const currentModelId = this.getCurrentModelId();

    // Update header
    const header = `模型配置 (${models.length} 个模型)`;
    this.container.setLabel(header);

    // Update model list
    const modelItems = models.map((model, index) => {
      const isCurrent = model.id === currentModelId;
      const prefix = isCurrent ? '→ ' : '  ';
      const highlight = isCurrent ? `{${this.theme.mauve}-fg}{bold}` : '';
      const reset = isCurrent ? '{' + '/}' : '';
      return `${highlight}${prefix}${model.provider}/${model.modelName}${reset}`;
    });

    this.modelList.setItems(modelItems);
  }

  /**
   * Select and switch to a model
   */
  private async selectModel(): Promise<void> {
    const models = this.getModels();
    const selected = (this.modelList as any).selected;

    if (selected !== undefined && selected < models.length) {
      const model = models[selected];
      await this.switchModel(model.id);
      this.renderContent();
      this.screen.render();
    }
  }

  /**
   * Add a new model
   */
  private async addNewModel(): Promise<void> {
    if (this.addModel) {
      await this.addModel();
      this.renderContent();
      this.screen.render();
    }
  }

  /**
   * Delete the selected model
   */
  private async deleteModel(): Promise<void> {
    const models = this.getModels();
    const selected = (this.modelList as any).selected;

    if (selected !== undefined && selected < models.length && this.removeModel) {
      const model = models[selected];

      // Show confirmation dialog
      const confirmBox = blessed.box({
        parent: this.screen,
        top: 'center',
        left: 'center',
        width: 50,
        height: 8,
        border: {
          type: 'line',
          fg: this.theme.red
        },
        style: {
          bg: this.theme.bgDark,
          fg: this.theme.fg
        },
        content: `确认删除模型?\n\n  ${model.provider}/${model.modelName}\n\n  Enter: 确认 | Esc: 取消`
      } as any);

      const closeConfirm = () => {
        confirmBox.destroy();
        this.screen.render();
      };

      const doDelete = async () => {
        if (this.removeModel) {
          await this.removeModel(model.id);
          this.renderContent();
        }
        closeConfirm();
      };

      this.screen.key(['escape'], closeConfirm);
      this.screen.key(['enter'], doDelete);

      this.screen.render();
    }
  }

  /**
   * Handle keyboard input
   */
  protected async handleKey(key: string): Promise<void> {
    switch (key) {
      case 'enter':
        await this.selectModel();
        break;
      case 'a':
        await this.addNewModel();
        break;
      case 'd':
        await this.deleteModel();
        break;
    }
  }

  /**
   * Get key bindings for this panel
   */
  getKeyBindings(): Array<{ key: string; description: string }> {
    return [
      { key: 'Enter', description: '切换模型' },
      { key: 'a', description: '添加模型' },
      { key: 'd', description: '删除模型' }
    ];
  }

  /**
   * Refresh the panel content
   */
  refresh(): void {
    super.refresh();
    this.renderContent();
  }
}
