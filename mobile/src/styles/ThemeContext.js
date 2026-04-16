import React from 'react';
import { THEMES } from './theme';

export const ThemeContext = React.createContext({
    theme: THEMES.dark.obsidian,
    appearance: 'dark',
    palette: 'obsidian',
    setAppearance: () => {},
    setPalette: () => {},
    toggleTheme: () => {} // Kept for compatibility
});
