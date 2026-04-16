const baseSpacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
const baseBorderRadius = { sm: 8, md: 12, lg: 20, xl: 28, xxl: 35 };

export const PALETTES = {
  obsidian: {
    primary: '#0a84ff',
    secondary: '#30d158',
    accent: '#bf5af2',
    mesh: ['#0a2a5e', '#1a0b36', '#050a14'], // Deep Blue to Purple
  },
  emerald: {
    primary: '#10b981',
    secondary: '#8b5cf6',
    accent: '#f59e0b',
    mesh: ['#064e40', '#062d2e', '#010f0e'], // Deep Teal to Emerald
  }
};

export const THEMES = {
  dark: {
    obsidian: {
      colors: {
        background: '#050a14',
        surface: '#121214',
        surfaceVariant: '#1c1c1e',
        primary: PALETTES.obsidian.primary,
        secondary: PALETTES.obsidian.secondary,
        accent: PALETTES.obsidian.accent,
        error: '#ff453a',
        warning: '#ff9f0a',
        text: '#ffffff',
        textSecondary: 'rgba(255, 255, 255, 0.85)',
        textTertiary: 'rgba(255, 255, 255, 0.55)',
        border: 'rgba(255, 255, 255, 0.15)',
        glass: 'rgba(255, 255, 255, 0.05)',
        glassSecondary: 'rgba(255, 255, 255, 0.15)',
        glassBorder: 'rgba(255, 255, 255, 0.08)',
        mesh: PALETTES.obsidian.mesh,
      },
      shadows: {
        soft: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
        deep: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 },
        primary: { shadowColor: PALETTES.obsidian.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 8 }
      },
      spacing: baseSpacing,
      borderRadius: baseBorderRadius,
    },
    emerald: {
      colors: {
        background: '#010f0e',
        surface: '#021a17',
        surfaceVariant: '#032c26',
        primary: PALETTES.emerald.primary,
        secondary: PALETTES.emerald.secondary,
        accent: PALETTES.emerald.accent,
        error: '#ef4444',
        warning: '#f59e0b',
        text: '#ffffff',
        textSecondary: 'rgba(255, 255, 255, 0.85)',
        textTertiary: 'rgba(255, 255, 255, 0.55)',
        border: 'rgba(255, 255, 255, 0.15)',
        glass: 'rgba(255, 255, 255, 0.05)',
        glassSecondary: 'rgba(255, 255, 255, 0.15)',
        glassBorder: 'rgba(255, 255, 255, 0.08)',
        mesh: PALETTES.emerald.mesh,
      },
      shadows: {
        soft: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
        deep: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 },
        primary: { shadowColor: PALETTES.emerald.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 8 }
      },
      spacing: baseSpacing,
      borderRadius: baseBorderRadius,
    }
  },
  light: {
    obsidian: {
      colors: {
        background: '#F0F0F5',
        surface: '#FFFFFF',
        surfaceVariant: '#F8F8FA',
        primary: '#007AFF',
        secondary: '#34C759',
        accent: '#AF52DE',
        error: '#FF3B30',
        warning: '#FF9500',
        text: '#000000',
        textSecondary: 'rgba(0, 0, 0, 0.7)',
        textTertiary: 'rgba(0, 0, 0, 0.4)',
        border: 'rgba(0, 0, 0, 0.12)',
        glass: 'rgba(255, 255, 255, 0.9)',
        glassSecondary: 'rgba(255, 255, 255, 0.95)',
        glassBorder: 'rgba(0, 0, 0, 0.06)',
        mesh: ['#DFDFE6', '#D1D1D6', '#F0F0F5'],
      },
      shadows: {
        soft: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
        deep: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 },
        primary: { shadowColor: '#007AFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 }
      },
      spacing: baseSpacing,
      borderRadius: baseBorderRadius,
    },
    emerald: {
      colors: {
        background: '#F0FDF4',
        surface: '#FFFFFF',
        surfaceVariant: '#E8F5E9',
        primary: '#10b981',
        secondary: '#8b5cf6',
        accent: '#f59e0b',
        text: '#064e3b',
        textSecondary: 'rgba(6, 78, 59, 0.8)',
        textTertiary: 'rgba(6, 78, 59, 0.5)',
        border: 'rgba(16, 185, 129, 0.2)',
        glass: 'rgba(255, 255, 255, 0.9)',
        glassSecondary: 'rgba(255, 255, 255, 0.95)',
        glassBorder: 'rgba(16, 185, 129, 0.15)',
        mesh: ['#DCFCE7', '#ECFDF5', '#F0FDF4'],
      },
      shadows: {
        soft: { shadowColor: '#10b981', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 2 },
        deep: { shadowColor: '#064e3b', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 5 },
        primary: { shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 }
      },
      spacing: baseSpacing,
      borderRadius: baseBorderRadius,
    }
  }
};

// Backwards compatibility
export const darkTheme = THEMES.dark.obsidian;
export const lightTheme = THEMES.light.obsidian;
export const theme = darkTheme;
