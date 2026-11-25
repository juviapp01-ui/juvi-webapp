import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon, Pressable } from '@/components/ui';

// A full-height, one-at-a-time vertical video feed — the web version of the
// app's paged FlatList used by Reels and Trend Decode. Scroll snaps to one
// item; only the item on screen plays (muted until the viewer unmutes —
// browsers only autoplay without sound); tap pauses / resumes.

export type FeedItem = { id: string; videoUrl?: string | null; thumbnailUrl?: string | null };

type Props<T extends FeedItem> = {
  items: T[];
  startId?: string;
  // Drawn over each item (title, buttons…). `active` is the one on screen.
  renderOverlay: (item: T, active: boolean) => ReactNode;
  onActiveChange?: (item: T) => void;
  onNearEnd?: () => void;
  onClose: () => void;
  // Height of the feed. Full screen by default; the Reels tab leaves room
  // for the tab bar.
  height?: string;
};

export function VideoFeed<T extends FeedItem>({ items, startId, renderOverlay, onActiveChange, onNearEnd, onClose, height = '100vh' }: Props<T>) {
  const scroller = useRef<HTMLDivElement | null>(null);
  const [activeId, setActiveId] = useState<string | undefined>(startId ?? items[0]?.id);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const scrolledToStart = useRef(false);

  // Open on the item that was tapped.
  useEffect(() => {
    if (scrolledToStart.current || !startId || !scroller.current) return;
    const el = scroller.current.querySelector<HTMLElement>(`[data-feed-id="${CSS.escape(startId)}"]`);
    if (el) {
      el.scrollIntoView({ block: 'start' });
      scrolledToStart.current = true;
    }
  }, [startId, items]);

  // Whichever item is mostly on screen is the active one.
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const id = (entry.target as HTMLElement).dataset.feedId;
            if (id) setActiveId(id);
          }
        }
      },
      { root, threshold: [0.6] }
    );
    root.querySelectorAll('[data-feed-id]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  useEffect(() => {
    setPaused(false);
    const index = items.findIndex((i) => i.id === activeId);
    if (index >= 0) onActiveChange?.(items[index]);
    if (index >= items.length - 2) onNearEnd?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  return (
    <div style={{ position: 'relative', height, backgroundColor: '#000' }}>
      <div ref={scroller} style={{ height: '100%', overflowY: 'auto', scrollSnapType: 'y mandatory', overscrollBehavior: 'contain' }} className="rn-hscroll">
        {items.map((item) => (
          <FeedVideo
            key={item.id}
            item={item}
            active={item.id === activeId}
            muted={muted}
            paused={paused}
            onTap={() => setPaused((p) => !p)}
            overlay={renderOverlay(item, item.id === activeId)}
          />
        ))}
      </div>
      <Pressable onPress={onClose} ariaLabel="Close" scaleTo={0.88} style={controlStyle('left')}>
        <Icon name="close" size={24} color="#FFFFFF" />
      </Pressable>
      <Pressable onPress={() => setMuted((m) => !m)} ariaLabel={muted ? 'Unmute' : 'Mute'} scaleTo={0.88} style={controlStyle('right')}>
        <Icon name={muted ? 'volume-mute' : 'volume-high'} size={20} color="#FFFFFF" />
      </Pressable>
    </div>
  );
}

function FeedVideo({ item, active, muted, paused, onTap, overlay }: { item: FeedItem; active: boolean; muted: boolean; paused: boolean; onTap: () => void; overlay: ReactNode }) {
  const video = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.muted = muted;
    if (active && !paused) {
      v.play().catch(() => {
        /* autoplay refused — the play badge shows, a tap starts it */
      });
    } else {
      v.pause();
      if (!active) v.currentTime = 0;
    }
  }, [active, paused, muted]);

  return (
    <div data-feed-id={item.id} style={{ position: 'relative', height: '100%', scrollSnapAlign: 'start', scrollSnapStop: 'always', overflow: 'hidden' }}>
      {item.videoUrl ? (
        <video
          ref={video}
          src={active ? item.videoUrl : undefined}
          poster={item.thumbnailUrl ?? undefined}
          loop
          playsInline
          muted={muted}
          preload={active ? 'auto' : 'none'}
          controlsList="nodownload noplaybackrate"
          disablePictureInPicture
          onContextMenu={(e) => e.preventDefault()}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000' }}
        />
      ) : item.thumbnailUrl ? (
        <img src={item.thumbnailUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : null}
      <div
        onClick={onTap}
        style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, transparent 35%, rgba(0,0,0,0.75) 100%)', cursor: 'pointer' }}
        role="button"
        aria-label={paused ? 'Play' : 'Pause'}
      />
      {active && paused && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="play" size={28} color="#FFFFFF" />
          </div>
        </div>
      )}
      {overlay}
    </div>
  );
}

const controlStyle = (side: 'left' | 'right') => ({
  position: 'absolute' as const,
  top: 16,
  [side]: 16,
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: 'rgba(0,0,0,0.35)',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 5,
});
