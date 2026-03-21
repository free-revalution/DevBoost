import { XMLParser } from 'fast-xml-parser';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { TargetInfo, SourceFile, CompilerSettings, KeilProject } from './types.js';

/**
 * File type mapping from Keil FileType codes
 */
const FILE_TYPE_MAP: Record<number, string> = {
  1: 'C Source',
  2: 'Header',
  3: 'Assembler',
  4: 'Text',
  5: 'C++ Source',
  6: 'Library',
  7: 'Object',
  8: 'Image',
  9: 'Configuration'
};

/**
 * Keil5 Project Parser
 *
 * Parses Keil µVision 5 project files (.uvprojx)
 * and extracts project structure, target info, and source files.
 */
export class KeilProjectParser {
  private static readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    textNodeName: '_text',
    parseAttributeValue: true,
    trimValues: true
  });

  /**
   * Parse a Keil .uvprojx project file
   *
   * @param projectPath - Path to the .uvprojx file
   * @returns Parsed project information
   */
  static parseUVProject(projectPath: string): KeilProject {
    const content = readFileSync(projectPath, 'utf-8');
    const parsed = this.parser.parse(content);

    const project = parsed.Project;
    if (!project) {
      throw new Error('Invalid Keil project file: missing Project root');
    }

    const target = project.Target;
    if (!target) {
      throw new Error('Invalid Keil project file: missing Target section');
    }

    const targetInfo = this.extractTargetInfo(target);
    const sources = this.extractSources(target);
    const compilerSettings = this.extractCompilerSettings(target);

    return {
      filePath: resolve(projectPath),
      targetInfo,
      sources,
      compilerSettings,
      toolsetName: target.ToolsetName,
      schemaVersion: project.SchemaVersion
    };
  }

  /**
   * Get target device information from a parsed project
   *
   * @param projectPath - Path to the .uvprojx file
   * @returns Target device information
   */
  static getTargetInfo(projectPath: string): TargetInfo {
    const project = this.parseUVProject(projectPath);
    return project.targetInfo;
  }

  /**
   * Get source files from a parsed project
   *
   * @param projectPath - Path to the .uvprojx file
   * @returns Array of source files
   */
  static getSources(projectPath: string): SourceFile[] {
    const project = this.parseUVProject(projectPath);
    return project.sources;
  }

  /**
   * Extract target information from project XML
   *
   * @param target - Target section from parsed XML
   * @returns Target information
   */
  private static extractTargetInfo(target: any): TargetInfo {
    const targetOption = target.TargetOption;
    const commonOption = targetOption?.TargetCommonOption;

    const device = commonOption?.Device || '';
    const vendor = commonOption?.Vendor || '';
    const cpuAttr = commonOption?.Cpu || '';

    // Parse CPU attribute
    const cpuType = this.extractCpuType(cpuAttr);
    const iramInfo = this.extractMemoryInfo(cpuAttr, 'IRAM');
    const iromInfo = this.extractMemoryInfo(cpuAttr, 'IROM');
    const fpuInfo = this.extractFpuInfo(cpuAttr);
    const clock = this.extractClock(cpuAttr);

    return {
      deviceName: device,
      vendor,
      cpuType,
      iramStart: iramInfo.start || '0x20000000',
      iramSize: iramInfo.size || '0x0',
      iromStart: iromInfo.start || '0x08000000',
      iromSize: iromInfo.size || '0x0',
      hasFPU: fpuInfo.hasFPU,
      fpuType: fpuInfo.type,
      clock
    };
  }

  /**
   * Extract CPU type from CPU attribute string
   *
   * @param cpuAttr - CPU attribute string
   * @returns CPU type
   */
  private static extractCpuType(cpuAttr: string): string {
    const match = cpuAttr.match(/CPUTYPE\("([^"]+)"\)/);
    return match ? match[1] : 'Unknown';
  }

  /**
   * Extract memory region information
   *
   * @param cpuAttr - CPU attribute string
   * @param region - Memory region type (IRAM, IROM, etc.)
   * @returns Memory info with start and size
   */
  private static extractMemoryInfo(
    cpuAttr: string,
    region: string
  ): { start: string; size: string } {
    // Try to match IRAM(0x20000000,0x20000) pattern
    const match = cpuAttr.match(new RegExp(`${region}\\((0x[0-9A-Fa-f]+),(0x[0-9A-Fa-f]+)\\)`));
    if (match) {
      return { start: match[1], size: match[2] };
    }
    return { start: '', size: '' };
  }

  /**
   * Extract FPU information
   *
   * @param cpuAttr - CPU attribute string
   * @returns FPU info
   */
  private static extractFpuInfo(cpuAttr: string): { hasFPU: boolean; type?: string } {
    const fpuMatch = cpuAttr.match(/FPU(\d)/);
    if (fpuMatch) {
      return { hasFPU: true, type: `FPU${fpuMatch[1]}` };
    }
    return { hasFPU: false };
  }

  /**
   * Extract clock frequency
   *
   * @param cpuAttr - CPU attribute string
   * @returns Clock frequency string or undefined
   */
  private static extractClock(cpuAttr: string): string | undefined {
    const match = cpuAttr.match(/CLOCK\((\d+)\)/);
    return match ? match[1] : undefined;
  }

  /**
   * Extract source files from project XML
   *
   * @param target - Target section from parsed XML
   * @returns Array of source files
   */
  private static extractSources(target: any): SourceFile[] {
    const sources: SourceFile[] = [];
    const groups = target.Groups?.Group;

    if (!groups) {
      return sources;
    }

    // Handle single group (not an array)
    const groupArray = Array.isArray(groups) ? groups : [groups];

    for (const group of groupArray) {
      const groupName = group.GroupName || 'Default';
      const files = group.Files?.File;

      if (!files) {
        continue;
      }

      // Handle single file (not an array)
      const fileArray = Array.isArray(files) ? files : [files];

      for (const file of fileArray) {
        const fileName = file.FileName;
        const filePath = file.FilePath;
        const fileTypeCode = parseInt(file.FileType || '1', 10);

        if (!fileName || !filePath) {
          continue;
        }

        sources.push({
          name: fileName,
          path: filePath,
          type: FILE_TYPE_MAP[fileTypeCode] || 'Unknown',
          group: groupName,
          fileTypeCode
        });
      }
    }

    return sources;
  }

  /**
   * Extract compiler settings from project XML
   *
   * @param target - Target section from parsed XML
   * @returns Compiler settings
   */
  private static extractCompilerSettings(target: any): CompilerSettings {
    const targetOption = target.TargetOption;
    const commonOption = targetOption?.TargetCommonOption;
    const optimize = commonOption?.Optimize;

    // Extract include paths and defines from various option groups
    const includePaths: string[] = [];
    const defines: string[] = [];

    // These could be in different places depending on Keil version
    // This is a simplified extraction
    const armAds = targetOption?.Toolset?.ArmAds;
    if (armAds) {
      // Extract from ArmADS section if present
      const armAdsMisc = armAds.ArmAdsMisc;
      if (armAdsMisc) {
        const includePath = armAdsMisc.IncludePath;
        if (includePath) {
          const paths = includePath.split(';').filter((p: string) => p.trim());
          includePaths.push(...paths);
        }

        const define = armAdsMisc.Define;
        if (define) {
          const defs = define.split(';').filter((d: string) => d.trim());
          defines.push(...defs);
        }
      }
    }

    return {
      optimization: optimize,
      includePaths,
      defines,
      debugInfo: true // Default assumption
    };
  }
}
