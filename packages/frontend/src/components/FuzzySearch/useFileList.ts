import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';

interface FlatTreeItem {
  path: string;
}

export function getFlatFileList(
  tree: (FlatTreeItem | { [key: string]: (FlatTreeItem | object)[] })[]
): string[] {
  const files: string[] = [];

  function walk(items: (FlatTreeItem | { [key: string]: (FlatTreeItem | object)[] })[]) {
    for (const item of items) {
      if ('path' in item) {
        files.push((item as FlatTreeItem).path);
      } else {
        const key = Object.keys(item)[0];
        const children = item[key];
        if (Array.isArray(children)) {
          walk(children);
        }
      }
    }
  }

  walk(tree);
  return files.sort((a, b) => a.localeCompare(b));
}

export function useFileList(): string[] {
  const fileTree = useSelector((state: RootState) => state.fileTree.fileTree);

  return useMemo(() => getFlatFileList(fileTree), [fileTree]);
}
