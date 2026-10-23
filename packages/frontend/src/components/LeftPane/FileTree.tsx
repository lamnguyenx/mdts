import { Box } from '@mantine/core';
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

  const handleFileSelectWithClose = useCallback((path: string) => {
    onFileSelect(path);
    if (isMobile) onToggle();
  }, [onFileSelect, isMobile, onToggle]);

  return (
    <Box
      py="xs"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}
    >
      <FileTreeHeader
        isOpen={isMobile || isOpen}
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
    </Box>
  );
};

export default FileTree;
