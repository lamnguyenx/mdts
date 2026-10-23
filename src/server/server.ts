import express, { NextFunction, Request, Response } from 'express';
import * as fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { ServerContext, ServerOptions } from './context';
import { fileTreeRouter } from './routes/filetree';
import { outlineRouter } from './routes/outline';
import { getConfig, saveConfig } from './config';
import { setupWatcher } from './watcher';
import { plantumlRouter } from './routes/plantuml';
import { folderRouter } from './routes/folders';
import { FolderService } from './folders';

const MAX_PORT_RETRIES = 10;

/**
 * Resolve the directories holding static assets. When running from the compiled
 * output (`dist/server`), they sit next to it (`./public`, `../frontend`).
 * When running straight from TypeScript (`bun src/index.ts`), fall back to the
 * repository layout (`public/`, `dist/frontend`) so dev mode needs no backend build.
 */
export const resolveStaticRoots = (currentLocation: string): { publicRoot: string; frontendRoot: string } => {
  const firstExisting = (candidates: string[]): string =>
    candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];

  return {
    publicRoot: firstExisting([
      path.join(currentLocation, 'public'),
      path.join(currentLocation, '../../public'),
    ]),
    frontendRoot: firstExisting([
      path.join(currentLocation, '../frontend'),
      path.join(currentLocation, '../../dist/frontend'),
    ]),
  };
};

const getFolderParam = (req: Request): string | undefined =>
  typeof req.query.folder === 'string' ? req.query.folder : undefined;

const isInsideDirectory = (directory: string, filePath: string): boolean => {
  const relative = path.relative(directory, filePath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

export const serve = (
  options: ServerOptions,
  port: number,
  host: string,
  autoPort: boolean = false,
): Promise<{ server: import('http').Server; port: number }> => {
  const folders = new FolderService(options);
  const { frontendRoot } = resolveStaticRoots(__dirname);
  const app = createApp(options, __dirname, folders);

  type ServeResult = { server: import('http').Server; port: number };
  const tryListen = (currentPort: number, retries: number): Promise<ServeResult> => {
    return new Promise((resolve, reject) => {
      const server = app.listen(currentPort, host);

      server.once('listening', () => {
        if (options.defaultDirectory) {
          logger.log('Server', `📁 Default folder: ${folders.defaultDirectory}`);
        } else {
          logger.log('Server', '📂 Dashboard mode: choose a folder in your browser');
        }
        if (options.globPatterns && options.globPatterns.length > 0) {
          logger.log('Server', `📄 Filtering with ${options.globPatterns.length} glob pattern(s)`);
        }
        if (currentPort !== port) {
          logger.log('Server', `⚠️  Port ${port} was in use, using ${currentPort} instead`);
        }
        logger.log('Server', `🚀 Server listening at http://${host}:${currentPort}`);
        setupWatcher(options, server, currentPort, folders, path.join(frontendRoot, 'bundle.js'));
        resolve({ server, port: currentPort });
      });

      server.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE' && autoPort && retries > 0) {
          logger.log('Server', `⚠️  Port ${currentPort} is in use, trying ${currentPort + 1}...`);
          resolve(tryListen(currentPort + 1, retries - 1));
        } else {
          reject(err);
        }
      });
    });
  };

  return tryListen(port, autoPort ? MAX_PORT_RETRIES : 0);
};

export const createApp = (
  options: ServerOptions = {},
  currentLocation: string = __dirname,
  folders: FolderService = new FolderService(options),
): express.Express => {
  const app = express();
  const { publicRoot, frontendRoot } = resolveStaticRoots(currentLocation);

  // JSON middleware - must be before routes that need it
  app.use(express.json());

  // Mount library static files
  app.use(express.static(publicRoot));
  app.use(express.static(frontendRoot));

  const scoped = (req: Request, res: Response, next: NextFunction): void => {
    const resolution = folders.resolve(getFolderParam(req));

    if (!resolution.context) {
      res.status(resolution.error?.status ?? 400).json({
        error: resolution.error?.message ?? 'Invalid folder',
      });
      return;
    }

    res.locals.folderContext = resolution.context;
    folders.recordRecent(resolution.context.directory);
    next();
  };

  // Define API
  app.use('/api/folders', folderRouter(folders));
  app.use('/api/filetree', scoped, fileTreeRouter());
  app.use('/api/outline', scoped, outlineRouter());
  app.use('/api/plantuml', plantumlRouter());
  app.get('/api/config', (req, res) => {
    res.json(getConfig());
  });
  app.post('/api/config', (req, res) => {
    try {
      saveConfig(req.body);
      res.status(200).send('Config saved');
    } catch (error) {
      logger.error('Failed to save config:', error);
      res.status(500).send('Failed to save config');
    }
  });

  app.get('/api/markdown/mdts-welcome-markdown.md', (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    res.sendFile('welcome.md', { root: publicRoot });
  });

  app.use('/api/markdown', scoped, (req, res) => {
    const context = res.locals.folderContext as ServerContext;
    // Decode the URI component to handle encoded characters in the path
    const decodedPath = decodeURIComponent(req.path);
    // Normalize the path to resolve '..' and '.' segments
    const normalizedPath = path.normalize(decodedPath);

    // Construct the full file path
    const filePath = path.join(context.directory, normalizedPath);

    // Security check: Ensure the resolved path is within the designated directory
    // This prevents path traversal attacks (e.g., accessing files outside 'directory')
    if (!isInsideDirectory(context.directory, filePath)) {
      logger.error(`🚫 Attempted path traversal: ${filePath}`);
      return res.status(403).send('Forbidden');
    }

    // /api/markdown is only used to fetch markdown. Keep that contract so
    // enabling dotfiles below cannot expose .env, .git/config, and similar.
    if (!/\.(md|markdown)$/i.test(normalizedPath)) {
      return res.status(404).send('File not found');
    }

    if (!fs.existsSync(filePath)) {
      logger.error(`🚫 File not found: ${filePath}`);
      return res.status(404).send('File not found');
    }

    const relativePath = path.relative(context.directory, filePath);
    res.sendFile(relativePath, { root: context.directory, dotfiles: 'allow' }, (err) => {
      if (!err) return;
      if (res.headersSent) return;
      if ('code' in err && err.code === 'ENOENT') {
        res.status(404).send('File not found');
      } else {
        logger.error(`🚫 Error serving markdown ${filePath}:`, err);
        res.status(500).send('Internal Server Error');
      }
    });
  });

  // Catch-all route to serve index.html for the app, or assets from the
  // currently selected folder.
  app.get('*splat', async (req, res) => {
    const folderParam = getFolderParam(req);
    const resolution = folders.resolve(folderParam);

    if (!resolution.context) {
      if (folderParam) {
        return res
          .status(resolution.error?.status ?? 404)
          .send(resolution.error?.message ?? 'Folder not found');
      }
      return res.sendFile('index.html', { root: frontendRoot });
    }

    const { directory } = resolution.context;
    const filePath = path.join(directory, req.path);
    let isDirectory = false;
    try {
      const stats = fs.statSync(filePath);
      isDirectory = stats.isDirectory();
    } catch {
      // File or directory does not exist, proceed as if it's a file
    }

    if (
      isDirectory ||
      req.path.toLowerCase().endsWith('.md') ||
      req.path.toLowerCase().endsWith('.markdown')
    ) {
      return res.sendFile('index.html', { root: frontendRoot });
    } else {
      return res.sendFile(req.path, { root: directory }, (err) => {
        if (err) {
          if ('code' in err && err.code === 'ENOENT') {
            logger.error(`🚫 File not found: ${path.join(directory, req.path)}`);
            res.status(404).send('File not found');
          } else {
            logger.error(`🚫 Error serving file ${path.join(directory, req.path)}:`, err);
            res.status(500).send('Internal Server Error');
          }
        }
      });
    }
  });

  return app;
};
