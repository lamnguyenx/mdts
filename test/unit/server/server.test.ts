import { type Express } from 'express';
import fs from 'fs';
import http from 'http';
import net from 'net';
import os from 'os';
import path from 'path';
import request from 'supertest';
import { getConfig, saveConfig } from '../../../src/server/config';
import { createApp, serve } from '../../../src/server/server';
import { setupWatcher } from '../../../src/server/watcher';

jest.mock('../../../src/server/watcher', () => ({
  setupWatcher: jest.fn(),
}));

jest.mock('../../../src/server/config', () => ({
  getConfig: jest.fn(),
  saveConfig: jest.fn(),
}));

const fixtureLocation = path.join(__dirname, '../../fixtures/mountDirectory/dist/server');

const findFreePort = (): Promise<number> => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    server.close(() => resolve(port));
  });
});

const occupyPort = (port: number): Promise<http.Server> => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(port, '127.0.0.1', () => resolve(server));
});

describe('server.ts unit tests', () => {
  let app: Express;
  let rootDirectory: string;
  let firstFolder: string;
  let secondFolder: string;
  let configDir: string;

  beforeAll(() => {
    rootDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'mdts-server-'));
    firstFolder = path.join(rootDirectory, 'first');
    secondFolder = path.join(rootDirectory, 'second');
    configDir = path.join(rootDirectory, 'config');

    fs.mkdirSync(path.join(firstFolder, 'nested'), { recursive: true });
    fs.mkdirSync(secondFolder, { recursive: true });
    fs.writeFileSync(path.join(firstFolder, 'README.md'), '# First folder');
    fs.writeFileSync(path.join(firstFolder, 'nested', 'guide.md'), '# Guide');
    fs.writeFileSync(path.join(secondFolder, 'other.md'), '# Second folder');
    fs.writeFileSync(path.join(secondFolder, 'image.png'), 'not really a png');

    app = createApp({ defaultDirectory: firstFolder, configDir }, fixtureLocation);
  });

  afterAll(() => {
    fs.rmSync(rootDirectory, { recursive: true, force: true });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createApp', () => {
    it('serves the file tree for the default folder', async () => {
      const res = await request(app).get('/api/filetree');

      expect(res.statusCode).toEqual(200);
      expect(res.body.mountedDirectoryPath).toEqual(firstFolder);
      expect(res.body.fileTree).toEqual(
        expect.arrayContaining([
          { path: 'README.md', status: ' ' },
          { nested: [{ path: 'nested/guide.md', status: ' ' }] },
        ]),
      );
    });

    it('switches folders with the folder query parameter', async () => {
      const res = await request(app)
        .get('/api/filetree')
        .query({ folder: secondFolder });

      expect(res.statusCode).toEqual(200);
      expect(res.body.mountedDirectoryPath).toEqual(secondFolder);
      expect(res.body.fileTree).toEqual([{ path: 'other.md', status: ' ' }]);
    });

    it('returns 400 when no folder is configured or requested', async () => {
      const dashboardApp = createApp({ configDir }, fixtureLocation);
      const res = await request(dashboardApp).get('/api/filetree');

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toEqual('folder query parameter is required');
    });

    it('returns 404 when the requested folder does not exist', async () => {
      const res = await request(app)
        .get('/api/filetree')
        .query({ folder: path.join(rootDirectory, 'missing') });

      expect(res.statusCode).toEqual(404);
      expect(res.body.error).toContain('Folder not found');
    });

    it('defines GET /api/config', async () => {
      const mockConfig = { fontFamily: 'Test', fontSize: 16 };
      (getConfig as jest.Mock).mockReturnValue(mockConfig);

      const res = await request(app).get('/api/config');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(mockConfig);
      expect(getConfig).toHaveBeenCalled();
    });

    it('defines POST /api/config', async () => {
      const mockBody = { fontFamily: 'NewFont', fontSize: 18 };
      const res = await request(app).post('/api/config').send(mockBody);

      expect(res.statusCode).toEqual(200);
      expect(res.text).toEqual('Config saved');
      expect(saveConfig).toHaveBeenCalledWith(mockBody);
    });

    it('handles errors in POST /api/config', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      (saveConfig as jest.Mock).mockImplementation(() => {
        throw new Error('Save failed');
      });

      const res = await request(app).post('/api/config').send({ theme: 'x' });

      expect(res.statusCode).toEqual(500);
      expect(res.text).toEqual('Failed to save config');
      consoleErrorSpy.mockRestore();
    });

    it('serves the welcome markdown', async () => {
      const res = await request(app).get('/api/markdown/mdts-welcome-markdown.md');

      expect(res.statusCode).toEqual(200);
      expect(res.headers['content-type']).toMatch(/text\/plain/);
      expect(res.text).toContain('# Welcome to mdts');
    });

    it('serves markdown from the default folder', async () => {
      const res = await request(app).get('/api/markdown/README.md');

      expect(res.statusCode).toEqual(200);
      expect(res.text).toEqual('# First folder');
    });

    it('serves markdown from the selected folder', async () => {
      const res = await request(app)
        .get('/api/markdown/other.md')
        .query({ folder: secondFolder });

      expect(res.statusCode).toEqual(200);
      expect(res.text).toEqual('# Second folder');
    });

    it('prevents path traversal for /api/markdown', async () => {
      const res = await request(app).get('/api/markdown/%2e%2e%2fpackage.json');

      expect(res.statusCode).toEqual(404);
      expect(res.text).toEqual('File not found');
    });

    it('returns 404 for non-existent files in /api/markdown', async () => {
      const res = await request(app).get('/api/markdown/nonexistent.md');

      expect(res.statusCode).toEqual(404);
      expect(res.text).toEqual('File not found');
    });

    it('returns 404 for non-markdown files in /api/markdown', async () => {
      const res = await request(app).get('/api/markdown/image.png');

      expect(res.statusCode).toEqual(404);
      expect(res.text).toEqual('File not found');
    });

    it('serves index.html for markdown paths', async () => {
      const res = await request(app).get('/some/file.md');

      expect(res.statusCode).toEqual(200);
      expect(res.text).toContain('<title>mdts - Markdown file viewer</title>');
    });

    it('serves index.html for directory paths', async () => {
      const res = await request(app)
        .get('/nested')
        .query({ folder: firstFolder });

      expect(res.statusCode).toEqual(200);
      expect(res.text).toContain('<title>mdts - Markdown file viewer</title>');
    });

    it('serves non-markdown files from the selected folder', async () => {
      const res = await request(app)
        .get('/image.png')
        .query({ folder: secondFolder });

      expect(res.statusCode).toEqual(200);
      expect(res.body.toString()).toEqual('not really a png');
    });

    it('returns 404 for non-existent non-markdown files', async () => {
      const res = await request(app)
        .get('/nonexistent.png')
        .query({ folder: secondFolder });

      expect(res.statusCode).toEqual(404);
      expect(res.text).toEqual('File not found');
    });

    it('serves the dashboard index without a folder', async () => {
      const dashboardApp = createApp({ configDir }, fixtureLocation);
      const res = await request(dashboardApp).get('/');

      expect(res.statusCode).toEqual(200);
      expect(res.text).toContain('<title>mdts - Markdown file viewer</title>');
    });

    it('exposes folder info, recents and browsing', async () => {
      const info = await request(app).get('/api/folders/info');
      expect(info.body).toEqual({
        daemon: false,
        defaultFolder: firstFolder,
        home: os.homedir(),
      });

      const browse = await request(app)
        .get('/api/folders/browse')
        .query({ path: firstFolder });
      expect(browse.statusCode).toEqual(200);
      expect(browse.body.directories).toEqual([
        { name: 'nested', path: path.join(firstFolder, 'nested') },
      ]);

      const added = await request(app)
        .post('/api/folders/recent')
        .send({ path: secondFolder });
      expect(added.body.recent[0]).toEqual(
        expect.objectContaining({ path: secondFolder, exists: true }),
      );

      const removed = await request(app)
        .delete('/api/folders/recent')
        .query({ path: secondFolder });
      expect(removed.body.recent).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ path: secondFolder })]),
      );
    });
  });

  describe('serve', () => {
    it('starts a server and sets up the watcher', async () => {
      const port = await findFreePort();
      const options = { defaultDirectory: firstFolder, configDir };

      const { server } = await serve(options, port, '127.0.0.1');

      expect(setupWatcher).toHaveBeenCalledWith(options, server, port, expect.anything());
      await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    it('does not report glob patterns when none are provided', async () => {
      const port = await findFreePort();
      const { server } = await serve({ configDir }, port, '127.0.0.1');

      expect(setupWatcher).toHaveBeenCalled();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    it('rejects on EADDRINUSE when autoPort is false', async () => {
      const port = await findFreePort();
      const blocker = await occupyPort(port);

      await expect(serve({ configDir }, port, '127.0.0.1', false))
        .rejects.toMatchObject({ code: 'EADDRINUSE' });

      await new Promise<void>((resolve) => blocker.close(() => resolve()));
    });

    it('retries on EADDRINUSE and uses the next port when autoPort is true', async () => {
      const port = await findFreePort();
      const blocker = await occupyPort(port);

      const { server, port: actualPort } = await serve(
        { configDir },
        port,
        '127.0.0.1',
        true,
      );

      expect(actualPort).toEqual(port + 1);
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await new Promise<void>((resolve) => blocker.close(() => resolve()));
    });
  });
});
