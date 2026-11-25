import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { ENV } from '@/config/env';
import { persist, Keys } from '@/utils/storage';
import { ChatMessage } from '@/types';

// Live transport for a booking's thread with JUVI — the app's useChatSocket
// with the browser's tab visibility in place of React Native's AppState.
// Server events (chatSocket.js): join with "conversation:join", send with
// "message:send", receive on "message:new".
export function useChatSocket(bookingId: string) {
  const socketRef = useRef<Socket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = persist.get<string>(Keys.ACCESS_TOKEN);
    const socket = io(ENV.WS_URL, {
      auth: { token },
      query: { bookingId },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });
    socketRef.current = socket;

    const join = () => socket.emit('conversation:join', { bookingId });
    socket.on('connect', () => {
      setIsConnected(true);
      setError(null);
      // On every connect: a reconnect is a new socket in no rooms.
      join();
    });
    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      if (reason === 'io server disconnect') socket.connect();
    });
    socket.on('message:new', (msg: ChatMessage) => {
      setMessages((m) => (m.some((x) => x.id === msg.id) ? m : [...m, msg]));
    });
    socket.on('chat:error', (e: { message?: string }) => setError(e?.message ?? 'Chat error'));

    // Coming back to the tab: reconnect if the browser dropped the socket.
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !socket.connected) socket.connect();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      socket.disconnect();
    };
  }, [bookingId]);

  const send = (content: string) => {
    socketRef.current?.emit('message:send', { bookingId, content });
  };

  return { messages, setMessages, isConnected, error, send };
}
