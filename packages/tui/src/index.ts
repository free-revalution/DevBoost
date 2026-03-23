// Core Framework
export { App } from './core/app.js';
export { EventManager, type KeyBinding, type EventType, type EventData, type EventHandler } from './core/event-manager.js';

// Panels
export {
  BasePanel,
  AgentPanel,
  ChatPanel,
  ModelPanel,
  ToolsPanel,
  SettingsPanel,
  type PanelState,
  type PanelConfig,
  type AgentPanelConfig,
  type ChatPanelConfig,
  type ModelPanelConfig,
  type ToolsPanelConfig,
  type SettingsPanelConfig,
  type AgentStatus,
  type ToolInfo,
  type SettingItem
} from './panels/index.js';

// Legacy exports (for backward compatibility)
export { CatppuccinMocha, type Theme } from './theme.js';
export { ScreenManager } from './screen.js';
export { MainLayout } from './layout.js';

// Interactive Components
export { ModelMenu, AddModelWizard, DeleteModelDialog } from './components/index.js';
export type { MenuResult, AddModelResult, ModelInfo } from './components/index.js';
