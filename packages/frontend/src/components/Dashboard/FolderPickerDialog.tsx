import {
  Box,
  Button,
  Flex,
  Group,
  LoadingOverlay,
  Modal,
  Paper,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import {
  IconArrowUp,
  IconFolder,
  IconFolderOpen,
} from '@tabler/icons-react';
import React, { useCallback, useEffect, useState } from 'react';

interface BrowseEntry {
  name: string;
  path: string;
}

interface BrowseResponse {
  path: string;
  parent: string | null;
  directories: BrowseEntry[];
  home: string;
}

interface FolderPickerDialogProps {
  open: boolean;
  initialPath?: string;
  onClose: () => void;
  onOpen: (path: string) => void;
}

interface DirectoryRowProps {
  directory: BrowseEntry;
  onSelect: (path: string) => void;
}

const DirectoryRow: React.FC<DirectoryRowProps> = ({ directory, onSelect }) => {
  const handleClick = useCallback(() => onSelect(directory.path), [directory.path, onSelect]);

  return (
    <Flex
      component={UnstyledButton}
      onClick={handleClick}
      align="center"
      gap="sm"
      w="100%"
      px="md"
      py={8}
      style={{ textAlign: 'left' }}
    >
      <IconFolder size={16} color="var(--mantine-primary-color-filled)" />
      <Text size="sm" truncate style={{ flex: 1 }}>
        {directory.name}
      </Text>
    </Flex>
  );
};

const FolderPickerDialog: React.FC<FolderPickerDialogProps> = ({
  open,
  initialPath,
  onClose,
  onOpen,
}) => {
  const [currentPath, setCurrentPath] = useState('');
  const [pathInput, setPathInput] = useState('');
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [directories, setDirectories] = useState<BrowseEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const browse = useCallback(async (targetPath?: string) => {
    setLoading(true);
    setError(null);

    try {
      const query = targetPath ? `?path=${encodeURIComponent(targetPath)}` : '';
      const response = await fetch(`/api/folders/browse${query}`);

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || `Unable to open folder (${response.status})`);
      }

      const data = await response.json() as BrowseResponse;
      setCurrentPath(data.path);
      setPathInput(data.path);
      setParentPath(data.parent);
      setDirectories(data.directories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to browse folders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    browse(initialPath);
  }, [open, initialPath, browse]);

  const handleGo = useCallback(() => {
    if (pathInput.trim()) {
      browse(pathInput.trim());
    }
  }, [browse, pathInput]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleGo();
    }
  }, [handleGo]);

  const handlePathInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setPathInput(event.target.value);
  }, []);

  const handleParentClick = useCallback(() => {
    if (parentPath) browse(parentPath);
  }, [browse, parentPath]);

  const handleDirectorySelect = useCallback((directoryPath: string) => {
    browse(directoryPath);
  }, [browse]);

  const handleOpenCurrent = useCallback(() => {
    if (currentPath) onOpen(currentPath);
  }, [currentPath, onOpen]);

  return (
    <Modal
      opened={open}
      onClose={onClose}
      size="md"
      title={
        <Box>
          <Text fw={600}>Open a folder</Text>
          <Text size="sm" c="dimmed" mt={2}>
            Pick any folder on this machine. It opens in its own workspace tab.
          </Text>
        </Box>
      }
    >
      <TextInput
        autoFocus
        label="Folder path"
        value={pathInput}
        onChange={handlePathInputChange}
        onKeyDown={handleKeyDown}
        placeholder="/home/you/project"
        mt="xs"
        rightSection={
          <Button size="compact-xs" variant="subtle" onClick={handleGo} disabled={loading}>
            Go
          </Button>
        }
        rightSectionWidth={56}
      />

      <Text
        size="xs"
        c={error ? 'red' : 'dimmed'}
        mt="sm"
        style={{ minHeight: '1.2em', wordBreak: 'break-all' }}
      >
        {error || currentPath}
      </Text>

      <Paper withBorder pos="relative" h={300} mt="xs">
        <LoadingOverlay
          visible={loading}
          zIndex={1}
          overlayProps={{ radius: 'sm', blur: 0 }}
        />

        <ScrollArea h="100%" type="hover">
          <Stack gap={0}>
            {parentPath && (
              <Flex
                component={UnstyledButton}
                onClick={handleParentClick}
                align="center"
                gap="sm"
                w="100%"
                px="md"
                py={8}
                style={{ textAlign: 'left' }}
              >
                <IconArrowUp size={16} />
                <Box style={{ flex: 1 }}>
                  <Text size="sm">..</Text>
                  <Text size="xs" c="dimmed">Parent folder</Text>
                </Box>
              </Flex>
            )}

            {!loading && directories.length === 0 && (
              <Box px="md" py="2rem" style={{ textAlign: 'center' }}>
                <Text size="sm" c="dimmed">
                  No subfolders here.
                </Text>
              </Box>
            )}

            {directories.map((directory) => (
              <DirectoryRow
                key={directory.path}
                directory={directory}
                onSelect={handleDirectorySelect}
              />
            ))}
          </Stack>
        </ScrollArea>
      </Paper>

      <Group justify="flex-end" mt="lg">
        <Button variant="default" onClick={onClose}>Cancel</Button>
        <Button
          leftSection={<IconFolderOpen size={18} />}
          disabled={!currentPath || loading}
          onClick={handleOpenCurrent}
        >
          Open this folder
        </Button>
      </Group>
    </Modal>
  );
};

export default FolderPickerDialog;
