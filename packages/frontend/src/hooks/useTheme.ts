import { createTheme } from '@mantine/core';
import type { CSSVariablesResolver, MantineColorsTuple, MantineThemeOverride } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { themes } from '../styles/themes';
import type { ThemePalette } from '../styles/themes';

export interface AppThemeResult {
  theme: MantineThemeOverride;
  cssVariablesResolver: CSSVariablesResolver;
  colorScheme: 'light' | 'dark';
  palette: ThemePalette;
  /** Background of the main content area, derived from the palette. */
  backdrop: string;
}

export const shade = (hex: string, weight: number): string => {
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

/**
 * Builds the 10-step `app` color scale from a single primary hex,
 * mirroring how Mantine color scales are structured.
 */
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

/**
 * Rebuilds Mantine's `dark` color scale around the theme's dark `paper`
 * color. Mantine derives all dark-scheme surfaces (body, borders, dimmed
 * text, hover states, …) from this tuple, so theming it retints every
 * component without a single extra CSS rule.
 *
 * Index roles follow Mantine's default dark scale:
 * 0 text · 1/2 dimmed text · 3 placeholder · 4 borders · 5 hover ·
 * 6 default surface · 7 body · 8/9 deeper surfaces.
 */
export const createDarkTuple = (paper: string): MantineColorsTuple => [
  shade(paper, 0.87),
  shade(paper, 0.73),
  shade(paper, 0.61),
  shade(paper, 0.30),
  shade(paper, 0.11),
  shade(paper, 0.07),
  shade(paper, 0.04),
  paper,
  shade(paper, -0.11),
  shade(paper, -0.19),
];

export const getActivePalette = (themeId: string, colorScheme: 'light' | 'dark'): ThemePalette => {
  const selectedTheme = themes.find((item) => item.id === themeId) || themes[0];
  return selectedTheme[colorScheme];
};

/**
 * Light-scheme surfaces: Mantine keeps light mode on white surfaces by
 * default, so the theme's `paper` is injected as the body color to carry
 * the palette identity (chrome, modals, drawers, …). Inputs, popovers and
 * dropdowns stay elevated on white, and content cards float on top.
 */
const createLightVariablesResolver = (paper: string): CSSVariablesResolver => () => ({
  variables: {},
  light: {
    '--mantine-color-body': paper,
  },
  dark: {},
});

export const useTheme = (): AppThemeResult => {
  const { darkMode } = useSelector((state: RootState) => state.appSetting);
  const { theme: themeId } = useSelector((state: RootState) => state.config);
  const systemPrefersDark = useMediaQuery('(prefers-color-scheme: dark)', false);

  const colorScheme: 'light' | 'dark' = darkMode === 'dark' || darkMode === 'light'
    ? darkMode
    : systemPrefersDark
      ? 'dark'
      : 'light';

  const palette = useMemo(() => getActivePalette(themeId, colorScheme), [themeId, colorScheme]);

  const theme = useMemo(() => createTheme({
    primaryColor: 'app',
    primaryShade: 6,
    colors: {
      app: createColorTuple(palette.primary),
      dark: createDarkTuple(getActivePalette(themeId, 'dark').paper),
    },
    fontFamilyMonospace: '"Roboto Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace',
    defaultRadius: 'sm',
  }), [palette.primary, themeId]);

  const resolver = useMemo(
    () => createLightVariablesResolver(palette.paper),
    [palette.paper],
  );

  return {
    theme,
    cssVariablesResolver: resolver,
    colorScheme,
    palette,
    backdrop: colorScheme === 'dark'
      ? shade(getActivePalette(themeId, 'dark').paper, -0.11)
      : palette.background,
  };
};
