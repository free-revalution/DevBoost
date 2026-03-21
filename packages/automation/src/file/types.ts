/**
 * File edit operation types
 */
export type FileOperation = 'create' | 'modify' | 'delete' | 'rename' | 'copy';

/**
 * Edit mode for file operations
 */
export type EditMode = 'text' | 'regex' | 'line';

/**
 * File change record
 */
export interface FileChange {
  /** Path to the file that was changed */
  filePath: string;
  /** Operation performed */
  operation: FileOperation;
  /** Timestamp of the change */
  timestamp: number;
  /** Path to backup file if created */
  backupPath?: string;
  /** Original content before change */
  originalContent?: string;
  /** New content after change */
  newContent?: string;
  /** Whether the change was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Options for file editing operations
 */
export interface EditOptions {
  /** Create backup before editing */
  createBackup?: boolean;
  /** Dry run - don't actually make changes */
  dryRun?: boolean;
  /** Edit mode */
  mode?: EditMode;
  /** Case sensitive search */
  caseSensitive?: boolean;
  /** Multiple occurrences */
  replaceAll?: boolean;
  /** Encoding */
  encoding?: BufferEncoding;
  /** Preserve indentation */
  preserveIndentation?: boolean;
}

/**
 * Options for project configuration editing
 */
export interface ProjectConfigOptions extends EditOptions {
  /** Project file type */
  projectType?: 'uvprojx' | 'ioc' | 'ewp' | 'generic';
  /** Validate after edit */
  validate?: boolean;
}

/**
 * Source file update options
 */
export interface SourceUpdateOptions {
  /** Line number to update (1-based) */
  line?: number;
  /** Column number */
  column?: number;
  /** Content to insert/replace */
  content: string;
  /** Update strategy */
  strategy?: 'replace' | 'append' | 'prepend' | 'insert';
  /** Preserve indentation */
  preserveIndentation?: boolean;
}

/**
 * Backup information
 */
export interface BackupInfo {
  /** Original file path */
  originalPath: string;
  /** Backup file path */
  backupPath: string;
  /** Creation timestamp */
  timestamp: number;
  /** File size in bytes */
  size: number;
}
