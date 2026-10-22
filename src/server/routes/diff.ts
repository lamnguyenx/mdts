import { Router } from 'express';
import { simpleGit, SimpleGit } from 'simple-git';
import { ServerContext } from '../context';

const extractFilePath = (params: Record<string, unknown>): string => {
  const splat = params.splat;
  return Array.isArray(splat) ? splat.join('/') : String(splat);
};

const isRootCommitError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return /(unknown revision|bad revision|ambiguous argument)/i.test(message);
};

export const diffRouter = (fallbackContext?: ServerContext): Router => {
  const router = Router();

  // GET /api/diff/:path - current working tree diff
  router.get('/*splat', async (req, res) => {
    const context = (res.locals.folderContext as ServerContext | undefined) ?? fallbackContext;

    if (!context) {
      return res.status(400).json({ error: 'folder query parameter is required' });
    }

    const filePath = extractFilePath(req.params);
    const git: SimpleGit = simpleGit({ baseDir: context.directory });
    try {
      const isRepo = await git.checkIsRepo();
      if (!isRepo) {
        return res.status(404).json({ error: 'Not a git repository' });
      }
      const diff = await git.diff(['--', filePath]);
      res.setHeader('Content-Type', 'text/plain');
      res.send(diff);
    } catch {
      res.status(500).json({ error: 'Failed to get diff' });
    }
  });

  return router;
};

export const diffPrevRouter = (fallbackContext?: ServerContext): Router => {
  const router = Router();

  // GET /api/diff-prev/:path - diff of the last commit that changed this file
  router.get('/*splat', async (req, res) => {
    const context = (res.locals.folderContext as ServerContext | undefined) ?? fallbackContext;

    if (!context) {
      return res.status(400).json({ error: 'folder query parameter is required' });
    }

    const filePath = extractFilePath(req.params);
    const git: SimpleGit = simpleGit({ baseDir: context.directory });
    try {
      const isRepo = await git.checkIsRepo();
      if (!isRepo) {
        return res.status(404).json({ error: 'Not a git repository' });
      }
      const log = await git.log({ maxCount: 1, file: filePath });
      if (!log.latest) {
        res.setHeader('Content-Type', 'text/plain');
        return res.send('');
      }
      const hash = log.latest.hash;
      let diff: string;
      try {
        diff = await git.diff([`${hash}~1`, hash, '--', filePath]);
      } catch (error) {
        if (!isRootCommitError(error)) throw error;
        // First commit has no parent; diff against empty tree
        const emptyTree = '4b825dc642cb6eb9a060e54bf899d69f7cb46252';
        diff = await git.diff([emptyTree, hash, '--', filePath]);
      }
      res.setHeader('Content-Type', 'text/plain');
      res.send(diff);
    } catch {
      res.status(500).json({ error: 'Failed to get previous diff' });
    }
  });

  return router;
};
