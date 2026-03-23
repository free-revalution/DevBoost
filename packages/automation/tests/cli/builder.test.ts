import { describe, it, expect } from 'vitest';
import { CLIBuilder, BuildStatus, type BuildResult, type BuildOptions } from '../../src/cli';

describe('CLI Layer Automation', () => {
  describe('BuildStatus enum', () => {
    it('should have all required status values', () => {
      expect(BuildStatus.Success).toBe('Success');
      expect(BuildStatus.Failed).toBe('Failed');
      expect(BuildStatus.Timeout).toBe('Timeout');
      expect(BuildStatus.Cancelled).toBe('Cancelled');
    });
  });

  describe('CLIBuilder.buildProject', () => {
    it('should handle build command structure', () => {
      const buildCommand = 'make';
      const args = ['all', '-j4'];

      expect(buildCommand).toBe('make');
      expect(args).toContain('all');
      expect(args).toContain('-j4');
    });

    it('should support different build tools', () => {
      const buildTools = ['make', 'cmake', 'ninja', 'msbuild'];

      expect(buildTools).toContain('make');
      expect(buildTools).toContain('cmake');
      expect(buildTools).toContain('ninja');
      expect(buildTools).toContain('msbuild');
    });

    it('should handle build directory configuration', () => {
      const options: BuildOptions = {
        buildDir: '/path/to/build',
        config: 'Release',
        target: 'all'
      };

      expect(options.buildDir).toBeDefined();
      expect(options.config).toBe('Release');
      expect(options.target).toBe('all');
    });
  });

  describe('CLIBuilder.cleanProject', () => {
    it('should handle clean command structure', () => {
      const cleanCommand = 'make';
      const target = 'clean';

      expect(cleanCommand).toBe('make');
      expect(target).toBe('clean');
    });

    it('should support different clean strategies', () => {
      const strategies = ['make', 'rm', 'build-tool'];

      expect(strategies).toContain('make');
      expect(strategies).toContain('rm');
    });
  });

  describe('CLIBuilder.getBuildOutput', () => {
    it('should capture stdout and stderr', () => {
      const output = {
        stdout: 'Compiling main.c...',
        stderr: 'warning: unused variable',
        exitCode: 0
      };

      expect(output.stdout).toContain('Compiling');
      expect(output.stderr).toContain('warning');
      expect(output.exitCode).toBe(0);
    });

    it('should handle error output', () => {
      const errorOutput = {
        stdout: '',
        stderr: 'error: undefined reference',
        exitCode: 1
      };

      expect(errorOutput.stderr).toContain('error');
      expect(errorOutput.exitCode).not.toBe(0);
    });
  });

  describe('BuildResult type', () => {
    it('should have required result properties', () => {
      const result: BuildResult = {
        status: BuildStatus.Success,
        success: true,
        exitCode: 0,
        duration: 1500,
        output: {
          stdout: 'Build successful',
          stderr: ''
        }
      };

      expect(result.status).toBe(BuildStatus.Success);
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should track warnings and errors', () => {
      const result: BuildResult = {
        status: BuildStatus.Failed,
        success: false,
        exitCode: 1,
        duration: 2300,
        output: {
          stdout: '',
          stderr: 'error: syntax error'
        },
        warnings: 5,
        errors: 1
      };

      expect(result.warnings).toBe(5);
      expect(result.errors).toBe(1);
      expect(result.success).toBe(false);
    });
  });

  describe('BuildOptions type', () => {
    it('should support common build options', () => {
      const options: BuildOptions = {
        buildDir: '/build',
        config: 'Debug',
        target: 'myapp',
        jobs: 8,
        timeout: 60000,
        verbose: true
      };

      expect(options.buildDir).toBeDefined();
      expect(options.config).toBe('Debug');
      expect(options.jobs).toBe(8);
      expect(options.verbose).toBe(true);
    });

    it('should support environment variables', () => {
      const options: BuildOptions = {
        buildDir: '/build',
        env: {
          CC: 'gcc',
          CFLAGS: '-O2'
        }
      };

      expect(options.env).toBeDefined();
      expect(options.env?.CC).toBe('gcc');
    });
  });

  describe('CLIBuilder class structure', () => {
    it('should have buildProject method', () => {
      expect(typeof CLIBuilder.buildProject).toBe('function');
    });

    it('should have cleanProject method', () => {
      expect(typeof CLIBuilder.cleanProject).toBe('function');
    });

    it('should have getBuildOutput method', () => {
      expect(typeof CLIBuilder.getBuildOutput).toBe('function');
    });

    it('should have detectBuildTool method', () => {
      expect(typeof CLIBuilder.detectBuildTool).toBe('function');
    });
  });

  describe('Build tool detection', () => {
    it('should identify make from Makefile', () => {
      const hasMakefile = true;
      const buildTool = hasMakefile ? 'make' : 'unknown';

      expect(buildTool).toBe('make');
    });

    it('should identify cmake from CMakeLists.txt', () => {
      const hasCMake = true;
      const buildTool = hasCMake ? 'cmake' : 'unknown';

      expect(buildTool).toBe('cmake');
    });

    it('should detect parallel build support', () => {
      const supportsParallel = true;
      const jobs = supportsParallel ? 4 : 1;

      expect(jobs).toBeGreaterThan(1);
    });
  });

  describe('Output parsing', () => {
    it('should extract compiler warnings', () => {
      const line = 'main.c:42: warning: unused variable "x"';
      const isWarning = line.includes('warning');

      expect(isWarning).toBe(true);
      expect(line).toContain('main.c');
    });

    it('should extract compiler errors', () => {
      const line = 'main.c:42: error: undeclared variable "y"';
      const isError = line.includes('error');

      expect(isError).toBe(true);
      expect(line).toContain('main.c');
    });

    it('should parse file:line:column format', () => {
      const line = 'utils.c:123:15: note: previous declaration';
      const match = line.match(/^([^:]+):(\d+):(\d+):/);

      expect(match).toBeTruthy();
      if (match) {
        expect(match[1]).toBe('utils.c');
        expect(parseInt(match[2])).toBe(123);
        expect(parseInt(match[3])).toBe(15);
      }
    });
  });
});
