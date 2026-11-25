import { useEffect, useRef, useState } from 'react';
import { api } from '@/api/client';
import { coursesApi } from '@/api';
import { Icon, Pressable, Spinner, Text, View } from '@/components/ui';

// Web version of the app's LessonPdfReader. The PDF itself never reaches the
// browser: each page is an image from GET /courses/:id/lessons/:lessonId/pages/:n,
// which checks the purchase on every request. Pages are fetched through the
// API client (so the access token — and its refresh — come for free; an
// <img> can't send that header), kept in memory as blob URLs only while the
// reader is open, and loaded as they come near the screen.
//
// A browser can't block screenshots the way the app does; the watermark (the
// viewer's phone number) ties any copy back to an account, and right-click /
// drag-to-save are switched off on the pages.

const DEFAULT_ASPECT = 1190 / 1684; // A4 portrait until the real size is known

type Props = {
  courseId: string;
  lessonId: string;
  pageCount: number;
  watermark: string;
  onReachedEnd: () => void;
};

export function LessonPdfReader({ courseId, lessonId, pageCount, watermark, onReachedEnd }: Props) {
  const [current, setCurrent] = useState(1);
  const reachedEnd = useRef(false);
  const onEnd = useRef(onReachedEnd);
  onEnd.current = onReachedEnd;

  const onVisible = (page: number) => {
    setCurrent(page);
    if (page === pageCount && !reachedEnd.current) {
      reachedEnd.current = true;
      onEnd.current();
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '0 12px 72px' }}>
        {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
          <PdfPage key={n} courseId={courseId} lessonId={lessonId} pageNumber={n} watermark={watermark} onVisible={onVisible} />
        ))}
      </div>
      <div
        style={{
          position: 'sticky', bottom: 16, margin: '-48px auto 0', width: 'fit-content', padding: '5px 12px', borderRadius: 14,
          backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 12, fontVariantNumeric: 'tabular-nums',
        }}
        aria-live="polite"
      >
        {current} / {pageCount}
      </div>
    </div>
  );
}

function PdfPage({ courseId, lessonId, pageNumber, watermark, onVisible }: { courseId: string; lessonId: string; pageNumber: number; watermark: string; onVisible: (n: number) => void }) {
  const box = useRef<HTMLDivElement | null>(null);
  const [near, setNear] = useState(pageNumber <= 2);
  const [src, setSrc] = useState<string | null>(null);
  const [aspect, setAspect] = useState(DEFAULT_ASPECT);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [attempt, setAttempt] = useState(0);

  // Load when within a screen of the viewport; report when mostly on screen.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const loader = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '100% 0px' });
    const seen = new IntersectionObserver(([e]) => e.isIntersecting && onVisible(pageNumber), { threshold: 0.6 });
    loader.observe(el);
    seen.observe(el);
    return () => {
      loader.disconnect();
      seen.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber]);

  useEffect(() => {
    if (!near) return;
    let url: string | null = null;
    let alive = true;
    setStatus('loading');
    api
      .get(coursesApi.lessonPageUrl(courseId, lessonId, pageNumber).replace(api.defaults.baseURL ?? '', ''), { responseType: 'blob' })
      .then((res) => {
        if (!alive) return;
        url = URL.createObjectURL(res.data as Blob);
        setSrc(url);
      })
      .catch(() => alive && setStatus('error'));
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [near, courseId, lessonId, pageNumber, attempt]);

  return (
    <div
      ref={box}
      style={{ position: 'relative', width: '100%', aspectRatio: `${aspect}`, backgroundColor: '#fff', borderRadius: 4, overflow: 'hidden', userSelect: 'none' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {src && (
        <img
          src={src}
          alt={`Page ${pageNumber}`}
          draggable={false}
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth && img.naturalHeight) setAspect(img.naturalWidth / img.naturalHeight);
            setStatus('ready');
          }}
          onError={() => setStatus('error')}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
        />
      )}
      {status === 'ready' && <Watermark text={watermark} />}
      {(status === 'loading' || status === 'idle') && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spinner />
        </div>
      )}
      {status === 'error' && (
        <Pressable
          onPress={() => {
            setSrc(null);
            setAttempt((a) => a + 1);
          }}
          style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 }}
        >
          <Icon name="refresh" size={22} color="#884952" />
          <Text style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, fontSize: 13, color: '#524344', textAlign: 'center' }}>
            Couldn’t load page {pageNumber}. Tap to retry.
          </Text>
        </Pressable>
      )}
    </div>
  );
}

// The viewer's phone number, faint and repeated diagonally across the page.
function Watermark({ text }: { text: string }) {
  if (!text) return null;
  return (
    <View style={{ position: 'absolute', inset: 0, justifyContent: 'space-around', overflow: 'hidden', transform: 'rotate(-30deg) scale(1.4)', pointerEvents: 'none' }} aria-hidden>
      {Array.from({ length: 9 }, (_, row) => (
        <View key={row} style={{ flexDirection: 'row', justifyContent: 'space-around', paddingLeft: row % 2 ? 60 : 0 }}>
          {Array.from({ length: 3 }, (_, col) => (
            <span key={col} style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13, color: 'rgba(0,0,0,0.07)', whiteSpace: 'nowrap' }}>
              {text}
            </span>
          ))}
        </View>
      ))}
    </View>
  );
}
