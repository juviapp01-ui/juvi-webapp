import { api } from './client';
import { ContinueLearningInfo, Course, CourseCategory, CourseLesson, CourseProgress, Paginated } from '@/types';
import { CreateOrderResponse } from './payments';
import { normalizeSyllabus } from '@/utils/syllabus';

// `coursePurchased` is the enclosing course's purchase state — the backend
// never sends a per-lesson lock flag (there's no such column; a lesson is
// locked purely because the viewer hasn't bought the course), it just sends
// the full lesson row when purchased and a stripped {id,title,order} one
// when not. Defaulting `locked` to `true` regardless of purchase state used
// to leave every lesson showing a padlock even right after a successful
// purchase — this derives it from the one signal that's actually real.
function normalizeLesson(raw: any, coursePurchased: boolean): CourseLesson {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description ?? null,
    order: raw.order ?? raw.sequence ?? raw.position ?? 0,
    durationSeconds: raw.durationSeconds ?? raw.duration,
    videoUrl: raw.videoUrl ?? undefined,
    // An older backend sends no type — every lesson was a video then.
    type: raw.type === 'PDF' ? 'PDF' : 'VIDEO',
    pageCount: raw.pageCount ?? null,
    // Missing on an older backend — then simply no syllabus.
    syllabus: normalizeSyllabus(raw.syllabus),
    locked: raw.locked ?? raw.isLocked ?? (raw.unlocked !== undefined ? !raw.unlocked : !coursePurchased),
    completed: raw.completed ?? raw.isCompleted ?? false,
  };
}

function normalizeCourse(raw: any): Course {
  const purchased = raw.purchased ?? raw.isPurchased ?? raw.hasPurchased ?? false;

  // Distinguish "backend omitted lessons for this response shape" (list
  // endpoints) from "this course genuinely has zero lessons" (detail
  // endpoint) — only the latter should report lessonCount: 0.
  const hasLessonsArray = Array.isArray(raw.lessons) || Array.isArray(raw.data?.lessons);
  const lessonsRaw = Array.isArray(raw.lessons)
    ? raw.lessons
    : Array.isArray(raw.data?.lessons)
      ? raw.data.lessons
      : [];
  const lessons = lessonsRaw
    .map((l: any) => normalizeLesson(l, purchased))
    .sort((a: CourseLesson, b: CourseLesson) => a.order - b.order);

  const lessonCount = raw.lessonCount ?? raw.totalLessons ?? (hasLessonsArray ? lessons.length : undefined);
  const durationSeconds = raw.durationSeconds ?? raw.totalDurationSeconds ?? (hasLessonsArray
    ? lessons.reduce((sum: number, l: CourseLesson) => sum + (l.durationSeconds ?? 0), 0)
    : undefined);

  return {
    id: raw.id,
    categoryId: raw.categoryId ?? raw.category?.id ?? '',
    title: raw.title,
    description: raw.description,
    thumbnailUrl: raw.thumbnailUrl ?? raw.thumbnail,
    price: raw.price ?? 0,
    purchased,
    lessons,
    lessonCount,
    durationSeconds,
    level: raw.level ?? raw.difficulty,
  };
}

function normalizeContinueLearning(raw: any): ContinueLearningInfo | null {
  if (!raw) return null;
  const courseId = raw.courseId ?? raw.course?.id ?? raw.id;
  if (!courseId) return null;

  const completedCount = raw.completedCount ?? raw.completedLessons ?? 0;
  const totalLessons = raw.totalLessons ?? raw.total ?? raw.course?.lessonCount ?? 0;

  return {
    courseId,
    courseTitle: raw.courseTitle ?? raw.course?.title ?? raw.title,
    thumbnailUrl: raw.thumbnailUrl ?? raw.course?.thumbnailUrl ?? raw.thumbnail,
    lessonTitle: raw.lessonTitle ?? raw.nextLesson?.title ?? raw.currentLesson?.title ?? raw.lesson?.title ?? '',
    completedCount,
    totalLessons,
    percent: raw.percent ?? raw.progressPercent ?? (totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0),
  };
}

function normalizeCategory(raw: any): CourseCategory {
  return {
    id: raw.id,
    name: raw.name ?? raw.title,
    imageUrl: raw.imageUrl ?? raw.thumbnailUrl,
    courseCount: raw.courseCount ?? raw.coursesCount ?? (Array.isArray(raw.courses) ? raw.courses.length : undefined),
  };
}

export const coursesApi = {
  categories: async () => {
    const res = await api.get<any>('/course-categories');
    const raw = res.data;
    const items = Array.isArray(raw?.items)
      ? raw.items
      : Array.isArray(raw?.categories)
        ? raw.categories
        : Array.isArray(raw?.data)
          ? raw.data
          : Array.isArray(raw)
            ? raw
            : [];
    res.data = items.map(normalizeCategory);
    return res as { data: CourseCategory[] };
  },
  byCategory: async (categoryId: string, params?: { page?: number; limit?: number }) => {
    const res = await api.get<any>('/courses', { params: { categoryId, ...params } });
    const raw = res.data;
    const items = Array.isArray(raw?.items)
      ? raw.items
      : Array.isArray(raw?.courses)
        ? raw.courses
        : Array.isArray(raw?.data)
          ? raw.data
          : Array.isArray(raw)
            ? raw
            : [];
    res.data = {
      items: items.map(normalizeCourse),
      page: raw?.page ?? params?.page ?? 1,
      pageSize: raw?.pageSize ?? raw?.limit ?? items.length,
      total: raw?.total ?? items.length,
    };
    return res as { data: Paginated<Course> };
  },
  getById: async (id: string) => {
    const res = await api.get<any>(`/courses/${id}`);
    // isPurchased rides as a sibling of `course` in this response
    // ({ course, isPurchased }), not a field on the course object itself —
    // normalizeCourse only ever sees a purchase flag if it's merged in here.
    // Missing this left course.purchased permanently false, so a completed
    // payment's polling loop never saw success and spun for its full 5
    // minutes before giving up.
    const envelope = res.data?.data ?? res.data ?? {};
    const courseRaw = envelope.course ?? envelope;
    res.data = normalizeCourse({
      ...courseRaw,
      isPurchased: envelope.isPurchased ?? courseRaw.isPurchased,
    });
    return res as { data: Course };
  },
  // Same response shape as the existing booking payment initiation
  // (paymentsApi.createOrder) — see PaymentScreen.tsx for how it's consumed.
  purchase: (id: string) => api.post<CreateOrderResponse>(`/courses/${id}/purchase`),
  getLesson: async (courseId: string, lessonId: string) => {
    const res = await api.get<any>(`/courses/${courseId}/lessons/${lessonId}`);
    // This endpoint 403s outright for an unpurchased course (see
    // course.controller.js) — reaching a 200 here already proves purchased.
    res.data = normalizeLesson(res.data?.lesson ?? res.data?.data ?? res.data, true);
    return res as { data: CourseLesson };
  },
  // Where one page of a PDF lesson is served. Loaded by expo-image with the
  // access token in an Authorization header, never via a public link.
  lessonPageUrl: (courseId: string, lessonId: string, page: number) =>
    `${api.defaults.baseURL}/courses/${courseId}/lessons/${lessonId}/pages/${page}`,
  completeLesson: (courseId: string, lessonId: string) =>
    api.post(`/courses/${courseId}/lessons/${lessonId}/complete`),
  progress: async (courseId: string) => {
    const res = await api.get<any>(`/courses/${courseId}/progress`);
    const raw = res.data?.data ?? res.data;
    const completedLessonIds = raw?.completedLessonIds ?? raw?.completedLessons ?? [];
    res.data = {
      completedLessonIds,
      completedCount: raw?.completedCount ?? completedLessonIds.length ?? 0,
      totalLessons: raw?.totalLessons ?? raw?.total ?? 0,
      nextLessonId: raw?.nextLessonId ?? raw?.nextLesson?.id,
    };
    return res as { data: CourseProgress };
  },
  continueLearning: async () => {
    const res = await api.get<any>('/courses/me/continue-learning');
    const raw = res.data?.data ?? res.data;
    res.data = normalizeContinueLearning(raw);
    return res as { data: ContinueLearningInfo | null };
  },
};
