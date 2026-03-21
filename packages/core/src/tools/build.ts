/**
 * Build Tool
 *
 * Build embedded projects using various build tools.
 */

import { BaseTool } from './base.js';
import { ToolResult } from '../types.js';
import { CLIBuilder, BuildTool as AutoBuildTool, type BuildOptions } from '@devboost/automation';

export interface BuildToolParameters {
  projectPath: string;
  tool?: AutoBuildTool;
  configuration?: string;
  target?: string;
  clean?: boolean;
  options?: {
    jobs?: number;
    verbose?: boolean;
  };
}

export class BuildToolClass extends BaseTool {
  name = 'build';
  description = 'Build embedded projects using Make, CMake, or other build tools';
  parameters = {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: 'Path to the project directory'
      },
      tool: {
        type: 'string',
        enum: ['make', 'cmake', 'gcc', 'arm-none-eabi-gcc'],
        description: 'Build tool to use (auto-detect if not specified)'
      },
      configuration: {
        type: 'string',
        description: 'Build configuration (e.g., Debug, Release)'
      },
      target: {
        type: 'string',
        description: 'Build target (leave empty for default target)'
      },
      clean: {
        type: 'boolean',
        description: 'Clean before building (default: false)'
      },
      options: {
        type: 'object',
        description: 'Additional build options'
      }
    },
    required: ['projectPath']
  };

  async execute(params: Record<string, unknown>): Promise<ToolResult> {
    // Validate required parameters
    const validation = this.validateRequired(params, ['projectPath']);
    if (validation) {
      return validation;
    }

    try {
      const typedParams = params as unknown as BuildToolParameters;
      const {
        projectPath,
        tool,
        configuration: config,
        target,
        clean = false,
        options = {}
      } = typedParams;

      // Check if project path exists
      const { promises: fs } = await import('fs');
      try {
        await fs.access(projectPath);
      } catch {
        return this.error(`Project path not found: ${projectPath}`);
      }

      // Clean if requested
      if (clean) {
        const cleanResult = await CLIBuilder.cleanProject(projectPath, {});
        if (!cleanResult) {
          return this.error(`Clean operation failed`);
        }
      }

      // Execute build
      const buildOptions: BuildOptions = {
        config: config as any,
        target,
        jobs: options?.jobs,
        verbose: options?.verbose
      };

      const buildResult = await CLIBuilder.buildProject(projectPath, buildOptions);

      if (buildResult.success) {
        return this.success({
          message: 'Build completed successfully',
          tool: tool || 'auto-detected',
          configuration: config || 'default',
          output: buildResult.output,
          timeTaken: buildResult.duration
        });
      } else {
        return this.error(buildResult.errorMessage || 'Build operation failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.error(`Build operation failed: ${errorMessage}`);
    }
  }
}

// Export as BuildTool for compatibility
export const BuildTool = BuildToolClass;
