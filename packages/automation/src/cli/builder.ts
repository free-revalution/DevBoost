import { execaCommand } from 'execa';
import { existsSync } from 'fs';
import { join } from 'path';
import {
  BuildStatus,
  type BuildResult,
  type BuildOptions,
  type CleanOptions,
  type BuildTool,
  type BuildOutput
} from './types.js';

/**
 * CLI Layer Automation
 *
 * Provides functionality to build, clean, and manage
 * embedded projects using various build tools.
 */
export class CLIBuilder {
  /**
   * Build a project
   *
   * @param projectPath - Path to project directory
   * @param options - Build options
   * @returns Build result
   */
  static async buildProject(
    projectPath: string,
    options: BuildOptions = {}
  ): Promise<BuildResult> {
    const startTime = Date.now();
    const buildTool = await this.detectBuildTool(projectPath);

    try {
      const { command: cmd, args } = this.getBuildCommand(buildTool, options);
      const cwd = options.buildDir || projectPath;

      const result = await execaCommand(`${cmd} ${args.join(' ')}`, {
        cwd,
        timeout: options.timeout || 300000, // 5 minutes default
        env: { ...process.env, ...options.env },
        reject: false
      });

      const duration = Date.now() - startTime;
      const output = this.parseBuildOutput(result.stdout, result.stderr);

      if (result.exitCode === 0) {
        return {
          status: BuildStatus.Success,
          success: true,
          exitCode: result.exitCode || 0,
          duration,
          output,
          warnings: output.warnings,
          errors: output.errors
        };
      } else {
        return {
          status: BuildStatus.Failed,
          success: false,
          exitCode: result.exitCode || 1,
          duration,
          output,
          warnings: output.warnings,
          errors: output.errors,
          errorMessage: this.extractErrorMessage(output)
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check for timeout
      if (errorMessage.includes('timeout') || errorMessage.includes('TIMEDOUT')) {
        return {
          status: BuildStatus.Timeout,
          success: false,
          exitCode: -1,
          duration,
          output: { stdout: '', stderr: errorMessage },
          errorMessage: 'Build timed out'
        };
      }

      return {
        status: BuildStatus.Failed,
        success: false,
        exitCode: -1,
        duration,
        output: { stdout: '', stderr: errorMessage },
        errorMessage
      };
    }
  }

  /**
   * Clean build artifacts
   *
   * @param projectPath - Path to project directory
   * @param options - Clean options
   * @returns True if clean was successful
   */
  static async cleanProject(
    projectPath: string,
    options: CleanOptions = {}
  ): Promise<boolean> {
    const buildTool = await this.detectBuildTool(projectPath);

    try {
      const { command: cmd, args } = this.getCleanCommand(buildTool, options);
      const cwd = options.buildDir || projectPath;

      const result = await execaCommand(`${cmd} ${args.join(' ')}`, {
        cwd,
        timeout: 60000, // 1 minute
        reject: false
      });

      return (result.exitCode || 0) === 0;
    } catch {
      return false;
    }
  }

  /**
   * Get build output from the last build
   *
   * @param projectPath - Path to project directory
   * @returns Build output or null
   */
  static async getBuildOutput(projectPath: string): Promise<BuildOutput | null> {
    // In a real implementation, this would read from a log file
    // or cache the last build output
    return {
      stdout: '',
      stderr: '',
      combined: ''
    };
  }

  /**
   * Detect the build tool used by a project
   *
   * @param projectPath - Path to project directory
   * @returns Detected build tool
   */
  static async detectBuildTool(projectPath: string): Promise<BuildTool> {
    // Check for CMake
    if (existsSync(join(projectPath, 'CMakeLists.txt'))) {
      return 'cmake';
    }

    // Check for Makefile
    if (existsSync(join(projectPath, 'Makefile')) ||
        existsSync(join(projectPath, 'makefile'))) {
      return 'make';
    }

    // Check for build.ninja (Ninja)
    if (existsSync(join(projectPath, 'build.ninja'))) {
      return 'ninja';
    }

    // Check for Visual Studio solution
    const solutions = [
      join(projectPath, '*.sln'),
      join(projectPath, '*.vcxproj')
    ];
    for (const pattern of solutions) {
      // In a real implementation, we would use glob to check
      // For now, just return unknown
    }

    return 'unknown';
  }

  /**
   * Get build command for a build tool
   *
   * @param tool - Build tool
   * @param options - Build options
   * @returns Command and arguments
   */
  private static getBuildCommand(
    tool: BuildTool,
    options: BuildOptions
  ): { command: string; args: string[] } {
    const args: string[] = [];

    switch (tool) {
      case 'make':
        return {
          command: 'make',
          args: this.getMakeArgs(options)
        };

      case 'cmake':
        return {
          command: 'cmake',
          args: this.getCMakeArgs(options)
        };

      case 'ninja':
        return {
          command: 'ninja',
          args: this.getNinjaArgs(options)
        };

      case 'msbuild':
        return {
          command: 'msbuild',
          args: this.getMSBuildArgs(options)
        };

      case 'xcodebuild':
        return {
          command: 'xcodebuild',
          args: this.getXcodeBuildArgs(options)
        };

      default:
        throw new Error(`Unsupported build tool: ${tool}`);
    }
  }

  /**
   * Get clean command for a build tool
   *
   * @param tool - Build tool
   * @param options - Clean options
   * @returns Command and arguments
   */
  private static getCleanCommand(
    tool: BuildTool,
    options: CleanOptions
  ): { command: string; args: string[] } {
    switch (tool) {
      case 'make':
        return {
          command: 'make',
          args: options.all ? ['distclean'] : ['clean']
        };

      case 'cmake':
        return {
          command: 'cmake',
          args: ['--build', '.', '--target', 'clean']
        };

      case 'ninja':
        return {
          command: 'ninja',
          args: ['clean']
        };

      default:
        return {
          command: tool,
          args: ['clean']
        };
    }
  }

  /**
   * Get make build arguments
   *
   * @param options - Build options
   * @returns Arguments array
   */
  private static getMakeArgs(options: BuildOptions): string[] {
    const args: string[] = [];

    if (options.jobs) {
      args.push(`-j${options.jobs}`);
    }

    if (options.target) {
      args.push(options.target);
    } else {
      args.push('all');
    }

    if (options.verbose) {
      args.push('VERBOSE=1');
    }

    if (options.args) {
      args.push(...options.args);
    }

    return args;
  }

  /**
   * Get CMake build arguments
   *
   * @param options - Build options
   * @returns Arguments array
   */
  private static getCMakeArgs(options: BuildOptions): string[] {
    const args = ['--build', '.'];

    if (options.config) {
      args.push('--config', options.config);
    }

    if (options.target) {
      args.push('--target', options.target);
    }

    if (options.jobs) {
      args.push('--parallel', options.jobs.toString());
    }

    if (options.verbose) {
      args.push('--verbose');
    }

    return args;
  }

  /**
   * Get Ninja build arguments
   *
   * @param options - Build options
   * @returns Arguments array
   */
  private static getNinjaArgs(options: BuildOptions): string[] {
    const args: string[] = [];

    if (options.jobs) {
      args.push(`-j${options.jobs}`);
    }

    if (options.target) {
      args.push(options.target);
    }

    if (options.verbose) {
      args.push('-v');
    }

    return args;
  }

  /**
   * Get MSBuild arguments
   *
   * @param options - Build options
   * @returns Arguments array
   */
  private static getMSBuildArgs(options: BuildOptions): string[] {
    const args: string[] = [];

    if (options.config) {
      args.push(`/p:Configuration=${options.config}`);
    }

    if (options.target) {
      args.push(`/t:${options.target}`);
    }

    if (options.verbose) {
      args.push('/v:detailed');
    }

    if (options.jobs) {
      args.push(`/m:${options.jobs}`);
    }

    return args;
  }

  /**
   * Get xcodebuild arguments
   *
   * @param options - Build options
   * @returns Arguments array
   */
  private static getXcodeBuildArgs(options: BuildOptions): string[] {
    const args: string[] = [];

    if (options.config) {
      args.push('-configuration', options.config);
    }

    if (options.target) {
      args.push('-target', options.target);
    }

    if (options.jobs) {
      args.push('-jobs', options.jobs.toString());
    }

    return args;
  }

  /**
   * Parse build output and count warnings/errors
   *
   * @param stdout - Standard output
   * @param stderr - Standard error
   * @returns Parsed output with counts
   */
  private static parseBuildOutput(stdout: string, stderr: string): BuildOutput & {
    warnings: number;
    errors: number;
  } {
    const combined = stdout + '\n' + stderr;
    const lines = combined.split('\n');

    let warnings = 0;
    let errors = 0;

    for (const line of lines) {
      if (line.includes(' warning:')) {
        warnings++;
      }
      if (line.includes(' error:') || line.includes(' fatal error:')) {
        errors++;
      }
    }

    return {
      stdout,
      stderr,
      combined,
      warnings,
      errors
    };
  }

  /**
   * Extract error message from build output
   *
   * @param output - Build output
   * @returns Error message
   */
  private static extractErrorMessage(output: BuildOutput & { errors?: number }): string {
    if (output.errors && output.errors > 0) {
      return `Build failed with ${output.errors} error(s)`;
    }

    // Look for error patterns
    const errorPatterns = [
      /error:\s*(.+)/,
      /undefined reference to (.+)/,
      /multiple definition of (.+)/
    ];

    const combined = output.combined || output.stderr || '';
    for (const pattern of errorPatterns) {
      const match = combined.match(pattern);
      if (match) {
        return match[1] || match[0];
      }
    }

    return 'Build failed';
  }
}
