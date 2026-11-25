import { useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { sheet } from '@/lib/rn';
import { EmptyState, Icon, PressableScale, SkeletonLoader, Spinner, Text, View } from '@/components/ui';
import { TrendDecodeCard } from '@/components/home/TrendDecode';
import { VideoFeed } from '@/components/media/VideoFeed';
import { useTrendDecodeFeed } from '@/hooks';
import { getErrorMessage } from '@/utils/errors';
import type { TrendDecodeItem } from '@/types';

// Ports of frontend/src/screens/customer/TrendDecodeListScreen.tsx and
// TrendDecodeViewerScreen.tsx.

export function TrendDecodeListScreen() {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useTrendDecodeFeed();
  const items = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);
  const open = (item: TrendDecodeItem) => navigate(`/trend-decode/${item.id}`, { state: { item } });

  return (
    <View style={listStyles.safe}>
      <View style={listStyles.header}>
        <PressableScale scaleTo={0.88} onPress={() => navigate(-1)} style={listStyles.backButton} ariaLabel="Back">
          <Icon name="arrow-back" size={20} color="#1e1b18" />
        </PressableScale>
        <Text style={listStyles.headerTitle}>Trend Decode</Text>
        <View style={listStyles.backButton} />
      </View>
      {isLoading ? (
        <div style={listStyles.grid}>
          {[0, 1, 2, 3].map((i) => (
            <SkeletonLoader key={i} height={280} style={{ borderRadius: 16 }} />
          ))}
        </div>
      ) : error && items.length === 0 ? (
        <EmptyState title="Could not load Trend Decode" message={getErrorMessage(error)} iconName="alert-circle-outline" iconColor="#C0392B" actionLabel="Retry" onAction={() => refetch()} />
      ) : items.length === 0 ? (
        <EmptyState title="No trends yet" message="Trend Decode content will show up here." iconName="sparkles-outline" iconColor="#857374" />
      ) : (
        <>
          <div style={listStyles.grid}>
            {items.map((item) => (
              <div key={item.id} style={{ minWidth: 0 }}>
                <div style={{ width: '100%' }}>
                  <TrendDecodeCard item={item} onPress={() => open(item)} fill />
                </div>
              </div>
            ))}
          </div>
          {hasNextPage && (
            <View style={{ alignItems: 'center', paddingBottom: 32 }}>
              <PressableScale onPress={() => fetchNextPage()} disabled={isFetchingNextPage} style={listStyles.moreBtn}>
                {isFetchingNextPage ? <Spinner /> : <Text style={listStyles.moreText}>Show more</Text>}
              </PressableScale>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const listStyles = sheet({
  safe: { flex: 1, minHeight: '100vh', backgroundColor: '#fff8f5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 18, color: '#1e1b18' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, padding: '8px 20px 32px' },
  moreBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 999, borderWidth: 1, borderColor: '#efe6e2', backgroundColor: '#FFFFFF' },
  moreText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: '#884952' },
});

export function TrendDecodeViewerScreen() {
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const passed = (useLocation().state as { item?: TrendDecodeItem } | null)?.item;
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useTrendDecodeFeed();
  const feed = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);
  // The feed when the item is in it (swipe on to the next), else just the
  // one item passed from the list or Home.
  const items = feed.some((i) => i.id === id) ? feed : passed ? [passed] : [];

  if (items.length === 0) {
    return isLoading ? (
      <View style={{ flex: 1, minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
        <Spinner size="large" color="#FFFFFF" />
      </View>
    ) : (
      <View style={{ flex: 1, minHeight: '100vh', backgroundColor: '#fff8f5', justifyContent: 'center' }}>
        <EmptyState title="This video isn't available" message="It may have been removed." iconName="film-outline" iconColor="#857374" actionLabel="See all" onAction={() => navigate('/trend-decode')} />
      </View>
    );
  }

  return (
    <VideoFeed
      items={items}
      startId={id}
      onClose={() => navigate(-1)}
      onNearEnd={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
      renderOverlay={(item) => (
        <View style={viewerStyles.bottomOverlay}>
          <Text style={viewerStyles.title} numberOfLines={2}>{item.title}</Text>
          {item.description ? <Text style={viewerStyles.description} numberOfLines={4}>{item.description}</Text> : null}
        </View>
      )}
    />
  );
}

const viewerStyles = sheet({
  bottomOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: 40, pointerEvents: 'none' },
  title: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20, color: '#FFFFFF', marginBottom: 8 },
  description: { fontFamily: 'Inter_400Regular', fontSize: 13.5, color: 'rgba(255,255,255,0.9)', lineHeight: 20 },
});
