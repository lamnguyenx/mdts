import { Button, Group, Modal, Tabs } from '@mantine/core';
import React, { useCallback, useState } from 'react';
import useIsMobile from '../../hooks/useIsMobile';
import { useSettingsForm } from '../../hooks/useSettingsForm';
import ColorSchemeSettingsTab from './ColorSchemeSettingsTab';
import FontSettingsTab from './FontSettingsTab';
import LayoutSettingsTab from './LayoutSettingsTab';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onClose }) => {
  const isMobile = useIsMobile();
  const [selectedTab, setSelectedTab] = useState<string | null>('layout');

  const {
    darkMode,
    contentMode,
    themeType,
    fontFamily,
    fontFamilyMonospace,
    fontSize,
    syntaxHighlighterTheme,
    enableBreaks,
    fontInputMode,
    fontInputModeMonospace,
    setFontFamily,
    setFontFamilyMonospace,
    setFontSize,
    setSyntaxHighlighterTheme,
    setEnableBreaks,
    handleSave: handleSaveForm,
    handleCancel: handleCancelForm,
    handleToggleDarkMode,
    handleToggleTheme,
    handleToggleContentMode,
    handleFontInputModeChange,
    handleFontInputModeMonospaceChange,
    handleReset,
  } = useSettingsForm();

  const handleSave = useCallback(() => {
    handleSaveForm();
    onClose();
  }, [handleSaveForm, onClose]);

  const handleCancel = useCallback(() => {
    handleCancelForm();
    onClose();
  }, [handleCancelForm, onClose]);

  const handleSelectTab = useCallback((value: string | null) => {
    setSelectedTab(value);
  }, []);

  return (
    <Modal
      opened={open}
      onClose={onClose}
      size={isMobile ? '100%' : 760}
      fullScreen={isMobile}
      title="Appearance Settings"
      styles={{
        body: {
          padding: 0,
          height: isMobile ? '100%' : 520,
          display: 'flex',
          flexDirection: 'column',
        },
        content: {
          overflow: 'hidden',
        },
      }}
    >
      <Tabs
        value={selectedTab}
        onChange={handleSelectTab}
        orientation={isMobile ? 'horizontal' : 'vertical'}
        style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}
      >
        <Tabs.List
          style={{
            flexShrink: 0,
            minWidth: isMobile ? undefined : 160,
            padding: isMobile ? undefined : '8px 0',
            borderRight: isMobile ? undefined : '1px solid var(--mantine-color-default-border)',
            borderBottom: isMobile ? '1px solid var(--mantine-color-default-border)' : undefined,
          }}
        >
          <Tabs.Tab value="layout">Layout</Tabs.Tab>
          <Tabs.Tab value="color-scheme">Color Scheme</Tabs.Tab>
          <Tabs.Tab value="font">Font</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel
          value="layout"
          p="md"
          style={{ flex: 1, overflowY: 'auto' }}
          className="custom-scrollbar"
        >
          <LayoutSettingsTab
            contentMode={contentMode}
            enableBreaks={enableBreaks}
            handleToggleContentMode={handleToggleContentMode}
            setEnableBreaks={setEnableBreaks}
          />
        </Tabs.Panel>
        <Tabs.Panel
          value="color-scheme"
          p="md"
          style={{ flex: 1, overflowY: 'auto' }}
          className="custom-scrollbar"
        >
          <ColorSchemeSettingsTab
            darkMode={darkMode}
            theme={themeType}
            syntaxHighlighterTheme={syntaxHighlighterTheme}
            handleToggleDarkMode={handleToggleDarkMode}
            handleToggleTheme={handleToggleTheme}
            setSyntaxHighlighterTheme={setSyntaxHighlighterTheme}
          />
        </Tabs.Panel>
        <Tabs.Panel
          value="font"
          p="md"
          style={{ flex: 1, overflowY: 'auto' }}
          className="custom-scrollbar"
        >
          <FontSettingsTab
            fontSize={fontSize}
            fontFamily={fontFamily}
            fontFamilyMonospace={fontFamilyMonospace}
            fontInputMode={fontInputMode}
            fontInputModeMonospace={fontInputModeMonospace}
            setFontSize={setFontSize}
            setFontFamily={setFontFamily}
            setFontFamilyMonospace={setFontFamilyMonospace}
            handleFontInputModeChange={handleFontInputModeChange}
            handleFontInputModeMonospaceChange={handleFontInputModeMonospaceChange}
          />
        </Tabs.Panel>
      </Tabs>

      <Group
        px="md"
        py="sm"
        justify="flex-end"
        gap="sm"
        style={{ borderTop: '1px solid var(--mantine-color-default-border)', flexShrink: 0 }}
      >
        <Button
          onClick={handleReset}
          size="compact-sm"
          variant="subtle"
          color="gray"
          mr="auto"
        >
          Restore default setting
        </Button>
        <Button onClick={handleCancel} size="compact-sm" variant="subtle" color="gray">
          Cancel
        </Button>
        <Button onClick={handleSave} size="compact-sm">
          Save
        </Button>
      </Group>
    </Modal>
  );
};

export default SettingsDialog;
