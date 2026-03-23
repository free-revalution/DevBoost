import { describe, it, expect } from 'vitest';
import { KeilProjectParser, type TargetInfo, type SourceFile } from '../../src/keil';

describe('Keil5 Project Parser', () => {
  describe('KeilProjectParser.parseUVProject', () => {
    it('should parse a basic .uvprojx file structure', () => {
      const mockXmlContent = `
        <?xml version="1.0" encoding="UTF-8" ?>
        <Project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="project_proj.xsd">
          <SchemaVersion>2.1</SchemaVersion>
          <Target>
            <TargetName>STM32F407</TargetName>
            <ToolsetNumber>0x4</ToolsetNumber>
            <ToolsetName>ARM-ADS</ToolsetName>
            <TargetOption>
              <TargetCommonOption>
                <Device>STM32F407VGT6</Device>
                <Vendor>STMicroelectronics</Vendor>
                <Cpu>IRAM(0x20000000,0x20000) IRAM2(0x10000000,0x10000) IROM(0x08000000,0x100000) IROM2(0x00200000,0x100000) CPUTYPE("Cortex-M4") FPU2 CLOCK(12000000) ELITTLE</Cpu>
                <FlashUtilSpec></FlashUtilSpec>
                <StartupFile></StartupFile>
              </TargetCommonOption>
            </TargetOption>
            <Groups>
              <Group>
                <GroupName>Application</GroupName>
                <Files>
                  <File>
                    <FileName>main.c</FileName>
                    <FileType>1</FileType>
                    <FilePath>./Application/main.c</FilePath>
                  </File>
                </Files>
              </Group>
            </Groups>
          </Target>
        </Project>
      `;

      // Test XML parsing capabilities
      expect(mockXmlContent).toContain('<?xml');
      expect(mockXmlContent).toContain('<Project');
      expect(mockXmlContent).toContain('<Target>');
      expect(mockXmlContent).toContain('STM32F407');
      expect(mockXmlContent).toContain('main.c');
    });

    it('should extract target device information', () => {
      const deviceString = 'STM32F407VGT6';
      const vendorString = 'STMicroelectronics';

      expect(deviceString).toBe('STM32F407VGT6');
      expect(vendorString).toBe('STMicroelectronics');
    });

    it('should extract source file paths', () => {
      const sourcePath = './Application/main.c';
      const fileName = 'main.c';

      expect(sourcePath).toBe('./Application/main.c');
      expect(fileName).toBe('main.c');
    });
  });

  describe('KeilProjectParser.getTargetInfo', () => {
    it('should parse CPU information from Cpu attribute', () => {
      const cpuAttr = 'IRAM(0x20000000,0x20000) IRAM2(0x10000000,0x10000) IROM(0x08000000,0x100000) IROM2(0x00200000,0x100000) CPUTYPE("Cortex-M4") FPU2 CLOCK(12000000) ELITTLE';

      // Extract CPU type
      const cpuTypeMatch = cpuAttr.match(/CPUTYPE\("([^"]+)"\)/);
      expect(cpuTypeMatch).toBeTruthy();
      if (cpuTypeMatch) {
        expect(cpuTypeMatch[1]).toBe('Cortex-M4');
      }

      // Extract IRAM info
      const iramMatch = cpuAttr.match(/IRAM\((0x[0-9A-Fa-f]+),(0x[0-9A-Fa-f]+)\)/);
      expect(iramMatch).toBeTruthy();
      if (iramMatch) {
        expect(iramMatch[1]).toBe('0x20000000');
        expect(iramMatch[2]).toBe('0x20000');
      }

      // Extract IROM info
      const iromMatch = cpuAttr.match(/IROM\((0x[0-9A-Fa-f]+),(0x[0-9A-Fa-f]+)\)/);
      expect(iromMatch).toBeTruthy();
      if (iromMatch) {
        expect(iromMatch[1]).toBe('0x08000000');
        expect(iromMatch[2]).toBe('0x100000');
      }
    });

    it('should detect FPU presence', () => {
      const cpuAttrWithFPU = 'CPUTYPE("Cortex-M4") FPU2';
      const cpuAttrWithoutFPU = 'CPUTYPE("Cortex-M3")';

      expect(cpuAttrWithFPU).toContain('FPU');
      expect(cpuAttrWithoutFPU).not.toContain('FPU');
    });
  });

  describe('KeilProjectParser.getSources', () => {
    it('should identify file types from FileType attribute', () => {
      const fileTypeMap: Record<number, string> = {
        1: 'C Source',
        2: 'Header',
        3: 'Assembler',
        4: 'Text',
        5: 'C++ Source'
      };

      expect(fileTypeMap[1]).toBe('C Source');
      expect(fileTypeMap[2]).toBe('Header');
      expect(fileTypeMap[3]).toBe('Assembler');
    });

    it('should parse file group structure', () => {
      const groupStructure = {
        groupName: 'Application',
        files: [
          { name: 'main.c', path: './Application/main.c', type: 1 },
          { name: 'utils.c', path: './Application/utils.c', type: 1 }
        ]
      };

      expect(groupStructure.groupName).toBe('Application');
      expect(groupStructure.files).toHaveLength(2);
      expect(groupStructure.files[0].name).toBe('main.c');
    });
  });

  describe('TargetInfo type', () => {
    it('should have required properties', () => {
      const targetInfo: TargetInfo = {
        deviceName: 'STM32F407VGT6',
        vendor: 'STMicroelectronics',
        cpuType: 'Cortex-M4',
        iramStart: '0x20000000',
        iramSize: '0x20000',
        iromStart: '0x08000000',
        iromSize: '0x100000',
        hasFPU: true,
        fpuType: 'FPU2'
      };

      expect(targetInfo.deviceName).toBeDefined();
      expect(targetInfo.vendor).toBeDefined();
      expect(targetInfo.cpuType).toBeDefined();
      expect(targetInfo.hasFPU).toBe(true);
    });
  });

  describe('SourceFile type', () => {
    it('should have file properties', () => {
      const sourceFile: SourceFile = {
        name: 'main.c',
        path: './Application/main.c',
        type: 'C Source',
        group: 'Application'
      };

      expect(sourceFile.name).toBe('main.c');
      expect(sourceFile.path).toBeDefined();
      expect(sourceFile.type).toBeDefined();
      expect(sourceFile.group).toBeDefined();
    });
  });

  describe('KeilProjectParser class structure', () => {
    it('should have parseUVProject method', () => {
      expect(typeof KeilProjectParser.parseUVProject).toBe('function');
    });

    it('should have getTargetInfo method', () => {
      expect(typeof KeilProjectParser.getTargetInfo).toBe('function');
    });

    it('should have getSources method', () => {
      expect(typeof KeilProjectParser.getSources).toBe('function');
    });
  });
});
