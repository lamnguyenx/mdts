import { act, render, waitFor } from '@testing-library/react';
import React from 'react';
import { FileTreeView } from '../../../../../src/components/LeftPane/FileTreeContent/FileTreeView';

describe('FileTreeView', () => {
  const filteredFileTree = [
    { path: 'file1.md' },
    { 'dir1': [{ path: 'dir1/file2.md' }] },
  ];
  const expandedNodes = ['dir1'];
  const onFileSelect = jest.fn();
  const onExpandedItemsChange = jest.fn();
  it('should render correctly', () => {
    const { asFragment } = render(
      <FileTreeView
        filteredFileTree={filteredFileTree}
        expandedNodes={expandedNodes}
        selectedFilePath="dir1/file2.md"
        onFileSelect={onFileSelect}
        onExpandedItemsChange={onExpandedItemsChange}
      />
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it('scrolls the selected file into view', async () => {
    const scrollIntoViewMock = jest.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    render(
      <FileTreeView
        filteredFileTree={filteredFileTree}
        expandedNodes={expandedNodes}
        selectedFilePath="dir1/file2.md"
        onFileSelect={onFileSelect}
        onExpandedItemsChange={onExpandedItemsChange}
      />
    );

    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 200);
      });
    });

    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalledWith({ block: 'nearest', behavior: 'smooth' });
    });
  });
});
