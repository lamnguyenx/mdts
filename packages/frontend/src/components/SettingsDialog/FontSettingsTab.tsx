import {
  Box,
  Group,
  Radio,
  Select,
  Slider,
  Text,
  TextInput,
} from '@mantine/core';
import React, { useCallback } from 'react';
import type { SelectProps } from '@mantine/core';
import { WEB_SAFE_FONTS, WEB_SAFE_MONOSPACE_FONTS } from '../../constants';

const formatFontSize = (value: number): string => `${value}px`;

const renderFontOption: SelectProps['renderOption'] = ({ option }) => (
  <Text size="sm" style={{ fontFamily: option.value }}>{option.label}</Text>
);

interface FontSettingsTabProps {
  fontSize: number;
  fontFamily: string;
  fontFamilyMonospace: string;
  fontInputMode: 'select' | 'text';
  fontInputModeMonospace: 'select' | 'text';
  setFontSize: (size: number) => void;
  setFontFamily: (font: string) => void;
  setFontFamilyMonospace: (font: string) => void;
  handleFontInputModeChange: (mode: 'select' | 'text') => void;
  handleFontInputModeMonospaceChange: (mode: 'select' | 'text') => void;
}

const FontSettingsTab: React.FC<FontSettingsTabProps> = ({
  fontSize,
  fontFamily,
  fontFamilyMonospace,
  fontInputMode,
  fontInputModeMonospace,
  setFontSize,
  setFontFamily,
  setFontFamilyMonospace,
  handleFontInputModeChange,
  handleFontInputModeMonospaceChange,
}) => {
  const handleFontSelect = useCallback((value: string | null) => {
    if (value) setFontFamily(value);
  }, [setFontFamily]);

  const handleMonospaceFontSelect = useCallback((value: string | null) => {
    if (value) setFontFamilyMonospace(value);
  }, [setFontFamilyMonospace]);

  const handleFontChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setFontFamily(event.target.value);
  }, [setFontFamily]);

  const handleMonospaceFontChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setFontFamilyMonospace(event.target.value);
  }, [setFontFamilyMonospace]);

  const handleChangeFontSize = useCallback((value: number) => {
    setFontSize(value);
  }, [setFontSize]);

  const handleFontInputMode = useCallback((value: string) => {
    handleFontInputModeChange(value as 'select' | 'text');
  }, [handleFontInputModeChange]);

  const handleFontInputModeMonospace = useCallback((value: string) => {
    handleFontInputModeMonospaceChange(value as 'select' | 'text');
  }, [handleFontInputModeMonospaceChange]);

  return (
    <Box p="xs">
      <Text size="sm" fw={600} mb="xs">Font Size</Text>
      <Slider
        value={fontSize}
        onChange={handleChangeFontSize}
        thumbLabel="Font Size"
        label={formatFontSize}
        showLabelOnHover={false}
        step={1}
        marks={[
          { value: 10 },
          { value: 14 },
          { value: 18 },
          { value: 24 },
        ]}
        min={10}
        max={24}
        size="sm"
        mb="md"
      />

      <Radio.Group
        label="Font Family"
        value={fontInputMode}
        onChange={handleFontInputMode}
        mb="xs"
      >
        <Group gap="lg">
          <Radio size="xs" value="select" label="Select from list" />
          <Radio size="xs" value="text" label="Enter manually" />
        </Group>
      </Radio.Group>

      {fontInputMode === 'select' ? (
        <Select
          aria-label="Font Family"
          id="fontFamily"
          value={fontFamily}
          onChange={handleFontSelect}
          data={WEB_SAFE_FONTS.map((font) => ({ value: font, label: font }))}
          size="sm"
          mb="xs"
          allowDeselect={false}
          renderOption={renderFontOption}
          data-testid="font-family-select"
        />
      ) : (
        <TextInput
          autoFocus
          id="fontFamily"
          aria-label="Font Family"
          type="text"
          size="sm"
          value={fontFamily}
          mb="xs"
          onChange={handleFontChange}
          data-testid="font-family-input"
        />
      )}

      <Radio.Group
        label="Monospace Font Family"
        value={fontInputModeMonospace}
        onChange={handleFontInputModeMonospace}
        mb="xs"
      >
        <Group gap="lg">
          <Radio size="xs" value="select" label="Select from list" />
          <Radio size="xs" value="text" label="Enter manually" />
        </Group>
      </Radio.Group>

      {fontInputModeMonospace === 'select' ? (
        <Select
          aria-label="Monospace Font Family"
          id="fontFamilyMonospace"
          value={fontFamilyMonospace}
          onChange={handleMonospaceFontSelect}
          data={WEB_SAFE_MONOSPACE_FONTS.map((font) => ({ value: font, label: font }))}
          size="sm"
          mb="xs"
          allowDeselect={false}
          renderOption={renderFontOption}
          data-testid="monospace-font-family-select"
        />
      ) : (
        <TextInput
          id="fontFamilyMonospace"
          aria-label="Monospace Font Family"
          type="text"
          size="sm"
          value={fontFamilyMonospace}
          mb="xs"
          onChange={handleMonospaceFontChange}
          data-testid="monospace-font-family-input"
        />
      )}
    </Box>
  );
};

export default FontSettingsTab;
