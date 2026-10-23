import { Router } from 'express';
import fs, { Dirent } from 'fs';
import path from 'path';
import { EXCLUDED_DIRECTORIES } from '../../constants';
import { ServerContext } from '../context';
import { logger } from '../../utils/logger';
import { isUnreadableDirectoryError } from '../../utils/errors';

type FileTreeItem = { path: string } | { [key: string]: FileTree };
type FileTree = FileTreeItem[];

const toPosixPath = (p: string): string => p.split(path.sep).join('/');

export const fileTreeRouter = (fallbackContext?: ServerContext): Router => {
  const router = Router();

  router.get('/', async (req, res) => {
    const context = (res.locals.folderContext as ServerContext | undefined) ?? fallbackContext;

    if (!context) {
      return res.status(400).json({ error: 'folder query parameter is required' });
    }

    const { directory } = context;
    const filePatterns = context.filePatterns;
    const fileTree = filePatterns
      ? buildFileTreeFromPatterns(filePatterns)
      : await getFileTree(directory, '');
    res.json({ fileTree, mountedDirectoryPath: directory });
  });

  return router;
};

const isDotFileOrDirectory = (entryName: string): boolean => {
  return entryName.startsWith('.');
};

const shouldIncludeEntry = (entry: Dirent): boolean => {
  return !isDotFileOrDirectory(entry.name) && !EXCLUDED_DIRECTORIES.includes(entry.name);
};

const buildFileTreeFromPatterns = (filePatterns: string[]): FileTree => {
  const root: FileTree = [];
  const dirMap = new Map<string, FileTree>();
  dirMap.set('', root);

  const getOrCreateDir = (dirPath: string): FileTree => {
    if (dirMap.has(dirPath)) return dirMap.get(dirPath)!;

    const parentPath = path.dirname(dirPath);
    const dirName = path.basename(dirPath);
    const parentTree = parentPath === '.' ? root : getOrCreateDir(parentPath);

    const existing = parentTree.find(
      (item): item is { [key: string]: FileTree } =>
        typeof item === 'object' && !('path' in item) && dirName in item,
    );

    if (existing) {
      dirMap.set(dirPath, existing[dirName]);
      return existing[dirName];
    }

    const newTree: FileTree = [];
    parentTree.push({ [dirName]: newTree });
    dirMap.set(dirPath, newTree);
    return newTree;
  };

  const sorted = [...filePatterns].sort();
  sorted.forEach(filePath => {
    const dirPath = path.dirname(filePath);
    const targetTree = dirPath === '.' ? root : getOrCreateDir(dirPath);
    targetTree.push({ path: toPosixPath(filePath) });
  });

  return root;
};

const getFileTree = async (
  baseDirectory: string,
  currentRelativePath: string
): Promise<FileTree> => {
  const fullPath = path.join(baseDirectory, currentRelativePath);
  let entriesInDir: Dirent[];
  try {
    entriesInDir = fs.readdirSync(fullPath, { withFileTypes: true });
  } catch (error) {
    if (isUnreadableDirectoryError(error)) {
      logger.log('Server', `🔒 Skipping inaccessible directory: ${currentRelativePath || fullPath}`);
      return [];
    }
    throw error;
  }
  const entries = entriesInDir.filter(shouldIncludeEntry);

  const tree: FileTree = [];

  for (const entry of entries) {
    const entryPath = path.join(currentRelativePath, entry.name);
    if (entry.isDirectory()) {
      const subTree = await getFileTree(baseDirectory, entryPath);
      if (subTree.length > 0) {
        tree.push({ [entry.name]: subTree });
      }
    } else if (entry.name.endsWith('.md') || entry.name.endsWith('.markdown')) {
      tree.push({ path: toPosixPath(entryPath) });
    }
  }
  return tree;
};
