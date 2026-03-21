import { describe, it, expect } from 'vitest';
import { USBDetector, DeviceType, type USBDevice } from '../../src/usb';

describe('USB Device Detector', () => {
  describe('DeviceType enum', () => {
    it('should have all required device types', () => {
      expect(DeviceType.STLinkV2).toBe('STLinkV2');
      expect(DeviceType.STLinkV3).toBe('STLinkV3');
      expect(DeviceType.JLink).toBe('JLink');
      expect(DeviceType.DAPLink).toBe('DAPLink');
      expect(DeviceType.Unknown).toBe('Unknown');
    });
  });

  describe('USBDetector.identifyDevice', () => {
    it('should identify ST-Link V2 devices', () => {
      const device: USBDevice = {
        vendorId: 0x0483,
        productId: 0x3748,
        manufacturer: 'STMicroelectronics',
        product: 'ST-LINK/V2',
        serialNumber: 'SN001'
      };

      const detectedType = USBDetector.identifyDevice(device);
      expect(detectedType).toBe(DeviceType.STLinkV2);
    });

    it('should identify ST-Link V2.1 devices', () => {
      const device: USBDevice = {
        vendorId: 0x0483,
        productId: 0x374b,
        manufacturer: 'STMicroelectronics',
        product: 'ST-LINK/V2.1',
        serialNumber: 'SN002'
      };

      const detectedType = USBDetector.identifyDevice(device);
      expect(detectedType).toBe(DeviceType.STLinkV2);
    });

    it('should identify ST-Link V3 devices', () => {
      const device: USBDevice = {
        vendorId: 0x0483,
        productId: 0x374e,
        manufacturer: 'STMicroelectronics',
        product: 'ST-LINK/V3',
        serialNumber: 'SN003'
      };

      const detectedType = USBDetector.identifyDevice(device);
      expect(detectedType).toBe(DeviceType.STLinkV3);
    });

    it('should identify ST-Link V3E devices', () => {
      const device: USBDevice = {
        vendorId: 0x0483,
        productId: 0x374f,
        manufacturer: 'STMicroelectronics',
        product: 'ST-LINK/V3E',
        serialNumber: 'SN004'
      };

      const detectedType = USBDetector.identifyDevice(device);
      expect(detectedType).toBe(DeviceType.STLinkV3);
    });

    it('should identify J-Link devices', () => {
      const device: USBDevice = {
        vendorId: 0x1366,
        productId: 0x0101,
        manufacturer: 'SEGGER',
        product: 'J-Link',
        serialNumber: 'SN005'
      };

      const detectedType = USBDetector.identifyDevice(device);
      expect(detectedType).toBe(DeviceType.JLink);
    });

    it('should identify DAPLink devices', () => {
      const device: USBDevice = {
        vendorId: 0x0d28,
        productId: 0x0204,
        manufacturer: 'ARM',
        product: 'DAPLink CMSIS-DAP',
        serialNumber: 'SN006'
      };

      const detectedType = USBDetector.identifyDevice(device);
      expect(detectedType).toBe(DeviceType.DAPLink);
    });

    it('should return Unknown for unrecognized devices', () => {
      const device: USBDevice = {
        vendorId: 0x1234,
        productId: 0x5678,
        manufacturer: 'Unknown',
        product: 'Unknown Device',
        serialNumber: 'SN007'
      };

      const detectedType = USBDetector.identifyDevice(device);
      expect(detectedType).toBe(DeviceType.Unknown);
    });

    it('should identify alternative DAPLink vendor IDs', () => {
      const device: USBDevice = {
        vendorId: 0x2b8e, // NXP
        productId: 0x000a,
        manufacturer: 'NXP',
        product: 'LPC11U35',
        serialNumber: 'SN008'
      };

      const detectedType = USBDetector.identifyDevice(device);
      expect(detectedType).toBe(DeviceType.DAPLink);
    });
  });

  describe('USBDetector.getRecommendedTool', () => {
    it('should recommend STM32CubeProgrammer for ST-Link V2', () => {
      const tool = USBDetector.getRecommendedTool(DeviceType.STLinkV2);
      expect(tool).toBe('STM32CubeProgrammer');
    });

    it('should recommend STM32CubeProgrammer for ST-Link V3', () => {
      const tool = USBDetector.getRecommendedTool(DeviceType.STLinkV3);
      expect(tool).toBe('STM32CubeProgrammer');
    });

    it('should recommend JLink for J-Link devices', () => {
      const tool = USBDetector.getRecommendedTool(DeviceType.JLink);
      expect(tool).toBe('JLink');
    });

    it('should recommend OpenOCD for DAPLink devices', () => {
      const tool = USBDetector.getRecommendedTool(DeviceType.DAPLink);
      expect(tool).toBe('OpenOCD');
    });

    it('should return null for Unknown devices', () => {
      const tool = USBDetector.getRecommendedTool(DeviceType.Unknown);
      expect(tool).toBeNull();
    });
  });
});
