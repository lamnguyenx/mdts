import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Center,
  Container,
  Divider,
  EmptyState,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  Title,
  Tooltip,
  UnstyledButton,
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

const RecentFolderItem: React.FC<RecentFolderItemProps> = ({ folder, onOpen, onRemove }) => {
  const handleOpen = useCallback(() => onOpen(folder.path), [onOpen, folder.path]);
  const handleRemove = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onRemove(folder.path);
  }, [onRemove, folder.path]);

  return (
    <Box pos="relative">
      <Group
        component={UnstyledButton}
        onClick={handleOpen}
        wrap="nowrap"
        gap="md"
        align="center"
        px="md"
        py="sm"
        pr={64}
        w="100%"
        ta="left"
      >
        <IconFolder
          size={22}
          color={folder.exists ? 'var(--mantine-primary-color-filled)' : 'var(--mantine-color-disabled)'}
          style={{ flexShrink: 0 }}
        />
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text fw={600} truncate>{folder.name}</Text>
          <Text size="xs" ff="monospace" c="dimmed" truncate>{folder.path}</Text>
        </Box>
        {!folder.exists && (
          <Badge size="sm" color="yellow" variant="light">
            Missing
          </Badge>
        )}
      </Group>
      <Tooltip label="Remove from recent">
        <ActionIcon
          variant="subtle"
          color="gray"
          aria-label={`Remove ${folder.name} from recent folders`}
          onClick={handleRemove}
          pos="absolute"
          right="md"
          top="50%"
          style={{ transform: 'translateY(-50%)', zIndex: 1 }}
        >
          <IconTrash size={16} />
        </ActionIcon>
      </Tooltip>
    </Box>
  );
};

const Dashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { backdrop } = useTheme();
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

  return (
    <Box mih="100dvh" bg={backdrop} style={{ display: 'flex', flexDirection: 'column' }}>
      <Box
        component="header"
        bg="var(--mantine-color-body)"
        px="md"
        style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
      >
        <Group h={56} gap="md" justify="space-between" wrap="nowrap">
          <Box w={96} h={44}>
            <Logo />
          </Box>
          <Group gap="xs" wrap="nowrap">
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
          </Group>
        </Group>
      </Box>

      <Container size="md" py="3rem" style={{ flexGrow: 1 }}>
        <Text size="xs" fw={700} c="app.6" tt="uppercase" lts="0.16em">
          Markdown workspaces
        </Text>
        <Title order={1} mt="xs" fz="clamp(2rem, 5vw, 2.75rem)" lh={1.05} lts="-0.045em">
          Pick a folder.
          <br />
          Start reading.
        </Title>
        <Text c="dimmed" mt="md" maw={560} fz="1.08rem" lh={1.7}>
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

          <Paper withBorder radius="md">
            {loading ? (
              <Center py="4rem">
                <Loader role="progressbar" size="sm" />
              </Center>
            ) : recentFolders.length === 0 ? (
              <EmptyState
                px="lg"
                py="2rem"
                icon={<IconFolder size={44} color="var(--mantine-color-disabled)" stroke={1.5} />}
                title="No folders yet"
                description="Folders you open will show up here."
              >
                <EmptyState.Actions>
                  <Button
                    variant="subtle"
                    leftSection={<IconPlus size={18} />}
                    onClick={handleOpenPicker}
                  >
                    Choose your first folder
                  </Button>
                </EmptyState.Actions>
              </EmptyState>
            ) : (
              <Stack gap={0}>
                {recentFolders.map((folder, index) => (
                  <React.Fragment key={folder.path}>
                    {index > 0 && <Divider />}
                    <RecentFolderItem
                      folder={folder}
                      onOpen={openFolder}
                      onRemove={removeFolder}
                    />
                  </React.Fragment>
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
        bg="var(--mantine-color-body)"
        style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
      >
        <Text size="xs" c="dimmed">
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
