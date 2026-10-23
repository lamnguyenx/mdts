import {
  ActionIcon,
  Anchor,
  Box,
  Group,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import {
  IconBrandGithub,
  IconLayoutDashboard,
  IconLayoutSidebarRight,
  IconMenu2,
  IconSearch,
  IconSettings,
} from '@tabler/icons-react';
import React, { useCallback } from 'react';

import useIsMobile from '../hooks/useIsMobile';
import Logo from './Logo';

interface AppHeaderProps {
  handleFileSelect: (path: string) => void;
  onSettingsClick: () => void;
  onFuzzySearchClick: () => void;
  onToggleFileTree?: () => void;
  onToggleOutline?: () => void;
  onDashboardClick?: () => void;
  currentFolder?: string | null;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  handleFileSelect,
  onSettingsClick,
  onFuzzySearchClick,
  onToggleFileTree,
  onToggleOutline,
  onDashboardClick,
  currentFolder,
}) => {
  const isMobile = useIsMobile();
  const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const shortcutKey = isMac ? '⌘K' : 'Ctrl+K';
  const handleFileSelectClick = useCallback(() => {
    handleFileSelect('');
  }, [handleFileSelect]);

  return (
    <Box
      component="header"
      h="var(--app-header-height)"
      px="sm"
      style={{
        backgroundColor: 'var(--app-paper)',
        borderBottom: '1px solid var(--mantine-color-default-border)',
        flexShrink: 0,
      }}
    >
      <Group h="100%" justify="space-between" wrap="nowrap">
        <Group gap={4} wrap="nowrap">
          {isMobile && onToggleFileTree && (
            <Tooltip label="Toggle file tree">
              <ActionIcon
                onClick={onToggleFileTree}
                variant="subtle"
                color="gray"
                size="md"
                aria-label="toggle file tree"
              >
                <IconMenu2 size={20} />
              </ActionIcon>
            </Tooltip>
          )}
          <Tooltip label="Top page">
            <UnstyledButton
              onClick={handleFileSelectClick}
              aria-label="Top page"
              style={{ height: 44, display: 'flex', alignItems: 'center' }}
            >
              <Logo />
            </UnstyledButton>
          </Tooltip>
        </Group>

        <Group gap={4} wrap="nowrap">
          {isMobile && onToggleOutline && (
            <Tooltip label="Toggle outline">
              <ActionIcon
                onClick={onToggleOutline}
                variant="subtle"
                color="gray"
                size="md"
                aria-label="toggle outline"
              >
                <IconLayoutSidebarRight size={20} />
              </ActionIcon>
            </Tooltip>
          )}
          {onDashboardClick && (
            <Tooltip label={currentFolder ? 'Open another folder' : 'Dashboard'}>
              <ActionIcon
                onClick={onDashboardClick}
                variant="subtle"
                color="gray"
                size="md"
                aria-label="open dashboard"
              >
                <IconLayoutDashboard size={20} />
              </ActionIcon>
            </Tooltip>
          )}
          <Tooltip label="Settings">
            <ActionIcon
              onClick={onSettingsClick}
              variant="subtle"
              color="gray"
              size="md"
              aria-label="settings"
            >
              <IconSettings size={20} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={`Search files (${shortcutKey})`}>
            <ActionIcon
              onClick={onFuzzySearchClick}
              variant="subtle"
              color="gray"
              size="md"
              aria-label="search files"
            >
              <IconSearch size={20} />
            </ActionIcon>
          </Tooltip>
          {!isMobile && (
            <Tooltip label="GitHub Repository">
              <ActionIcon
                component="a"
                href="https://github.com/unhappychoice/mdts"
                target="_blank"
                rel="noopener"
                variant="subtle"
                color="gray"
                size="md"
                aria-label="GitHub repository"
              >
                <IconBrandGithub size={20} />
              </ActionIcon>
            </Tooltip>
          )}
          {!isMobile && (
            <Tooltip label="Changelog">
              <Anchor
                href="https://github.com/unhappychoice/mdts/blob/main/CHANGELOG.md"
                target="_blank"
                rel="noopener"
                size="sm"
                ff="monospace"
              >
                v{process.env.APP_VERSION}
              </Anchor>
            </Tooltip>
          )}
        </Group>
      </Group>
    </Box>
  );
};

export default AppHeader;
