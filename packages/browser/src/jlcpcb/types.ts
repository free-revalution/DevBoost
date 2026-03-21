/**
 * JLCPCB type definitions for PCB configuration and orders
 */

/**
 * Valid PCB layer counts
 */
export type PCBLayers = 1 | 2 | 4 | 6;

/**
 * Valid PCB thickness values in mm
 */
export type PCBThickness = 0.4 | 0.6 | 0.8 | 1.0 | 1.2 | 1.6 | 2.0;

/**
 * Valid PCB colors
 */
export type PCBColor = 'green' | 'red' | 'blue' | 'black' | 'white' | 'yellow';

/**
 * Valid PCB finish types
 */
export type PCBFinish = 'hasl' | 'enig' | 'osp';

/**
 * Valid surface finish types
 */
export type SurfaceFinish = 'hasl_lf' | 'hasl_lf_s' | 'enig' | 'enepig' | 'osp';

/**
 * PCB configuration parameters
 */
export interface PCBConfig {
  /** Number of PCB layers (1, 2, 4, or 6) */
  layers: PCBLayers;

  /** PCB width in mm (10-500) */
  width: number;

  /** PCB height in mm (10-500) */
  height: number;

  /** Number of PCBs to order (5-10000) */
  quantity: number;

  /** PCB thickness in mm (default: 1.6) */
  thickness?: PCBThickness;

  /** PCB solder mask color (default: green) */
  color?: PCBColor;

  /** PCB finish type (default: hasl) */
  finish?: PCBFinish;

  /** Surface finish type (default: hasl_lf) */
  surfaceFinish?: SurfaceFinish;

  /** Copper weight in oz (default: 1) */
  copperWeight?: 1 | 2;

  /** Gold fingers for edge connectors (default: false) */
  goldFingers?: boolean;

  /** Castellated holes (default: false) */
  castellatedHoles?: boolean;

  /** Remove order number (default: false) */
  removeOrderNumber?: boolean;

  /** Confirm files (default: false) */
  confirmFiles?: boolean;

  /** Track impedance control (default: false) */
  impedanceControl?: boolean;
}

/**
 * Gerber file information
 */
export interface GerberFile {
  /** Full path to the Gerber file */
  path: string;

  /** Filename of the Gerber file */
  filename: string;

  /** File size in bytes */
  size?: number;

  /** MD5 checksum for file verification */
  checksum?: string;
}

/**
 * Order status enumeration
 */
export enum OrderStatus {
  /** Order is pending initialization */
  PENDING = 'pending',

  /** Gerber files uploaded */
  UPLOADED = 'uploaded',

  /** PCB configuration completed */
  CONFIGURED = 'configured',

  /** Items added to cart */
  IN_CART = 'in_cart',

  /** Order placed */
  ORDERED = 'ordered',

  /** Order is being processed */
  PROCESSING = 'processing',

  /** Order has been shipped */
  SHIPPED = 'shipped',

  /** Order completed */
  COMPLETED = 'completed',

  /** Order failed */
  FAILED = 'failed',

  /** Order cancelled */
  CANCELLED = 'cancelled'
}

/**
 * Order information
 */
export interface Order {
  /** Unique order identifier */
  id: string;

  /** Current order status */
  status: OrderStatus;

  /** PCB configuration */
  config: PCBConfig;

  /** Gerber files */
  gerbers: GerberFile[];

  /** Order total in USD */
  total: number;

  /** Order creation date */
  createdAt: Date;

  /** Estimated delivery date */
  estimatedDelivery?: Date;

  /** Order tracking number */
  trackingNumber?: string;
}

/**
 * Component selection for assembly
 */
export interface ComponentSelection {
  /** Component reference designator */
  reference: string;

  /** LCSC part number */
  lcscPart: string;

  /** Quantity */
  quantity: number;

  /** Component footprint/package */
  package?: string;
}

/**
 * Assembly options
 */
export interface AssemblyOptions {
  /** Enable PCBA assembly */
  enabled: boolean;

  /** Components to assemble */
  components: ComponentSelection[];

  /** Assembly side (top, bottom, or both) */
  side?: 'top' | 'bottom' | 'both';

  /** Remove order number from PCB (default: false) */
  removeOrderNumber?: boolean;
}

/**
 * Browser automation configuration
 */
export interface JLCPCBConfig {
  /** Headless mode (default: true) */
  headless?: boolean;

  /** Timeout for page operations in ms (default: 30000) */
  timeout?: number;

  /** Screenshot directory for error recovery */
  screenshotDir?: string;

  /** JLCPCB base URL */
  baseUrl?: string;

  /** Credentials for automatic login */
  credentials?: {
    email: string;
    password: string;
  };
}
