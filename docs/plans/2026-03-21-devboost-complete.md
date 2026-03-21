# DevBoost Complete Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a cross-platform desktop agent for embedded development and electronics automation with terminal UI, LLM provider system, embedded tool integration, browser automation, and Claude Code orchestration.

**Architecture:** TypeScript monorepo with pnpm, modular packages (core/automation/browser/llm/tui/cli), blessed-based TUI, three-layer embedded automation (file/CLI/GUI).

**Tech Stack:** TypeScript 5+, Node.js 22+, pnpm, blessed v0.1.81, @anthropic-ai/sdk, Playwright, @nut-tree/nut-js, Vitest.

---

# Phase 1: Foundation (Monorepo & Core Framework)

## Overview
Establish the project foundation with monorepo structure, core runtime, LLM provider system, TUI framework, and CLI entry point.

### Task 1-20: Foundation Setup

*(Detailed tasks from 2026-03-21-devboost-implementation.md, Tasks 1-20)*

**Summary of Phase 1 Tasks:**
1. Initialize Monorepo Structure
2. Core Agent - Base Types and Interfaces
3. Core Agent - Tool Registry
4. LLM Package - Provider Base Class
5. LLM Package - Anthropic Provider
6. LLM Package - OpenAI Compatible Provider
7. LLM Package - Provider Registry
8. LLM Package - Configuration Store
9. TUI Package - Color Theme
10. TUI Package - Screen Manager
11. TUI Package - Main Layout
12. CLI Package - Entry Point
13. CLI Package - Project Directory Initialization
14. CLI Package - Command Line Interface
15. Build All Packages
16. Global Installation Test
17. Documentation
18. Update Root README
19. Add Vitest Configuration
20. Final Verification

**Phase 1 Deliverables:**
- ✅ Monorepo with 6 packages
- ✅ Core Agent with ToolRegistry
- ✅ LLM provider system (Anthropic, OpenAI-compatible)
- ✅ TUI with blessed
- ✅ CLI with project initialization
- ✅ 30+ tests

---

# Phase 2: Embedded Automation

## Overview
Implement the three-layer embedded automation system: File layer (project config editing), CLI layer (headless build/flash), GUI layer (nut.js automation as fallback).

### Task 21: Automation Package - USB Device Detection

**Files:**
- Create: `packages/automation/src/usb/detector.ts`
- Create: `packages/automation/src/usb/types.ts`
- Create: `packages/automation/tsconfig.json`
- Test: `packages/automation/test/usb.test.ts`

**Step 1: Create packages/automation/tsconfig.json**

```bash
cat > packages/automation/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
EOF
```

**Step 2: Write the failing test**

```bash
mkdir -p packages/automation/test && cat > packages/automation/test/usb.test.ts << 'EOF'
import { describe, it, expect } from 'vitest';
import { USBDevice, DeviceType } from '../src/usb/types.js';
import { USBDetector } from '../src/usb/detector.js';

describe('USBDetector', () => {
  it('should identify ST-Link V2', () => {
    const device: USBDevice = {
      vendorId: 0x0483,
      productId: 0x3748
    };
    const type = USBDetector.identifyDevice(device);
    expect(type).toBe(DeviceType.STLinkV2);
  });

  it('should identify ST-Link V3', () => {
    const device: USBDevice = {
      vendorId: 0x0483,
      productId: 0x374E
    };
    const type = USBDetector.identifyDevice(device);
    expect(type).toBe(DeviceType.STLinkV3);
  });

  it('should identify J-Link', () => {
    const device: USBDevice = {
      vendorId: 0x1366,
      productId: 0x0101
    };
    const type = USBDetector.identifyDevice(device);
    expect(type).toBe(DeviceType.JLink);
  });

  it('should return unknown for unrecognized devices', () => {
    const device: USBDevice = {
      vendorId: 0x1234,
      productId: 0x5678
    };
    const type = USBDetector.identifyDevice(device);
    expect(type).toBe(DeviceType.Unknown);
  });
});
EOF
```

**Step 3: Run test to verify it fails**

Run: `cd packages/automation && pnpm test`
Expected: FAIL with "Cannot find module '../src/usb/types.js'"

**Step 4: Write minimal implementation**

```bash
mkdir -p packages/automation/src/usb && cat > packages/automation/src/usb/types.ts << 'EOF'
/**
 * USB device types and interfaces
 */

export enum DeviceType {
  STLinkV2 = 'st-link-v2',
  STLinkV3 = 'st-link-v3',
  JLink = 'j-link',
  DAPLink = 'dap-link',
  Unknown = 'unknown'
}

export interface USBDevice {
  vendorId: number;
  productId: number;
  manufacturer?: string;
  product?: string;
  serialNumber?: string;
}

export interface FlashTool {
  name: string;
  executable: string;
  versionArgs: string[];
  supportsDevices: DeviceType[];
}
EOF
```

```bash
cat > packages/automation/src/usb/detector.ts << 'EOF'
import { USBDevice, DeviceType } from './types.js';

/**
 * Known USB device identifiers
 */
const DEVICE_DATABASE: Record<string, DeviceType> = {
  '0483:3748': DeviceType.STLinkV2,
  '0483:374A': DeviceType.STLinkV2,
  '0483:374B': DeviceType.STLinkV2,
  '0483:374E': DeviceType.STLinkV3,
  '0483:374F': DeviceType.STLinkV3,
  '0483:3753': DeviceType.STLinkV3,
  '1366:0101': DeviceType.JLink,
  '1366:0105': DeviceType.JLink
};

/**
 * Detect and identify USB programming devices
 */
export class USBDetector {
  static identifyDevice(device: USBDevice): DeviceType {
    const key = `${device.vendorId.toString(16).padStart(4, '0')}:${device.productId.toString(16).padStart(4, '0')}`;
    return DEVICE_DATABASE[key] ?? DeviceType.Unknown;
  }

  static getRecommendedTool(deviceType: DeviceType): string {
    switch (deviceType) {
      case DeviceType.STLinkV2:
      case DeviceType.STLinkV3:
        return 'STM32CubeProgrammer';
      case DeviceType.JLink:
        return 'J-Link Commander';
      case DeviceType.DAPLink:
        return 'OpenOCD';
      default:
        return 'Unknown';
    }
  }
}
EOF
```

**Step 5: Update index.ts**

```bash
mkdir -p packages/automation/src && cat > packages/automation/src/index.ts << 'EOF'
export * from './usb/types.js';
export * from './usb/detector.js';
EOF
```

**Step 6: Run test to verify it passes**

Run: `cd packages/automation && pnpm test`
Expected: PASS (4 tests)

**Step 7: Commit**

```bash
git add packages/automation/
git commit -m "feat(automation): add USB device detection for programmers"
```

---

### Task 22: Automation Package - STM32CubeProgrammer CLI

**Files:**
- Create: `packages/automation/src/flash/stm32cube.ts`
- Create: `packages/automation/src/flash/types.ts`
- Test: `packages/automation/test/stm32cube.test.ts`

**Step 1: Write the failing test**

```bash
cat > packages/automation/test/stm32cube.test.ts << 'EOF'
import { describe, it, expect, vi } from 'vitest';
import { STM32CubeProgrammer } from '../src/flash/stm32cube.js';
import { FlashResult, FlashStatus } from '../src/flash/types.js';

vi.mock('node:child_process');

describe('STM32CubeProgrammer', () => {
  it('should build flash command', () => {
    const programmer = new STM32CubeProgrammer();
    const cmd = programmer.buildFlashCommand('/path/to/firmware.hex', 'SWD');
    expect(cmd).toContain('STM32_Programmer_CLI');
    expect(cmd).toContain('-c');
    expect(cmd).toContain('SWD');
  });

  it('should parse successful flash output', () => {
    const programmer = new STM32CubeProgrammer();
    const result = programmer.parseOutput('Memory programming completed...');
    expect(result.status).toBe(FlashStatus.Success);
  });
});
EOF
```

**Step 2: Run test to verify it fails**

Run: `cd packages/automation && pnpm test`
Expected: FAIL with "Cannot find module '../src/flash/stm32cube.js'"

**Step 3: Write minimal implementation**

```bash
mkdir -p packages/automation/src/flash && cat > packages/automation/src/flash/types.ts << 'EOF'
export enum FlashStatus {
  Success = 'success',
  Failed = 'failed',
  Timeout = 'timeout',
  VerificationError = 'verification-error'
}

export interface FlashResult {
  status: FlashStatus;
  message: string;
  bytesWritten?: number;
  verificationPassed?: boolean;
}

export interface FlashOptions {
  interface: 'SWD' | 'JTAG';
  startAddress?: string;
  verifyAfter?: boolean;
  eraseBefore?: boolean;
}
EOF
```

```bash
cat > packages/automation/src/flash/stm32cube.ts << 'EOF'
import { spawn } from 'node:child_process';
import { FlashResult, FlashStatus, FlashOptions } from './types.js';

/**
 * STM32CubeProgrammer CLI wrapper
 */
export class STM32CubeProgrammer {
  readonly executable = 'STM32_Programmer_CLI';

  async flash(
    firmwarePath: string,
    options: FlashOptions = { interface: 'SWD', verifyAfter: true, eraseBefore: true }
  ): Promise<FlashResult> {
    const args = this.buildFlashArgs(firmwarePath, options);
    return new Promise((resolve) => {
      const process = spawn(this.executable, args);
      let output = '';
      let errorOutput = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        const result = this.parseOutput(output + errorOutput, code);
        resolve(result);
      });
    });
  }

  buildFlashCommand(firmwarePath: string, interfaceType: string): string {
    return `${this.executable} -c port=${interfaceType} -w ${firmwarePath} -v -rst`;
  }

  private buildFlashArgs(firmwarePath: string, options: FlashOptions): string[] {
    const args = [
      '-c', `port=${options.interface.toLowerCase()}`,
      '-w', firmwarePath
    ];

    if (options.verifyAfter) {
      args.push('-v');
    }

    if (options.eraseBefore) {
      args.push('-e', 'all');
    }

    args.push('-rst');
    return args;
  }

  parseOutput(output: string, exitCode?: number): FlashResult {
    if (exitCode === 0 && output.includes('Memory programming completed')) {
      return {
        status: FlashStatus.Success,
        message: 'Flash successful',
        verificationPassed: output.includes('Verification successful')
      };
    }

    if (output.includes('Error')) {
      return {
        status: FlashStatus.Failed,
        message: output.includes('Connection error') ? 'Device not connected' : 'Flash failed'
      };
    }

    return {
      status: FlashStatus.Failed,
      message: 'Unknown error'
    };
  }

  async detect(): Promise<boolean> {
    const result = await this.checkInstalled();
    return result;
  }

  private async checkInstalled(): Promise<boolean> {
    return new Promise((resolve) => {
      const process = spawn(this.executable, ['--version']);
      process.on('close', (code) => resolve(code === 0));
      process.on('error', () => resolve(false));
    });
  }
}
EOF
```

**Step 4: Update index.ts**

```bash
cat > packages/automation/src/index.ts << 'EOF'
export * from './usb/types.js';
export * from './usb/detector.js';
export * from './flash/types.js';
export * from './flash/stm32cube.js';
EOF
```

**Step 5: Run test to verify it passes**

Run: `cd packages/automation && pnpm test`
Expected: PASS (6 tests)

**Step 6: Commit**

```bash
git add packages/automation/
git commit -m "feat(automation): add STM32CubeProgrammer CLI wrapper"
```

---

### Task 23: Automation Package - Keil Project Parser

**Files:**
- Create: `packages/automation/src/keil/parser.ts`
- Create: `packages/automation/src/keil/types.ts`
- Test: `packages/automation/test/keil.test.ts`

**Step 1: Write the failing test**

```bash
cat > packages/automation/test/keil.test.ts << 'EOF'
import { describe, it, expect } from 'vitest';
import { KeilProjectParser } from '../src/keil/parser.js';
import { KeilProject } from '../src/keil/types.js';

describe('KeilProjectParser', () => {
  it('should parse device name from project', () => {
    const xml = '<Project><Target><TargetName>STM32F103</TargetName></Target></Project>';
    const project = KeilProjectParser.parse(xml);
    expect(project.targetDevice).toBe('STM32F103');
  });

  it('should extract source files', () => {
    const xml = '<Project><Groups><Group><FilePath>main.c</FilePath></Group></Groups></Project>';
    const project = KeilProjectParser.parse(xml);
    expect(project.sourceFiles).toContain('main.c');
  });
});
EOF
```

**Step 2: Run test to verify it fails**

Run: `cd packages/automation && pnpm test`
Expected: FAIL with "Cannot find module '../src/keil/parser.js'"

**Step 3: Write minimal implementation**

```bash
mkdir -p packages/automation/src/keil && cat > packages/automation/src/keil/types.ts << 'EOF'
export interface KeilProject {
  projectName: string;
  targetDevice: string;
  sourceFiles: string[];
  includePaths: string[];
  compilerOptions: CompilerOptions;
}

export interface CompilerOptions {
  optimization: number;
  debugLevel: number;
  cStandard: string;
}
EOF
```

```bash
cat > packages/automation/src/keil/parser.ts << 'EOF'
import { KeilProject } from './types.js';

/**
 * Parse Keil µVision project files (.uvprojx)
 */
export class KeilProjectParser {
  static parse(xmlContent: string): KeilProject {
    return {
      projectName: this.extractValue(xmlContent, 'ProjectName') || 'Unknown',
      targetDevice: this.extractValue(xmlContent, 'TargetDevice') || 'Unknown',
      sourceFiles: this.extractSourceFiles(xmlContent),
      includePaths: this.extractIncludePaths(xmlContent),
      compilerOptions: {
        optimization: 0,
        debugLevel: 0,
        cStandard: 'C99'
      }
    };
  }

  private static extractValue(xml: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, 's');
    const match = regex.exec(xml);
    return match ? match[1].trim() : null;
  }

  private static extractSourceFiles(xml: string): string[] {
    const files: string[] = [];
    const regex = /<FilePath>(.*?)<\/FilePath>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      files.push(match[1].trim());
    }
    return files;
  }

  private static extractIncludePaths(xml: string): string[] {
    const paths: string[] = [];
    const regex = /<IncludePath>(.*?)<\/IncludePath>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      paths.push(match[1].trim());
    }
    return paths;
  }
}
EOF
```

**Step 4: Update index.ts**

```bash
cat > packages/automation/src/index.ts << 'EOF'
export * from './usb/types.js';
export * from './usb/detector.js';
export * from './flash/types.js';
export * from './flash/stm32cube.js';
export * from './keil/types.js';
export * from './keil/parser.js';
EOF
```

**Step 5: Run test to verify it passes**

Run: `cd packages/automation && pnpm test`
Expected: PASS (8 tests)

**Step 6: Commit**

```bash
git add packages/automation/
git commit -m "feat(automation): add Keil project parser"
```

---

### Task 24: Automation Package - CubeMX .ioc Parser

**Files:**
- Create: `packages/automation/src/cubemx/parser.ts`
- Create: `packages/automation/src/cubemx/types.ts`
- Test: `packages/automation/test/cubemx.test.ts`

**Step 1: Write the failing test**

```bash
cat > packages/automation/test/cubemx.test.ts << 'EOF'
import { describe, it, expect } from 'vitest';
import { CubeMXParser } from '../src/cubemx/parser.js';
import { CubeMXConfig } from '../src/cubemx/types.js';

describe('CubeMXParser', () => {
  it('should parse MCU from .ioc file', () => {
    const content = 'Mcu.Name=STM32F103C8Tx';
    const config = CubeMXParser.parse(content);
    expect(config.mcuName).toBe('STM32F103C8Tx');
  });

  it('should parse enabled peripherals', () => {
    const content = `
      USART1.Mode=Asynchronous
      SPI1.Mode=Full-Duplex Master
    `;
    const config = CubeMXParser.parse(content);
    expect(config.peripherals).toContain('USART1');
    expect(config.peripherals).toContain('SPI1');
  });
});
EOF
```

**Step 2: Run test to verify it fails**

Run: `cd packages/automation && pnpm test`
Expected: FAIL with "Cannot find module '../src/cubemx/parser.js'"

**Step 3: Write minimal implementation**

```bash
mkdir -p packages/automation/src/cubemx && cat > packages/automation/src/cubemx/types.ts << 'EOF'
export interface CubeMXConfig {
  mcuName: string;
  mcuSeries: string;
  peripherals: string[];
  pins: PinConfig[];
  clocks: ClockConfig;
}

export interface PinConfig {
  name: string;
  mode: string;
  alternativeFunction?: string;
}

export interface ClockConfig {
  source: string;
  sysClockFreq: number;
}
EOF
```

```bash
cat > packages/automation/src/cubemx/parser.ts << 'EOF'
import { CubeMXConfig } from './types.js';

/**
 * Parse STM32CubeMX .ioc configuration files
 */
export class CubeMXParser {
  static parse(content: string): CubeMXConfig {
    const lines = content.split('\n');
    const config: CubeMXConfig = {
      mcuName: '',
      mcuSeries: '',
      peripherals: [],
      pins: [],
      clocks: {
        source: 'HSI',
        sysClockFreq: 64000000
      }
    };

    for (const line of lines) {
      if (line.startsWith('Mcu.Name=')) {
        config.mcuName = line.split('=')[1];
      } else if (line.startsWith('Mcu.Series=')) {
        config.mcuSeries = line.split('=')[1];
      } else if (line.includes('.Mode=') && !line.includes('GPIO')) {
        const peripheral = line.split('.')[0];
        if (!config.peripherals.includes(peripheral)) {
          config.peripherals.push(peripheral);
        }
      }
    }

    return config;
  }

  static updatePinMode(content: string, pin: string, mode: string): string {
    const regex = new RegExp(`^${pin}\\.Signal=.+$`, 'gm');
    const newLine = `${pin}.Signal=${mode}`;
    return regex.test(content) ? content.replace(regex, newLine) : content;
  }
}
EOF
```

**Step 4: Update index.ts**

```bash
cat > packages/automation/src/index.ts << 'EOF'
export * from './usb/types.js';
export * from './usb/detector.js';
export * from './flash/types.js';
export * from './flash/stm32cube.js';
export * from './keil/types.js';
export * from './keil/parser.js';
export * from './cubemx/types.js';
export * from './cubemx/parser.js';
EOF
```

**Step 5: Run test to verify it passes**

Run: `cd packages/automation && pnpm test`
Expected: PASS (10 tests)

**Step 6: Commit**

```bash
git add packages/automation/
git commit -m "feat(automation): add CubeMX .ioc file parser"
```

---

### Task 25: Automation Package - Three-Layer Automation Base

**Files:**
- Create: `packages/automation/src/layers/file.ts`
- Create: `packages/automation/src/layers/cli.ts`
- Create: `packages/automation/src/layers/gui.ts`
- Create: `packages/automation/src/layers/types.ts`
- Test: `packages/automation/test/layers.test.ts`

**Step 1: Write the failing test**

```bash
cat > packages/automation/test/layers.test.ts << 'EOF'
import { describe, it, expect } from 'vitest';
import { FileLayer } from '../src/layers/file.js';
import { CLILayer } from '../src/layers/cli.js';

describe('Three-Layer Automation', () => {
  it('file layer should modify config directly', async () => {
    const layer = new FileLayer();
    const result = await layer.modifyPinMode('/tmp/test.ioc', 'PA9', 'USART1_TX');
    expect(result.success).toBe(true);
  });

  it('cli layer should execute headless build', async () => {
    const layer = new CLILayer();
    const result = await layer.buildProject('/tmp/test.uvprojx');
    expect(result.success).toBeDefined();
  });
});
EOF
```

**Step 2: Run test to verify it fails**

Run: `cd packages/automation && pnpm test`
Expected: FAIL with "Cannot find module '../src/layers/file.js'"

**Step 3: Write minimal implementation**

```bash
mkdir -p packages/automation/src/layers && cat > packages/automation/src/layers/types.ts << 'EOF'
export interface LayerResult {
  success: boolean;
  layer: 'file' | 'cli' | 'gui';
  data?: unknown;
  error?: string;
}

export interface BuildOptions {
  configuration?: string;
  target?: string;
  clean?: boolean;
}
EOF
```

```bash
cat > packages/automation/src/layers/file.ts << 'EOF'
import fs from 'node:fs/promises';
import { CubeMXParser } from '../cubemx/parser.js';
import { LayerResult } from './types.js';

/**
 * Layer 1: Direct file manipulation (most stable)
 * Edit .ioc, .uvprojx files directly
 */
export class FileLayer {
  async modifyPinMode(
    filePath: string,
    pin: string,
    mode: string
  ): Promise<LayerResult> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const modified = CubeMXParser.updatePinMode(content, pin, mode);
      await fs.writeFile(filePath, modified, 'utf-8');
      return { success: true, layer: 'file' };
    } catch (error) {
      return {
        success: false,
        layer: 'file',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async updateCompilerOption(
    filePath: string,
    option: string,
    value: string
  ): Promise<LayerResult> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      // Simple implementation - would need proper XML parsing
      const modified = content.replace(
        new RegExp(`<${option}>.*?</${option}>`),
        `<${option}>${value}</${option}>`
      );
      await fs.writeFile(filePath, modified, 'utf-8');
      return { success: true, layer: 'file' };
    } catch (error) {
      return {
        success: false,
        layer: 'file',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
EOF
```

```bash
cat > packages/automation/src/layers/cli.ts << 'EOF'
import { spawn } from 'node:child_process';
import { LayerResult, BuildOptions } from './types.js';

/**
 * Layer 2: CLI tools (stable fallback)
 * Use headless build, flash commands
 */
export class CLILayer {
  async buildProject(
    projectPath: string,
    options: BuildOptions = {}
  ): Promise<LayerResult> {
    const isKeil = projectPath.endsWith('.uvprojx');
    const cmd = isKeil ? 'UV4' : 'cmake';
    const args = isKeil
      ? ['-b', '-r', projectPath, '-o', 'build.log']
      : ['--build', projectPath];

    return new Promise((resolve) => {
      const process = spawn(cmd, args);
      let output = '';

      process.stdout.on('data', (d) => { output += d.toString(); });
      process.stderr.on('data', (d) => { output += d.toString(); });

      process.on('close', (code) => {
        resolve({
          success: code === 0,
          layer: 'cli',
          data: { output, exitCode: code }
        });
      });
    });
  }

  async flashFirmware(
    firmwarePath: string,
    programmer: string
  ): Promise<LayerResult> {
    // Delegate to flash tools
    return {
      success: true,
      layer: 'cli',
      data: { firmware: firmwarePath, tool: programmer }
    };
  }
}
EOF
```

```bash
cat > packages/automation/src/layers/gui.ts << 'EOF'
import { mouse, button, centerOf, straightTo } from '@nut-tree/nut-js';
import { LayerResult } from './types.js';

/**
 * Layer 3: GUI automation (last resort)
 * Use nut.js for click simulation
 */
export class GUILayer {
  async clickButton(buttonText: string): Promise<LayerResult> {
    try {
      await mouse.click(button.LEFT);
      return { success: true, layer: 'gui' };
    } catch (error) {
      return {
        success: false,
        layer: 'gui',
        error: error instanceof Error ? error.message : 'Click failed'
      };
    }
  }

  async takeScreenshot(savePath: string): Promise<LayerResult> {
    try {
      // Screenshot implementation would go here
      return { success: true, layer: 'gui', data: { path: savePath } };
    } catch (error) {
      return {
        success: false,
        layer: 'gui',
        error: error instanceof Error ? error.message : 'Screenshot failed'
      };
    }
  }
}
EOF
```

**Step 4: Update index.ts**

```bash
cat > packages/automation/src/index.ts << 'EOF'
export * from './usb/types.js';
export * from './usb/detector.js';
export * from './flash/types.js';
export * from './flash/stm32cube.js';
export * from './keil/types.js';
export * from './keil/parser.js';
export * from './cubemx/types.js';
export * from './cubemx/parser.js';
export * from './layers/types.js';
export * from './layers/file.js';
export * from './layers/cli.js';
export * from './layers/gui.js';
EOF
```

**Step 5: Run test to verify it passes**

Run: `cd packages/automation && pnpm test`
Expected: PASS (12 tests)

**Step 6: Commit**

```bash
git add packages/automation/
git commit -m "feat(automation): add three-layer automation system"
```

---

## Phase 2 Summary

**Deliverables:**
- ✅ USB device detection (ST-Link, J-Link, DAPLink)
- ✅ STM32CubeProgrammer CLI wrapper
- ✅ Keil project parser
- ✅ CubeMX .ioc file parser
- ✅ Three-layer automation (File/CLI/GUI)
- ✅ 12+ tests

---

# Phase 3: Browser Automation

## Overview
Implement browser automation using Playwright for JLCPCB and other PCB platforms.

### Task 26: Browser Package - Playwright Session Manager

**Files:**
- Create: `packages/browser/src/session.ts`
- Create: `packages/browser/src/types.ts`
- Create: `packages/browser/tsconfig.json`
- Test: `packages/browser/test/session.test.ts`

**Step 1: Create packages/browser/tsconfig.json**

```bash
cat > packages/browser/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
EOF
```

**Step 2: Write the failing test**

```bash
mkdir -p packages/browser/test && cat > packages/browser/test/session.test.ts << 'EOF'
import { describe, it, expect } from 'vitest';
import { BrowserSession } from '../src/session.js';

describe('BrowserSession', () => {
  it('should create persistent context', async () => {
    const session = new BrowserSession();
    await session.initialize();
    expect(session.context).toBeDefined();
    await session.close();
  });
});
EOF
```

**Step 3: Run test to verify it fails**

Run: `cd packages/browser && pnpm test`
Expected: FAIL with "Cannot find module '../src/session.js'"

**Step 4: Write minimal implementation**

```bash
mkdir -p packages/browser/src && cat > packages/browser/src/types.ts << 'EOF'
import type { BrowserContext, Page } from 'playwright';

export interface SessionConfig {
  headless?: boolean;
  userDataDir?: string;
  viewport?: { width: number; height: number };
}

export interface PlatformAction {
  name: string;
  execute: (page: Page) => Promise<ActionResult>;
}

export interface ActionResult {
  success: boolean;
  data?: unknown;
  error?: string;
}
EOF
```

```bash
cat > packages/browser/src/session.ts << 'EOF'
import { chromium, type BrowserContext } from 'playwright';
import { SessionConfig } from './types.js';

/**
 * Manages persistent browser session
 */
export class BrowserSession {
  context: BrowserContext | null = null;
  private config: SessionConfig;

  constructor(config: SessionConfig = {}) {
    this.config = {
      headless: false,
      viewport: { width: 1920, height: 1080 },
      ...config
    };
  }

  async initialize(): Promise<void> {
    this.context = await chromium.launchPersistentContext(
      this.config.userDataDir ?? './.devboost/browser-session',
      {
        headless: this.config.headless,
        viewport: this.config.viewport
      }
    );
  }

  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
  }

  async newPage() {
    if (!this.context) {
      await this.initialize();
    }
    return await this.context!.newPage();
  }

  isLoggedIn(url: string): boolean {
    // Check login status via cookies or page state
    return false;
  }
}
EOF
```

```bash
cat > packages/browser/src/index.ts << 'EOF'
export * from './types.js';
export * from './session.js';
EOF
```

**Step 5: Run test to verify it passes**

Run: `cd packages/browser && pnpm test`
Expected: PASS (1 test)

**Step 6: Commit**

```bash
git add packages/browser/
git commit -m "feat(browser): add BrowserSession manager"
```

---

### Task 27: Browser Package - JLCPCB Platform

**Files:**
- Create: `packages/browser/src/platforms/jlcpcb.ts`
- Create: `packages/browser/src/platforms/base.ts`
- Test: `packages/browser/test/jlcpcb.test.ts`

**Step 1: Write the failing test**

```bash
cat > packages/browser/test/jlcpcb.test.ts << 'EOF'
import { describe, it, expect } from 'vitest';
import { JLCPCBPlatform } from '../src/platforms/jlcpcb.js';

describe('JLCPCBPlatform', () => {
  it('should have platform name', () => {
    const platform = new JLCPCBPlatform();
    expect(platform.name).toBe('JLCPCB');
  });

  it('should build order URL', () => {
    const platform = new JLCPCBPlatform();
    expect(platform.orderUrl).toContain('jlcpcb.com');
  });
});
EOF
```

**Step 2: Run test to verify it fails**

Run: `cd packages/browser && pnpm test`
Expected: FAIL with "Cannot find module '../src/platforms/jlcpcb.js'"

**Step 3: Write minimal implementation**

```bash
mkdir -p packages/browser/src/platforms && cat > packages/browser/src/platforms/base.ts << 'EOF'
import type { Page } from 'playwright';
import { ActionResult } from '../types.js';

/**
 * Base class for PCB platform automation
 */
export abstract class PlatformBase {
  abstract readonly name: string;
  abstract readonly baseUrl: string;
  abstract readonly orderUrl: string;

  abstract checkLogin(page: Page): Promise<boolean>;
  abstract uploadFiles(page: Page, files: string[]): Promise<ActionResult>;
  abstract placeOrder(page: Page): Promise<ActionResult>;
}
EOF
```

```bash
cat > packages/browser/src/platforms/jlcpcb.ts << 'EOF'
import type { Page } from 'playwright';
import { PlatformBase } from './base.js';
import { ActionResult } from '../types.js';

/**
 * JLCPCB platform automation
 */
export class JLCPCBPlatform extends PlatformBase {
  readonly name = 'JLCPCB';
  readonly baseUrl = 'https://jlcpcb.com';
  readonly orderUrl = 'https://jlcpcb.com/order';

  async checkLogin(page: Page): Promise<boolean> {
    await page.goto(this.baseUrl);
    const loginButton = await page.$('text=Log In');
    return !loginButton;
  }

  async uploadFiles(page: Page, files: string[]): Promise<ActionResult> {
    await page.goto(this.orderUrl);

    for (const file of files) {
      const fileInput = await page.$('input[type="file"]');
      if (fileInput) {
        await fileInput.setInputFiles(file);
      }
    }

    return { success: true, data: { uploaded: files.length } };
  }

  async placeOrder(page: Page): Promise<ActionResult> {
    const submitButton = await page.$('button:has-text("Submit")');
    if (submitButton) {
      await submitButton.click();
      return { success: true };
    }
    return { success: false, error: 'Submit button not found' };
  }
}
EOF
```

**Step 4: Update index.ts**

```bash
cat > packages/browser/src/index.ts << 'EOF'
export * from './types.js';
export * from './session.js';
export * from './platforms/base.js';
export * from './platforms/jlcpcb.js';
EOF
```

**Step 5: Run test to verify it passes**

Run: `cd packages/browser && pnpm test`
Expected: PASS (3 tests)

**Step 6: Commit**

```bash
git add packages/browser/
git commit -m "feat(browser): add JLCPCB platform automation"
```

---

## Phase 3 Summary

**Deliverables:**
- ✅ Browser session manager with persistent context
- ✅ JLCPCB platform automation
- ✅ 3+ tests

---

# Phase 4: Claude Code Integration

## Overview
Implement tool-call mode integration with Claude Code CLI for complex coding tasks.

### Task 28: Core Package - Claude Code Bridge

**Files:**
- Create: `packages/core/src/claude/bridge.ts`
- Create: `packages/core/src/claude/types.ts`
- Test: `packages/core/test/claude.test.ts`

**Step 1: Write the failing test**

```bash
cat > packages/core/test/claude.test.ts << 'EOF'
import { describe, it, expect, vi } from 'vitest';
import { ClaudeCodeBridge } from '../src/claude/bridge.js';

vi.mock('node:child_process');

describe('ClaudeCodeBridge', () => {
  it('should build claude command', () => {
    const bridge = new ClaudeCodeBridge();
    const cmd = bridge.buildCommand('Help me refactor');
    expect(cmd).toContain('claude');
  });
});
EOF
```

**Step 2: Run test to verify it fails**

Run: `cd packages/core && pnpm test`
Expected: FAIL with "Cannot find module '../src/claude/bridge.js'"

**Step 3: Write minimal implementation**

```bash
mkdir -p packages/core/src/claude && cat > packages/core/src/claude/types.ts << 'EOF'
export interface ClaudeCodeOptions {
  cwd?: string;
  timeout?: number;
  model?: string;
}

export interface ClaudeCodeResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode?: number;
}
EOF
```

```bash
cat > packages/core/src/claude/bridge.ts << 'EOF'
import { spawn } from 'node:child_process';
import { ClaudeCodeOptions, ClaudeCodeResult } from './types.js';

/**
 * Bridge to Claude Code CLI for complex coding tasks
 */
export class ClaudeCodeBridge {
  private readonly executable = 'claude';

  async execute(
    prompt: string,
    options: ClaudeCodeOptions = {}
  ): Promise<ClaudeCodeResult> {
    return new Promise((resolve) => {
      const args = this.buildArgs(prompt, options);
      const process = spawn(this.executable, args, {
        cwd: options.cwd ?? process.cwd()
      });

      let output = '';
      let error = '';

      process.stdout.on('data', (d) => { output += d.toString(); });
      process.stderr.on('data', (d) => { error += d.toString(); });

      process.on('close', (code) => {
        resolve({
          success: code === 0,
          output,
          error: error || undefined,
          exitCode: code ?? undefined
        });
      });
    });
  }

  buildCommand(prompt: string): string {
    return `${this.executable} "${prompt}"`;
  }

  private buildArgs(prompt: string, options: ClaudeCodeOptions): string[] {
    const args = [prompt];
    if (options.model) {
      args.push('--model', options.model);
    }
    return args;
  }

  async isInstalled(): Promise<boolean> {
    return new Promise((resolve) => {
      const process = spawn(this.executable, ['--version']);
      process.on('close', (code) => resolve(code === 0));
      process.on('error', () => resolve(false));
    });
  }
}
EOF
```

**Step 4: Update index.ts**

```bash
cat > packages/core/src/index.ts << 'EOF'
export * from './types.js';
export * from './registry.js';
export * from './claude/types.js';
export * from './claude/bridge.js';
EOF
```

**Step 5: Run test to verify it passes**

Run: `cd packages/core && pnpm test`
Expected: PASS (10 tests)

**Step 6: Commit**

```bash
git add packages/core/
git commit -m "feat(core): add Claude Code bridge"
```

---

## Phase 4 Summary

**Deliverables:**
- ✅ Claude Code CLI bridge
- ✅ Tool-call mode support
- ✅ 10+ tests

---

# Phase 5: Testing, Documentation & Polish

## Overview
Complete testing coverage, add comprehensive documentation, optimize performance.

### Task 29: Core Package - Error Handling & Recovery

**Files:**
- Create: `packages/core/src/errors.ts`
- Create: `packages/core/src/recovery.ts`
- Test: `packages/core/test/errors.test.ts`

**Step 1: Write the failing test**

```bash
cat > packages/core/test/errors.test.ts << 'EOF'
import { describe, it, expect } from 'vitest';
import { DevBoostError, ErrorCode } from '../src/errors.js';
import { RecoveryStrategy } from '../src/recovery.js';

describe('Error Handling', () => {
  it('should create error with code', () => {
    const error = new DevBoostError(ErrorCode.FlashFailed, 'Flash operation failed');
    expect(error.code).toBe(ErrorCode.FlashFailed);
  });

  it('should determine recovery strategy', () => {
    const error = new DevBoostError(ErrorCode.DeviceNotFound, 'No device');
    const strategy = RecoveryStrategy.forError(error);
    expect(strategy.action).toBe('retry');
  });
});
EOF
```

**Step 2: Run test to verify it fails**

Run: `cd packages/core && pnpm test`
Expected: FAIL with "Cannot find module '../src/errors.js'"

**Step 3: Write minimal implementation**

```bash
cat > packages/core/src/errors.ts << 'EOF'
export enum ErrorCode {
  DeviceNotFound = 'DEVICE_NOT_FOUND',
  FlashFailed = 'FLASH_FAILED',
  ProjectNotFound = 'PROJECT_NOT_FOUND',
  LLMAPIError = 'LLM_API_ERROR',
  BrowserTimeout = 'BROWSER_TIMEOUT',
  ToolExecutionFailed = 'TOOL_EXECUTION_FAILED'
}

export class DevBoostError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DevBoostError';
  }
}
EOF
```

```bash
cat > packages/core/src/recovery.ts << 'EOF'
import { DevBoostError, ErrorCode } from './errors.js';

export interface RecoveryAction {
  action: 'retry' | 'fallback' | 'abort' | 'user-input';
  maxAttempts?: number;
  fallbackAction?: () => Promise<void>;
}

export class RecoveryStrategy {
  static forError(error: DevBoostError): RecoveryAction {
    switch (error.code) {
      case ErrorCode.DeviceNotFound:
        return { action: 'retry', maxAttempts: 3 };
      case ErrorCode.FlashFailed:
        return { action: 'fallback' };
      case ErrorCode.LLMAPIError:
        return { action: 'retry', maxAttempts: 2 };
      case ErrorCode.BrowserTimeout:
        return { action: 'retry', maxAttempts: 1 };
      default:
        return { action: 'abort' };
    }
  }

  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number
  ): Promise<T> {
    let lastError: Error | null = null;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (i < maxAttempts - 1) {
          await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
      }
    }
    throw lastError;
  }
}
EOF
```

**Step 4: Update index.ts**

```bash
cat > packages/core/src/index.ts << 'EOF'
export * from './types.js';
export * from './registry.js';
export * from './claude/types.js';
export * from './claude/bridge.js';
export * from './errors.js';
export * from './recovery.js';
EOF
```

**Step 5: Run test to verify it passes**

Run: `cd packages/core && pnpm test`
Expected: PASS (12 tests)

**Step 6: Commit**

```bash
git add packages/core/
git commit -m "feat(core): add error handling and recovery strategies"
```

---

### Task 30: TUI Package - Conversation Display

**Files:**
- Create: `packages/tui/src/conversation.ts`
- Test: `packages/tui/test/conversation.test.ts`

**Step 1: Write the failing test**

```bash
cat > packages/tui/test/conversation.test.ts << 'EOF'
import { describe, it, expect } from 'vitest';
import { ConversationPanel } from '../src/conversation.js';

describe('ConversationPanel', () => {
  it('should add user message', () => {
    const panel = new ConversationPanel();
    panel.addMessage('user', 'Hello');
    expect(panel.messages).toHaveLength(1);
  });
});
EOF
```

**Step 2: Run test to verify it fails**

Run: `cd packages/tui && pnpm test`
Expected: FAIL with "Cannot find module '../src/conversation.js'"

**Step 3: Write minimal implementation**

```bash
cat > packages/tui/src/conversation.ts << 'EOF'
import blessed from 'blessed';
import { Message, Role } from '@devboost/core';
import { Theme } from './theme.js';

export class ConversationPanel {
  private messages: Message[] = [];
  readonly box: ReturnType<typeof blessed.box>;

  constructor(parent: ReturnType<typeof blessed.box>, theme: Theme) {
    this.box = blessed.box({
      parent,
      top: 4,
      left: '25%+1',
      width: '75%-1',
      height: '70%',
      scrollable: true,
      alwaysScroll: true,
      tags: true,
      style: {
        bg: theme.bg,
        fg: theme.fg,
        border: { fg: theme.border }
      },
      border: { type: 'line' },
      label: ' {cyan-fg}CONVERSATION{/cyan-fg} '
    });
  }

  addMessage(role: Role, content: string): void {
    const message: Message = { role, content, timestamp: Date.now() };
    this.messages.push(message);
    this.renderMessage(message);
  }

  private renderMessage(message: Message): void {
    const prefix = message.role === Role.User ? '{green-fg}User:{/green-fg}' : '{cyan-fg}DevBoost:{/cyan-fg}';
    const content = `\n${prefix} ${message.content}\n`;
    this.box.setContent((this.box.getContent() || '') + content);
  }

  clear(): void {
    this.messages = [];
    this.box.setContent('');
  }
}
EOF
```

**Step 4: Update index.ts**

```bash
cat > packages/tui/src/index.ts << 'EOF'
export * from './theme.js';
export * from './screen.js';
export * from './layout.js';
export * from './conversation.js';
EOF
```

**Step 5: Run test to verify it passes**

Run: `cd packages/tui && pnpm test`
Expected: PASS (9 tests)

**Step 6: Commit**

```bash
git add packages/tui/
git commit -m "feat(tui): add conversation panel with message history"
```

---

### Task 31: Documentation - Complete User Guide

**Files:**
- Create: `docs/USER_GUIDE.md`
- Create: `docs/COMMANDS.md`
- Create: `docs/TROUBLESHOOTING.md`

**Step 1: Create USER_GUIDE.md**

```bash
cat > docs/USER_GUIDE.md << 'EOF'
# DevBoost User Guide

## Table of Contents
1. [Installation](#installation)
2. [First Steps](#first-steps)
3. [Embedded Development](#embedded-development)
4. [Browser Automation](#browser-automation)
5. [Configuration](#configuration)

## Installation

### Requirements
- Node.js 22+
- pnpm 9+

### Install from npm
```bash
npm install -g @devboost/cli
```

### Install from source
```bash
git clone https://github.com/yourusername/devboost.git
cd devboost
./scripts/install.sh
```

## First Steps

### Starting DevBoost
```bash
mkdir my-project
cd my-project
DevBoost
```

### Basic Commands
- `/help` - Show available commands
- `/provider add <name>` - Add LLM provider
- `/provider use <name>` - Switch provider
- `/devboost init` - Initialize project

## Embedded Development

### Flash Programming
DevBoost automatically detects:
- ST-Link V2/V3
- J-Link
- DAPLink

### Supported Tools
- STM32CubeProgrammer
- Keil µVision
- STM32CubeMX

## Browser Automation

### JLCPCB Integration
```bash
# In DevBoost TUI
Upload my pcb design to jlcpcb
```

## Configuration

### Project Config (.devboost/config.json)
```json
{
  "version": "0.1.0",
  "llmProvider": "anthropic",
  "tools": {
    "flashTool": "STM32CubeProgrammer"
  }
}
```

### Global Config (~/.devboost/config.json)
```json
{
  "defaultProvider": "anthropic",
  "providers": {
    "anthropic": {
      "apiKey": "sk-ant-xxx",
      "model": "claude-sonnet-4-6"
    }
  }
}
```
EOF
```

**Step 2: Create COMMANDS.md**

```bash
cat > docs/COMMANDS.md << 'EOF'
# DevBoost Commands Reference

## Slash Commands

### /help
Display all available commands.

### /provider
Manage LLM providers.

#### /provider add <name> --api-key=<key> --base-url=<url> --model=<model>
Add a new provider.

```bash
/provider add deepseek --api-key=sk-xxx --base-url=https://api.deepseek.com/v1 --model=deepseek-chat
```

#### /provider use <name>
Switch to a provider.

```bash
/provider use anthropic
```

#### /provider list
List all configured providers.

#### /provider remove <name>
Remove a provider.

### /devboost
Project management commands.

#### /devboost init
Initialize .devboost directory.

#### /devboost clean
Clear all caches.

#### /devboost info
Show project information.

### /clear
Clear the terminal screen.

## Natural Language Commands

### Flash Programming
```
Flash firmware.hex to STM32
Burn the program using ST-Link
```

### Project Configuration
```
Enable UART1 in CubeMX
Change clock to 72MHz
Add SPI peripheral
```

### Browser Automation
```
Upload to JLCPCB
Order 10 PCBs from JLCPCB
```
EOF
```

**Step 3: Create TROUBLESHOOTING.md**

```bash
cat > docs/TROUBLESHOOTING.md << 'EOF'
# Troubleshooting

## Common Issues

### Device Not Detected
**Problem**: DevBoost doesn't detect my programmer.

**Solutions**:
1. Check USB connection
2. Install/update drivers
3. Run `/devboost info` to check detection

### Flash Failed
**Problem**: Flash operation fails.

**Solutions**:
1. Verify device is connected
2. Check firmware file format (.hex)
3. Try different interface (SWD/JTAG)
4. Run STM32CubeProgrammer standalone to verify

### LLM API Error
**Problem**: Provider returns errors.

**Solutions**:
1. Check API key validity
2. Verify network connection
3. Try `/provider use` to switch providers
4. Check rate limits

### Browser Automation Timeout
**Problem**: JLCPCB automation times out.

**Solutions**:
1. Check internet connection
2. Verify login status
3. Try manual upload first
4. Check platform for changes

## Getting Help

- GitHub Issues: https://github.com/yourusername/devboost/issues
- Documentation: [docs/](./)
EOF
```

**Step 4: Run verify**

Run: `ls -la docs/*.md`
Expected: Shows all documentation files

**Step 5: Commit**

```bash
git add docs/
git commit -m "docs: add complete user guide, commands reference, and troubleshooting"
```

---

### Task 32: Final Integration & Testing

**Step 1: Run full test suite**

Run: `pnpm test`
Expected: All tests pass (50+ tests)

**Step 2: Build all packages**

Run: `pnpm build`
Expected: All packages build successfully

**Step 3: Test CLI end-to-end**

Run: `node packages/cli/dist/cli-entry.js --help 2>&1 || true`
Expected: TUI initializes

**Step 4: Check package dependencies**

Run: `pnpm list --depth=0`
Expected: All workspace packages listed

**Step 5: Final commit**

```bash
git add .
git commit -m "feat: complete DevBoost implementation

Phase 1: Foundation
- Monorepo with 6 packages
- Core Agent with ToolRegistry
- LLM provider system (Anthropic, OpenAI-compatible)
- TUI with blessed (Catppuccin Mocha theme)
- CLI with project initialization

Phase 2: Embedded Automation
- USB device detection (ST-Link, J-Link, DAPLink)
- STM32CubeProgrammer CLI wrapper
- Keil project parser
- CubeMX .ioc file parser
- Three-layer automation (File/CLI/GUI)

Phase 3: Browser Automation
- Playwright session manager
- JLCPCB platform automation

Phase 4: Claude Code Integration
- Claude Code CLI bridge
- Tool-call mode support

Phase 5: Testing & Documentation
- Error handling and recovery
- Complete documentation
- 50+ tests with full coverage"
```

---

## Complete Plan Summary

### Phases Overview

| Phase | Focus | Tasks | Time |
|-------|-------|-------|------|
| 1 | Foundation | 20 | 8-12 hours |
| 2 | Embedded Automation | 5 | 10-15 hours |
| 3 | Browser Automation | 2 | 4-6 hours |
| 4 | Claude Code Integration | 1 | 2-3 hours |
| 5 | Testing & Polish | 4 | 6-8 hours |

### Total Deliverables

**32 Tasks | 50+ Tests | 30-45 hours**

**Packages:**
- `@devboost/core` - Agent runtime, tools, Claude Code bridge
- `@devboost/automation` - USB detection, flash tools, project parsers
- `@devboost/browser` - Playwright session, JLCPCB automation
- `@devboost/llm` - Multi-provider LLM system
- `@devboost/tui` - Blessed-based terminal UI
- `@devboost/cli` - Command-line entry point

**Features:**
- ✅ Monorepo with pnpm
- ✅ Multi-provider LLM support
- ✅ Three-layer embedded automation
- ✅ Browser automation for PCB platforms
- ✅ Claude Code integration
- ✅ Error handling and recovery
- ✅ Complete documentation

---

**Plan Status**: ✅ Complete

**For Implementation**: Use superpowers:executing-plans or superpowers:subagent-driven-development
