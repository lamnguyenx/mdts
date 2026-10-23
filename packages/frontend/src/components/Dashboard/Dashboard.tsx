import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Center,
  Container,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconBrandGithub,
  IconFolder,
  IconFolderOpen,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { fetchData } from '../../api';
import { useTheme } from '../../hooks/useTheme';
import Logo from '../Logo';
import { fetchConfig } from '../../store/slices/configSlice';
import type { AppDispatch } from '../../store/store';
import FolderPickerDialog from './FolderPickerDialog';

interface RecentFolder {
  path: string;
  name: string;
  openedAt: string;
  exists: boolean;
}

interface RecentFoldersResponse {
  recent: RecentFolder[];
}

interface ServerInfo {
  daemon: boolean;
  defaultFolder: string | null;
  home: string;
}

interface RecentFolderItemProps {
  folder: RecentFolder;
  onOpen: (path: string) => void;
  onRemove: (path: string) => void;
}

const withAlpha = (hex: string, alpha: number): string => {
  const normalized = hex.replace('#', '');
  const value = parseInt(normalized, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const RecentFolderItem: React.FC<RecentFolderItemProps> = ({ folder, onOpen, onRemove }) => {
  const handleOpen = useCallback(() => onOpen(folder.path), [onOpen, folder.path]);
  const handleRemove = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onRemove(folder.path);
  }, [onRemove, folder.path]);
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleOpen();
    }
  }, [handleOpen]);

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
      style={{
        padding: '8px 12px',
        cursor: 'pointer',
        borderBottom: '1px solid var(--mantine-color-default-border)',
      }}
    >
      <Group wrap="nowrap" gap="md">
        <IconFolder
          size={22}
          color={folder.exists ? 'var(--mantine-primary-color-filled)' : 'var(--mantine-color-disabled)'}
          style={{ flexShrink: 0 }}
        />
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text fw={600} truncate>
            {folder.name}
          </Text>
          <Text size="xs" ff="monospace" c="dimmed" truncate>
            {folder.path}
          </Text>
        </Box>
        {!folder.exists && (
          <Badge size="sm" color="yellow" variant="light">
            Missing
          </Badge>
        )}
        <Tooltip label="Remove from recent">
          <ActionIcon
            variant="subtle"
            color="gray"
            aria-label={`Remove ${folder.name} from recent folders`}
            onClick={handleRemove}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Box>
  );
};

const Dashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { palette } = useTheme();
  const [recentFolders, setRecentFolders] = useState<RecentFolder[]>([]);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);

  const loadRecentFolders = useCallback(async () => {
    try {
      const data = await fetchData<RecentFoldersResponse>('/api/folders/recent', 'json');
      setRecentFolders(data?.recent ?? []);
    } catch {
      setRecentFolders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    dispatch(fetchConfig());
    loadRecentFolders();

    fetchData<ServerInfo>('/api/folders/info', 'json')
      .then((info) => setServerInfo(info))
      .catch(() => setServerInfo(null));
  }, [dispatch, loadRecentFolders]);

  const openFolder = useCallback(async (folderPath: string) => {
    try {
      await fetch('/api/folders/recent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: folderPath }),
      });
    } catch {
      // Opening the folder still works even if the recent list cannot be saved.
    }

    window.location.assign(`/?folder=${encodeURIComponent(folderPath)}`);
  }, []);

  const removeFolder = useCallback(async (folderPath: string) => {
    setRecentFolders((folders) => folders.filter((folder) => folder.path !== folderPath));
    try {
      await fetch(`/api/folders/recent?path=${encodeURIComponent(folderPath)}`, {
        method: 'DELETE',
      });
    } catch {
      // The list will be refreshed on the next load.
    }
  }, []);

  const handleOpenFolder = useCallback((folderPath: string) => {
    setPickerOpen(false);
    openFolder(folderPath);
  }, [openFolder]);

  const handleOpenPicker = useCallback(() => {
    setPickerOpen(true);
  }, []);

  const handleClosePicker = useCallback(() => {
    setPickerOpen(false);
  }, []);

  const highlight = withAlpha(palette.primary, 0.16);
  const background = `radial-gradient(circle at 15% 0%, ${highlight} 0%, transparent 42%)`;

  return (
    <Box
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background,
      }}
    >
      <Box
        component="header"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--mantine-spacing-md)',
          padding: '8px 16px',
          borderBottom: '1px solid var(--mantine-color-default-border)',
          backgroundColor: withAlpha(palette.paper, 0.7),
          backdropFilter: 'blur(12px)',
        }}
      >
        <Box w={96} h={44}>
          <Logo />
        </Box>
        <Box style={{ flexGrow: 1 }} />
        <Tooltip label="GitHub Repository">
          <ActionIcon
            component="a"
            href="https://github.com/unhappychoice/mdts"
            target="_blank"
            rel="noopener"
            variant="subtle"
            color="gray"
            size="lg"
            aria-label="GitHub repository"
          >
            <IconBrandGithub size={20} />
          </ActionIcon>
        </Tooltip>
        <Text size="sm" c="dimmed" ff="monospace">
          v{process.env.APP_VERSION}
        </Text>
      </Box>

      <Container size="md" style={{ flexGrow: 1, paddingTop: '3rem', paddingBottom: '4rem' }}>
        <Text
          size="xs"
          fw={700}
          c="var(--app-primary)"
          tt="uppercase"
          style={{ letterSpacing: '0.16em' }}
        >
          Markdown workspaces
        </Text>
        <Title
          order={1}
          mt="xs"
          fw={700}
          style={{
            letterSpacing: '-0.045em',
            fontSize: 'clamp(2rem, 5vw, 2.75rem)',
            lineHeight: 1.05,
          }}
        >
          Pick a folder.
          <br />
          Start reading.
        </Title>
        <Text c="dimmed" mt="md" maw={560} style={{ fontSize: '1.08rem', lineHeight: 1.7 }}>
          mdts keeps running in the background. Open as many folders as you like — each one
          gets its own workspace and its own tab.
        </Text>

        <Group mt="lg">
          <Button
            size="lg"
            variant="filled"
            leftSection={<IconFolderOpen size={20} />}
            onClick={handleOpenPicker}
            px="xl"
          >
            Open a folder
          </Button>
        </Group>

        <Box mt="2.5rem">
          <Group gap="xs" mb="sm" align="center">
            <Title order={2} fw={650} size="h4">
              Recently viewed
            </Title>
            {recentFolders.length > 0 && (
              <Badge size="sm" variant="outline">
                {recentFolders.length}
              </Badge>
            )}
          </Group>

          <Paper withBorder radius="lg" style={{ overflow: 'hidden' }}>
            {loading ? (
              <Center py="4rem">
                <Loader role="progressbar" size="sm" />
              </Center>
            ) : recentFolders.length === 0 ? (
              <Stack align="center" gap="xs" px="lg" py="4rem" style={{ textAlign: 'center' }}>
                <IconFolder size={44} color="var(--mantine-color-disabled)" />
                <Text fw={600}>No folders yet</Text>
                <Text size="sm" c="dimmed">
                  Folders you open will show up here.
                </Text>
                <Button
                  variant="subtle"
                  leftSection={<IconPlus size={18} />}
                  onClick={handleOpenPicker}
                  mt="sm"
                >
                  Choose your first folder
                </Button>
              </Stack>
            ) : (
              <Stack gap={0}>
                {recentFolders.map((folder) => (
                  <RecentFolderItem
                    key={folder.path}
                    folder={folder}
                    onOpen={openFolder}
                    onRemove={removeFolder}
                  />
                ))}
              </Stack>
            )}
          </Paper>
        </Box>
      </Container>

      <Box
        component="footer"
        px="md"
        py="md"
        style={{
          borderTop: '1px solid var(--mantine-color-default-border)',
          color: 'var(--mantine-color-dimmed)',
        }}
      >
        <Text size="xs">
          Tip: bookmark a workspace URL, or run <code>npx mdts ./docs</code> to open a folder directly.
        </Text>
      </Box>

      <FolderPickerDialog
        open={pickerOpen}
        initialPath={serverInfo?.home}
        onClose={handleClosePicker}
        onOpen={handleOpenFolder}
      />
    </Box>
  );
};

export default Dashboard;
