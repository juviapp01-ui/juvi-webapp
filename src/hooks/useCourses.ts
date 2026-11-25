import { InfiniteData, useInfiniteQuery, useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { coursesApi } from '@/api';
import { ContinueLearningInfo, Course, CourseCategory, CourseProgress, Paginated } from '@/types';

export function useCourseCategories() {
  return useQuery<CourseCategory[]>({
    queryKey: ['courseCategories'],
    queryFn: () => coursesApi.categories().then((r) => r.data),
  });
}

export function useCoursesByCategory(categoryId: string) {
  return useInfiniteQuery<Paginated<Course>, Error, InfiniteData<Paginated<Course>>, any[], number>({
    queryKey: ['courses', categoryId],
    queryFn: ({ pageParam = 1 }) => coursesApi.byCategory(categoryId, { page: pageParam }).then((r) => r.data),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
    enabled: !!categoryId,
  });
}

export function useCourse(courseId: string) {
  return useQuery<Course>({
    queryKey: ['course', courseId],
    queryFn: () => coursesApi.getById(courseId).then((r) => r.data),
    enabled: !!courseId,
  });
}

export function useCourseProgress(courseId: string, enabled = true) {
  return useQuery<CourseProgress>({
    queryKey: ['course', courseId, 'progress'],
    queryFn: () => coursesApi.progress(courseId).then((r) => r.data),
    enabled: enabled && !!courseId,
  });
}

// A free course (price 0) has no Paytm step, but the backend still requires
// a real CoursePurchase row before it'll serve a lesson's video — lesson
// unlocking, progress and Continue Learning all key off that row existing,
// same as a paid course. POST /courses/:id/purchase already special-cases
// amount<=0 to create it directly instead of going through the gateway; this
// is that path, called from a tap on "Enroll for Free" rather than Buy.
export function useEnrollFreeCourse(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => coursesApi.purchase(courseId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course', courseId] });
      qc.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}

export function useCompleteLesson(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lessonId: string) => coursesApi.completeLesson(courseId, lessonId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course', courseId] });
      qc.invalidateQueries({ queryKey: ['course', courseId, 'progress'] });
      qc.invalidateQueries({ queryKey: ['courses', 'continueLearning'] });
    },
  });
}

// Merges the first page of courses across every category into one list.
// There's no unified GET /courses (all) or search endpoint on the backend,
// so this is a one-time fan-out over categories (typically a handful) —
// not a per-card N+1 fetch. Used for the Featured Courses row, category
// filter pills, and client-side search on CourseCategoriesScreen.
export function useAllCourses() {
  const { data: categories, refetch: refetchCategories, isRefetching: isRefetchingCategories } = useCourseCategories();
  const results = useQueries({
    queries: (categories ?? []).map((cat) => ({
      queryKey: ['courses', cat.id, 'firstPage'],
      queryFn: () => coursesApi.byCategory(cat.id, { page: 1 }).then((r) => r.data),
      enabled: !!categories,
    })),
  });

  const isLoading = !categories || results.some((r) => r.isLoading);
  const isRefetching = isRefetchingCategories || results.some((r) => r.isRefetching);
  const error = results.find((r) => r.error)?.error as Error | undefined;
  const courses = results.flatMap((r) => r.data?.items ?? []);
  const refetch = () => {
    refetchCategories();
    results.forEach((r) => r.refetch());
  };

  return { courses, categories: categories ?? [], isLoading, isRefetching, error, refetch };
}

export function useContinueLearning(): ContinueLearningInfo | null {
  const { data } = useQuery<ContinueLearningInfo | null>({
    queryKey: ['courses', 'continueLearning'],
    queryFn: () => coursesApi.continueLearning().then((r) => r.data),
  });
  return data ?? null;
}
