import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { PinConfig, PeripheralConfig, MCUInfo, IocFile } from './types.js';

/**
 * CubeMX .ioc file parser
 *
 * Parses STM32CubeMX configuration files (.ioc)
 * and extracts pin configurations and peripheral settings.
 */
export class CubeMXParser {
  /**
   * Parse a CubeMX .ioc configuration file
   *
   * @param iocPath - Path to the .ioc file
   * @returns Parsed configuration
   */
  static parseIocFile(iocPath: string): IocFile {
    const content = readFileSync(iocPath, 'utf-8');
    const properties = this.parseProperties(content);

    const mcuInfo = this.extractMCUInfo(properties);
    const pinConfigs = this.extractPinConfigs(properties);
    const peripheralConfigs = this.extractPeripheralConfigs(properties);

    return {
      filePath: resolve(iocPath),
      mcuInfo,
      pinConfigs,
      peripheralConfigs,
      properties
    };
  }

  /**
   * Get pin configurations from a .ioc file
   *
   * @param iocPath - Path to the .ioc file
   * @returns Array of pin configurations
   */
  static getPinConfig(iocPath: string): PinConfig[] {
    const parsed = this.parseIocFile(iocPath);
    return parsed.pinConfigs;
  }

  /**
   * Get peripheral configurations from a .ioc file
   *
   * @param iocPath - Path to the .ioc file
   * @returns Array of peripheral configurations
   */
  static getPeriphConfig(iocPath: string): PeripheralConfig[] {
    const parsed = this.parseIocFile(iocPath);
    return parsed.peripheralConfigs;
  }

  /**
   * Parse key-value properties from .ioc file
   *
   * @param content - File content
   * @returns Map of properties
   */
  private static parseProperties(content: string): Map<string, string> {
    const properties = new Map<string, string>();
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      // Skip comments and empty lines
      if (trimmed.startsWith('#') || trimmed.length === 0) {
        continue;
      }

      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.substring(0, eqIndex).trim();
        const value = trimmed.substring(eqIndex + 1).trim();
        properties.set(key, value);
      }
    }

    return properties;
  }

  /**
   * Extract MCU information from properties
   *
   * @param properties - Parsed properties
   * @returns MCU information
   */
  private static extractMCUInfo(properties: Map<string, string>): MCUInfo {
    return {
      family: properties.get('Mcu.Family') || '',
      name: properties.get('Mcu.Name') || '',
      package: properties.get('Mcu.Package'),
      userName: properties.get('Mcu.UserName')
    };
  }

  /**
   * Extract pin configurations from properties
   *
   * @param properties - Parsed properties
   * @returns Array of pin configurations
   */
  private static extractPinConfigs(properties: Map<string, string>): PinConfig[] {
    const pinConfigs: PinConfig[] = [];
    const pinEntries = new Map<string, PinConfig>();

    // Find all pin definitions (Mcu.Pin0, Mcu.Pin1, etc.)
    let pinIndex = 0;
    while (true) {
      const pinKey = `Mcu.Pin${pinIndex}`;
      const pinName = properties.get(pinKey);

      if (!pinName) {
        break;
      }

      // Extract signal for this pin
      const signalKey = `${pinName}.Signal`;
      const signal = properties.get(signalKey) || '';

      // Extract mode if present
      const modeKey = `${pinName}.Mode`;
      const mode = properties.get(modeKey);

      // Extract GPIO label if present
      const labelKey = `${pinName}.GPIO_Label`;
      const label = properties.get(labelKey);

      // Determine direction from signal
      let direction: 'Input' | 'Output' | 'Alternate' = 'Alternate';
      if (signal === 'GPIO_Output') {
        direction = 'Output';
      } else if (signal === 'GPIO_Input') {
        direction = 'Input';
      }

      // Extract alternate function number if present
      let afNumber: number | undefined;
      const afKey = `${pinName}.Lock`;
      // AF number might be in different properties depending on CubeMX version
      // This is a simplified extraction

      pinConfigs.push({
        pinName,
        signal,
        mode,
        direction,
        pull: 'None', // Default, would need more parsing
        label,
        afNumber
      });

      pinIndex++;
    }

    return pinConfigs;
  }

  /**
   * Extract peripheral configurations from properties
   *
   * @param properties - Parsed properties
   * @returns Array of peripheral configurations
   */
  private static extractPeripheralConfigs(properties: Map<string, string>): PeripheralConfig[] {
    const peripherals: Map<string, PeripheralConfig> = new Map();

    // Find all enabled IPs (Mcu.IP0, Mcu.IP1, etc.)
    let ipIndex = 0;
    while (true) {
      const ipKey = `Mcu.IP${ipIndex}`;
      const ipName = properties.get(ipKey);

      if (!ipName) {
        break;
      }

      // Skip system IPs
      if (['NVIC', 'RCC', 'SYS'].includes(ipName)) {
        ipIndex++;
        continue;
      }

      peripherals.set(ipName, {
        name: ipName,
        mode: 'Unknown'
      });

      ipIndex++;
    }

    // Extract detailed configuration for each peripheral type
    this.extractUARTConfig(properties, peripherals);
    this.extractSPIConfig(properties, peripherals);
    this.extractI2CConfig(properties, peripherals);
    this.extractADCConfig(properties, peripherals);

    return Array.from(peripherals.values());
  }

  /**
   * Extract UART/USART configuration
   *
   * @param properties - Parsed properties
   * @param peripherals - Map to update with configs
   */
  private static extractUARTConfig(
    properties: Map<string, string>,
    peripherals: Map<string, PeripheralConfig>
  ): void {
    for (const [name, config] of peripherals.entries()) {
      if (name.startsWith('UART') || name.startsWith('USART')) {
        const baudRateKey = `${name}.BaudRate`;
        const dataBitsKey = `${name}.DataWidth`;
        const parityKey = `${name}.Parity`;
        const stopBitsKey = `${name}.StopBits`;
        const modeKey = `${name}.Mode`;

        config.baudRate = properties.get(baudRateKey) || '115200';
        config.dataBits = properties.get(dataBitsKey) || '8';
        config.parity = this.mapParity(properties.get(parityKey));
        config.stopBits = properties.get(stopBitsKey) || '1';
        config.mode = properties.get(modeKey) || 'Asynchronous';

        // Check for DMA
        const dmaKey = `${name}.DMA`;
        config.dmaEnabled = properties.has(dmaKey);
      }
    }
  }

  /**
   * Extract SPI configuration
   *
   * @param properties - Parsed properties
   * @param peripherals - Map to update with configs
   */
  private static extractSPIConfig(
    properties: Map<string, string>,
    peripherals: Map<string, PeripheralConfig>
  ): void {
    for (const [name, config] of peripherals.entries()) {
      if (name.startsWith('SPI')) {
        const modeKey = `${name}.Mode`;
        const baudKey = `${name}.BaudRate`;

        config.mode = properties.get(modeKey) || 'Master';
        config.clockSpeed = properties.get(baudKey);

        // Check for DMA
        const dmaKey = `${name}.DMA`;
        config.dmaEnabled = properties.has(dmaKey);
      }
    }
  }

  /**
   * Extract I2C configuration
   *
   * @param properties - Parsed properties
   * @param peripherals - Map to update with configs
   */
  private static extractI2CConfig(
    properties: Map<string, string>,
    peripherals: Map<string, PeripheralConfig>
  ): void {
    for (const [name, config] of peripherals.entries()) {
      if (name.startsWith('I2C')) {
        const modeKey = `${name}.Mode`;
        const speedKey = `${name}.Speed`;

        config.mode = properties.get(modeKey) || 'Master';
        config.clockSpeed = properties.get(speedKey) || '100000';

        // Check for DMA
        const dmaKey = `${name}.DMA`;
        config.dmaEnabled = properties.has(dmaKey);
      }
    }
  }

  /**
   * Extract ADC configuration
   *
   * @param properties - Parsed properties
   * @param peripherals - Map to update with configs
   */
  private static extractADCConfig(
    properties: Map<string, string>,
    peripherals: Map<string, PeripheralConfig>
  ): void {
    for (const [name, config] of peripherals.entries()) {
      if (name.startsWith('ADC')) {
        const modeKey = `${name}.Mode`;
        config.mode = properties.get(modeKey) || 'Independent';
      }
    }
  }

  /**
   * Map parity value to standard name
   *
   * @param parity - Parity value from properties
   * @returns Standard parity name
   */
  private static mapParity(parity?: string): string {
    if (!parity) {
      return 'None';
    }

    const parityLower = parity.toLowerCase();
    if (parityLower.includes('even')) {
      return 'Even';
    } else if (parityLower.includes('odd')) {
      return 'Odd';
    }
    return 'None';
  }
}
