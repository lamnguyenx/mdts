import { type Express } from 'express';
import request from 'supertest';
import { createApp } from '../../src/server/server';
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('Server E2E Tests', () => {
  let app: Express;
  let configDir: string;
  let secondFolder: string;
  const contentDirectory = path.join(__dirname, '../fixtures/mountDirectory/content');

  beforeAll(async () => {
    configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdts-config-'));
    secondFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'mdts-second-'));
    fs.writeFileSync(path.join(secondFolder, 'other.md'), '# Other folder');

    app = createApp(
      {
        defaultDirectory: contentDirectory,
        configDir,
      },
      path.join(__dirname, '../fixtures/mountDirectory/dist/server'),
    );
  });

  afterAll(() => {
    fs.rmSync(configDir, { recursive: true, force: true });
    fs.rmSync(secondFolder, { recursive: true, force: true });
  });

  it('GET /api/filetree should return the file tree', async () => {
    const res = await request(app).get('/api/filetree');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({
      fileTree: expect.arrayContaining([
        { path: 'another.md' },
        {
          nested: [
            { path: 'nested/nested.md' },
          ],
        },
        { path: 'test.md' },
      ]),
      mountedDirectoryPath: contentDirectory,
    });
  });

  it('GET /api/filetree?folder= should open another folder independently', async () => {
    const res = await request(app)
      .get('/api/filetree')
      .query({ folder: secondFolder });

    expect(res.statusCode).toEqual(200);
    expect(res.body.mountedDirectoryPath).toEqual(secondFolder);
    expect(res.body.fileTree).toEqual([{ path: 'other.md' }]);
  });

  it('GET /api/filetree without a folder returns 400 in dashboard-only mode', async () => {
    const dashboardOnlyApp = createApp({ configDir });
    const res = await request(dashboardOnlyApp).get('/api/filetree');

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toEqual('folder query parameter is required');
  });

  it('GET /api/filetree with a missing folder returns 404', async () => {
    const res = await request(app)
      .get('/api/filetree')
      .query({ folder: path.join(secondFolder, 'missing') });

    expect(res.statusCode).toEqual(404);
    expect(res.body.error).toContain('Folder not found');
  });

  it('GET /api/folders/info describes the default folder', async () => {
    const res = await request(app).get('/api/folders/info');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({
      daemon: false,
      defaultFolder: contentDirectory,
      home: os.homedir(),
    });
  });

  it('GET /api/folders/browse lists subdirectories', async () => {
    const res = await request(app)
      .get('/api/folders/browse')
      .query({ path: contentDirectory });

    expect(res.statusCode).toEqual(200);
    expect(res.body.path).toEqual(contentDirectory);
    expect(res.body.directories).toEqual(
      expect.arrayContaining([
        { name: 'nested', path: path.join(contentDirectory, 'nested') },
      ]),
    );
  });

  it('POST /api/folders/recent remembers a folder and DELETE removes it', async () => {
    const addResponse = await request(app)
      .post('/api/folders/recent')
      .send({ path: secondFolder });

    expect(addResponse.statusCode).toEqual(200);
    expect(addResponse.body.recent[0]).toEqual(
      expect.objectContaining({ path: secondFolder, name: path.basename(secondFolder), exists: true }),
    );

    const removeResponse = await request(app)
      .delete('/api/folders/recent')
      .query({ path: secondFolder });

    expect(removeResponse.statusCode).toEqual(200);
    expect(removeResponse.body.recent).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ path: secondFolder })]),
    );
  });

  it('GET /api/markdown/mdts-welcome-markdown.md should return the welcome markdown', async () => {
    const res = await request(app).get('/api/markdown/mdts-welcome-markdown.md');
    expect(res.statusCode).toEqual(200);
    expect(res.text).toContain('# Welcome to mdts');
  });

  it('GET /api/markdown/test.md should return the content of test.md', async () => {
    const res = await request(app).get('/api/markdown/test.md');
    expect(res.statusCode).toEqual(200);
    expect(res.text).toContain('# Hello E2E');
  });

  it('GET /api/markdown/test.md?folder= should read from the selected folder', async () => {
    const res = await request(app)
      .get('/api/markdown/test.md')
      .query({ folder: contentDirectory });

    expect(res.statusCode).toEqual(200);
    expect(res.text).toContain('# Hello E2E');
  });

  it('GET /api/markdown/.hidden/readme.md should return markdown from a dot-directory', async () => {
    const res = await request(app).get('/api/markdown/.hidden/readme.md');
    expect(res.statusCode).toEqual(200);
    expect(res.headers['content-type']).toMatch(/markdown|plain|octet-stream/);
    expect(res.text).toContain('# Hidden directory markdown');
    expect(res.text).not.toContain('<title>mdts - Markdown file viewer</title>');
  });

  it('GET /api/markdown/.git/config should not be served', async () => {
    const res = await request(app).get('/api/markdown/.git/config');
    expect(res.statusCode).toEqual(404);
  });

  it('GET /api/markdown/.env should not be served even when the file exists', async () => {
    const res = await request(app).get('/api/markdown/.env');
    expect(res.statusCode).toEqual(404);
    expect(res.text).toEqual('File not found');
  });

  it('GET /api/outline should return the outline for a markdown file', async () => {
    const res = await request(app).get('/api/outline?filePath=test.md');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: 1,
          content: 'Hello E2E',
          id: 'hello-e2e',
        }),
      ]),
    );
  });

  it('GET /api/outline with non-existent file should return 200', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await request(app).get('/api/outline?filePath=nonexistent.md');
    expect(res.statusCode).toEqual(200);

    consoleErrorSpy.mockRestore();
  });

  it('GET /api/outline without filePath should return 400', async () => {
    const res = await request(app).get('/api/outline');
    expect(res.statusCode).toEqual(400);
  });

  it('GET / should return index.html for root path', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toEqual(200);
    expect(res.text).toContain('<title>mdts - Markdown file viewer</title>');
  });

  it('GET /some/path/to/file.md should return index.html for markdown paths', async () => {
    const res = await request(app).get('/test.md');
    expect(res.statusCode).toEqual(200);
    expect(res.text).toContain('<title>mdts - Markdown file viewer</title>');
  });

  it('should return 404 for non-existent files', async () => {
    const res = await request(app).get('/api/markdown/nonexistent-file');
    expect(res.statusCode).toEqual(404);
    expect(res.text).toEqual('File not found');
  });

  it('should return welcome markdown', async () => {
    const res = await request(app).get('/api/markdown/mdts-welcome-markdown.md');
    expect(res.statusCode).toEqual(200);
    expect(res.text).toContain('# Welcome to mdts');
  });

  it('should prevent path traversal', async () => {
    const res = await request(app).get('/api/markdown/%2e%2e%2fpackage.json');
    expect(res.statusCode).toEqual(404);
  });

  describe('serving non-markdown files', () => {
    it('should return 404 for non-existent non-markdown files', async () => {
      const res = await request(app).get('/nonexistent-image.png');
      expect(res.statusCode).toEqual(404);
      expect(res.text).toEqual('File not found');
    });
  });
});
