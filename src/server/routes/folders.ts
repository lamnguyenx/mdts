import { Router } from 'express';
import { logger } from '../../utils/logger';
import { FolderService } from '../folders';

export const folderRouter = (folders: FolderService): Router => {
  const router = Router();

  router.get('/info', (req, res) => {
    res.json(folders.info());
  });

  router.get('/recent', (req, res) => {
    res.json({ recent: folders.recents.list() });
  });

  router.post('/recent', (req, res) => {
    const folderPath = typeof req.body?.path === 'string' ? req.body.path : '';

    if (!folderPath.trim()) {
      return res.status(400).json({ error: 'path body parameter is required' });
    }

    const resolution = folders.resolve(folderPath);

    if (!resolution.context) {
      return res.status(resolution.error?.status ?? 400).json({
        error: resolution.error?.message ?? 'Invalid folder',
      });
    }

    folders.recordRecent(resolution.context.directory);
    res.json({ recent: folders.recents.list() });
  });

  router.delete('/recent', (req, res) => {
    const folderPath = typeof req.query.path === 'string' ? req.query.path : '';

    if (!folderPath) {
      return res.status(400).json({ error: 'path query parameter is required' });
    }

    folders.recents.remove(folderPath);
    res.json({ recent: folders.recents.list() });
  });

  router.get('/browse', (req, res) => {
    const requestedPath = typeof req.query.path === 'string' ? req.query.path : undefined;

    try {
      const { result, error } = folders.browse(requestedPath);

      if (!result) {
        return res.status(error?.status ?? 400).json({
          error: error?.message ?? 'Unable to browse folder',
        });
      }

      res.json(result);
    } catch (error) {
      logger.error('Failed to browse folders:', error);
      res.status(500).json({ error: 'Failed to browse folders' });
    }
  });

  return router;
};
