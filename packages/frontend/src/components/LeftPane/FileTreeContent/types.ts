export interface FileTreeItem {
  path: string;
}

export type FileTree = (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[];
