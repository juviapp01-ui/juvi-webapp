import { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { sheet } from '@/lib/rn';
import { EmptyState, Icon, Img, PressableScale, Spinner, Text, View } from '@/components/ui';
import { VideoFeed } from '@/components/media/VideoFeed';
import { useRecordReelView, useReelsFeed, useToggleReelLike, useToggleReelSave } from '@/hooks';
import { formatCompactNumber } from '@/utils/format';
import { getErrorMessage } from '@/utils/errors';
import type { Reel } from '@/types';

// Port of frontend/src/screens/customer/ReelsFeedScreen.tsx (the Reels tab):
// a full-height feed of artist reels with like, save and view counting.
// ?start=<reelId> opens it on a given reel (from Explore / Home).
const VIEW_DEBOUNCE_MS = 1500;

function ReelOverlay({ reel, active, onOpenArtist }: { reel: Reel; active: boolean; onOpenArtist: (artistId: string) => void }) {
  const recordView = useRecordReelView();
  const toggleLike = useToggleReelLike();
  const toggleSave = useToggleReelSave();
  const counted = useRef(false);

  // A view counts once the reel has been on screen for a moment, as in the app.
  useEffect(() => {
    if (!active || counted.current) return;
    const t = setTimeout(() => {
      counted.current = true;
      recordView.mutate(reel.id);
    }, VIEW_DEBOUNCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, reel.id]);

  return (
    <View style={styles.bottomOverlay}>
      <PressableScale onPress={() => reel.artist?.id && onOpenArtist(reel.artist.id)} style={styles.artistRow} ariaLabel={`Open ${reel.artist?.name ?? 'artist'}`}>
        {reel.artist?.photoUrl ? (
          <Img src={reel.artist.photoUrl} style={styles.avatar} />
        ) : (
          <View style={{ ...styles.avatar, ...styles.avatarFallback }}>
            <Icon name="person" size={18} color="#FFFFFF" />
          </View>
        )}
        <View style={styles.artistTextCol}>
          <Text style={styles.artistName} numberOfLines={1}>{reel.artist?.name ?? 'Artist'}</Text>
          {reel.artist?.rating ? (
            <View style={styles.ratingRow}>
              <Icon name="star" size={11} color="#FFE088" />
              <Text style={styles.ratingText}>{reel.artist.rating.toFixed(1)}</Text>
            </View>
          ) : null}
        </View>
      </PressableScale>
      {reel.caption ? <Text style={styles.caption} numberOfLines={3}>{reel.caption}</Text> : null}
      <View style={styles.viewsRow}>
        <Icon name="eye-outline" size={13} color="rgba(255,255,255,0.85)" />
        <Text style={styles.viewsText}>{formatCompactNumber(reel.viewCount ?? 0)} views</Text>
        <PressableScale scaleTo={0.85} onPress={() => toggleLike.mutate(reel.id)} style={styles.engagementBtn} ariaLabel={reel.isLiked ? 'Unlike' : 'Like'}>
          <Icon name={reel.isLiked ? 'heart' : 'heart-outline'} size={15} color={reel.isLiked ? '#E11D48' : 'rgba(255,255,255,0.85)'} />
          <Text style={styles.viewsText}>{formatCompactNumber(reel.likeCount ?? 0)}</Text>
        </PressableScale>
        <PressableScale scaleTo={0.85} onPress={() => toggleSave.mutate(reel.id)} style={styles.engagementBtn} ariaLabel={reel.isSaved ? 'Unsave' : 'Save'}>
          <Icon name={reel.isSaved ? 'bookmark' : 'bookmark-outline'} size={15} color={reel.isSaved ? '#FFE088' : 'rgba(255,255,255,0.85)'} />
          <Text style={styles.viewsText}>{reel.isSaved ? 'Saved' : 'Save'}</Text>
        </PressableScale>
      </View>
    </View>
  );
}

export default function ReelsFeedScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { data, isLoading, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useReelsFeed();
  const reels = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Spinner size="large" color="#FFFFFF" />
      </View>
    );
  }
  if (error && reels.length === 0) {
    return (
      <View style={styles.centeredLight}>
        <EmptyState title="Could not load reels" message={getErrorMessage(error)} iconName="alert-circle-outline" iconColor="#C0392B" actionLabel="Retry" onAction={() => refetch()} />
      </View>
    );
  }
  if (reels.length === 0) {
    return (
      <View style={styles.centeredLight}>
        <EmptyState title="No reels yet" message="Artist reels will show up here." iconName="film-outline" iconColor="#857374" />
      </View>
    );
  }

  return (
    // Leaves the tab bar visible over the bottom of the feed, as in the app.
    <VideoFeed
      items={reels}
      startId={params.get('start') ?? undefined}
      height="100vh"
      onClose={() => navigate('/home')}
      onNearEnd={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
      renderOverlay={(reel, active) => <ReelOverlay reel={reel} active={active} onOpenArtist={(id) => navigate(`/artist/${id}`)} />}
    />
  );
}

const styles = sheet({
  centered: { flex: 1, minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  centeredLight: { flex: 1, minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff8f5' },
  bottomOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingRight: 80, paddingBottom: 120 },
  artistRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, alignSelf: 'flex-start' },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)' },
  avatarFallback: { backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  artistTextCol: { marginLeft: 10, flexShrink: 1, textAlign: 'left' },
  artistName: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 15, color: '#FFFFFF' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  ratingText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: 'rgba(255,255,255,0.85)' },
  caption: { fontFamily: 'Inter_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.95)', lineHeight: 19, marginBottom: 10 },
  viewsRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  viewsText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: 'rgba(255,255,255,0.85)' },
  engagementBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 16 },
});
