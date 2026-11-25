// A lesson's syllabus as the app uses it: a clean list of topics, [] when the
// backend sends none (older servers, or lessons without one).

export const SYLLABUS_COLLAPSED_COUNT = 5;

export function normalizeSyllabus(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

// The topics to show: all of them, or the first few until "Show more".
export function visibleSyllabus(items: string[], expanded: boolean): { shown: string[]; hiddenCount: number } {
  if (expanded || items.length <= SYLLABUS_COLLAPSED_COUNT) return { shown: items, hiddenCount: 0 };
  return { shown: items.slice(0, SYLLABUS_COLLAPSED_COUNT), hiddenCount: items.length - SYLLABUS_COLLAPSED_COUNT };
}
