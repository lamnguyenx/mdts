import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { fetchContent } from '../store/slices/contentSlice';
import { fetchFileTree } from '../store/slices/fileTreeSlice';
import { fetchOutline } from '../store/slices/outlineSlice';
import type { AppDispatch } from '../store/store';

type Event = { type: 'reload-content' } | { type: 'reload-tree' } | { type: 'reload-page' };

export const useWebSocket = (
  currentPath: string | null,
  folder: string | null = null,
): void => {
  const dispatch = useDispatch<AppDispatch>();
  const wsRef = useRef<WebSocket | null>(null);
  const currentPathRef = useRef<string | null>(currentPath);

  // Update the ref whenever currentPath changes
  useEffect(() => {
    currentPathRef.current = currentPath;
  }, [currentPath]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    const folderQuery = folder ? `?folder=${encodeURIComponent(folder)}` : '';
    const ws = new WebSocket(`${protocol}${window.location.host}/${folderQuery}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      if (currentPathRef.current) {
        ws.send(JSON.stringify({ type: 'watch-file', filePath: currentPathRef.current }));
      }
    };

    ws.onmessage = (event) => {
      const message: Event = JSON.parse(event.data);

      if (message.type === 'reload-content') {
        if (!currentPathRef.current) return;
        dispatch(fetchContent(currentPathRef.current));
        dispatch(fetchOutline(currentPathRef.current));
      } else if (message.type === 'reload-tree') {
        dispatch(fetchFileTree());
      } else if (message.type === 'reload-page') {
        window.location.reload();
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, [folder, dispatch]);

  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && currentPathRef.current) {
      console.log('send watch-file message');
      wsRef.current.send(JSON.stringify({ type: 'watch-file', filePath: currentPathRef.current }));
    }
  }, [currentPath]);
};
