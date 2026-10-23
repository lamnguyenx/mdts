import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import FileTreeContent from '../../../../../src/components/LeftPane/FileTreeContent/FileTreeContent';

describe('FileTreeContent', () => {
  const mockFileTree = [
    { 'folder1': [{ path: 'file1.md' }, { 'subfolder': [{ path: 'folder1/subfolder/file2.txt' }] }] },
    { path: 'file3.js' },
  ];
  test('renders loading spinner when loading is true', () => {
    render(
      <FileTreeContent
        filteredFileTree={[]} // Can be empty when loading
        loading={true}
        error={null}
        expandedNodes={[]}
        selectedFilePath={null}
        onFileSelect={jest.fn()}
        onExpandedItemsChange={jest.fn()}
      />
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('renders error message when error is present', () => {
    render(
      <FileTreeContent
        filteredFileTree={[]} // Can be empty when error
        loading={false}
        error="Failed to load tree"
        expandedNodes={[]}
        selectedFilePath={null}
        onFileSelect={jest.fn()}
        onExpandedItemsChange={jest.fn()}
      />
    );
    expect(screen.getByText('Error: Failed to load tree')).toBeInTheDocument();
  });

  test('renders file tree correctly', () => {
    const { asFragment } = render(
      <FileTreeContent
        filteredFileTree={mockFileTree}
        loading={false}
        error={null}
        expandedNodes={['folder1']}
        selectedFilePath={null}
        onFileSelect={jest.fn()}
        onExpandedItemsChange={jest.fn()}
      />
    );
    expect(asFragment()).toMatchSnapshot();
    expect(screen.getByText('folder1')).toBeInTheDocument();
    expect(screen.getByText('file3.js')).toBeInTheDocument();
  });

  test('renders existing tree while loading when filtered tree already has content', () => {
    render(
      <FileTreeContent
        filteredFileTree={mockFileTree}
        loading={true}
        error={null}
        expandedNodes={['folder1']}
        selectedFilePath={null}
        onFileSelect={jest.fn()}
        onExpandedItemsChange={jest.fn()}
      />
    );
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByText('folder1')).toBeInTheDocument();
  });

  test('calls onFileSelect when a file is clicked', () => {
    const onFileSelectMock = jest.fn();
    render(
      <FileTreeContent
        filteredFileTree={mockFileTree}
        loading={false}
        error={null}
        expandedNodes={[]}
        selectedFilePath={null}
        onFileSelect={onFileSelectMock}
        onExpandedItemsChange={jest.fn()}
      />
    );
    fireEvent.click(screen.getByText('file3.js'));
    expect(onFileSelectMock).toHaveBeenCalledWith('file3.js');
  });

  test('calls onExpandedItemsChange when a folder is expanded/collapsed', () => {
    const onExpandedItemsChangeMock = jest.fn();
    render(
      <FileTreeContent
        filteredFileTree={mockFileTree}
        loading={false}
        error={null}
        expandedNodes={[]}
        selectedFilePath={null}
        onFileSelect={jest.fn()}
        onExpandedItemsChange={onExpandedItemsChangeMock}
      />
    );
    // Simulate expanding 'folder1'
    fireEvent.click(screen.getByText('folder1'));
    expect(onExpandedItemsChangeMock).toHaveBeenCalledWith(expect.any(Object), ['folder1']);
  });
});
