/**
 * Notification Manager for TUI
 *
 * Provides real-time notifications for events, status updates, and alerts.
 */

import blessed from 'blessed';
import { Theme } from '../theme.js';

/**
 * Notification type
 */
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

/**
 * Notification configuration
 */
export interface NotificationConfig {
  message: string;
  type?: NotificationType;
  duration?: number; // Auto-dismiss duration in ms (0 for no auto-dismiss)
  position?: 'top' | 'bottom' | 'center';
  actions?: Array<{ label: string; callback: () => void }>;
}

/**
 * Notification Manager class
 */
export class NotificationManager {
  private screen: ReturnType<typeof blessed.screen>;
  private theme: Theme;
  private activeNotifications: Map<string, ReturnType<typeof blessed.box>>;
  private nextId: number = 0;

  constructor(screen: ReturnType<typeof blessed.screen>, theme: Theme) {
    this.screen = screen;
    this.theme = theme;
    this.activeNotifications = new Map();
  }

  /**
   * Show a notification
   */
  show(config: NotificationConfig): string {
    const id = `notification-${this.nextId++}`;
    const notification = this.createNotificationBox(config);

    this.activeNotifications.set(id, notification);
    this.screen.render();

    // Auto-dismiss if duration is set
    if (config.duration && config.duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, config.duration);
    }

    return id;
  }

  /**
   * Show an info notification
   */
  info(message: string, duration: number = 3000): string {
    return this.show({ message, type: 'info', duration });
  }

  /**
   * Show a success notification
   */
  success(message: string, duration: number = 3000): string {
    return this.show({ message, type: 'success', duration });
  }

  /**
   * Show a warning notification
   */
  warning(message: string, duration: number = 5000): string {
    return this.show({ message, type: 'warning', duration });
  }

  /**
   * Show an error notification
   */
  error(message: string, duration: number = 7000): string {
    return this.show({ message, type: 'error', duration });
  }

  /**
   * Dismiss a notification by ID
   */
  dismiss(id: string): void {
    const notification = this.activeNotifications.get(id);
    if (notification) {
      notification.destroy();
      this.activeNotifications.delete(id);
      this.screen.render();
    }
  }

  /**
   * Dismiss all active notifications
   */
  dismissAll(): void {
    for (const [id, notification] of this.activeNotifications) {
      notification.destroy();
    }
    this.activeNotifications.clear();
    this.screen.render();
  }

  /**
   * Get count of active notifications
   */
  getActiveCount(): number {
    return this.activeNotifications.size;
  }

  /**
   * Create notification box based on configuration
   */
  private createNotificationBox(config: NotificationConfig): ReturnType<typeof blessed.box> {
    const type = config.type || 'info';
    const colors = this.getTypeColors(type);
    const icon = this.getTypeIcon(type);

    // Calculate width based on message length
    const messageLines = config.message.split('\n');
    const maxLineLength = Math.max(...messageLines.map(l => l.length));
    const width = Math.max(maxLineLength + 8, 30);

    // Calculate height
    const contentHeight = messageLines.length + 2;
    const actionsHeight = config.actions ? 2 : 0;
    const height = contentHeight + actionsHeight;

    // Determine position
    let position: { top?: number | string; bottom?: number | string; left?: number | string } = {};
    switch (config.position) {
      case 'top':
        position = { top: 1 + this.activeNotifications.size * 2 };
        break;
      case 'bottom':
        position = { bottom: 1 + this.activeNotifications.size * 2 };
        break;
      case 'center':
      default:
        position = { top: 'center' };
        break;
    }

    // Create notification box
    const notification = blessed.box({
      parent: this.screen,
      left: 'center',
      width,
      height,
      border: {
        type: 'line',
        fg: colors.border
      },
      style: {
        bg: colors.bg,
        fg: this.theme.fg
      },
      tags: true,
      ...position
    } as any);

    // Add icon and message
    const content = `{${colors.fg}-fg}{bold}${icon}{/bold}{/${colors.fg}-fg} ${config.message}`;
    notification.setContent(content);

    // Add actions if provided
    if (config.actions && config.actions.length > 0) {
      const actionText = config.actions.map((a, i) => `${i + 1}:${a.label}`).join(' | ');
      const actionBar = blessed.text({
        parent: notification,
        bottom: 0,
        left: 1,
        content: actionText,
        tags: true
      });

      // Register key bindings for actions
      config.actions.forEach((action, index) => {
        const key = String(index + 1);
        this.screen.key([key], () => {
          action.callback();
          this.dismiss(notification as any);
        });
      });
    }

    // Allow dismiss with Escape or Enter
    const closeHandler = () => {
      const id = this.findNotificationId(notification);
      if (id) {
        this.dismiss(id);
      }
    };

    notification.key(['escape', 'enter'], closeHandler);

    // Focus notification if it's the only one
    if (this.activeNotifications.size === 0) {
      notification.focus();
    }

    return notification;
  }

  /**
   * Get colors for notification type
   */
  private getTypeColors(type: NotificationType): { bg: string; fg: string; border: string } {
    switch (type) {
      case 'success':
        return {
          bg: this.theme.bgDark,
          fg: 'green',
          border: this.theme.green
        };
      case 'warning':
        return {
          bg: this.theme.bgDark,
          fg: 'yellow',
          border: this.theme.yellow
        };
      case 'error':
        return {
          bg: this.theme.bgDark,
          fg: 'red',
          border: this.theme.red
        };
      case 'info':
      default:
        return {
          bg: this.theme.bgDark,
          fg: 'cyan',
          border: this.theme.cyan
        };
    }
  }

  /**
   * Get icon for notification type
   */
  private getTypeIcon(type: NotificationType): string {
    switch (type) {
      case 'success':
        return '✓';
      case 'warning':
        return '⚠';
      case 'error':
        return '✗';
      case 'info':
      default:
        return 'ℹ';
    }
  }

  /**
   * Find notification ID by element
   */
  private findNotificationId(element: ReturnType<typeof blessed.box>): string | null {
    for (const [id, notification] of this.activeNotifications) {
      if (notification === element) {
        return id;
      }
    }
    return null;
  }

  /**
   * Update theme for all active notifications
   */
  updateTheme(theme: Theme): void {
    this.theme = theme;
    // Note: Active notifications keep their old theme until dismissed
    // This is intentional to avoid visual jumps during theme changes
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.dismissAll();
  }
}

/**
 * Global notification instance (optional, for convenience)
 */
let globalNotificationManager: NotificationManager | null = null;

export function setGlobalNotificationManager(manager: NotificationManager): void {
  globalNotificationManager = manager;
}

export function getGlobalNotificationManager(): NotificationManager | null {
  return globalNotificationManager;
}

// Convenience functions if global manager is set
export function notify(config: NotificationConfig): string | null {
  if (globalNotificationManager) {
    return globalNotificationManager.show(config);
  }
  return null;
}

export function notifyInfo(message: string, duration?: number): string | null {
  if (globalNotificationManager) {
    return globalNotificationManager.info(message, duration);
  }
  return null;
}

export function notifySuccess(message: string, duration?: number): string | null {
  if (globalNotificationManager) {
    return globalNotificationManager.success(message, duration);
  }
  return null;
}

export function notifyWarning(message: string, duration?: number): string | null {
  if (globalNotificationManager) {
    return globalNotificationManager.warning(message, duration);
  }
  return null;
}

export function notifyError(message: string, duration?: number): string | null {
  if (globalNotificationManager) {
    return globalNotificationManager.error(message, duration);
  }
  return null;
}
