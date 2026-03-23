/**
 * Theme definitions for TUI
 * All themes follow the same color scheme structure
 */

/**
 * Base theme interface
 */
export interface Theme {
  readonly name: string;
  readonly bg: string;
  readonly bgDark: string;
  readonly bgLight: string;
  readonly fg: string;
  readonly border: string;
  readonly cyan: string;
  readonly green: string;
  readonly yellow: string;
  readonly red: string;
  readonly gray: string;
  readonly mauve: string;
}

/**
 * Catppuccin Mocha - Dark, cozy theme
 */
export const CatppuccinMocha: Theme = {
  name: 'Catppuccin Mocha',
  bg: '#1e1e2e',
  bgDark: '#181825',
  bgLight: '#313244',
  fg: '#cdd6f4',
  border: '#45475a',
  cyan: '#89b4fa',
  green: '#a6e3a1',
  yellow: '#f9e2af',
  red: '#f38ba8',
  gray: '#6c7086',
  mauve: '#cba6f7'
};

/**
 * Tokyo Night - Modern dark theme
 */
export const TokyoNight: Theme = {
  name: 'Tokyo Night',
  bg: '#1a1b26',
  bgDark: '#16161e',
  bgLight: '#24283b',
  fg: '#c0caf5',
  border: '#414868',
  cyan: '#7dcfff',
  green: '#9ece6a',
  yellow: '#e0af68',
  red: '#f7768e',
  gray: '#565f89',
  mauve: '#bb9af7'
};

/**
 * Dracula - Classic dark theme
 */
export const Dracula: Theme = {
  name: 'Dracula',
  bg: '#282a36',
  bgDark: '#21222c',
  bgLight: '#44475a',
  fg: '#f8f8f2',
  border: '#44475a',
  cyan: '#8be9fd',
  green: '#50fa7b',
  yellow: '#f1fa8c',
  red: '#ff5555',
  gray: '#6272a4',
  mauve: '#bd93f9'
};

/**
 * Nord - Arctic, bluish theme
 */
export const Nord: Theme = {
  name: 'Nord',
  bg: '#2e3440',
  bgDark: '#242933',
  bgLight: '#3b4252',
  fg: '#eceff4',
  border: '#4c566a',
  cyan: '#88c0d0',
  green: '#a3be8c',
  yellow: '#ebcb8b',
  red: '#bf616a',
  gray: '#4c566a',
  mauve: '#b48ead'
};

/**
 * Monokai - Classic dark theme
 */
export const Monokai: Theme = {
  name: 'Monokai',
  bg: '#272822',
  bgDark: '#1e1f1a',
  bgLight: '#3e3d32',
  fg: '#f8f8f2',
  border: '#49483e',
  cyan: '#66d9ef',
  green: '#a6e22e',
  yellow: '#f92672',
  red: '#f92672',
  gray: '#75715e',
  mauve: '#ae81ff'
};

/**
 * Gruvbox Dark - Retro theme
 */
export const GruvboxDark: Theme = {
  name: 'Gruvbox Dark',
  bg: '#282828',
  bgDark: '#1d2021',
  bgLight: '#3c3836',
  fg: '#ebdbb2',
  border: '#665c54',
  cyan: '#83a598',
  green: '#b8bb26',
  yellow: '#fabd2f',
  red: '#fb4934',
  gray: '#928374',
  mauve: '#d3869b'
};

/**
 * All available themes
 */
export const AllThemes: Theme[] = [
  CatppuccinMocha,
  TokyoNight,
  Dracula,
  Nord,
  Monokai,
  GruvboxDark
];

/**
 * Theme Manager class
 * Handles theme switching and persistence
 */
export class ThemeManager {
  private currentTheme: Theme;
  private themeIndex: number;
  private storageKey: string;

  constructor(storageKey: string = 'devboost-theme') {
    this.storageKey = storageKey;
    this.themeIndex = this.loadThemeIndex();
    this.currentTheme = AllThemes[this.themeIndex] || CatppuccinMocha;
  }

  /**
   * Get current theme
   */
  getCurrentTheme(): Theme {
    return this.currentTheme;
  }

  /**
   * Get all available themes
   */
  getAllThemes(): Theme[] {
    return [...AllThemes];
  }

  /**
   * Set theme by name
   */
  setThemeByName(name: string): boolean {
    const index = AllThemes.findIndex(t => t.name === name);
    if (index !== -1) {
      this.themeIndex = index;
      this.currentTheme = AllThemes[index];
      this.saveThemeIndex();
      return true;
    }
    return false;
  }

  /**
   * Set theme by index
   */
  setThemeByIndex(index: number): boolean {
    if (index >= 0 && index < AllThemes.length) {
      this.themeIndex = index;
      this.currentTheme = AllThemes[index];
      this.saveThemeIndex();
      return true;
    }
    return false;
  }

  /**
   * Cycle to next theme
   */
  nextTheme(): Theme {
    this.themeIndex = (this.themeIndex + 1) % AllThemes.length;
    this.currentTheme = AllThemes[this.themeIndex];
    this.saveThemeIndex();
    return this.currentTheme;
  }

  /**
   * Cycle to previous theme
   */
  previousTheme(): Theme {
    this.themeIndex = (this.themeIndex - 1 + AllThemes.length) % AllThemes.length;
    this.currentTheme = AllThemes[this.themeIndex];
    this.saveThemeIndex();
    return this.currentTheme;
  }

  /**
   * Get current theme index
   */
  getCurrentThemeIndex(): number {
    return this.themeIndex;
  }

  /**
   * Load theme index from storage
   */
  private loadThemeIndex(): number {
    try {
      // Try to load from localStorage-like storage
      // For terminal apps, we might use a config file
      const fs = require('fs');
      const path = require('path');
      const configPath = path.join(process.cwd(), '.devboost', 'config.json');

      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (typeof config.themeIndex === 'number') {
          return config.themeIndex;
        }
      }
    } catch (error) {
      // Ignore loading errors
    }
    return 0; // Default to first theme
  }

  /**
   * Save theme index to storage
   */
  private saveThemeIndex(): void {
    try {
      const fs = require('fs');
      const path = require('path');
      const configDir = path.join(process.cwd(), '.devboost');
      const configPath = path.join(configDir, 'config.json');

      // Ensure directory exists
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // Read existing config or create new
      let config: Record<string, any> = {};
      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      }

      // Update theme index
      config.themeIndex = this.themeIndex;

      // Write config
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      // Ignore saving errors
    }
  }

  /**
   * Reset to default theme
   */
  reset(): void {
    this.themeIndex = 0;
    this.currentTheme = AllThemes[0];
    this.saveThemeIndex();
  }
}

// Export default theme for convenience
export { CatppuccinMocha as defaultTheme };
