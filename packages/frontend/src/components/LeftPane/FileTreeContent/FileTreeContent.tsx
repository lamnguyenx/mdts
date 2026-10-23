import React from 'react';
import ErrorView from '../../ErrorView';
import { FileTreeView } from './FileTreeView';
import { LoadingIndicator } from './LoadingIndicator';
import type { FileTree } from './types';

interface FileTreeContentProps {
  filteredFileTree: FileTree | null;
  loading: boolean;
  error: string | null;
  expandedNodes: string[];
  selectedFilePath: string | null;
  onFileSelect: (path: string) => void;
  onExpandedItemsChange: (event: React.SyntheticEvent, itemIds: string[]) => void;
}

const FileTreeContent: React.FC<FileTreeContentProps> = ({
  filteredFileTree,
  loading,
  error,
  expandedNodes,
  selectedFilePath,
  onFileSelect,
  onExpandedItemsChange,
}) => {
  if (loading && !(filteredFileTree && filteredFileTree.length > 0)) return <LoadingIndicator />;
  if (error) return <ErrorView error={error} />;

  return (
    <FileTreeView
      filteredFileTree={filteredFileTree}
      expandedNodes={expandedNodes}
      selectedFilePath={selectedFilePath}
      onFileSelect={onFileSelect}
      onExpandedItemsChange={onExpandedItemsChange}
    />
  );
};

export default FileTreeContent;
