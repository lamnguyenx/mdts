import fs from 'fs';
import os from 'os';
import path from 'path';
import { isUnreadableDirectoryError } from '../utils/errors';
import { resolveGlobPatterns } from '../utils/glob';
import { ServerContext, ServerOptions } from './context';

const MAX_RECENT_FOLDERS = 10;

export interface RecentFolder {
  path: string;
  name: string;
  openedAt: string;
  exists: boolean;
}

export interface FolderError {
  status: number;
  message: string;
}

export interface FolderResolution {
  context?: ServerContext;
  error?: FolderError;
}

export interface BrowseEntry {
  name: string;
  path: string;
}

export interface BrowseResult {
  path: string;
  parent: string | null;
  directories: BrowseEntry[];
  home: string;
}

interface StoredRecentFolder {
  path: string;
  openedAt: string;
}

export const expandHome = (input: string): string => {
  const trimmed = input.trim();
  if (trimmed === '~') return os.homedir();
  if (trimmed.startsWith('~/') || trimmed.startsWith('~\\')) {
    return path.join(os.homedir(), trimmed.slice(2));
  }
  return trimmed;
};

export const toAbsoluteFolder = (input: string): string =>
  path.resolve(expandHome(input));

const isDirectory = (target: string): boolean => {
  try {
    return fs.statSync(target).isDirectory();
  } catch {
    return false;
  }
};

export class RecentFoldersStore {
  private readonly filePath: string;

  constructor(configDir: string = path.join(os.homedir(), '.config', 'mdts')) {
    this.filePath = path.join(configDir, 'folders.json');
  }

  list(): RecentFolder[] {
    return this.read().map((folder) => ({
      path: folder.path,
      name: path.basename(folder.path) || folder.path,
      openedAt: folder.openedAt,
      exists: isDirectory(folder.path),
    }));
  }

  add(folderPath: string): void {
    const absolutePath = toAbsoluteFolder(folderPath);
    if (!isDirectory(absolutePath)) return;

    const current = this.read();
    if (current[0]?.path === absolutePath) return;

    const next: StoredRecentFolder[] = [
      { path: absolutePath, openedAt: new Date().toISOString() },
      ...current.filter((folder) => folder.path !== absolutePath),
    ].slice(0, MAX_RECENT_FOLDERS);

    this.write(next);
  }

  remove(folderPath: string): void {
    const absolutePath = toAbsoluteFolder(folderPath);
    this.write(this.read().filter((folder) => folder.path !== absolutePath));
  }

  private read(): StoredRecentFolder[] {
    try {
      if (!fs.existsSync(this.filePath)) return [];
      const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      const entries: unknown[] = Array.isArray(raw) ? raw : Array.isArray(raw?.recent) ? raw.recent : [];

      return entries.flatMap((entry) => {
        if (typeof entry === 'string') {
          return [{ path: entry, openedAt: new Date(0).toISOString() }];
        }
        if (
          entry &&
          typeof entry === 'object' &&
          typeof (entry as StoredRecentFolder).path === 'string'
        ) {
          return [{
            path: (entry as StoredRecentFolder).path,
            openedAt: typeof (entry as StoredRecentFolder).openedAt === 'string'
              ? (entry as StoredRecentFolder).openedAt
              : new Date(0).toISOString(),
          }];
        }
        return [];
      });
    } catch {
      return [];
    }
  }

  private write(folders: StoredRecentFolder[]): void {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify({ recent: folders }, null, 2));
    } catch {
      // Recent folders are a convenience; a read-only config directory should
      // never prevent a folder from being opened.
    }
  }
}

export class FolderService {
  readonly defaultDirectory: string | null;
  readonly recents: RecentFoldersStore;

  constructor(private readonly options: ServerOptions = {}) {
    this.defaultDirectory = options.defaultDirectory
      ? toAbsoluteFolder(options.defaultDirectory)
      : null;
    this.recents = new RecentFoldersStore(options.configDir);
  }

  resolve(requestedFolder?: string | null): FolderResolution {
    const requested = requestedFolder?.trim();
    const raw = requested || this.defaultDirectory;

    if (!raw) {
      return {
        error: {
          status: 400,
          message: 'folder query parameter is required',
        },
      };
    }

    const directory = toAbsoluteFolder(raw);

    try {
      const stats = fs.statSync(directory);
      if (!stats.isDirectory()) {
        return {
          error: { status: 400, message: `Not a directory: ${directory}` },
        };
      }
    } catch {
      return {
        error: { status: 404, message: `Folder not found: ${directory}` },
      };
    }

    const context = this.options.globPatterns && this.options.globPatterns.length > 0
      ? resolveGlobPatterns(directory, this.options.globPatterns)
      : { directory };

    return { context };
  }

  recordRecent(folderPath: string): void {
    this.recents.add(folderPath);
  }

  info(): { daemon: boolean; defaultFolder: string | null; home: string } {
    return {
      daemon: !this.defaultDirectory,
      defaultFolder: this.defaultDirectory,
      home: os.homedir(),
    };
  }

  browse(requestedPath?: string): { result?: BrowseResult; error?: FolderError } {
    const target = toAbsoluteFolder(requestedPath?.trim() || os.homedir());

    try {
      const stats = fs.statSync(target);
      if (!stats.isDirectory()) {
        return { error: { status: 400, message: `Not a directory: ${target}` } };
      }
    } catch {
      return { error: { status: 404, message: `Folder not found: ${target}` } };
    }

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(target, { withFileTypes: true });
    } catch (error) {
      if (isUnreadableDirectoryError(error)) {
        return { error: { status: 403, message: `Permission denied: ${target}` } };
      }
      throw error;
    }

    const directories = entries
      .filter((entry) => {
        if (entry.isDirectory()) return true;
        if (!entry.isSymbolicLink()) return false;
        return isDirectory(path.join(target, entry.name));
      })
      .map((entry) => ({
        name: entry.name,
        path: path.join(target, entry.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const parent = path.dirname(target);

    return {
      result: {
        path: target,
        parent: parent === target ? null : parent,
        directories,
        home: os.homedir(),
      },
    };
  }
}
