import React from 'react';
import { lightTheme, darkTheme } from './theme';

export const ThemeContext = React.createContext({
    theme: darkTheme || { colors: {} },
    isDark: true,
    toggleTheme: () => {}
});
