import chokidar, { type FSWatcher } from 'chokidar';
import * as http from 'http';
import path from 'path';
import { WebSocket, WebSocketServer } from 'ws';
import { FolderService } from '../../../src/server/folders';
import { setupWatcher } from '../../../src/server/watcher';
import { logger } from '../../../src/utils/logger';

jest.mock('chokidar');

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  statSync: jest.fn(),
}));

interface MockWss {
  on: jest.Mock;
  clients: Set<WebSocket>;
}

interface MockClient {
  client: WebSocket;
  handlers: Record<string, (payload: unknown) => void>;
  send: jest.Mock;
}

let mockWss: MockWss;
let connectionHandler: ((ws: WebSocket, request?: http.IncomingMessage) => void) | undefined;
let listeningHandler: (() => void) | undefined;

jest.mock('ws', () => ({
  WebSocket: jest.fn(),
  WebSocketServer: jest.fn(() => mockWss),
}));

jest.mock('../../../src/utils/logger', () => ({
  logger: {
    showLogo: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
  },
}));

const createWatcher = (): FSWatcher => ({
  on: jest.fn().mockReturnThis(),
  close: jest.fn().mockResolvedValue(undefined),
  unwatch: jest.fn(),
}) as unknown as FSWatcher;

const createClient = (): MockClient => {
  const handlers: Record<string, (payload: unknown) => void> = {};
  const send = jest.fn();
  const client = {
    send,
    close: jest.fn(),
    on: jest.fn((event: string, handler: (payload: unknown) => void) => {
      handlers[event] = handler;
      return client;
    }),
  } as unknown as WebSocket;

  return { client, handlers, send };
};

const connect = (client: WebSocket | MockClient, url = '/'): void => {
  const socket = 'client' in client ? client.client : client;
  connectionHandler?.(socket, { url } as http.IncomingMessage);
};

const getWatcherHandler = (
  watcher: FSWatcher,
  event: string,
): ((filePath: string) => void) => {
  const call = (watcher.on as jest.Mock).mock.calls.find(([name]) => name === event);
  return call?.[1];
};

describe('watcher.ts unit tests', () => {
  let mockServer: http.Server;
  let mockFolderService: FolderService;
  let watchers: FSWatcher[];

  beforeEach(() => {
    jest.clearAllMocks();
    connectionHandler = undefined;
    listeningHandler = undefined;

    mockServer = {} as http.Server;
    watchers = [];

    (chokidar.watch as jest.Mock).mockImplementation(() => {
      const watcher = createWatcher();
      watchers.push(watcher);
      return watcher;
    });

    mockWss = {
      on: jest.fn((event: string, callback: (...args: never[]) => void) => {
        if (event === 'connection') {
          connectionHandler = callback as unknown as typeof connectionHandler;
        } else if (event === 'listening') {
          listeningHandler = callback as unknown as typeof listeningHandler;
        }
      }),
      clients: new Set<WebSocket>(),
    };

    mockFolderService = {
      defaultDirectory: '/mock/directory',
      resolve: jest.fn((folder?: string | null) => (
        folder
          ? { context: { directory: folder } }
          : { error: { status: 400, message: 'folder query parameter is required' } }
      )),
    } as unknown as FolderService;
  });

  it('creates a WebSocket server and logs when it is listening', () => {
    setupWatcher({}, mockServer, 3000, mockFolderService);

    expect(WebSocketServer).toHaveBeenCalledWith({ server: mockServer });
    listeningHandler?.();
    expect(logger.log).toHaveBeenCalledWith(
      'Livereload',
      '🚀 WebSocket server listening at ws://localhost:3000',
    );
  });

  it('watches the folder from the WebSocket URL', () => {
    const { client } = createClient();

    setupWatcher({}, mockServer, 3000, mockFolderService);
    connect(client, '/?folder=%2Fmock%2Fother');

    expect(mockFolderService.resolve).toHaveBeenCalledWith('/mock/other');
    expect(chokidar.watch).toHaveBeenCalledWith('/mock/other', expect.any(Object));
    expect(logger.log).toHaveBeenCalledWith('Livereload', '🤝 Livereload Client connected');
  });

  it('falls back to the default folder when the URL has no folder', () => {
    const { client } = createClient();

    setupWatcher({}, mockServer, 3000, mockFolderService);
    connect(client);

    expect(mockFolderService.resolve).toHaveBeenCalledWith('/mock/directory');
    expect(chokidar.watch).toHaveBeenCalledWith('/mock/directory', expect.any(Object));
  });

  it('waits for a workspace when no folder is available', () => {
    const { client } = createClient();
    (mockFolderService.resolve as jest.Mock).mockReturnValue({
      error: { status: 400, message: 'folder query parameter is required' },
    });

    setupWatcher({}, mockServer, 3000, mockFolderService);
    connect(client);

    expect(chokidar.watch).not.toHaveBeenCalled();
    expect(logger.log).toHaveBeenCalledWith(
      'Livereload',
      '📂 No folder selected; waiting for a workspace',
    );
  });

  it('broadcasts tree reloads only to clients of the same folder', () => {
    const first = createClient();
    const second = createClient();

    setupWatcher({}, mockServer, 3000, mockFolderService);
    connect(first.client, '/?folder=%2Fmock%2Ffirst');
    connect(second.client, '/?folder=%2Fmock%2Fsecond');

    const firstWatcher = watchers[0];
    getWatcherHandler(firstWatcher, 'add')('new-file.md');

    expect(first.send).toHaveBeenCalledWith(JSON.stringify({ type: 'reload-tree' }));
    expect(second.send).not.toHaveBeenCalled();
    expect(logger.log).toHaveBeenCalledWith(
      'Livereload',
      '🌲 File added: new-file.md, reloading tree...',
    );

    getWatcherHandler(firstWatcher, 'unlink')('old-file.md');
    expect(first.send).toHaveBeenCalledTimes(2);
    expect(logger.log).toHaveBeenCalledWith(
      'Livereload',
      '🌲 File removed: old-file.md, reloading tree...',
    );
  });

  it('watches the selected content file per client and reloads it on change', () => {
    const first = createClient();
    const second = createClient();

    setupWatcher({}, mockServer, 3000, mockFolderService);
    connect(first.client, '/?folder=%2Fmock%2Ffirst');
    connect(second.client, '/?folder=%2Fmock%2Fsecond');

    first.handlers.message(JSON.stringify({ type: 'watch-file', filePath: '/mock/file.md' }));

    const contentWatcher = watchers[watchers.length - 1];
    expect(logger.log).toHaveBeenCalledWith(
      'Livereload',
      '👀 Watching file: /mock/file.md',
    );
    expect(chokidar.watch).toHaveBeenLastCalledWith(
      path.join('/mock/first', '/mock/file.md'),
      { ignoreInitial: true },
    );

    getWatcherHandler(contentWatcher, 'change')('/mock/first/mock/file.md');

    expect(first.send).toHaveBeenCalledWith(JSON.stringify({ type: 'reload-content' }));
    expect(second.send).not.toHaveBeenCalled();
  });

  it('replaces the content watcher when another file is selected', () => {
    const client = createClient();

    setupWatcher({}, mockServer, 3000, mockFolderService);
    connect(client);

    client.handlers.message(JSON.stringify({ type: 'watch-file', filePath: '/mock/one.md' }));
    const firstContentWatcher = watchers[1];
    client.handlers.message(JSON.stringify({ type: 'watch-file', filePath: '/mock/two.md' }));
    const secondContentWatcher = watchers[2];

    expect(firstContentWatcher.close).toHaveBeenCalled();
    expect(secondContentWatcher.close).not.toHaveBeenCalled();
  });

  it('does not recreate the content watcher for the same file', () => {
    const client = createClient();

    setupWatcher({}, mockServer, 3000, mockFolderService);
    connect(client);

    client.handlers.message(JSON.stringify({ type: 'watch-file', filePath: '/mock/one.md' }));
    client.handlers.message(JSON.stringify({ type: 'watch-file', filePath: '/mock/one.md' }));

    expect(chokidar.watch).toHaveBeenCalledTimes(2);
  });

  it('ignores watch-file messages without a valid file path', () => {
    const client = createClient();

    setupWatcher({}, mockServer, 3000, mockFolderService);
    connect(client);
    client.handlers.message(JSON.stringify({ type: 'watch-file', filePath: 123 }));

    expect(chokidar.watch).toHaveBeenCalledTimes(1);
  });

  it('logs invalid WebSocket message payloads', () => {
    const client = createClient();

    setupWatcher({}, mockServer, 3000, mockFolderService);
    connect(client);
    client.handlers.message('{invalid-json');

    expect(logger.error).toHaveBeenCalledWith(
      '🚫 Error parsing WebSocket message:',
      expect.any(Error),
    );
  });

  it('closes the content watcher and folder watcher when the last client leaves', async () => {
    const first = createClient();
    const second = createClient();

    setupWatcher({}, mockServer, 3000, mockFolderService);
    connect(first.client, '/?folder=%2Fmock%2Fshared');
    connect(second.client, '/?folder=%2Fmock%2Fshared');

    first.handlers.message(JSON.stringify({ type: 'watch-file', filePath: '/mock/file.md' }));
    const contentWatcher = watchers[1];
    const folderWatcher = watchers[0];

    first.handlers.close();
    expect(logger.log).toHaveBeenCalledWith('Livereload', '👋 Livereload Client closed');
    expect(contentWatcher.close).toHaveBeenCalled();
    expect(folderWatcher.close).not.toHaveBeenCalled();

    second.handlers.close();
    expect(folderWatcher.close).toHaveBeenCalled();
  });

  it('logs client errors', () => {
    const client = createClient();
    const error = new Error('Client error');

    setupWatcher({}, mockServer, 3000, mockFolderService);
    connect(client);
    client.handlers.error(error);

    expect(logger.error).toHaveBeenCalledWith('🚫 Error on WebSocket client:', error);
  });

  it('ignores excluded directories and non-markdown files', () => {
    const client = createClient();

    setupWatcher({}, mockServer, 3000, mockFolderService);
    connect(client);

    const options = (chokidar.watch as jest.Mock).mock.calls[0][1];
    const ignored = options.ignored;

    expect(ignored('/mock/directory/node_modules/pkg/index.js')).toBe(true);
    expect(ignored('/mock/directory/docs', { isDirectory: () => true })).toBe(false);
    expect(ignored('/mock/directory/README.md', { isDirectory: () => false })).toBe(false);
    expect(ignored('/mock/directory/README.markdown', { isDirectory: () => false })).toBe(false);
    expect(ignored('/mock/directory/image.png', { isDirectory: () => false })).toBe(true);
    expect(ignored('/mock/directory/unknown')).toBe(false);
  });

  it('keeps watching on permission errors and disables on fatal watcher errors', async () => {
    const client = createClient();

    setupWatcher({}, mockServer, 3000, mockFolderService);
    connect(client);
    const folderWatcher = watchers[0];
    const onError = getWatcherHandler(folderWatcher, 'error') as unknown as (error: unknown) => void;

    onError(Object.assign(new Error('permission denied'), {
      code: 'EACCES',
      path: '/mock/directory/secret',
    }));

    expect(logger.log).toHaveBeenCalledWith(
      'Livereload',
      '🔒 Can\'t watch "secret" (permission denied); live-reload skipped for it, others still watched.',
    );
    expect(folderWatcher.close).not.toHaveBeenCalled();

    const fatalError = Object.assign(new Error('Too many open files'), { code: 'EMFILE' });
    onError(fatalError);
    await Promise.resolve();

    expect(folderWatcher.unwatch).toHaveBeenCalledWith('/mock/directory');
    expect(folderWatcher.close).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith('🚫 Error watching directory:', fatalError);
    expect(logger.error).toHaveBeenCalledWith('Livereload will be disabled');
    expect(logger.error).toHaveBeenCalledWith(
      'This error is likely caused by too many open files. Try increasing the ulimit.',
    );
  });

  it('watches explicit file patterns when provided', () => {
    const client = createClient();
    (mockFolderService.resolve as jest.Mock).mockReturnValue({
      context: {
        directory: '/mock/directory',
        filePatterns: ['a.md', 'sub/b.md'],
      },
    });

    setupWatcher({ globPatterns: ['*.md'] }, mockServer, 3000, mockFolderService);
    connect(client, '/?folder=%2Fmock%2Fdirectory');

    expect(chokidar.watch).toHaveBeenCalledWith(
      ['/mock/directory/a.md', '/mock/directory/sub/b.md'],
      { ignoreInitial: true },
    );
  });

  it('logs when chokidar throws while setting up a watcher', () => {
    const client = createClient();
    (chokidar.watch as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Directory watch error');
    });

    setupWatcher({}, mockServer, 3000, mockFolderService);
    connect(client);

    expect(logger.error).toHaveBeenCalledWith('🚫 Error watching directory:', expect.any(Error));
    expect(logger.error).toHaveBeenCalledWith('Livereload will be disabled');
  });
});
