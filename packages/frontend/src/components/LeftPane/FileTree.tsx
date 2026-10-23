import { Box, Drawer, useComputedColorScheme } from '@mantine/core';
import React, { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import useIsMobile from '../../hooks/useIsMobile';
import {
  ensureExpandedNodes,
  expandAllNodes,
  fetchFileTree,
  getAncestorPaths,
  setExpandedNodes,
  setSearchQuery
} from '../../store/slices/fileTreeSlice';
import type { FileTreeItem } from '../../store/slices/fileTreeSlice';
import type { AppDispatch, RootState } from '../../store/store';
import FileTreeContent from './FileTreeContent/FileTreeContent';
import FileTreeHeader from './FileTreeHeader';
import FileTreeSearch from './FileTreeSearch';

interface FileTreeComponentProps {
  onFileSelect: (path: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  selectedFilePath: string | null;
}

const FileTree: React.FC<FileTreeComponentProps> = ({
  onFileSelect,
  isOpen,
  onToggle,
  selectedFilePath,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const colorScheme = useComputedColorScheme('light', { getInitialValueInEffect: false });
  const isMobile = useIsMobile();
  const {
    fileTree,
    filteredFileTree,
    loading,
    error,
    searchQuery,
    expandedNodes
  } = useSelector((state: RootState) => state.fileTree);

  useEffect(() => {
    dispatch(fetchFileTree());
  }, [dispatch]);

  // Reveal the current document in the tree: expand ancestors when path changes or tree finishes loading.
  useEffect(() => {
    if (!selectedFilePath || loading) return;

    const ancestors = getAncestorPaths(selectedFilePath);
    if (ancestors.length > 0) {
      dispatch(ensureExpandedNodes(ancestors));
    }
  }, [selectedFilePath, loading, dispatch]);

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setSearchQuery(event.target.value));
  }, [dispatch]);

  const handleClearSearch = useCallback(() => {
    dispatch(setSearchQuery(''));
  }, [dispatch]);

  const handleExpandAllClick = useCallback(() => {
    dispatch(expandAllNodes(fileTree));
  }, [dispatch, fileTree]);

  const handleCollapseAll = useCallback(() => {
    dispatch(setExpandedNodes([]));
  }, [dispatch]);

  const handleExpandedItemsChange = useCallback((event: React.SyntheticEvent, itemIds: string[]) => {
    void event;
    dispatch(setExpandedNodes(itemIds));
  }, [dispatch]);

  useEffect(() => {
    if (!searchQuery) return;

    const newExpanded: string[] = [];

    const collectExpandedPaths = (items: (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[], parentPath: string = '') => {
      items.forEach(item => {
        if (!('path' in item)) { // It's a folder
          const key = Object.keys(item)[0];
          const value = (item as { [key: string]: (FileTreeItem | object)[] })[key];
          const currentPath = parentPath ? `${parentPath}/${key}` : key;
          if (!newExpanded.includes(currentPath)) {
            newExpanded.push(currentPath);
          }
          if (Array.isArray(value)) {
            collectExpandedPaths(value as (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[], currentPath);
          }
        }
      });
    };

    if (filteredFileTree) {
      collectExpandedPaths(filteredFileTree);
    }

    dispatch(setExpandedNodes(newExpanded));
  }, [searchQuery, filteredFileTree, dispatch]);

  const overlay = colorScheme === 'dark' ? 'rgba(16, 16, 16, 0.01)' : 'rgba(192, 192, 192, 0.01)';
  const background = `linear-gradient(135deg, ${overlay} 0%, var(--app-paper) 100%)`;

  const handleFileSelectWithClose = useCallback((path: string) => {
    onFileSelect(path);
    if (isMobile) onToggle();
  }, [onFileSelect, isMobile, onToggle]);

  const panelContent = (
    <>
      <FileTreeHeader
        isOpen={isMobile ? true : isOpen}
        onToggle={onToggle}
        onExpandAllClick={handleExpandAllClick}
        onCollapseAll={handleCollapseAll}
      />
      {(isMobile || isOpen) && (
        <FileTreeSearch
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onClearSearch={handleClearSearch}
        />
      )}
      {(isMobile || isOpen) && (
        <FileTreeContent
          filteredFileTree={filteredFileTree}
          loading={loading}
          error={error}
          expandedNodes={expandedNodes}
          selectedFilePath={selectedFilePath}
          onFileSelect={isMobile ? handleFileSelectWithClose : onFileSelect}
          onExpandedItemsChange={handleExpandedItemsChange}
        />
      )}
    </>
  );

  if (isMobile) {
    return (
      <Drawer
        opened={isOpen}
        onClose={onToggle}
        position="left"
        size={260}
        withCloseButton={false}
        keepMounted
        padding="sm"
        styles={{
          content: {
            backgroundColor: 'var(--app-paper)',
            borderRight: '1px solid var(--mantine-color-default-border)',
          },
        }}
      >
        {panelContent}
      </Drawer>
    );
  }

  return (
    <Box
      style={{
        width: isOpen ? 260 : 56,
        background,
        paddingTop: 'var(--mantine-spacing-xs)',
        paddingBottom: 'var(--mantine-spacing-xs)',
        borderRight: '1px solid var(--mantine-color-default-border)',
        minHeight: '100%',
        flexShrink: 0,
      }}
    >
      {panelContent}
    </Box>
  );
};

export default FileTree;
