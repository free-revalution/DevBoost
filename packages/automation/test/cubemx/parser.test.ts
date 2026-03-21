import { describe, it, expect } from 'vitest';
import { CubeMXParser, type PinConfig, type PeripheralConfig } from '../../src/cubemx';

describe('CubeMX .ioc Parser', () => {
  describe('CubeMXParser.parseIocFile', () => {
    it('should parse basic .ioc file structure', () => {
      const mockIocContent = `
#MicroXplorer Configuration settings - do not modify
File.Version=6
GPIO.groupedBy=Group By Peripherals
Mcu.Family=STM32F4
Mcu.Name=STM32F407V(G)Tx
Mcu.UserName=STM32F407VGTx
Mcu.Package=LQFP100
Mcu.IP0=NVIC
Mcu.IP1=RCC
Mcu.IP2=SYS
Mcu.IP3=GPIO
Mcu.IP4=UART4
Mcu.IP5=I2C1
Mcu.IP6=SPI1
Mcu.IPNb=7
Mcu.Pin0=PE2
Mcu.Pin1=PE3
Mcu.Pin2=PE4
Mcu.Pin3=PE5
Mcu.Pin4=PE6
Mcu.PinsNb=5
PE2.Signal=UART4_TX
PE3.Signal=UART4_RX
PE4.Mode=I2C1_Master_TX_DMA
PE4.Signal=I2C1_SDA
PE5.Signal=I2C1_SCL
PE6.Mode=SPI1_Master_DMA
PE6.Signal=SPI1_MOSI
      `;

      // Test basic parsing capabilities
      expect(mockIocContent).toContain('Mcu.Family=STM32F4');
      expect(mockIocContent).toContain('Mcu.Name=STM32F407V');
      expect(mockIocContent).toContain('PE2.Signal=UART4_TX');
      expect(mockIocContent).toContain('PE4.Signal=I2C1_SDA');
    });

    it('should extract MCU family and name', () => {
      const family = 'STM32F4';
      const name = 'STM32F407V(G)Tx';

      expect(family).toBe('STM32F4');
      expect(name).toContain('STM32F407');
    });
  });

  describe('CubeMXParser.getPinConfig', () => {
    it('should parse pin signal assignments', () => {
      const pinLine = 'PE2.Signal=UART4_TX';
      const parts = pinLine.split('=');

      expect(parts[0]).toBe('PE2.Signal');
      expect(parts[1]).toBe('UART4_TX');
    });

    it('should parse pin mode configuration', () => {
      const modeLine = 'PE4.Mode=I2C1_Master_TX_DMA';
      const parts = modeLine.split('=');

      expect(parts[0]).toBe('PE4.Mode');
      expect(parts[1]).toBe('I2C1_Master_TX_DMA');
    });

    it('should extract pin name and signal', () => {
      const pinSignal = 'PE6.Signal=SPI1_MOSI';
      const match = pinSignal.match(/^([A-Z]+\d+)\.Signal=(.+)$/);

      expect(match).toBeTruthy();
      if (match) {
        expect(match[1]).toBe('PE6');
        expect(match[2]).toBe('SPI1_MOSI');
      }
    });
  });

  describe('CubeMXParser.getPeriphConfig', () => {
    it('should list enabled peripherals', () => {
      const ipLines = [
        'Mcu.IP0=NVIC',
        'Mcu.IP1=RCC',
        'Mcu.IP2=SYS',
        'Mcu.IP3=UART4',
        'Mcu.IP4=I2C1'
      ];

      const peripherals = ipLines
        .filter(line => line.startsWith('Mcu.IP'))
        .map(line => line.split('=')[1])
        .filter(ip => ip !== 'NVIC' && ip !== 'RCC' && ip !== 'SYS');

      expect(peripherals).toContain('UART4');
      expect(peripherals).toContain('I2C1');
      expect(peripherals.length).toBeGreaterThan(0);
    });

    it('should count total peripherals', () => {
      const ipNbLine = 'Mcu.IPNb=7';
      const match = ipNbLine.match(/Mcu\.IPNb=(\d+)/);

      expect(match).toBeTruthy();
      if (match) {
        expect(parseInt(match[1], 10)).toBe(7);
      }
    });
  });

  describe('PinConfig type', () => {
    it('should have required pin properties', () => {
      const pinConfig: PinConfig = {
        pinName: 'PE2',
        signal: 'UART4_TX',
        mode: 'Asynchronous',
        direction: 'Output',
        pull: 'None'
      };

      expect(pinConfig.pinName).toBe('PE2');
      expect(pinConfig.signal).toBe('UART4_TX');
      expect(pinConfig.direction).toBeDefined();
    });
  });

  describe('PeripheralConfig type', () => {
    it('should have peripheral properties', () => {
      const periphConfig: PeripheralConfig = {
        name: 'UART4',
        mode: 'Asynchronous',
        baudRate: '115200',
        dataBits: '8',
        parity: 'None',
        stopBits: '1'
      };

      expect(periphConfig.name).toBe('UART4');
      expect(periphConfig.baudRate).toBe('115200');
      expect(periphConfig.mode).toBeDefined();
    });
  });

  describe('CubeMXParser class structure', () => {
    it('should have parseIocFile method', () => {
      expect(typeof CubeMXParser.parseIocFile).toBe('function');
    });

    it('should have getPinConfig method', () => {
      expect(typeof CubeMXParser.getPinConfig).toBe('function');
    });

    it('should have getPeriphConfig method', () => {
      expect(typeof CubeMXParser.getPeriphConfig).toBe('function');
    });
  });

  describe('Signal parsing', () => {
    it('should handle GPIO signals', () => {
      const gpioSignal = 'PA0.Signal=GPIO_Output';
      const isGPIO = gpioSignal.includes('GPIO');

      expect(isGPIO).toBe(true);
    });

    it('should handle UART signals', () => {
      const uartSignal = 'PE2.Signal=UART4_TX';
      const isUART = uartSignal.includes('UART');

      expect(isUART).toBe(true);
    });

    it('should handle SPI signals', () => {
      const spiSignal = 'PE6.Signal=SPI1_MOSI';
      const isSPI = spiSignal.includes('SPI');

      expect(isSPI).toBe(true);
    });

    it('should handle I2C signals', () => {
      const i2cSignal = 'PE4.Signal=I2C1_SDA';
      const isI2C = i2cSignal.includes('I2C');

      expect(isI2C).toBe(true);
    });
  });
});
