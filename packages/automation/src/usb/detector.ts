import { DeviceType, type USBDevice } from './types.js';

/**
 * USB device vendor and product ID mappings
 */
interface DeviceMapping {
  vendorId: number;
  productIds: number[];
  type: DeviceType;
}

/**
 * USB Device Detector
 *
 * Identifies embedded development debuggers and programmers
 * based on their USB vendor and product IDs.
 */
export class USBDetector {
  private static readonly DEVICE_MAPPINGS: DeviceMapping[] = [
    // ST-Link V3 variants (check first since some IDs overlap)
    {
      vendorId: 0x0483, // STMicroelectronics
      productIds: [0x374e, 0x374f, 0x3753, 0x3754, 0x3755, 0x3757],
      type: DeviceType.STLinkV3
    },
    // ST-Link V2 variants
    {
      vendorId: 0x0483, // STMicroelectronics
      productIds: [0x3748, 0x3744, 0x374b, 0x3742],
      type: DeviceType.STLinkV2
    },
    // SEGGER J-Link
    {
      vendorId: 0x1366, // SEGGER
      productIds: [0x0101, 0x0105, 0x0107, 0x0102, 0x0104],
      type: DeviceType.JLink
    },
    // ARM DAPLink (CMSIS-DAP)
    {
      vendorId: 0x0d28, // ARM / NXP
      productIds: [0x0204, 0x0205, 0x000a, 0x000b, 0x000c],
      type: DeviceType.DAPLink
    },
    // Additional DAPLink vendors
    {
      vendorId: 0x2b8e, // NXP Semiconductors
      productIds: [0x000a, 0x000b, 0x000c, 0x000d],
      type: DeviceType.DAPLink
    }
  ];

  /**
   * Identify a USB device type based on vendor and product IDs
   *
   * @param device - USB device information
   * @returns Detected device type
   */
  static identifyDevice(device: USBDevice): DeviceType {
    // First try exact match on both vendor and product ID
    const exactMatch = this.DEVICE_MAPPINGS.find(
      mapping =>
        mapping.vendorId === device.vendorId &&
        mapping.productIds.includes(device.productId)
    );

    if (exactMatch) {
      return exactMatch.type;
    }

    // Special handling: ST-Link V3 product IDs overlap with V2
    // Check for V3 specific IDs first
    const stLinkV3Mapping = this.DEVICE_MAPPINGS.find(
      m => m.vendorId === 0x0483 && m.type === DeviceType.STLinkV3
    );
    if (
      stLinkV3Mapping &&
      device.vendorId === 0x0483 &&
      stLinkV3Mapping.productIds.includes(device.productId)
    ) {
      return DeviceType.STLinkV3;
    }

    // Return Unknown if no match found
    return DeviceType.Unknown;
  }

  /**
   * Get the recommended programming tool for a device type
   *
   * @param deviceType - The type of device
   * @returns Recommended tool name, or null if unknown
   */
  static getRecommendedTool(deviceType: DeviceType): string | null {
    switch (deviceType) {
      case DeviceType.STLinkV2:
      case DeviceType.STLinkV3:
        return 'STM32CubeProgrammer';
      case DeviceType.JLink:
        return 'JLink';
      case DeviceType.DAPLink:
        return 'OpenOCD';
      case DeviceType.Unknown:
        return null;
      default:
        return null;
    }
  }

  /**
   * Create a human-readable device identifier
   *
   * @param device - USB device information
   * @returns Formatted device identifier string
   */
  static formatDeviceId(device: USBDevice): string {
    const vid = device.vendorId.toString(16).padStart(4, '0').toUpperCase();
    const pid = device.productId.toString(16).padStart(4, '0').toUpperCase();
    return `${device.manufacturer} ${device.product} (${vid}:${pid})`;
  }
}
