import { Group, Text, Tree, useTree } from '@mantine/core';
import type { TreeNodeData } from '@mantine/core';
import { IconFileText, IconFolder } from '@tabler/icons-react';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import type { FileTree, FileTreeItem } from './types';

interface FileNodeData extends TreeNodeData {
  isDirectory?: boolean;
  children?: FileNodeData[];
  hasChildren?: boolean;
}

interface FileTreeViewProps {
  filteredFileTree: FileTree | null;
  expandedNodes: string[];
  selectedFilePath: string | null;
  onFileSelect: (path: string) => void;
  onExpandedItemsChange: (event: React.SyntheticEvent, itemIds: string[]) => void;
}

const toTreeData = (items: FileTree | null, parentPath = ''): FileNodeData[] => {
  if (!items) return [];

  return items.map((item) => {
    if ('path' in item) {
      const fileItem = item as FileTreeItem;
      return {
        value: fileItem.path,
        label: fileItem.path.split('/').pop() ?? fileItem.path,
        isDirectory: false,
      };
    }

    const name = Object.keys(item)[0];
    const value = parentPath ? `${parentPath}/${name}` : name;
    const children = item[name];
    return {
      value,
      label: name,
      isDirectory: true,
      hasChildren: true,
      children: Array.isArray(children)
        ? toTreeData(children as FileTree, value)
        : [],
    };
  });
};

export const FileTreeView: React.FC<FileTreeViewProps> = ({
  filteredFileTree,
  expandedNodes,
  selectedFilePath,
  onFileSelect,
  onExpandedItemsChange,
}) => {
  const treeRef = useRef<HTMLUListElement>(null);

  const treeData = useMemo(() => toTreeData(filteredFileTree), [filteredFileTree]);
  const expandedState = useMemo(
    () => Object.fromEntries(expandedNodes.map((value) => [value, true])),
    [expandedNodes],
  );

  const handleExpandedStateChange = useCallback((state: Record<string, boolean>) => {
    const values = Object.keys(state).filter((value) => state[value]);
    const unchanged = values.length === expandedNodes.length
      && values.every((value) => expandedNodes.includes(value));
    if (unchanged) return;
    onExpandedItemsChange({} as React.SyntheticEvent, values);
  }, [expandedNodes, onExpandedItemsChange]);

  const handleSelectedStateChange = useCallback((values: string[]) => {
    const value = values[0];
    if (value) onFileSelect(value);
  }, [onFileSelect]);

  const renderNode = useCallback((payload: Tree.RenderNodePayload) => {
    const { node, selected, hasChildren, elementProps } = payload;
    return (
      <Group
        {...elementProps}
        gap={6}
        wrap="nowrap"
        py={1}
        pe={4}
        bdrs="sm"
        bg={selected ? 'var(--mantine-primary-color-light)' : undefined}
      >
        {hasChildren ? (
          <IconFolder size={16} color="var(--mantine-primary-color-filled)" style={{ flexShrink: 0 }} />
        ) : (
          <IconFileText size={16} style={{ flexShrink: 0 }} />
        )}
        <Text size="sm" truncate style={{ flex: 1 }}>
          {node.label}
        </Text>
      </Group>
    );
  }, []);

  const tree = useTree({
    expandedState,
    onExpandedStateChange: handleExpandedStateChange,
    selectedState: selectedFilePath ? [selectedFilePath] : [],
    onSelectedStateChange: handleSelectedStateChange,
  });

  useEffect(() => {
    if (!selectedFilePath) return undefined;

    let cancelled = false;
    const tryScroll = () => {
      if (cancelled) return true;
      const element = Array.from(treeRef.current?.querySelectorAll<HTMLElement>('[data-value]') ?? [])
        .find((item) => item.dataset.value === selectedFilePath);
      if (element) {
        element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        return true;
      }
      return false;
    };

    if (tryScroll()) {
      return () => {
        cancelled = true;
      };
    }

    // Newly expanded parents may not have mounted the item yet.
    const timeoutId = window.setTimeout(tryScroll, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [selectedFilePath, expandedNodes]);

  return (
    <Tree
      ref={treeRef}
      data={treeData}
      tree={tree}
      selectOnClick
      expandOnClick
      withLines
      levelOffset="md"
      renderNode={renderNode}
    />
  );
};
