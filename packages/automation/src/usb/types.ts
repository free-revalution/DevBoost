/**
 * USB device types supported by DevBoost
 */
export enum DeviceType {
  /** ST-Link V2 debugger */
  STLinkV2 = 'STLinkV2',
  /** ST-Link V3 debugger */
  STLinkV3 = 'STLinkV3',
  /** SEGGER J-Link debugger */
  JLink = 'JLink',
  /** ARM DAPLink debugger */
  DAPLink = 'DAPLink',
  /** Unknown or unsupported device */
  Unknown = 'Unknown'
}

/**
 * USB device information
 */
export interface USBDevice {
  /** USB vendor ID */
  vendorId: number;
  /** USB product ID */
  productId: number;
  /** Manufacturer name */
  manufacturer: string;
  /** Product name */
  product: string;
  /** Serial number */
  serialNumber: string;
}

/**
 * Device detection result
 */
export interface DeviceDetectionResult {
  /** Detected device type */
  type: DeviceType;
  /** Device information */
  device: USBDevice;
  /** Recommended programming tool */
  recommendedTool: string | null;
}
