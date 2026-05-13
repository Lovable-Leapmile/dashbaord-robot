// Theme configuration for dynamic UI skinning
// All colors are defined in HSL format for CSS variable compatibility

export type UISkin = 'LEAPMILE_UI' | 'BIAL_UI' | 'AMS_UI' | 'DHL_UI';

export interface ThemeColors {
  // Primary colors
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  
  // Accent colors
  accent: string;
  accentForeground: string;
  
  // Background colors
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  
  // Muted colors
  muted: string;
  mutedForeground: string;
  
  // Border and input
  border: string;
  input: string;
  ring: string;
  
  // Status colors
  destructive: string;
  destructiveForeground: string;
  success: string;
  warning: string;
  
  // Login specific
  loginOverlay: string;
  loginTitle: string;
  
  // Sidebar
  sidebarBackground: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  sidebarRing: string;
  
  // AG Grid header
  agGridHeader: string;
}

// Helper function to convert hex to HSL
function hexToHSL(hex: string): string {
  // Remove the hash if present
  hex = hex.replace(/^#/, '');
  
  // Parse the hex values
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// LEAPMILE_UI - Default theme (current state)
const LEAPMILE_THEME: ThemeColors = {
  primary: '266 60% 29%',
  primaryForeground: '0 0% 100%',
  secondary: '210 40% 96.1%',
  secondaryForeground: '222.2 47.4% 11.2%',
  accent: '268 42% 62%',
  accentForeground: '0 0% 100%',
  background: '0 0% 100%',
  foreground: '222.2 84% 4.9%',
  card: '0 0% 100%',
  cardForeground: '222.2 84% 4.9%',
  popover: '0 0% 100%',
  popoverForeground: '222.2 84% 4.9%',
  muted: '210 40% 96.1%',
  mutedForeground: '215.4 16.3% 46.9%',
  border: '214.3 31.8% 91.4%',
  input: '214.3 31.8% 91.4%',
  ring: '266 60% 29%',
  destructive: '0 84.2% 60.2%',
  destructiveForeground: '210 40% 98%',
  success: '142 76% 36%',
  warning: '38 92% 50%',
  loginOverlay: '145 40% 16%',
  loginTitle: '268 42% 62%',
  sidebarBackground: '0 0% 98%',
  sidebarForeground: '240 5.3% 26.1%',
  sidebarPrimary: '240 5.9% 10%',
  sidebarPrimaryForeground: '0 0% 98%',
  sidebarAccent: '240 4.8% 95.9%',
  sidebarAccentForeground: '240 5.9% 10%',
  sidebarBorder: '220 13% 91%',
  sidebarRing: '217.2 91.2% 59.8%',
  agGridHeader: '268 42% 62%',
};

// BIAL_UI - Bangalore International Airport Limited
const BIAL_THEME: ThemeColors = {
  primary: hexToHSL('#0B3C5D'),
  primaryForeground: '0 0% 100%',
  secondary: hexToHSL('#1F7A8C'),
  secondaryForeground: '0 0% 100%',
  accent: hexToHSL('#1F7A8C'),
  accentForeground: '0 0% 100%',
  background: '0 0% 100%',
  foreground: hexToHSL('#1B1F23'),
  card: '0 0% 100%',
  cardForeground: hexToHSL('#1B1F23'),
  popover: '0 0% 100%',
  popoverForeground: hexToHSL('#1B1F23'),
  muted: hexToHSL('#F4F6F8'),
  mutedForeground: hexToHSL('#57606A'),
  border: hexToHSL('#D0D7DE'),
  input: hexToHSL('#D0D7DE'),
  ring: hexToHSL('#0B3C5D'),
  destructive: hexToHSL('#C62828'),
  destructiveForeground: '0 0% 100%',
  success: hexToHSL('#2E8540'),
  warning: hexToHSL('#FFB703'),
  loginOverlay: hexToHSL('#082F49'),
  loginTitle: hexToHSL('#1F7A8C'),
  sidebarBackground: hexToHSL('#E6F1F5'),
  sidebarForeground: hexToHSL('#082F49'),
  sidebarPrimary: hexToHSL('#0B3C5D'),
  sidebarPrimaryForeground: '0 0% 100%',
  sidebarAccent: hexToHSL('#E6F1F5'),
  sidebarAccentForeground: hexToHSL('#082F49'),
  sidebarBorder: hexToHSL('#D0D7DE'),
  sidebarRing: hexToHSL('#1F7A8C'),
  agGridHeader: hexToHSL('#0B3C5D'),
};

// AMS_UI - Ace Micromatic Group (uses same colors as BIAL_UI, only logo differs)
const AMS_THEME: ThemeColors = {
  primary: hexToHSL('#0B3C5D'),
  primaryForeground: '0 0% 100%',
  secondary: hexToHSL('#1F7A8C'),
  secondaryForeground: '0 0% 100%',
  accent: hexToHSL('#1F7A8C'),
  accentForeground: '0 0% 100%',
  background: '0 0% 100%',
  foreground: hexToHSL('#1B1F23'),
  card: '0 0% 100%',
  cardForeground: hexToHSL('#1B1F23'),
  popover: '0 0% 100%',
  popoverForeground: hexToHSL('#1B1F23'),
  muted: hexToHSL('#F4F6F8'),
  mutedForeground: hexToHSL('#57606A'),
  border: hexToHSL('#D0D7DE'),
  input: hexToHSL('#D0D7DE'),
  ring: hexToHSL('#0B3C5D'),
  destructive: hexToHSL('#C62828'),
  destructiveForeground: '0 0% 100%',
  success: hexToHSL('#2E8540'),
  warning: hexToHSL('#FFB703'),
  loginOverlay: hexToHSL('#082F49'),
  loginTitle: hexToHSL('#1F7A8C'),
  sidebarBackground: hexToHSL('#E6F1F5'),
  sidebarForeground: hexToHSL('#082F49'),
  sidebarPrimary: hexToHSL('#0B3C5D'),
  sidebarPrimaryForeground: '0 0% 100%',
  sidebarAccent: hexToHSL('#E6F1F5'),
  sidebarAccentForeground: hexToHSL('#082F49'),
  sidebarBorder: hexToHSL('#D0D7DE'),
  sidebarRing: hexToHSL('#1F7A8C'),
  agGridHeader: hexToHSL('#0B3C5D'),
};

// DHL_UI
const DHL_THEME: ThemeColors = {
  primary: hexToHSL('#FFCC00'),
  primaryForeground: hexToHSL('#1A1A1A'),
  secondary: hexToHSL('#D40511'),
  secondaryForeground: '0 0% 100%',
  accent: hexToHSL('#D40511'),
  accentForeground: '0 0% 100%',
  background: '0 0% 100%',
  foreground: hexToHSL('#1A1A1A'),
  card: '0 0% 100%',
  cardForeground: hexToHSL('#1A1A1A'),
  popover: '0 0% 100%',
  popoverForeground: hexToHSL('#1A1A1A'),
  muted: hexToHSL('#F5F5F5'),
  mutedForeground: hexToHSL('#616161'),
  border: hexToHSL('#E0E0E0'),
  input: hexToHSL('#E0E0E0'),
  ring: hexToHSL('#FFCC00'),
  destructive: hexToHSL('#C62828'),
  destructiveForeground: '0 0% 100%',
  success: hexToHSL('#2E7D32'),
  warning: hexToHSL('#F9A825'),
  loginOverlay: hexToHSL('#A4000A'),
  loginTitle: hexToHSL('#FFCC00'),
  sidebarBackground: hexToHSL('#FFF6CC'),
  sidebarForeground: hexToHSL('#1A1A1A'),
  sidebarPrimary: hexToHSL('#D40511'),
  sidebarPrimaryForeground: '0 0% 100%',
  sidebarAccent: hexToHSL('#FFF6CC'),
  sidebarAccentForeground: hexToHSL('#1A1A1A'),
  sidebarBorder: hexToHSL('#E0E0E0'),
  sidebarRing: hexToHSL('#FFCC00'),
  agGridHeader: hexToHSL('#D40511'),
};

// Theme registry
export const THEMES: Record<UISkin, ThemeColors> = {
  LEAPMILE_UI: LEAPMILE_THEME,
  BIAL_UI: BIAL_THEME,
  AMS_UI: AMS_THEME,
  DHL_UI: DHL_THEME,
};

// Get the current UI skin from environment variable
export function getCurrentSkin(): UISkin {
  const skin = import.meta.env.VITE_DEPLOYMENT_CSS_SKIN as string;
  
  // Validate and fallback to LEAPMILE_UI if missing or invalid
  if (skin && skin in THEMES) {
    return skin as UISkin;
  }
  
  return 'LEAPMILE_UI';
}

// Get the current theme based on environment variable
export function getCurrentTheme(): ThemeColors {
  return THEMES[getCurrentSkin()];
}

// Apply theme to document root
export function applyTheme(skin?: UISkin): void {
  const theme = skin ? THEMES[skin] : getCurrentTheme();
  const root = document.documentElement;
  
  // Set all CSS variables
  root.style.setProperty('--primary', theme.primary);
  root.style.setProperty('--primary-foreground', theme.primaryForeground);
  root.style.setProperty('--secondary', theme.secondary);
  root.style.setProperty('--secondary-foreground', theme.secondaryForeground);
  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--accent-foreground', theme.accentForeground);
  root.style.setProperty('--background', theme.background);
  root.style.setProperty('--foreground', theme.foreground);
  root.style.setProperty('--card', theme.card);
  root.style.setProperty('--card-foreground', theme.cardForeground);
  root.style.setProperty('--popover', theme.popover);
  root.style.setProperty('--popover-foreground', theme.popoverForeground);
  root.style.setProperty('--muted', theme.muted);
  root.style.setProperty('--muted-foreground', theme.mutedForeground);
  root.style.setProperty('--border', theme.border);
  root.style.setProperty('--input', theme.input);
  root.style.setProperty('--ring', theme.ring);
  root.style.setProperty('--destructive', theme.destructive);
  root.style.setProperty('--destructive-foreground', theme.destructiveForeground);
  root.style.setProperty('--success', theme.success);
  root.style.setProperty('--warning', theme.warning);
  root.style.setProperty('--login-overlay', theme.loginOverlay);
  root.style.setProperty('--login-title', theme.loginTitle);
  root.style.setProperty('--sidebar-background', theme.sidebarBackground);
  root.style.setProperty('--sidebar-foreground', theme.sidebarForeground);
  root.style.setProperty('--sidebar-primary', theme.sidebarPrimary);
  root.style.setProperty('--sidebar-primary-foreground', theme.sidebarPrimaryForeground);
  root.style.setProperty('--sidebar-accent', theme.sidebarAccent);
  root.style.setProperty('--sidebar-accent-foreground', theme.sidebarAccentForeground);
  root.style.setProperty('--sidebar-border', theme.sidebarBorder);
  root.style.setProperty('--sidebar-ring', theme.sidebarRing);
  root.style.setProperty('--ag-grid-header', theme.agGridHeader);
  
  // Set data attribute for potential CSS selectors
  root.setAttribute('data-theme', skin || getCurrentSkin());
}

// Logo paths for each skin
export const SKIN_LOGOS: Record<UISkin, string> = {
  LEAPMILE_UI: '/src/assets/logo.png',
  BIAL_UI: '/src/assets/logos/bial-logo.png',
  AMS_UI: '/src/assets/logos/ams-logo.png',
  DHL_UI: '/src/assets/logos/dhl-logo.png',
};

// Get the logo for the current skin
export function getCurrentLogo(): string {
  return SKIN_LOGOS[getCurrentSkin()];
}
