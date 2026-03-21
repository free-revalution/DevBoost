/**
 * Project Tool
 *
 * Initialize and manage embedded projects.
 */

import { BaseTool } from './base.js';
import { ToolResult } from '../types.js';
import { ProjectState, ContextManager } from '../context.js';

export interface ProjectToolParameters {
  action: 'init' | 'load' | 'save' | 'info';
  path?: string;
  name?: string;
  type?: string;
}

export class ProjectToolClass extends BaseTool {
  name = 'project';
  description = 'Initialize and manage embedded projects';
  parameters = {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['init', 'load', 'save', 'info'],
        description: 'Action to perform'
      },
      path: {
        type: 'string',
        description: 'Project path (required for init and load actions)'
      },
      name: {
        type: 'string',
        description: 'Project name (optional, for init action)'
      },
      type: {
        type: 'string',
        description: 'Project type (optional, for init action)'
      }
    },
    required: ['action']
  };

  private context?: ContextManager;

  setContext(context: ContextManager): void {
    this.context = context;
  }

  async execute(params: Record<string, unknown>): Promise<ToolResult> {
    // Validate required parameters
    const validation = this.validateRequired(params, ['action']);
    if (validation) {
      return validation;
    }

    const typedParams = params as unknown as ProjectToolParameters;
    const { action, path, name, type } = typedParams;

    try {
      switch (action) {
        case 'init':
          return await this.initProject(path, name, type);

        case 'load':
          return await this.loadProject(path);

        case 'save':
          return await this.saveProject();

        case 'info':
          return await this.getProjectInfo();

        default:
          return this.error(`Unknown action: ${action}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.error(`Project operation failed: ${errorMessage}`);
    }
  }

  private async initProject(
    path: string | undefined,
    name: string | undefined,
    type: string | undefined
  ): Promise<ToolResult> {
    if (!path) {
      return this.error('Project path is required for init action');
    }

    const { promises: fs } = await import('fs');

    // Check if path exists
    try {
      await fs.access(path);
    } catch {
      // Create directory if it doesn't exist
      await fs.mkdir(path, { recursive: true });
    }

    const projectInfo: ProjectState = {
      path,
      name: name || undefined,
      type: type || 'embedded'
    };

    // Update context if available
    if (this.context) {
      await this.context.setProject(projectInfo);
    }

    return this.success({
      message: 'Project initialized successfully',
      project: projectInfo
    });
  }

  private async loadProject(path: string | undefined): Promise<ToolResult> {
    if (!path) {
      return this.error('Project path is required for load action');
    }

    const { promises: fs } = await import('fs');

    // Check if path exists
    try {
      await fs.access(path);
    } catch {
      return this.error(`Project path not found: ${path}`);
    }

    // Try to detect project type by checking for common files
    let projectType = 'embedded';
    let projectName: string | undefined;

    try {
      // Check for Makefile
      await fs.access(`${path}/Makefile`);
      projectType = 'make';
    } catch {
      // Not a Make project
    }

    try {
      // Check for CMakeLists.txt
      await fs.access(`${path}/CMakeLists.txt`);
      projectType = 'cmake';
    } catch {
      // Not a CMake project
    }

    const projectInfo: ProjectState = {
      path,
      name: projectName,
      type: projectType,
      metadata: {
        detectedType: projectType
      }
    };

    // Update context if available
    if (this.context) {
      await this.context.setProject(projectInfo);
    }

    return this.success({
      message: 'Project loaded successfully',
      project: projectInfo
    });
  }

  private async saveProject(): Promise<ToolResult> {
    // In a real implementation, this would save project state
    // For now, just return success
    return this.success({
      message: 'Project state saved'
    });
  }

  private async getProjectInfo(): Promise<ToolResult> {
    // Get project from context if available
    if (this.context) {
      const project = this.context.getProject();
      if (project) {
        return this.success({
          message: 'Project information retrieved',
          project
        });
      }
    }

    // Return placeholder if no project is loaded
    return this.success({
      message: 'No project currently loaded',
      project: null
    });
  }
}

// Export as ProjectTool for compatibility
export const ProjectTool = ProjectToolClass;
