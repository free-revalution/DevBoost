/**
 * Pin configuration from CubeMX .ioc file
 */
export interface PinConfig {
  /** Pin name (e.g., PE2, PA0) */
  pinName: string;
  /** Signal function (e.g., UART4_TX, GPIO_Output) */
  signal: string;
  /** Pin mode (e.g., Asynchronous, Input, Output) */
  mode?: string;
  /** Pin direction (Input, Output, Alternate) */
  direction?: string;
  /** Pull resistor setting (None, Up, Down) */
  pull?: string;
  /** GPIO label if configured */
  label?: string;
  /** Alternate function number */
  afNumber?: number;
}

/**
 * Peripheral configuration
 */
export interface PeripheralConfig {
  /** Peripheral name (e.g., UART4, I2C1, SPI1) */
  name: string;
  /** Peripheral mode (e.g., Asynchronous, Master, Slave) */
  mode?: string;
  /** Baud rate for UART/USART */
  baudRate?: string;
  /** Data bits for UART/USART */
  dataBits?: string;
  /** Parity for UART/USART */
  parity?: string;
  /** Stop bits for UART/USART */
  stopBits?: string;
  /** Clock speed for SPI/I2C */
  clockSpeed?: string;
  /** Whether DMA is enabled */
  dmaEnabled?: boolean;
}

/**
 * MCU information from .ioc file
 */
export interface MCUInfo {
  /** MCU family (e.g., STM32F4) */
  family: string;
  /** MCU name (e.g., STM32F407VGTx) */
  name: string;
  /** Package type (e.g., LQFP100) */
  package?: string;
  /** User-defined name */
  userName?: string;
}

/**
 * Parsed CubeMX .ioc file content
 */
export interface IocFile {
  /** File path */
  filePath: string;
  /** MCU information */
  mcuInfo: MCUInfo;
  /** Pin configurations */
  pinConfigs: PinConfig[];
  /** Peripheral configurations */
  peripheralConfigs: PeripheralConfig[];
  /** All key-value pairs from the file */
  properties: Map<string, string>;
}
