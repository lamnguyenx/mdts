import { MantineProvider } from '@mantine/core';
import React from 'react';
import { useTheme } from '../hooks/useTheme';

interface AppThemeProviderProps {
  children: React.ReactNode;
}

export const AppThemeProvider: React.FC<AppThemeProviderProps> = ({ children }) => {
  const { theme, colorScheme, cssVariablesResolver } = useTheme();

  return (
    <MantineProvider
      theme={theme}
      forceColorScheme={colorScheme}
      cssVariablesResolver={cssVariablesResolver}
    >
      {children}
    </MantineProvider>
  );
};

export default AppThemeProvider;
