import { MantineProvider } from '@mantine/core';
import type { CSSVariablesResolver } from '@mantine/core';
import React from 'react';
import { useTheme } from '../hooks/useTheme';

const cssVariablesResolver: CSSVariablesResolver = (theme) => ({
  variables: {
    '--app-background': theme.other.appBackground,
    '--app-paper': theme.other.appPaper,
    '--app-primary': theme.other.appPrimary,
    '--mantine-color-body': theme.other.appPaper,
  },
  light: {},
  dark: {},
});

interface AppThemeProviderProps {
  children: React.ReactNode;
}

export const AppThemeProvider: React.FC<AppThemeProviderProps> = ({ children }) => {
  const { theme, colorScheme } = useTheme();

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
