// Single source of truth for blog categories. Adding a category means adding
// one entry here — the slug, display label, and card color all derive from it,
// so a typo in a post's `category` field fails validation instead of quietly
// creating an uncategorized/uncolored orphan category.

export const CATEGORIES = {
  "exam-strategy": {
    label: "Exam Strategy",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    text: "text-blue-700 dark:text-blue-400",
  },
  "university-guides": {
    label: "University Guides",
    bg: "bg-teal-50 dark:bg-teal-900/20",
    text: "text-teal-700 dark:text-teal-400",
  },
  "subject-guides": {
    label: "Subject Guides",
    bg: "bg-violet-50 dark:bg-violet-900/20",
    text: "text-violet-700 dark:text-violet-400",
  },
  "study-skills": {
    label: "Study Skills",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    text: "text-amber-700 dark:text-amber-400",
  },
} as const;

export type CategorySlug = keyof typeof CATEGORIES;

export const CATEGORY_SLUGS = Object.keys(CATEGORIES) as CategorySlug[];

export function isCategorySlug(value: string): value is CategorySlug {
  return value in CATEGORIES;
}

export function categoryLabel(slug: CategorySlug): string {
  return CATEGORIES[slug].label;
}

export function categoryStyle(slug: CategorySlug) {
  return CATEGORIES[slug];
}