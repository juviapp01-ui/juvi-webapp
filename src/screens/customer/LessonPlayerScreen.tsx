import { useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { sheet } from '@/lib/rn';
import { Button, EmptyState, Icon, Pressable, PressableScale, Spinner, Text, View } from '@/components/ui';
import { LessonPdfReader } from '@/components/course/LessonPdfReader';
import { coursesApi } from '@/api';
import { useCompleteLesson, useCourse } from '@/hooks';
import { useAuthStore } from '@/store/authStore';
import { getErrorMessage } from '@/utils/errors';

// Web version of the app's LessonPlayerScreen: the video (or the PDF reader)
// with the title, a 3-line description with "Show more", and the syllabus
// (closed by default) under it — YouTube style. Finishing the video, or
// reaching the PDF's last page, marks the lesson complete and offers the next.

function Description({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLSpanElement | null>(null);
  // Clamped text overflows when its full height is taller than what shows.
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && !expanded) setOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [text, expanded]);
  return (
    <View>
      <span
        ref={ref}
        style={{
          ...styles.description,
          ...(expanded ? {} : { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }),
          whiteSpace: 'pre-line',
        }}
      >
        {text}
      </span>
      {(overflows || expanded) && (
        <Pressable onPress={() => setExpanded((v) => !v)} style={styles.showMore}>
          <Text style={styles.showMoreText}>{expanded ? 'Show less' : 'Show more'}</Text>
        </Pressable>
      )}
    </View>
  );
}

function Syllabus({ items }: { items: string[] }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  return (
    <View style={styles.syllabusBox}>
      <Pressable onPress={() => setOpen((v) => !v)} style={styles.syllabusToggle} ariaLabel={`Syllabus, ${items.length} topics`}>
        <Icon name="list-outline" size={14} color="#884952" />
        <Text style={styles.syllabusHeading}>
          Syllabus · {items.length} topic{items.length === 1 ? '' : 's'}
        </Text>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={14} color="#884952" />
      </Pressable>
      {open && (
        <ol style={{ margin: '8px 0 0', paddingLeft: 22, maxHeight: '40vh', overflowY: 'auto' }}>
          {items.map((topic, i) => (
            <li key={`${i}-${topic}`} style={styles.syllabusItem}>
              {topic}
            </li>
          ))}
        </ol>
      )}
    </View>
  );
}

export default function LessonPlayerScreen() {
  const navigate = useNavigate();
  const { courseId = '', lessonId = '' } = useParams();
  const viewer = useAuthStore((s) => s.user);
  const watermark = viewer?.phone || viewer?.email || '';
  const [justCompleted, setJustCompleted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const { data: lesson, isLoading, error } = useQuery({
    queryKey: ['course', courseId, 'lesson', lessonId],
    queryFn: () => coursesApi.getLesson(courseId, lessonId).then((r) => r.data),
  });
  const { data: course } = useCourse(courseId);
  const completeLesson = useCompleteLesson(courseId);

  const finish = () => {
    if (justCompleted) return;
    setJustCompleted(true);
    completeLesson.mutate(lessonId);
  };

  const index = course?.lessons.findIndex((l) => l.id === lessonId) ?? -1;
  const nextLesson = index >= 0 ? course?.lessons[index + 1] : undefined;
  const title = lesson?.title ?? course?.lessons[index]?.title ?? 'Lesson';

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <PressableScale scaleTo={0.88} onPress={() => navigate(`/courses/${courseId}`)} style={styles.closeButton} ariaLabel="Close">
          <Icon name="close" size={24} color="#FFFFFF" />
        </PressableScale>
        <Text style={styles.topTitle} numberOfLines={1}>{title}</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <Spinner size="large" color="#FFFFFF" />
        </View>
      ) : error || !lesson ? (
        <View style={styles.centerLight}>
          <EmptyState title="This lesson isn't available" message={getErrorMessage(error, 'This lesson is not available yet.')} iconName="lock-closed-outline" iconColor="#884952" actionLabel="Back to course" onAction={() => navigate(`/courses/${courseId}`)} />
        </View>
      ) : (
        <>
          {lesson.type !== 'PDF' &&
            (lesson.videoUrl ? (
              <video
                key={lesson.id}
                src={lesson.videoUrl}
                controls
                autoPlay
                playsInline
                controlsList="nodownload noplaybackrate"
                disablePictureInPicture
                onContextMenu={(e) => e.preventDefault()}
                onEnded={finish}
                style={{ width: '100%', aspectRatio: '16 / 9', backgroundColor: '#000', display: 'block' }}
              />
            ) : (
              <View style={styles.center}>
                <Text style={styles.errorText}>This lesson is not available yet.</Text>
              </View>
            ))}

          <View style={styles.infoPanel}>
            <Text style={styles.title}>{title}</Text>
            {lesson.description ? <Description text={lesson.description} /> : null}
            <Syllabus items={lesson.syllabus ?? []} />
          </View>

          {lesson.type === 'PDF' && lesson.pageCount ? (
            <LessonPdfReader courseId={courseId} lessonId={lessonId} pageCount={lesson.pageCount} watermark={watermark} onReachedEnd={finish} />
          ) : null}
        </>
      )}

      {justCompleted && !dismissed && (
        <View style={styles.completeOverlay}>
          <View style={styles.completeCard}>
            <Icon name="checkmark-circle" size={36} color="#15803D" style={{ marginBottom: 10 }} />
            <Text style={styles.completeTitle}>Lesson Complete</Text>
            {nextLesson && !nextLesson.locked ? (
              <Button
                title={`Next: ${nextLesson.title}`}
                onPress={() => {
                  setJustCompleted(false);
                  setDismissed(false);
                  navigate(`/courses/${courseId}/lesson/${nextLesson.id}`, { replace: true });
                }}
              />
            ) : (
              <Button title="Back to Course" onPress={() => navigate(`/courses/${courseId}`)} />
            )}
            {lesson?.type === 'PDF' && (
              <Pressable onPress={() => setDismissed(true)} style={{ marginTop: 12 }}>
                <Text style={styles.keepReading}>Keep reading</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = sheet({
  container: { flex: 1, minHeight: '100vh', backgroundColor: '#111' },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#000' },
  closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 16, color: '#FFFFFF' },
  center: { minHeight: 240, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  centerLight: { flex: 1, backgroundColor: '#fff8f5', justifyContent: 'center' },
  errorText: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 14, color: '#FFFFFF', textAlign: 'center', paddingHorizontal: 32 },
  infoPanel: { backgroundColor: '#fff8f5', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, gap: 8, marginBottom: 12 },
  title: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 18, color: '#1e1b18' },
  description: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, lineHeight: 21, color: '#524344' },
  showMore: { alignSelf: 'flex-start', marginTop: 4 },
  showMoreText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: '#884952' },
  syllabusBox: { marginTop: 4 },
  syllabusToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  syllabusHeading: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: '#884952' },
  syllabusItem: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13.5, lineHeight: 20, color: '#524344' },
  completeOverlay: { position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, alignItems: 'center', paddingHorizontal: 24, paddingBottom: 32, zIndex: 30 },
  completeCard: { width: '100%', backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 20, padding: 24, alignItems: 'center', shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 24 },
  completeTitle: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 16, color: '#1e1b18', marginBottom: 16 },
  keepReading: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 13, color: '#524344' },
});
