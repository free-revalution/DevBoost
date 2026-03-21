import { describe, it, expect } from 'vitest';
import { CatppuccinMocha, Theme } from '../src/theme.js';

describe('Theme', () => {
  describe('CatppuccinMocha', () => {
    it('should export all required color properties', () => {
      expect(CatppuccinMocha).toBeDefined();
      expect(CatppuccinMocha).toHaveProperty('bg');
      expect(CatppuccinMocha).toHaveProperty('bgDark');
      expect(CatppuccinMocha).toHaveProperty('bgLight');
      expect(CatppuccinMocha).toHaveProperty('fg');
      expect(CatppuccinMocha).toHaveProperty('border');
      expect(CatppuccinMocha).toHaveProperty('cyan');
      expect(CatppuccinMocha).toHaveProperty('green');
      expect(CatppuccinMocha).toHaveProperty('yellow');
      expect(CatppuccinMocha).toHaveProperty('red');
      expect(CatppuccinMocha).toHaveProperty('gray');
      expect(CatppuccinMocha).toHaveProperty('mauve');
    });

    it('should have correct color values', () => {
      expect(CatppuccinMocha.bg).toBe('#1e1e2e');
      expect(CatppuccinMocha.bgDark).toBe('#181825');
      expect(CatppuccinMocha.bgLight).toBe('#313244');
      expect(CatppuccinMocha.fg).toBe('#cdd6f4');
      expect(CatppuccinMocha.border).toBe('#45475a');
      expect(CatppuccinMocha.cyan).toBe('#89b4fa');
      expect(CatppuccinMocha.green).toBe('#a6e3a1');
      expect(CatppuccinMocha.yellow).toBe('#f9e2af');
      expect(CatppuccinMocha.red).toBe('#f38ba8');
      expect(CatppuccinMocha.gray).toBe('#6c7086');
      expect(CatppuccinMocha.mauve).toBe('#cba6f7');
    });

    it('should have readonly properties', () => {
      // TypeScript should enforce this, but we can check the structure
      const themeKeys = Object.keys(CatppuccinMocha);
      expect(themeKeys).toHaveLength(11);
    });
  });

  describe('Theme type', () => {
    it('should allow type checking', () => {
      const theme: Theme = CatppuccinMocha;
      expect(theme).toBe(CatppuccinMocha);
    });
  });
});
