import { createTheme } from '@mantine/core';
import type { MantineColorsTuple, MantineThemeOverride } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { themes } from '../styles/themes';
import type { ThemePalette } from '../styles/themes';

export interface AppThemeResult {
  theme: MantineThemeOverride;
  colorScheme: 'light' | 'dark';
  palette: ThemePalette;
}

const shade = (hex: string, weight: number): string => {
  const normalized = hex.replace('#', '');
  const expanded = normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized;

  const value = parseInt(expanded, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  const target = weight > 0 ? 255 : 0;
  const amount = Math.abs(weight);

  const mix = (channel: number): number => Math.round(channel + (target - channel) * amount);

  return `#${[mix(red), mix(green), mix(blue)]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')}`;
};

export const createColorTuple = (primary: string): MantineColorsTuple => [
  shade(primary, 0.92),
  shade(primary, 0.8),
  shade(primary, 0.65),
  shade(primary, 0.45),
  shade(primary, 0.25),
  shade(primary, 0.1),
  primary,
  shade(primary, -0.15),
  shade(primary, -0.3),
  shade(primary, -0.45),
];

export const useTheme = (): AppThemeResult => {
  const { darkMode } = useSelector((state: RootState) => state.appSetting);
  const { theme: themeId } = useSelector((state: RootState) => state.config);
  const systemPrefersDark = useMediaQuery('(prefers-color-scheme: dark)', false);

  const colorScheme: 'light' | 'dark' = darkMode === 'dark' || darkMode === 'light'
    ? darkMode
    : systemPrefersDark
      ? 'dark'
      : 'light';

  const theme = useMemo(() => {
    const selectedTheme = themes.find((item) => item.id === themeId) || themes[0];
    const palette = selectedTheme[colorScheme];

    return createTheme({
      primaryColor: 'app',
      primaryShade: 6,
      fontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
      fontFamilyMonospace: '"Roboto Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace',
      colors: {
        app: createColorTuple(palette.primary),
      },
      other: {
        appBackground: palette.background,
        appPaper: palette.paper,
        appPrimary: palette.primary,
        colorScheme,
      },
    });
  }, [themeId, colorScheme]);

  return {
    theme,
    colorScheme,
    palette: (themes.find((item) => item.id === themeId) || themes[0])[colorScheme],
  };
};
