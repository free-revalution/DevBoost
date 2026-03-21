export const CatppuccinMocha = {
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
} as const;

export type Theme = typeof CatppuccinMocha;
