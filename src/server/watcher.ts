import chokidar, { FSWatcher } from 'chokidar';
import * as fs from 'fs';
import * as http from 'http';
import path from 'path';
import { WebSocket, WebSocketServer } from 'ws';
import { logger } from '../utils/logger';
import { isPermissionError } from '../utils/errors';
import { EXCLUDED_DIRECTORIES } from '../constants';
import { ServerContext, ServerOptions } from './context';
import { FolderService } from './folders';

interface FolderState {
  context: ServerContext;
  watcher: FSWatcher | null;
  clients: Set<WebSocket>;
}

interface ClientState {
  folder: string;
  context: ServerContext;
  contentWatcher: FSWatcher | null;
  watchedFile: string | null;
}

const folderFromUrl = (url?: string): string | null => {
  if (!url) return null;
  try {
    return new URL(url, 'http://localhost').searchParams.get('folder');
  } catch {
    return null;
  }
};

export const setupWatcher = (
  options: ServerOptions,
  server: http.Server,
  port: number,
  folders: FolderService = new FolderService(options),
): void => {
  const wss = new WebSocketServer({ server });
  const folderStates = new Map<string, FolderState>();
  const clientStates = new Map<WebSocket, ClientState>();

  const broadcastTreeReload = (folder: string): void => {
    const state = folderStates.get(folder);
    state?.clients.forEach((client) => {
      client.send(JSON.stringify({ type: 'reload-tree' }));
    });
  };

  const getFolderState = (context: ServerContext): FolderState => {
    const existing = folderStates.get(context.directory);
    if (existing) return existing;

    const state: FolderState = {
      context,
      watcher: null,
      clients: new Set(),
    };

    const onTreeChange = (): void => broadcastTreeReload(context.directory);
    state.watcher = context.filePatterns
      ? setupFilePatternWatcher(context, onTreeChange)
      : setupDirectoryWatcher(context.directory, onTreeChange);

    folderStates.set(context.directory, state);
    return state;
  };

  wss.on('listening', () => {
    logger.log('Livereload', `🚀 WebSocket server listening at ws://localhost:${port}`);
  });

  wss.on('connection', (ws, request) => {
    logger.log('Livereload', '🤝 Livereload Client connected');

    const requestedFolder = folderFromUrl(request?.url) ?? folders.defaultDirectory;
    const resolution = folders.resolve(requestedFolder);

    if (resolution.context) {
      const folderState = getFolderState(resolution.context);
      folderState.clients.add(ws);
      clientStates.set(ws, {
        folder: folderState.context.directory,
        context: folderState.context,
        contentWatcher: null,
        watchedFile: null,
      });
    } else {
      logger.log('Livereload', '📂 No folder selected; waiting for a workspace');
    }

    ws.on('message', (message) => {
      handleWebSocketMessage(ws, clientStates.get(ws), message.toString());
    });
    ws.on('close', () => {
      handleWebSocketClose(ws, clientStates, folderStates);
    });
    ws.on('error', (e) => logger.error('🚫 Error on WebSocket client:', e));
  });
};

const handleWebSocketMessage = (
  ws: WebSocket,
  state: ClientState | undefined,
  message: string,
): void => {
  try {
    const data = JSON.parse(message);
    if (data.type === 'watch-file' && typeof data.filePath === 'string' && state) {
      setupContentWatcher(ws, state, data.filePath);
    }
  } catch (e) {
    logger.error('🚫 Error parsing WebSocket message:', e);
  }
};

const handleWebSocketClose = (
  ws: WebSocket,
  clientStates: Map<WebSocket, ClientState>,
  folderStates: Map<string, FolderState>,
): void => {
  logger.log('Livereload', '👋 Livereload Client closed');

  const clientState = clientStates.get(ws);
  if (!clientState) return;

  clientState.contentWatcher?.close();
  clientState.contentWatcher = null;
  clientStates.delete(ws);

  const folderState = folderStates.get(clientState.folder);
  if (!folderState) return;

  folderState.clients.delete(ws);
  if (folderState.clients.size === 0) {
    folderState.watcher?.close()
      .then(() => logger.log('Livereload', 'Directory watcher closed'));
    folderStates.delete(clientState.folder);
  }
};

const attachTreeReloadHandlers = (watcher: FSWatcher, onTreeChange: () => void): void => {
  watcher.on('add', (filePath) => {
    logger.log('Livereload', `🌲 File added: ${filePath}, reloading tree...`);
    onTreeChange();
  });

  watcher.on('unlink', (filePath) => {
    logger.log('Livereload', `🌲 File removed: ${filePath}, reloading tree...`);
    onTreeChange();
  });
};

const logSkippedWatchTarget = (error: unknown, directory: string): void => {
  const target = describeWatchTarget(error, directory);
  logger.log(
    'Livereload',
    `🔒 Can't watch "${target}" (permission denied); live-reload skipped for it, others still watched.`,
  );
};

const describeWatchTarget = (error: unknown, directory: string): string => {
  const errorPath = (error as NodeJS.ErrnoException)?.path;
  if (typeof errorPath !== 'string') return 'a path';
  return errorPath.startsWith(`${directory}/`)
    ? errorPath.slice(directory.length + 1)
    : errorPath;
};

const setupDirectoryWatcher = (
  directory: string,
  onTreeChange: () => void,
): FSWatcher | null => {
  try {
    const watcher = chokidar.watch(directory, {
      ignored: (watchedFilePath: string, stats?: fs.Stats) => {
        if (EXCLUDED_DIRECTORIES.some(p => watchedFilePath.includes(`/${p}`))) {
          return true;
        }

        if (stats) {
          return !stats.isDirectory() && !watchedFilePath.endsWith('.md') && !watchedFilePath.endsWith('.markdown');
        } else {
          // If stats is undefined, it's a directory that hasn't been scanned yet.
          // We want to traverse directories, so don't ignore.
          return false;
        }
      },
      ignoreInitial: true,
    });

    attachTreeReloadHandlers(watcher, onTreeChange);

    watcher.on('error', (error) => {
      if (isPermissionError(error)) return logSkippedWatchTarget(error, directory);

      watcher.unwatch(directory);
      watcher.close()
        .then(() => logger.log('Livereload', 'Directory watcher closed'));

      logger.error('🚫 Error watching directory:', error);
      logger.error('Livereload will be disabled');

      if (error && typeof error === 'object' && 'code' in error && error.code === 'EMFILE')
        logger.error('This error is likely caused by too many open files. Try increasing the ulimit.');
    });

    return watcher;
  } catch (e) {
    logger.error('🚫 Error watching directory:', e);
    logger.error('Livereload will be disabled');
    return null;
  }
};

const setupFilePatternWatcher = (
  context: ServerContext,
  onTreeChange: () => void,
): FSWatcher | null => {
  const { directory, filePatterns } = context;
  if (!filePatterns || filePatterns.length === 0) return null;

  try {
    const absolutePaths = filePatterns.map(f => path.join(directory, f));
    const watcher = chokidar.watch(absolutePaths, { ignoreInitial: true });

    attachTreeReloadHandlers(watcher, onTreeChange);

    watcher.on('error', (error) => {
      if (isPermissionError(error)) return logSkippedWatchTarget(error, directory);

      watcher.close()
        .then(() => logger.log('Livereload', 'File pattern watcher closed'));
      logger.error('🚫 Error watching files:', error);
      logger.error('Livereload will be disabled');
    });

    return watcher;
  } catch (e) {
    logger.error('🚫 Error watching files:', e);
    logger.error('Livereload will be disabled');
    return null;
  }
};

const setupContentWatcher = (
  ws: WebSocket,
  state: ClientState,
  filePath: string,
): void => {
  if (filePath === state.watchedFile) return;

  logger.log('Livereload', `👀 Watching file: ${filePath}`);
  state.watchedFile = filePath;
  state.contentWatcher?.close();
  state.contentWatcher = chokidar.watch(
    path.join(state.context.directory, filePath),
    { ignoreInitial: true },
  );

  state.contentWatcher.on('change', (changedFilePath) => {
    logger.log(
      'Livereload',
      `🔃 File changed: ${changedFilePath.replace(`${state.context.directory}/`, '')}, reloading content...`,
    );
    ws.send(JSON.stringify({ type: 'reload-content' }));
  });
  state.contentWatcher.on('error', (e) => {
    logger.error(`🚫 Error watching content file ${state.watchedFile}:`, e);
  });
};
