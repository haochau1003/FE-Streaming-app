import { useQueryClient, type InfiniteData, type QueryKey } from '@tanstack/react-query';
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { io, Socket } from 'socket.io-client';

import { useAuth } from '../auth';
import { config } from '../config';
import { log } from '../log';
import type { ListMediaParams, MediaItem, MediaListResponse } from '../types';
import { mediaKeys } from './query-keys';

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextValue>({ socket: null, connected: false });

interface MediaUploadedEvent {
  event: 'media_uploaded';
  data: { media: MediaItem };
  timestamp: string;
}

function listParamsFromKey(queryKey: QueryKey): ListMediaParams | undefined {
  const params = queryKey[2];
  return params && typeof params === 'object' ? (params as ListMediaParams) : undefined;
}

function mediaMatchesList(media: MediaItem, params: ListMediaParams | undefined): boolean {
  if (!params) return media.visibility !== 'private';
  if (params.owner_id && params.owner_id !== media.owner_id) return false;
  if (!params.owner_id && media.visibility === 'private') return false;
  if (params.visibility && params.visibility !== media.visibility) return false;
  if (params.mimetype_prefix && !media.mimetype.startsWith(params.mimetype_prefix)) return false;
  return true;
}

function prependMedia(
  old: InfiniteData<MediaListResponse> | undefined,
  media: MediaItem,
): InfiniteData<MediaListResponse> | undefined {
  if (!old || old.pages.length === 0) return old;
  if (old.pages.some((page) => page.items.some((item) => item.id === media.id))) return old;
  const [first, ...rest] = old.pages;
  return {
    ...old,
    pages: [{ ...first, items: [media, ...first.items], total: first.total + 1 }, ...rest],
  };
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { currentUserId, apiKey } = useAuth();
  const [connected, setConnected] = useState(false);
  // Hold the socket in state (not a ref) so the context value re-renders
  // when it's created. With a ref, useMemo couldn't track it as a dep, and
  // consumers calling sendComment before `connected` flipped true would
  // read `socket: null` and silently drop the message.
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const socket = io(config.SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      // Use `auth` (handshake payload) not `extraHeaders`. Browsers silently
      // drop custom headers on websocket transport, so extraHeaders only ever
      // reached the server during polling fallback. `auth` works on every
      // transport. The server reads it in handle_connect and stashes the
      // api_key per-sid.
      auth: apiKey ? { token: apiKey } : {},
    });
    setSocket(socket);

    socket.on('connect', () => {
      setConnected(true);
      log.debug('socket connected', socket.id);
    });
    socket.on('disconnect', (reason) => {
      setConnected(false);
      log.debug('socket disconnected', reason);
    });
    socket.on('connect_error', (err) => {
      log.warn('socket connect_error', err.message);
    });
    socket.on('error', (payload) => {
      // Server-side validation/auth rejections come back as an 'error' event.
      // Surfacing them stops bugs like "comments silently dropped" from hiding.
      log.warn('socket server error', payload);
    });

    socket.on('media_uploaded', (event: MediaUploadedEvent) => {
      try {
        const media = event.data?.media;
        const ownerId = media?.owner_id;
        if (!ownerId) return;
        if (currentUserId && ownerId !== currentUserId) return;
        queryClient
          .getQueryCache()
          .findAll({ queryKey: mediaKeys.lists() })
          .forEach((query) => {
            const params = listParamsFromKey(query.queryKey);
            if (!mediaMatchesList(media, params)) return;
            queryClient.setQueryData<InfiniteData<MediaListResponse>>(query.queryKey, (old) =>
              prependMedia(old, media),
            );
          });
        void queryClient.invalidateQueries({ queryKey: mediaKeys.lists() });
      } catch (e) {
        log.error('media_uploaded handler', e);
      }
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [queryClient, currentUserId, apiKey]);

  const value = useMemo<SocketContextValue>(
    () => ({ socket, connected }),
    [socket, connected],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}
