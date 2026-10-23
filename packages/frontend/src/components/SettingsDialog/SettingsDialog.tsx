import { Button, Divider, Group, Modal, ScrollArea, Tabs } from '@mantine/core';
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

  const panelProps = {
    p: 'md',
    style: { flexGrow: 1, minHeight: 0 },
  } as const;

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
        display="flex"
        style={{
          flex: 1,
          minHeight: 0,
          flexDirection: isMobile ? 'column' : 'row',
        }}
      >
        <Tabs.List w={isMobile ? undefined : 180} px={isMobile ? 'sm' : 'xs'} py={isMobile ? 'xs' : 'sm'}>
          <Tabs.Tab value="layout" ta={isMobile ? 'center' : 'left'}>Layout</Tabs.Tab>
          <Tabs.Tab value="color-scheme" ta={isMobile ? 'center' : 'left'}>Color Scheme</Tabs.Tab>
          <Tabs.Tab value="font" ta={isMobile ? 'center' : 'left'}>Font</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="layout" {...panelProps}>
          <ScrollArea h="100%" type="hover">
            <LayoutSettingsTab
              contentMode={contentMode}
              enableBreaks={enableBreaks}
              handleToggleContentMode={handleToggleContentMode}
              setEnableBreaks={setEnableBreaks}
            />
          </ScrollArea>
        </Tabs.Panel>
        <Tabs.Panel value="color-scheme" {...panelProps}>
          <ScrollArea h="100%" type="hover">
            <ColorSchemeSettingsTab
              darkMode={darkMode}
              theme={themeType}
              syntaxHighlighterTheme={syntaxHighlighterTheme}
              handleToggleDarkMode={handleToggleDarkMode}
              handleToggleTheme={handleToggleTheme}
              setSyntaxHighlighterTheme={setSyntaxHighlighterTheme}
            />
          </ScrollArea>
        </Tabs.Panel>
        <Tabs.Panel value="font" {...panelProps}>
          <ScrollArea h="100%" type="hover">
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
          </ScrollArea>
        </Tabs.Panel>
      </Tabs>

      <Divider />

      <Group px="md" py="sm" justify="flex-end" gap="sm" style={{ flexShrink: 0 }}>
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
