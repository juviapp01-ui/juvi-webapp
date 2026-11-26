import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { sheet, cx } from '@/lib/rn';
import { Icon, Pressable, Text, View } from '@/components/ui';
import { Card, QueryState, kit } from '@/components/ui/kit';
import { BackHeader } from '@/components/ui';
import { bookingsApi, chatApi } from '@/api';
import { useBookings } from '@/hooks';
import { useChatSocket } from '@/hooks/useChatSocket';
import { useUIStore } from '@/store/uiStore';
import { CHAT_ELIGIBLE_BOOKING_STATUSES } from '@/constants/bookingStatus';
import { getErrorMessage } from '@/utils/errors';
import { formatIstDateTime, istDayjs } from '@/utils/ist';
import type { Booking } from '@/types';

// Ports of the app's ChatList and ChatRoom. Every booking has its own thread
// with the JUVI team (customers and artists never message each other
// directly). Live messages come over the same socket as the app; history
// is re-polled every 5 s as a safety net, also like the app.

export function ChatListScreen({ perspective = 'customer' }: { perspective?: 'customer' | 'artist' }) {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useBookings(perspective);
  const threads = ((data?.items ?? []) as Booking[]).filter((b) => CHAT_ELIGIBLE_BOOKING_STATUSES.includes(b.status));
  const base = perspective === 'artist' ? '/partner/chat' : '/chat';

  return (
    <View style={kit.safe}>
      <View style={styles.tabHeader}>
        <Text style={styles.tabTitle}>Messages</Text>
        <Text style={styles.sub}>Our team coordinates every booking with you here.</Text>
      </View>
      <View style={kit.content}>
        <QueryState
          isLoading={isLoading}
          error={error}
          errorTitle="Could not load conversations"
          errorMessage={getErrorMessage(error)}
          onRetry={() => refetch()}
          empty={threads.length === 0}
          emptyTitle="No active conversations"
          emptyMessage="Once a booking is confirmed, you can message the JUVI team about it here."
          emptyIcon="chatbubbles-outline"
        >
          <Card style={{ padding: 0 }}>
            {threads.map((b, i) => (
              <Pressable key={b.id} onPress={() => navigate(`${base}/${b.id}`)} style={cx(styles.thread, i === threads.length - 1 && { borderBottomWidth: 0 })}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>J</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <Text style={styles.threadTitle} numberOfLines={1}>JUVI · {perspective === 'artist' ? b.customerName || 'Client' : b.artistName}</Text>
                  <Text style={styles.sub} numberOfLines={1}>{b.serviceTitle} · {formatIstDateTime(b.scheduledAt)}</Text>
                </View>
                <Icon name="chevron-forward" size={16} color="#d7c1c3" />
              </Pressable>
            ))}
          </Card>
        </QueryState>
      </View>
    </View>
  );
}

export function ChatRoomScreen() {
  const navigate = useNavigate();
  const { bookingId = '' } = useParams();
  const qc = useQueryClient();
  const showToast = useUIStore((s) => s.showToast);
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const { messages, setMessages, send, isConnected, error: socketError } = useChatSocket(bookingId);

  const { data: booking } = useQuery({ queryKey: ['booking', bookingId], queryFn: () => bookingsApi.getById(bookingId).then((r) => r.data), enabled: !!bookingId });
  const { data: history, isLoading, error } = useQuery({
    queryKey: ['chat', bookingId, 'history'],
    queryFn: () => chatApi.history(bookingId).then((r) => r.data),
    retry: false,
    refetchInterval: 5000,
  });

  // Merge history into the live list, de-duplicated by id, oldest first.
  useEffect(() => {
    if (!history?.messages?.length) return;
    setMessages((prev) => {
      const byId = new Map([...history.messages, ...prev].map((m) => [m.id, m]));
      return Array.from(byId.values()).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    });
  }, [history, setMessages]);

  useEffect(() => {
    chatApi.markRead(bookingId).catch(() => {});
    return () => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
    };
  }, [bookingId, qc]);

  useEffect(() => {
    if (socketError) showToast(socketError, 'error');
  }, [socketError, showToast]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const onSend = () => {
    const t = text.trim();
    if (!t) return;
    send(t);
    setText('');
  };

  return (
    <View style={{ ...kit.safe, height: '100dvh', minHeight: 0 }}>
      <BackHeader title="JUVI" onBack={() => navigate(-1)} />
      {booking && (
        <Text style={{ ...styles.sub, textAlign: 'center', padding: '0 20px 8px' }}>
          {booking.serviceTitle} · {formatIstDateTime(booking.scheduledAt)}
        </Text>
      )}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 16px' }} aria-live="polite">
        <Text style={styles.banner}>You're messaging the JUVI team, who pass things on and get back to you.</Text>
        <QueryState isLoading={isLoading && messages.length === 0} skeleton={2} error={error && messages.length === 0 ? error : null} errorTitle="Could not load message history" errorMessage={getErrorMessage(error)}>
          {messages.length === 0 && <Text style={{ ...styles.sub, textAlign: 'center', marginTop: 24 }}>No messages yet. Say hello!</Text>}
          {messages.map((m) => {
            const mine = !m.fromStaff;
            return (
              <View key={m.id} style={cx(styles.bubbleRow, mine && { alignItems: 'flex-end' })}>
                <View style={cx(styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs)}>
                  <Text style={cx(styles.bubbleText, mine && { color: '#FFFFFF' })}>{m.content}</Text>
                </View>
                <Text style={styles.time}>{istDayjs(m.createdAt).format('h:mm A')}</Text>
              </View>
            );
          })}
        </QueryState>
        <div ref={endRef} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
        style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid rgba(215, 193, 195, 0.3)', background: '#fff8f5' }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={isConnected ? 'Type a message…' : 'Connecting…'}
          aria-label="Message"
          maxLength={2000}
          style={{ flex: 1, minWidth: 0, border: '1px solid #e8dcd8', borderRadius: 999, padding: '12px 16px', fontFamily: 'Hanken Grotesk, sans-serif', fontSize: 15, background: '#FFFFFF', outline: 'none' }}
        />
        <button type="submit" disabled={!text.trim()} aria-label="Send" style={{ width: 46, height: 46, borderRadius: 23, border: 0, background: text.trim() ? '#884952' : '#d7c1c3', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: text.trim() ? 'pointer' : 'default' }}>
          <Icon name="send" size={18} color="#FFFFFF" />
        </button>
      </form>
    </View>
  );
}

const styles = sheet({
  tabHeader: { padding: '20px 20px 4px', gap: 4 },
  tabTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 28, color: '#1e1b18' },
  sub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#857374' },
  thread: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: '#f3ece8', width: '100%' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#884952', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 18, color: '#FFFFFF' },
  threadTitle: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, color: '#1e1b18' },
  banner: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12.5, color: '#857374', textAlign: 'center', backgroundColor: '#fbf2ed', borderRadius: 12, padding: 10, marginBottom: 12 },
  bubbleRow: { alignItems: 'flex-start', marginBottom: 10 },
  bubble: { maxWidth: '78%', borderRadius: 18, paddingVertical: 10, paddingHorizontal: 14 },
  bubbleMine: { backgroundColor: '#884952', borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#efe6e2', borderBottomLeftRadius: 4 },
  bubbleText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14.5, color: '#1e1b18', lineHeight: 20, whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  time: { fontFamily: 'Inter_400Regular', fontSize: 10.5, color: '#A8A29E', marginTop: 3 },
});
