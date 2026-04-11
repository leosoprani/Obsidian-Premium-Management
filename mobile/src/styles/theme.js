export const lightTheme = {
  colors: {
    background: '#F2F2F7', // iOS Light Gray Background
    surface: '#FFFFFF',
    surfaceVariant: '#FFFFFF',
    primary: '#007AFF', // iOS Blue (Light)
    secondary: '#34C759', // iOS Green (Light)
    accent: '#AF52DE', // iOS Purple (Light)
    error: '#FF3B30', // iOS Red (Light)
    warning: '#FF9500', // iOS Orange (Light)
    text: '#000000',
    textSecondary: '#8E8E93',
    textTertiary: '#C7C7CC',
    border: 'rgba(0, 0, 0, 0.03)',
    glass: 'rgba(255, 255, 255, 0.4)',
    glassSecondary: 'rgba(255, 255, 255, 0.6)',
  },
  shadows: {
    soft: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    deep: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 5,
    },
    primary: {
      shadowColor: '#007AFF',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    }
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  borderRadius: { sm: 8, md: 12, lg: 20, xl: 28, xxl: 35 },
};

export const darkTheme = {
  colors: {
    background: '#0a0a0c', // Obsidian Dark
    surface: '#121214',
    surfaceVariant: '#1c1c1e',
    primary: '#0a84ff',
    secondary: '#30d158',
    accent: '#bf5af2',
    error: '#ff453a',
    warning: '#ff9f0a',
    text: '#ffffff',
    textSecondary: '#8e8e93',
    textTertiary: '#48484a',
    border: 'rgba(255, 255, 255, 0.08)',
    glass: 'rgba(255, 255, 255, 0.03)',
    glassSecondary: 'rgba(255, 255, 255, 0.08)',
  },
  shadows: {
    soft: {
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },
    deep: {
      shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.5, shadowRadius: 20, elevation: 10,
    },
    primary: {
      shadowColor: '#0a84ff', shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3, shadowRadius: 15, elevation: 8,
    }
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  borderRadius: { sm: 8, md: 12, lg: 20, xl: 28, xxl: 35 },
};

export const theme = darkTheme; // Default export for backwards compatibility
