import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { sheet, cx } from '@/lib/rn';
import { Badge, BackHeader, Button, EmptyState, HScroll, Icon, type IconName, Img, Pressable, PressableScale, SkeletonLoader, Text, View } from '@/components/ui';
import { PaymentStub } from '@/components/ui/PaymentStub';
import { useAllCourses, useCourse, useCourseProgress, useCoursesByCategory, useDebounce, useEnrollFreeCourse } from '@/hooks';
import { useUIStore } from '@/store/uiStore';
import { formatDuration, formatPrice } from '@/utils/format';
import { getErrorMessage } from '@/utils/errors';
import type { Course } from '@/types';

// Ports of the app's CourseCategoriesScreen ("Learn with Annalia"),
// CourseListScreen and CourseDetailScreen. Paying for a course stops at the
// labelled payment placeholder; free courses enrol for real.

const LEARN_PORTRAIT = '/assets/images/1000128638-removebg-preview.png';
const HERO_BADGES: { icon: IconName; title: string }[] = [
  { icon: 'school-outline', title: 'Learn from industry pros' },
  { icon: 'play', title: 'Step-by-step video lessons' },
  { icon: 'ribbon-outline', title: 'Certificate of completion' },
];
const CATEGORY_ICONS: Record<string, IconName> = {
  bridal: 'sparkles-outline',
  hair: 'cut-outline',
  business: 'briefcase-outline',
  makeup: 'brush-outline',
  nail: 'color-palette-outline',
  skin: 'flower-outline',
};
const iconFor = (name: string): IconName => {
  const key = Object.keys(CATEGORY_ICONS).find((k) => name.toLowerCase().includes(k));
  return key ? CATEGORY_ICONS[key] : 'school-outline';
};

function FeaturedCourseCard({ course, onPress }: { course: Course; onPress: () => void }) {
  return (
    <PressableScale scaleTo={0.97} onPress={onPress} style={styles.featuredCard} ariaLabel={course.title}>
      <View style={styles.featuredThumbWrap}>
        {course.thumbnailUrl ? (
          <Img src={course.thumbnailUrl} style={{ width: '100%', height: '100%' }} />
        ) : (
          <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="play-circle-outline" size={30} color="#c2a3a8" />
          </View>
        )}
        <View style={styles.featuredPlayBadge}>
          <Icon name="play" size={12} color="#FFFFFF" />
        </View>
        {typeof course.lessonCount === 'number' && (
          <View style={styles.lessonCountBadge}>
            <Text style={styles.lessonCountText}>
              {course.lessonCount} lesson{course.lessonCount === 1 ? '' : 's'}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.featuredBody}>
        <Text style={styles.featuredTitle} numberOfLines={1}>{course.title}</Text>
        <Text style={styles.featuredDesc} numberOfLines={2}>{course.description || ' '}</Text>
        <View style={styles.featuredMetaRow}>
          {!!course.durationSeconds && (
            <View style={styles.metaChip}>
              <Icon name="time-outline" size={12} color="#857374" />
              <Text style={styles.metaChipText}>{formatDuration(course.durationSeconds)}</Text>
            </View>
          )}
          <Text style={{ ...styles.metaChipText, color: '#884952', fontWeight: 600 }}>{course.price > 0 ? formatPrice(course.price) : 'Free'}</Text>
        </View>
      </View>
    </PressableScale>
  );
}

export function CoursesHomeScreen() {
  const navigate = useNavigate();
  const { courses, categories, isLoading, error } = useAllCourses();
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search.trim().toLowerCase(), 300);
  const [categoryId, setCategoryId] = useState<string>('all');

  const shown = useMemo(
    () =>
      courses.filter(
        (c) =>
          (categoryId === 'all' || c.categoryId === categoryId) &&
          (!debounced || c.title.toLowerCase().includes(debounced) || (c.description ?? '').toLowerCase().includes(debounced))
      ),
    [courses, categoryId, debounced]
  );

  return (
    <View style={styles.safe}>
      <BackHeader title="Learn with Annalia" onBack={() => navigate(-1)} />
      <View style={styles.scrollContent}>
        <View style={styles.heroCard}>
          <View style={styles.heroArch} />
          <View style={styles.heroTextCol}>
            <Text style={styles.heroTitle}>Learn with Annalia</Text>
            <Text style={styles.heroSubtitle}>Pick a path — bridal glam, hair, or building your beauty business.</Text>
            <View style={styles.featureBadgeRow}>
              {HERO_BADGES.map((b) => (
                <View key={b.title} style={styles.featureBadge}>
                  <View style={styles.featureBadgeIconWrap}>
                    <Icon name={b.icon} size={15} color="#884952" />
                  </View>
                  <Text style={styles.featureBadgeText} numberOfLines={2}>{b.title}</Text>
                </View>
              ))}
            </View>
          </View>
          <Img src={LEARN_PORTRAIT} fit="contain" position="bottom right" style={styles.heroPortrait} />
        </View>

        <View style={styles.searchBar}>
          <Icon name="search" size={18} color="#857374" />
          <input className="rn-input" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search courses" style={styles.searchInput} aria-label="Search courses" />
          {search && (
            <Pressable onPress={() => setSearch('')} ariaLabel="Clear">
              <Icon name="close-circle" size={16} color="#a89a9b" />
            </Pressable>
          )}
        </View>

        <HScroll contentStyle={styles.pillRow}>
          {[{ id: 'all', name: 'All' }, ...categories].map((cat) => (
            <PressableScale key={cat.id} onPress={() => setCategoryId(cat.id)} style={cx(styles.pill, categoryId === cat.id && styles.pillActive)}>
              <Text style={cx(styles.pillText, categoryId === cat.id && styles.pillTextActive)}>{cat.name}</Text>
            </PressableScale>
          ))}
        </HScroll>

        <Text style={styles.sectionTitle}>Featured Courses</Text>
        {isLoading ? (
          <HScroll contentStyle={styles.featuredScrollContent}>
            {[0, 1].map((i) => (
              <SkeletonLoader key={i} height={220} width={220} style={{ borderRadius: 20 }} />
            ))}
          </HScroll>
        ) : error ? (
          <EmptyState title="Could not load courses" message={getErrorMessage(error)} iconName="alert-circle-outline" iconColor="#C0392B" />
        ) : shown.length === 0 ? (
          <Text style={styles.noResultsText}>No courses match your search.</Text>
        ) : (
          <HScroll contentStyle={styles.featuredScrollContent}>
            {shown.map((course) => (
              <FeaturedCourseCard key={course.id} course={course} onPress={() => navigate(`/courses/${course.id}`)} />
            ))}
          </HScroll>
        )}

        <Text style={styles.sectionTitle}>Browse by Category</Text>
        {!isLoading && categories.length === 0 && !error ? (
          <EmptyState title="No courses yet" message="Check back soon for new lessons." iconName="school-outline" iconColor="#857374" />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {categories.map((cat) => (
              <PressableScale key={cat.id} scaleTo={0.97} onPress={() => navigate(`/courses/category/${cat.id}?name=${encodeURIComponent(cat.name)}`)} style={styles.card}>
                <View style={styles.iconCircle}>
                  <Icon name={iconFor(cat.name)} size={26} color="#884952" />
                </View>
                <Text style={styles.cardTitle} numberOfLines={2}>{cat.name}</Text>
                {typeof cat.courseCount === 'number' && (
                  <Text style={styles.cardMeta}>
                    {cat.courseCount} course{cat.courseCount === 1 ? '' : 's'}
                  </Text>
                )}
              </PressableScale>
            ))}
          </div>
        )}
      </View>
    </View>
  );
}

export function CourseListScreen() {
  const navigate = useNavigate();
  const { categoryId = '' } = useParams();
  const [params] = useSearchParams();
  const name = params.get('name') ?? 'Courses';
  const { data, isLoading, error } = useCoursesByCategory(categoryId);
  const courses = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <View style={styles.safe}>
      <BackHeader title={name} onBack={() => navigate(-1)} />
      <View style={styles.scrollContent}>
        {isLoading ? (
          [0, 1, 2].map((i) => <SkeletonLoader key={i} height={110} style={{ borderRadius: 20, marginBottom: 14 }} />)
        ) : error ? (
          <EmptyState title="Could not load courses" message={getErrorMessage(error)} iconName="alert-circle-outline" iconColor="#C0392B" />
        ) : courses.length === 0 ? (
          <EmptyState title="No courses here yet" message="Check back soon for new lessons in this category." iconName="school-outline" iconColor="#857374" />
        ) : (
          courses.map((course) => (
            <PressableScale key={course.id} scaleTo={0.98} onPress={() => navigate(`/courses/${course.id}`)} style={styles.listCard}>
              <View style={styles.listThumb}>
                {course.thumbnailUrl ? <Img src={course.thumbnailUrl} style={{ width: '100%', height: '100%' }} /> : <Icon name="play-circle-outline" size={32} color="#c2a3a8" />}
              </View>
              <View style={{ flex: 1, gap: 4, textAlign: 'left' }}>
                <Text style={styles.cardTitle} numberOfLines={2}>{course.title}</Text>
                {course.description ? <Text style={styles.featuredDesc} numberOfLines={2}>{course.description}</Text> : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.price}>{course.price > 0 ? formatPrice(course.price) : 'Free'}</Text>
                  {course.purchased && <Badge label="Enrolled" variant="success" />}
                </View>
              </View>
            </PressableScale>
          ))
        )}
      </View>
    </View>
  );
}

export function CourseDetailScreen() {
  const navigate = useNavigate();
  const { courseId = '' } = useParams();
  const { data: course, isLoading, error } = useCourse(courseId);
  const { data: progress } = useCourseProgress(courseId, !!course?.purchased);
  const enrollFree = useEnrollFreeCourse(courseId);
  const showToast = useUIStore((s) => s.showToast);
  const [openSyllabus, setOpenSyllabus] = useState<Set<string>>(() => new Set());
  const toggleSyllabus = (id: string) =>
    setOpenSyllabus((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (isLoading) {
    return (
      <View style={styles.safe}>
        <BackHeader title="Course" onBack={() => navigate(-1)} />
        <View style={styles.scrollContent}>
          <SkeletonLoader height={200} style={{ borderRadius: 20, marginBottom: 20 }} />
          <SkeletonLoader height={24} width="70%" style={{ marginBottom: 10 }} />
          <SkeletonLoader height={14} width="40%" />
        </View>
      </View>
    );
  }
  if (error || !course) {
    return (
      <View style={styles.safe}>
        <BackHeader title="Course" onBack={() => navigate(-1)} />
        <EmptyState title="Could not load course" message={getErrorMessage(error)} iconName="alert-circle-outline" iconColor="#C0392B" />
      </View>
    );
  }

  const completed = new Set(progress?.completedLessonIds ?? course.lessons.filter((l) => l.completed).map((l) => l.id));
  const completedCount = progress?.completedCount ?? completed.size;
  const totalLessons = progress?.totalLessons || course.lessons.length;

  return (
    <View style={styles.safe}>
      <BackHeader title="Course" onBack={() => navigate(-1)} />
      <View style={styles.scrollContent}>
        <View style={styles.detailThumb}>
          {course.thumbnailUrl ? <Img src={course.thumbnailUrl} style={{ width: '100%', height: '100%' }} lazy={false} /> : <Icon name="play-circle-outline" size={44} color="#c2a3a8" />}
        </View>
        <Text style={styles.detailTitle}>{course.title}</Text>
        {course.description ? <Text style={styles.detailDescription}>{course.description}</Text> : null}

        {course.purchased ? (
          <View style={styles.progressCard}>
            <Text style={styles.progressLabel}>Your progress</Text>
            <Text style={styles.progressValue}>
              {completedCount}/{totalLessons} completed
            </Text>
            <View style={styles.progressTrack}>
              <View style={{ ...styles.progressFill, width: `${totalLessons ? Math.round((completedCount / totalLessons) * 100) : 0}%` }} />
            </View>
          </View>
        ) : (
          <View style={styles.buyRow}>
            {course.price <= 0 ? (
              <>
                <Badge label="Free" variant="success" />
                <Button
                  title="Enroll for Free"
                  loading={enrollFree.isPending}
                  onPress={() =>
                    enrollFree.mutate(undefined, {
                      onSuccess: () => showToast('You’re enrolled — enjoy the course', 'success'),
                      onError: (err) => showToast(getErrorMessage(err, 'Could not enroll. Please try again.'), 'error'),
                    })
                  }
                />
              </>
            ) : (
              <>
                <Text style={styles.priceText}>{formatPrice(course.price)}</Text>
                <Button title="Buy Course" onPress={() => navigate(`/courses/${course.id}/pay`)} />
              </>
            )}
          </View>
        )}

        <Text style={styles.sectionTitle}>Lessons</Text>
        <View style={{ gap: 10 }}>
          {course.lessons.map((lesson, index) => {
            // A real purchase row is needed to open any lesson, free or paid.
            const tappable = course.purchased && !lesson.locked;
            const done = completed.has(lesson.id) || lesson.completed;
            return (
              <View key={lesson.id} style={cx(styles.lessonRow, !tappable && styles.lessonRowLocked)}>
                <Pressable
                  onPress={() => tappable && navigate(`/courses/${course.id}/lesson/${lesson.id}`)}
                  disabled={!tappable}
                  style={styles.lessonMain}
                  ariaLabel={tappable ? `Open ${lesson.title}` : `${lesson.title} (locked)`}
                >
                  <View style={styles.lessonIndexWrap}>
                    {!tappable ? <Icon name="lock-closed" size={16} color="#c2a3a8" /> : done ? <Icon name="checkmark-circle" size={20} color="#15803D" /> : <Text style={styles.lessonIndex}>{index + 1}</Text>}
                  </View>
                  <View style={styles.lessonTextCol}>
                    <Text style={cx(styles.lessonTitle, !tappable && styles.lessonTitleLocked)} numberOfLines={1}>{lesson.title}</Text>
                    {lesson.type === 'PDF' && (
                      <View style={styles.lessonKind}>
                        <Icon name="document-text-outline" size={13} color="#884952" />
                        <Text style={styles.lessonKindText}>
                          PDF{lesson.pageCount ? ` · ${lesson.pageCount} page${lesson.pageCount === 1 ? '' : 's'}` : ''}
                        </Text>
                      </View>
                    )}
                    {lesson.description ? <Text style={styles.lessonDescription} numberOfLines={3}>{lesson.description}</Text> : null}
                  </View>
                  {tappable && <Icon name="chevron-forward" size={18} color="#d7c1c3" />}
                </Pressable>
                {lesson.syllabus.length > 0 && (
                  <View style={{ paddingLeft: 52, paddingRight: 16, paddingBottom: 12 }}>
                    <Pressable onPress={() => toggleSyllabus(lesson.id)} style={styles.syllabusToggle} ariaLabel="Show syllabus">
                      <Icon name="list-outline" size={13} color="#884952" />
                      <Text style={styles.syllabusToggleText}>
                        Syllabus · {lesson.syllabus.length} topic{lesson.syllabus.length === 1 ? '' : 's'}
                      </Text>
                      <Icon name={openSyllabus.has(lesson.id) ? 'chevron-up' : 'chevron-down'} size={13} color="#884952" />
                    </Pressable>
                    {openSyllabus.has(lesson.id) && (
                      <View style={{ marginTop: 6, gap: 3 }}>
                        {lesson.syllabus.map((topic, i) => (
                          <View key={`${i}-${topic}`} style={{ flexDirection: 'row', gap: 6 }}>
                            <Text style={styles.syllabusBullet}>•</Text>
                            <Text style={styles.syllabusTopic}>{topic}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export function CoursePaymentScreen() {
  const { courseId = '' } = useParams();
  const { data: course } = useCourse(courseId);
  return <PaymentStub title="Checkout" amount={course?.price} what={course ? `Course: ${course.title}` : 'Course'} />;
}

const styles = sheet({
  safe: { flex: 1, minHeight: '100vh', backgroundColor: '#fff8f5' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 48 },
  heroCard: {
    backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 1, borderColor: '#F2E8EA', position: 'relative', overflow: 'hidden',
    minHeight: 200, padding: '18px 0 18px 18px', marginBottom: 18,
  },
  heroArch: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '44%', backgroundColor: '#FDECEF', borderTopLeftRadius: 90 },
  heroTextCol: { width: '58%', zIndex: 2 },
  heroTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 21, lineHeight: 25, color: '#1e1b18', marginBottom: 7 },
  heroSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 12.5, lineHeight: 18, color: '#857374', marginBottom: 16 },
  heroPortrait: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '46%', height: '100%', zIndex: 2 },
  featureBadgeRow: { flexDirection: 'row', gap: 8 },
  featureBadge: { flex: 1, alignItems: 'center', gap: 5 },
  featureBadgeIconWrap: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FAF0F2', alignItems: 'center', justifyContent: 'center' },
  featureBadgeText: { fontFamily: 'Inter_500Medium', fontSize: 8.5, lineHeight: 11, color: '#524344', textAlign: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F2E8EA', borderRadius: 24, paddingHorizontal: 18, height: 50, marginBottom: 16 },
  searchInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, color: '#1e1b18' },
  pillRow: { gap: 10, paddingBottom: 24 },
  pill: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(215, 193, 195, 0.3)' },
  pillActive: { backgroundColor: '#1e1b18', borderColor: '#1e1b18' },
  pillText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#524344', whiteSpace: 'nowrap' },
  pillTextActive: { color: '#FFFFFF' },
  sectionTitle: { fontFamily: 'PlayfairDisplay_500Medium_Italic', fontSize: 20, color: '#1e1b18', marginBottom: 16, marginTop: 4 },
  noResultsText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#857374', marginBottom: 24 },
  featuredScrollContent: { gap: 16, paddingBottom: 28 },
  featuredCard: { width: 220, backgroundColor: '#FFFFFF', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(215, 193, 195, 0.3)', textAlign: 'left' },
  featuredThumbWrap: { width: '100%', aspectRatio: '16 / 10', backgroundColor: '#efe6e2', position: 'relative' },
  featuredPlayBadge: { position: 'absolute', top: '50%', left: '50%', marginTop: -16, marginLeft: -16, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(30, 27, 24, 0.55)', alignItems: 'center', justifyContent: 'center' },
  lessonCountBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(30, 27, 24, 0.7)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  lessonCountText: { fontFamily: 'Inter_600SemiBold', fontSize: 9, color: '#FFFFFF' },
  featuredBody: { padding: 14, gap: 6 },
  featuredTitle: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 14, color: '#1e1b18' },
  featuredDesc: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: '#857374', lineHeight: 16, minHeight: 32 },
  featuredMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, justifyContent: 'space-between' },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaChipText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: '#857374' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(215, 193, 195, 0.3)', padding: 18, minHeight: 140, justifyContent: 'center', width: '100%', textAlign: 'left' },
  iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(136, 73, 82, 0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  cardTitle: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 15, color: '#1e1b18', marginBottom: 4 },
  cardMeta: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: '#857374' },
  listCard: { flexDirection: 'row', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(215, 193, 195, 0.3)', padding: 12, marginBottom: 14, width: '100%', alignItems: 'center' },
  listThumb: { width: 96, height: 96, borderRadius: 14, overflow: 'hidden', backgroundColor: '#efe6e2', alignItems: 'center', justifyContent: 'center' },
  price: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 14, color: '#884952' },
  detailThumb: { width: '100%', aspectRatio: '16 / 9', borderRadius: 20, overflow: 'hidden', backgroundColor: '#efe6e2', marginBottom: 20, alignItems: 'center', justifyContent: 'center' },
  detailTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 26, color: '#1e1b18', marginBottom: 8 },
  detailDescription: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#524344', lineHeight: 21, marginBottom: 16 },
  progressCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#efe6e2', padding: 16, marginBottom: 24, gap: 6 },
  progressLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#857374', letterSpacing: 1.2, textTransform: 'uppercase' },
  progressValue: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, color: '#1e1b18' },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: '#f1e7e3', overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: '#884952' },
  buyRow: { gap: 12, marginBottom: 24 },
  priceText: { fontFamily: 'BodoniModa_700Bold', fontSize: 28, color: '#1e1b18' },
  lessonRow: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#efe6e2' },
  lessonRowLocked: { backgroundColor: '#fbf7f5' },
  lessonMain: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, width: '100%', textAlign: 'left' },
  lessonIndexWrap: { width: 26, alignItems: 'center' },
  lessonIndex: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#884952' },
  lessonTextCol: { flex: 1, minWidth: 0 },
  lessonTitle: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, color: '#1e1b18' },
  lessonTitleLocked: { color: '#857374' },
  lessonKind: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  lessonKindText: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 12, color: '#884952' },
  lessonDescription: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12.5, lineHeight: 18, color: '#857374', marginTop: 4 },
  syllabusToggle: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4 },
  syllabusToggleText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12, color: '#884952' },
  syllabusBullet: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12.5, lineHeight: 18, color: '#884952' },
  syllabusTopic: { flex: 1, fontFamily: 'HankenGrotesk_400Regular', fontSize: 12.5, lineHeight: 18, color: '#524344' },
});
