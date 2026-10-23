import { useComputedColorScheme } from '@mantine/core';
import type { CSSProperties } from 'react';
import {
  a11yDark,
  atomDark,
  base16AteliersulphurpoolLight,
  cb,
  coldarkCold,
  coldarkDark,
  coy,
  coyWithoutShadows,
  darcula,
  dark,
  dracula,
  duotoneDark,
  duotoneEarth,
  duotoneForest,
  duotoneLight,
  duotoneSea,
  duotoneSpace,
  funky,
  ghcolors,
  gruvboxDark,
  gruvboxLight,
  hopscotch,
  lucario,
  materialDark,
  materialLight,
  materialOceanic,
  nightOwl,
  nord,
  okaidia,
  oneDark,
  oneLight,
  pojoaque,
  prism,
  shadesOfPurple,
  solarizedDarkAtom,
  solarizedlight,
  synthwave84,
  tomorrow,
  twilight,
  vs,
  vscDarkPlus,
  xonokai,
  zTouch
} from 'react-syntax-highlighter/dist/esm/styles/prism';
import { SYNTAX_HIGHLIGHTER_THEMES } from '../constants';

type SyntaxHighlighterThemeMeta = typeof SYNTAX_HIGHLIGHTER_THEMES[number];

export const resolveSyntaxHighlighterThemeValue = (syntaxHighlighterTheme: string, mode: 'light' | 'dark'): string => {
  if (syntaxHighlighterTheme === 'auto') {
    return mode === 'dark' ? 'atomDark' : 'vs';
  }
  return syntaxHighlighterTheme;
};

export const useSyntaxHighlighterThemeMeta = (syntaxHighlighterTheme: string): SyntaxHighlighterThemeMeta => {
  const colorScheme = useComputedColorScheme('light', { getInitialValueInEffect: false });
  const resolved = resolveSyntaxHighlighterThemeValue(syntaxHighlighterTheme, colorScheme);
  return SYNTAX_HIGHLIGHTER_THEMES.find(t => t.value === resolved)
    ?? SYNTAX_HIGHLIGHTER_THEMES.find(t => t.value === 'atomDark')!;
};

export const useSyntaxHighlighterTheme = (syntaxHighlighterTheme: string): Record<string, CSSProperties> => {
  const colorScheme = useComputedColorScheme('light', { getInitialValueInEffect: false });

  const themeMap: { [key: string]: object } = {
    coy,
    dark,
    funky,
    okaidia,
    solarizedlight,
    tomorrow,
    twilight,
    prism,
    nightOwl,
    atomDark,
    darcula,
    dracula,
    ghcolors,
    vs,
    vscDarkPlus,
    a11yDark,
    base16AteliersulphurpoolLight,
    cb,
    coldarkCold,
    coldarkDark,
    coyWithoutShadows,
    duotoneDark,
    duotoneEarth,
    duotoneForest,
    duotoneLight,
    duotoneSea,
    duotoneSpace,
    gruvboxDark,
    gruvboxLight,
    hopscotch,
    lucario,
    materialDark,
    materialLight,
    materialOceanic,
    nord,
    oneDark,
    oneLight,
    pojoaque,
    shadesOfPurple,
    solarizedDarkAtom,
    synthwave84,
    xonokai,
    zTouch,
  };

  const resolved = resolveSyntaxHighlighterThemeValue(syntaxHighlighterTheme, colorScheme);
  return (themeMap[resolved] || atomDark) as Record<string, CSSProperties>;
};
