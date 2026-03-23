/**
 * Tools Panel
 *
 * Displays available tools and their status.
 */

import blessed from 'blessed';
import { BasePanel, PanelConfig } from './base-panel.js';
import { EventManager } from '../core/event-manager.js';
import { Theme } from '../theme.js';

/**
 * Tool info for display
 */
export interface ToolInfo {
  name: string;
  description: string;
  enabled: boolean;
  category: 'builtin' | 'custom';
}

/**
 * Tools panel configuration
 */
export interface ToolsPanelConfig extends PanelConfig {
  getTools: () => ToolInfo[] | Promise<ToolInfo[]>;
  toggleTool?: (toolName: string) => void | Promise<void>;
}

/**
 * Tools Panel class
 */
export class ToolsPanel extends BasePanel {
  private getTools: () => ToolInfo[] | Promise<ToolInfo[]>;
  private toggleTool?: (toolName: string) => void | Promise<void>;
  private toolsList: ReturnType<typeof blessed.list>;

  constructor(
    screen: ReturnType<typeof blessed.screen>,
    eventManager: EventManager,
    config: ToolsPanelConfig
  ) {
    super(screen, eventManager, config);
    this.getTools = config.getTools;
    this.toggleTool = config.toggleTool;

    // Create tools list
    this.toolsList = blessed.list({
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
      ['t'],
      async () => {
        await this.toggleSelectedTool();
      },
      'Toggle tool',
      this.id
    );

    this.eventManager.registerKey(
      ['+'],
      async () => {
        // Add custom tool placeholder
      },
      'Add tool',
      this.id
    );
  }

  /**
   * Render the panel content
   */
  protected renderContent(): void {
    this.renderContentAsync().catch(error => {
      console.error('Error rendering tools panel:', error);
    });
  }

  /**
   * Async render implementation
   */
  private async renderContentAsync(): Promise<void> {
    const tools = await Promise.resolve(this.getTools());
    const builtinTools = tools.filter(t => t.category === 'builtin');
    const customTools = tools.filter(t => t.category === 'custom');

    // Update header
    const header = `可用工具 (${tools.length} 个)`;
    this.container.setLabel(header);

    // Format tools list
    const toolItems = [
      '{bold}内置工具:{/bold}',
      ...builtinTools.map(t => {
        const status = t.enabled ? '{green-fg}✓{/green-fg}' : '{gray-fg}✗{/gray-fg}';
        return `  ${status} ${t.name} - ${t.description}`;
      }),
      '',
      '{bold}自定义工具:{/bold}',
      ...customTools.map(t => {
        const status = t.enabled ? '{green-fg}✓{/green-fg}' : '{gray-fg}✗{/gray-fg}';
        return `  ${status} ${t.name} - ${t.description}`;
      })
    ];

    this.toolsList.setItems(toolItems);
    this.screen.render();
  }

  /**
   * Toggle selected tool
   */
  private async toggleSelectedTool(): Promise<void> {
    if (this.toggleTool) {
      const tools = await this.getTools();
      const selected = (this.toolsList as any).selected;

      // Find the actual tool (skip headers)
      let toolIndex = -1;
      let listIndex = 0;
      for (const tool of tools) {
        if (listIndex === selected) {
          toolIndex = tools.indexOf(tool);
          break;
        }
        listIndex++;
      }

      if (toolIndex >= 0) {
        await this.toggleTool(tools[toolIndex].name);
        this.renderContent();
        this.screen.render();
      }
    }
  }

  /**
   * Handle keyboard input
   */
  protected async handleKey(key: string): Promise<void> {
    switch (key) {
      case 't':
        await this.toggleSelectedTool();
        break;
    }
  }

  /**
   * Get key bindings for this panel
   */
  getKeyBindings(): Array<{ key: string; description: string }> {
    return [
      { key: 't', description: '切换工具启用状态' },
      { key: '+', description: '添加自定义工具' }
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
