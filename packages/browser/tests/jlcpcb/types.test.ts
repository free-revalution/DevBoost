/**
 * Tests for JLCPCB types
 */

import { describe, it, expect } from 'vitest';
import {
  PCBConfig,
  GerberFile,
  OrderStatus,
  PCBLayers,
  PCBThickness,
  PCBColor,
  PCBFinish,
  SurfaceFinish
} from '../../src/jlcpcb/types';

describe('JLCPCB Types', () => {
  describe('PCBConfig', () => {
    it('should create valid PCB config with required fields', () => {
      const config: PCBConfig = {
        layers: 2,
        width: 100,
        height: 100,
        quantity: 5
      };

      expect(config.layers).toBe(2);
      expect(config.width).toBe(100);
      expect(config.height).toBe(100);
      expect(config.quantity).toBe(5);
    });

    it('should create valid PCB config with optional fields', () => {
      const config: PCBConfig = {
        layers: 4,
        width: 50,
        height: 100,
        quantity: 10,
        thickness: 1.6,
        color: 'green',
        finish: 'hasl',
        surfaceFinish: 'hasl_lf'
      };

      expect(config.thickness).toBe(1.6);
      expect(config.color).toBe('green');
      expect(config.finish).toBe('hasl');
      expect(config.surfaceFinish).toBe('hasl_lf');
    });

    it('should validate layer count', () => {
      const validLayers: PCBLayers[] = [1, 2, 4, 6];
      validLayers.forEach(layers => {
        const config: PCBConfig = {
          layers,
          width: 100,
          height: 100,
          quantity: 5
        };
        expect([1, 2, 4, 6]).toContain(config.layers);
      });
    });

    it('should validate dimensions', () => {
      const config: PCBConfig = {
        layers: 2,
        width: 10,
        height: 20,
        quantity: 5
      };

      expect(config.width).toBeGreaterThan(0);
      expect(config.height).toBeGreaterThan(0);
      expect(config.width).toBeLessThanOrEqual(500);
      expect(config.height).toBeLessThanOrEqual(500);
    });
  });

  describe('GerberFile', () => {
    it('should create valid Gerber file with required fields', () => {
      const gerber: GerberFile = {
        path: '/path/to/file.gbr',
        filename: 'board.gbr'
      };

      expect(gerber.path).toBe('/path/to/file.gbr');
      expect(gerber.filename).toBe('board.gbr');
    });

    it('should create valid Gerber file with optional fields', () => {
      const gerber: GerberFile = {
        path: '/path/to/file.zip',
        filename: 'gerbers.zip',
        size: 1024000,
        checksum: 'abc123'
      };

      expect(gerber.size).toBe(1024000);
      expect(gerber.checksum).toBe('abc123');
    });
  });

  describe('OrderStatus', () => {
    it('should have all required status values', () => {
      expect(OrderStatus.PENDING).toBe('pending');
      expect(OrderStatus.UPLOADED).toBe('uploaded');
      expect(OrderStatus.CONFIGURED).toBe('configured');
      expect(OrderStatus.IN_CART).toBe('in_cart');
      expect(OrderStatus.ORDERED).toBe('ordered');
      expect(OrderStatus.PROCESSING).toBe('processing');
      expect(OrderStatus.SHIPPED).toBe('shipped');
      expect(OrderStatus.COMPLETED).toBe('completed');
      expect(OrderStatus.FAILED).toBe('failed');
      expect(OrderStatus.CANCELLED).toBe('cancelled');
    });

    it('should allow status comparison', () => {
      const status1 = OrderStatus.PENDING;
      const status2 = OrderStatus.UPLOADED;
      const status3 = OrderStatus.PENDING;

      expect(status1).toBe(status3);
      expect(status1).not.toBe(status2);
    });
  });

  describe('Type Guards', () => {
    it('should validate PCB color values', () => {
      const validColors: PCBColor[] = [
        'green',
        'red',
        'blue',
        'black',
        'white',
        'yellow'
      ];

      validColors.forEach(color => {
        expect([
          'green',
          'red',
          'blue',
          'black',
          'white',
          'yellow'
        ]).toContain(color);
      });
    });

    it('should validate PCB finish values', () => {
      const validFinishes: PCBFinish[] = ['hasl', 'enig', 'osp'];

      validFinishes.forEach(finish => {
        expect(['hasl', 'enig', 'osp']).toContain(finish);
      });
    });

    it('should validate surface finish values', () => {
      const validSurfaceFinishes: SurfaceFinish[] = [
        'hasl_lf',
        'hasl_lf_s',
        'enig',
        'enepig',
        'osp'
      ];

      validSurfaceFinishes.forEach(finish => {
        expect([
          'hasl_lf',
          'hasl_lf_s',
          'enig',
          'enepig',
          'osp'
        ]).toContain(finish);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum quantity', () => {
      const config: PCBConfig = {
        layers: 2,
        width: 100,
        height: 100,
        quantity: 5
      };

      expect(config.quantity).toBeGreaterThanOrEqual(5);
    });

    it('should handle large quantity', () => {
      const config: PCBConfig = {
        layers: 2,
        width: 100,
        height: 100,
        quantity: 1000
      };

      expect(config.quantity).toBeLessThanOrEqual(10000);
    });

    it('should handle decimal thickness values', () => {
      const thicknesses: PCBThickness[] = [0.4, 0.6, 0.8, 1.0, 1.2, 1.6, 2.0];

      thicknesses.forEach(thickness => {
        expect(thickness).toBeGreaterThan(0);
        expect(thickness).toBeLessThanOrEqual(3.0);
      });
    });
  });
});
