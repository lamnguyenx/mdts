import { Box, Group, Select, SegmentedControl, Text, useComputedColorScheme } from '@mantine/core';
import type { SelectProps } from '@mantine/core';
import React, { useCallback } from 'react';
import { SYNTAX_HIGHLIGHTER_THEMES } from '../../constants';
import { themes } from '../../styles/themes';

interface ColorSchemeSettingsTabProps {
  darkMode: 'dark' | 'light' | 'auto';
  theme: string;
  syntaxHighlighterTheme: string;
  handleToggleDarkMode: (mode: 'dark' | 'light' | 'auto') => void;
  setSyntaxHighlighterTheme: (theme: string) => void;
  handleToggleTheme: (theme: string) => void;
}

interface ThemeOption {
  value: string;
  label: string;
  swatch: string;
}

const renderThemeOption: SelectProps['renderOption'] = ({ option }) => {
  const themeOption = option as ThemeOption;
  return (
    <Group gap="sm" wrap="nowrap">
      <Box
        w={20}
        h={20}
        style={{
          borderRadius: 4,
          background: themeOption.swatch,
          border: '1px solid var(--mantine-color-default-border)',
          flexShrink: 0,
        }}
      />
      <Text size="sm">{themeOption.label}</Text>
    </Group>
  );
};

const renderSyntaxThemeOption: SelectProps['renderOption'] = ({ option }) => {
  const syntaxOption = option as { value: string; label: string; color?: string };
  return (
    <Group gap="sm" wrap="nowrap">
      {syntaxOption.color && (
        <Box
          w={20}
          h={20}
          style={{
            borderRadius: 4,
            background: syntaxOption.color,
            border: '1px solid var(--mantine-color-default-border)',
            flexShrink: 0,
          }}
        />
      )}
      <Text size="sm">{syntaxOption.label}</Text>
    </Group>
  );
};

const ColorSchemeSettingsTab: React.FC<ColorSchemeSettingsTabProps> = ({
  darkMode,
  syntaxHighlighterTheme,
  theme,
  handleToggleDarkMode,
  setSyntaxHighlighterTheme,
  handleToggleTheme,
}) => {
  const colorScheme = useComputedColorScheme('light', { getInitialValueInEffect: false });

  const handleDarkModeChange = useCallback((value: string) => {
    handleToggleDarkMode(value as 'dark' | 'light' | 'auto');
  }, [handleToggleDarkMode]);

  const handleSyntaxThemeChange = useCallback((value: string | null) => {
    if (value) setSyntaxHighlighterTheme(value);
  }, [setSyntaxHighlighterTheme]);

  const handleThemeChange = useCallback((value: string | null) => {
    if (value) handleToggleTheme(value);
  }, [handleToggleTheme]);

  const themeData: ThemeOption[] = themes.map((item) => {
    const palette = item[colorScheme];
    return {
      value: item.id,
      label: item.name,
      swatch: `linear-gradient(45deg, ${palette.background} 0%, ${palette.paper} 100%)`,
    };
  });

  const syntaxThemeData = [
    { value: 'auto', label: 'Auto' },
    ...SYNTAX_HIGHLIGHTER_THEMES.map((item) => ({
      value: item.value,
      label: item.name,
      color: item.color,
    })),
  ];

  return (
    <Box p="xs">
      <Text size="sm" fw={600} mb="sm">Dark Mode</Text>
      <SegmentedControl
        value={darkMode}
        onChange={handleDarkModeChange}
        aria-label="dark mode"
        fullWidth
        size="sm"
        mb="md"
        data={[
          { value: 'dark', label: 'Dark' },
          { value: 'light', label: 'Light' },
          { value: 'auto', label: 'Auto (System)' },
        ]}
      />

      <Text size="sm" fw={600} mb="sm">Theme</Text>
      <Select
        value={theme}
        onChange={handleThemeChange}
        data={themeData}
        size="sm"
        mb="md"
        allowDeselect={false}
        aria-label="Theme"
        data-testid="theme-select"
        renderOption={renderThemeOption}
      />

      <Text size="sm" fw={600} mt="md" mb="sm" id="syntax-highlighter-theme-label">
        Syntax Highlighter Theme
      </Text>
      <Select
        aria-label="Syntax Highlighter Theme"
        id="syntaxHighlighterTheme"
        value={syntaxHighlighterTheme || 'auto'}
        onChange={handleSyntaxThemeChange}
        data={syntaxThemeData}
        size="sm"
        mb="xs"
        allowDeselect={false}
        searchable
        data-testid="syntax-highlighter-theme-select"
        renderOption={renderSyntaxThemeOption}
      />
    </Box>
  );
};

export default ColorSchemeSettingsTab;
