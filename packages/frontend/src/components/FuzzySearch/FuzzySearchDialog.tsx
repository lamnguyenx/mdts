import {
  Box,
  Divider,
  Flex,
  Group,
  Kbd,
  Modal,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import { IconFile, IconSearch } from '@tabler/icons-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { folderUrl } from '../../api';
import { filterAndSort } from './fuzzy';
import type { FuzzyMatchResult } from './fuzzy';
import { useFileList } from './useFileList';

interface FuzzySearchDialogProps {
  open: boolean;
  onClose: () => void;
}

function highlightPath(path: string, positions: number[]): React.ReactNode {
  if (positions.length === 0) return path;

  const elements: React.ReactNode[] = [];
  let lastPos = -1;
  const sorted = [...positions].sort((a, b) => a - b);

  for (const pos of sorted) {
    if (pos > lastPos + 1) {
      elements.push(path.slice(lastPos + 1, pos));
    }
    elements.push(
      <Text
        key={pos}
        component="mark"
        inherit
        c="var(--mantine-primary-color-filled)"
        bg="transparent"
        fw={700}
      >
        {path[pos]}
      </Text>
    );
    lastPos = pos;
  }

  if (lastPos + 1 < path.length) {
    elements.push(path.slice(lastPos + 1));
  }

  return <>{elements}</>;
}

interface ResultItemProps {
  path: string;
  match: FuzzyMatchResult;
  selected: boolean;
  index: number;
  onSelect: (index: number) => void;
  onMouseEnter: (index: number) => void;
}

const ResultItemInner: React.FC<ResultItemProps> = ({
  path,
  match,
  selected,
  index,
  onSelect,
  onMouseEnter,
}) => {
  const handleClick = useCallback(() => {
    onSelect(index);
  }, [onSelect, index]);

  const handleMouseEnter = useCallback(() => {
    onMouseEnter(index);
  }, [onMouseEnter, index]);

  return (
    <Flex
      component={UnstyledButton}
      aria-selected={selected}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      align="center"
      gap="sm"
      w="100%"
      px="md"
      py={4}
      bg={selected ? 'var(--mantine-primary-color-light)' : undefined}
      style={{ textAlign: 'left' }}
    >
      <IconFile size={16} style={{ flexShrink: 0 }} />
      <Text size="sm" ff="monospace" truncate style={{ flex: 1 }}>
        {highlightPath(path, match.positions)}
      </Text>
    </Flex>
  );
};

const ResultItem = React.memo(ResultItemInner);

const FuzzySearchDialog: React.FC<FuzzySearchDialogProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileList = useFileList();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const results: { path: string; match: FuzzyMatchResult }[] = useMemo(
    () => filterAndSort(query, fileList),
    [query, fileList]
  );

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  const navigateToSelected = useCallback(() => {
    if (results.length > 0 && selectedIndex < results.length) {
      onClose();
      navigate(folderUrl(`/${results[selectedIndex].path}`, location.search ?? ''));
    }
  }, [results, selectedIndex, navigate, onClose, location.search]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          navigateToSelected();
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [results.length, navigateToSelected, onClose]
  );

  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.querySelector('[aria-selected="true"]');
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleResultSelect = useCallback(
    (index: number) => {
      if (results.length > 0 && index < results.length) {
        onClose();
        navigate(folderUrl(`/${results[index].path}`, location.search ?? ''));
      }
    },
    [results, navigate, onClose, location.search]
  );

  const handleResultMouseEnter = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  return (
    <Modal
      opened={open}
      onClose={onClose}
      size="lg"
      yOffset="12vh"
      withCloseButton={false}
      styles={{
        content: {
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '50vh',
          overflow: 'hidden',
        },
        body: {
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        },
      }}
    >
      <Box p="md" pb="sm">
        <TextInput
          ref={inputRef}
          placeholder="Search files..."
          aria-label="Search files"
          value={query}
          onChange={handleQueryChange}
          onKeyDown={handleKeyDown}
          size="sm"
          leftSection={<IconSearch size={16} />}
          leftSectionWidth={36}
        />
      </Box>

      <ScrollArea flex={1} style={{ minHeight: 0 }}>
        <Box ref={listRef}>
          {results.length === 0 ? (
            <Box px="lg" py="xl" style={{ textAlign: 'center' }}>
              <Text size="sm" c="dimmed">
                {fileList.length === 0 ? 'No files available' : 'No matching files'}
              </Text>
            </Box>
          ) : (
            <Stack gap={0}>
              {results.map((item, index) => (
                <ResultItem
                  key={item.path}
                  path={item.path}
                  match={item.match}
                  selected={index === selectedIndex}
                  index={index}
                  onSelect={handleResultSelect}
                  onMouseEnter={handleResultMouseEnter}
                />
              ))}
            </Stack>
          )}
        </Box>
      </ScrollArea>

      <Divider />

      <Group px="md" py="xs" justify="space-between">
        <Text size="xs" c="dimmed">
          {results.length} of {fileList.length} files
        </Text>
        <Group gap={4}>
          <Kbd>↑↓</Kbd>
          <Text size="xs" c="dimmed">navigate</Text>
          <Kbd>enter</Kbd>
          <Text size="xs" c="dimmed">open</Text>
          <Kbd>esc</Kbd>
          <Text size="xs" c="dimmed">close</Text>
        </Group>
      </Group>
    </Modal>
  );
};

export default FuzzySearchDialog;
