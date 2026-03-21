import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { dirname, basename, join } from 'path';
import type {
  FileChange,
  EditOptions,
  ProjectConfigOptions,
  SourceUpdateOptions,
  BackupInfo
} from './types.js';

/**
 * File Layer Automation
 *
 * Provides safe file editing capabilities with backup and rollback support.
 */
export class FileEditor {
  private static readonly changeHistory: FileChange[] = [];
  private static readonly backups: Map<string, BackupInfo> = new Map();

  /**
   * Create a backup of a file
   *
   * @param filePath - Path to the file to backup
   * @returns Backup information
   */
  static createBackup(filePath: string): BackupInfo {
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const backupPath = this.getBackupPath(filePath);
    const stats = statSync(filePath);

    // Ensure backup directory exists
    const backupDir = dirname(backupPath);
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true });
    }

    // Create backup
    copyFileSync(filePath, backupPath);

    const backupInfo: BackupInfo = {
      originalPath: filePath,
      backupPath,
      timestamp: Date.now(),
      size: stats.size
    };

    this.backups.set(filePath, backupInfo);

    return backupInfo;
  }

  /**
   * Generate a backup file path with timestamp
   *
   * @param filePath - Original file path
   * @returns Backup file path
   */
  static getBackupPath(filePath: string): string {
    const dir = dirname(filePath);
    const name = basename(filePath);
    const timestamp = Date.now();
    return join(dir, `${name}.backup.${timestamp}`);
  }

  /**
   * Restore a file from backup
   *
   * @param filePath - Original file path
   * @returns True if restore was successful
   */
  static restoreBackup(filePath: string): boolean {
    const backup = this.backups.get(filePath);

    if (!backup) {
      throw new Error(`No backup found for: ${filePath}`);
    }

    if (!existsSync(backup.backupPath)) {
      throw new Error(`Backup file not found: ${backup.backupPath}`);
    }

    copyFileSync(backup.backupPath, filePath);
    return true;
  }

  /**
   * Edit project configuration file
   *
   * @param filePath - Path to project file
   * @param edits - Array of edits to apply (search/replace pairs)
   * @param options - Edit options
   * @returns File change record
   */
  static editProjectConfig(
    filePath: string,
    edits: Array<{ search: string | RegExp; replace: string }>,
    options: ProjectConfigOptions = {}
  ): FileChange {
    const {
      createBackup: shouldBackup = true,
      dryRun = false,
      mode = 'text',
      validate = true
    } = options;

    const change: FileChange = {
      filePath,
      operation: 'modify',
      timestamp: Date.now(),
      success: false
    };

    try {
      // Read file
      let content = readFileSync(filePath, options.encoding || 'utf-8');
      change.originalContent = content;

      // Create backup if requested
      if (shouldBackup && !dryRun) {
        const backup = this.createBackup(filePath);
        change.backupPath = backup.backupPath;
      }

      // Apply edits
      for (const edit of edits) {
        if (mode === 'regex' || edit.search instanceof RegExp) {
          const regex = edit.search instanceof RegExp ? edit.search : new RegExp(edit.search as string, 'g');
          content = content.replace(regex, edit.replace);
        } else {
          const searchStr = edit.search as string;
          const searchRegex = options.replaceAll !== false
            ? new RegExp(searchStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
            : new RegExp(searchStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

          content = content.replace(searchRegex, edit.replace);
        }
      }

      change.newContent = content;

      // Write file (unless dry run)
      if (!dryRun) {
        writeFileSync(filePath, content, options.encoding || 'utf-8');
      }

      // Validate if requested
      if (validate && !dryRun) {
        // Basic validation - file should still exist and be readable
        if (!existsSync(filePath)) {
          throw new Error('File validation failed: file does not exist after edit');
        }
      }

      change.success = true;
      this.changeHistory.push(change);
    } catch (error) {
      change.success = false;
      change.error = error instanceof Error ? error.message : String(error);

      // Rollback on error if backup was created
      if (change.backupPath && existsSync(change.backupPath)) {
        try {
          this.restoreBackup(filePath);
        } catch (restoreError) {
          change.error += ` | Rollback failed: ${restoreError}`;
        }
      }

      this.changeHistory.push(change);
      throw error;
    }

    return change;
  }

  /**
   * Update a source file
   *
   * @param filePath - Path to source file
   * @param updates - Update options
   * @param editOptions - Edit options
   * @returns File change record
   */
  static updateSourceFile(
    filePath: string,
    updates: SourceUpdateOptions,
    editOptions: EditOptions = {}
  ): FileChange {
    const {
      createBackup: shouldBackup = true,
      dryRun = false,
      preserveIndentation = true
    } = editOptions;

    const change: FileChange = {
      filePath,
      operation: 'modify',
      timestamp: Date.now(),
      success: false
    };

    try {
      // Read file
      let content = readFileSync(filePath, editOptions.encoding || 'utf-8');
      change.originalContent = content;

      // Create backup if requested
      if (shouldBackup && !dryRun) {
        const backup = this.createBackup(filePath);
        change.backupPath = backup.backupPath;
      }

      // Apply update based on strategy
      const newContent = this.applyUpdate(content, updates, preserveIndentation);
      change.newContent = newContent;

      // Write file (unless dry run)
      if (!dryRun) {
        writeFileSync(filePath, newContent, editOptions.encoding || 'utf-8');
      }

      change.success = true;
      this.changeHistory.push(change);
    } catch (error) {
      change.success = false;
      change.error = error instanceof Error ? error.message : String(error);

      // Rollback on error if backup was created
      if (change.backupPath && existsSync(change.backupPath)) {
        try {
          this.restoreBackup(filePath);
        } catch (restoreError) {
          change.error += ` | Rollback failed: ${restoreError}`;
        }
      }

      this.changeHistory.push(change);
      throw error;
    }

    return change;
  }

  /**
   * Apply update to content based on strategy
   *
   * @param content - Original content
   * @param updates - Update options
   * @param preserveIndentation - Whether to preserve indentation
   * @returns Updated content
   */
  private static applyUpdate(
    content: string,
    updates: SourceUpdateOptions,
    preserveIndentation: boolean
  ): string {
    const lines = content.split('\n');
    const { line, column, content: newContent, strategy = 'replace' } = updates;

    switch (strategy) {
      case 'replace':
        if (line !== undefined) {
          const index = line - 1; // Convert to 0-based
          if (index >= 0 && index < lines.length) {
            if (preserveIndentation) {
              const existingLine = lines[index];
              const indent = existingLine.match(/^\s*/)?.[0] || '';
              lines[index] = indent + newContent.trimStart();
            } else {
              lines[index] = newContent;
            }
          }
        }
        break;

      case 'append':
        if (line !== undefined) {
          const index = line - 1;
          if (index >= 0 && index < lines.length) {
            if (preserveIndentation) {
              const existingLine = lines[index];
              const indent = existingLine.match(/^\s*/)?.[0] || '';
              lines[index] = existingLine.trimEnd() + ' ' + newContent;
            } else {
              lines[index] = lines[index] + newContent;
            }
          }
        }
        break;

      case 'prepend':
        if (line !== undefined) {
          const index = line - 1;
          if (index >= 0 && index < lines.length) {
            if (preserveIndentation) {
              const existingLine = lines[index];
              const indent = existingLine.match(/^\s*/)?.[0] || '';
              lines[index] = indent + newContent + ' ' + existingLine.trim();
            } else {
              lines[index] = newContent + lines[index];
            }
          }
        }
        break;

      case 'insert':
        if (line !== undefined) {
          const index = line - 1;
          if (preserveIndentation && index >= 0 && index < lines.length) {
            const existingLine = lines[index];
            const indent = existingLine.match(/^\s*/)?.[0] || '';
            lines.splice(index, 0, indent + newContent);
          } else {
            lines.splice(index, 0, newContent);
          }
        }
        break;
    }

    return lines.join('\n');
  }

  /**
   * Get change history
   *
   * @param filePath - Optional file path to filter by
   * @returns Array of file changes
   */
  static getChangeHistory(filePath?: string): FileChange[] {
    if (filePath) {
      return this.changeHistory.filter(c => c.filePath === filePath);
    }
    return [...this.changeHistory];
  }

  /**
   * Clear change history
   */
  static clearChangeHistory(): void {
    this.changeHistory.length = 0;
  }

  /**
   * Get all backups
   *
   * @returns Map of file paths to backup info
   */
  static getBackups(): Map<string, BackupInfo> {
    return new Map(this.backups);
  }

  /**
   * Clean up old backups
   *
   * @param olderThan - Age in milliseconds
   * @returns Number of backups cleaned up
   */
  static cleanupOldBackups(olderThan: number): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [filePath, backup] of this.backups.entries()) {
      if (now - backup.timestamp > olderThan) {
        // In a real implementation, we would delete the backup file here
        this.backups.delete(filePath);
        cleaned++;
      }
    }

    return cleaned;
  }
}
