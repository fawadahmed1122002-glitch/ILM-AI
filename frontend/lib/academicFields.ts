// Mirrors backend/app/core/academic_fields.py FIELD_SUBJECTS -- keep in sync.
// Used only as a fallback for legacy accounts that registered under the old
// single-field picker and never got an explicit `subjects` list.
const FIELD_SUBJECTS: Record<string, string[]> = {
  "pre-engineering": ["Physics", "Chemistry", "Mathematics", "English"],
  "pre-medical": ["Biology", "Chemistry", "Physics", "English"],
  "ics-physics": ["Mathematics", "Physics", "Computer Science", "English"],
  "ics-stats": ["Mathematics", "Statistics", "Computer Science", "English"],
};

const ALL_SUBJECTS = ["Biology", "Chemistry", "Physics", "Mathematics", "Computer Science"];

// Returns the subjects a student should see.
// Priority order:
//   1. Explicit `subjects` (new registration flow -- student directly
//      multi-selected these at signup).
//   2. Field-derived subjects (legacy accounts from the old single-field
//      picker, before explicit subject selection existed).
//   3. ALL_SUBJECTS as a last-resort fallback so nobody sees an empty list.
// Always filtered down to ALL_SUBJECTS since English/Statistics have no
// ingested content yet -- remove that filter once that content exists.
export function subjectsForField(
  field: string | null | undefined,
  subjects?: string[] | null
): string[] {
  const explicit = subjects && subjects.length > 0 ? subjects : null;
  const derived = !explicit && field ? FIELD_SUBJECTS[field] : null;
  const list = explicit || derived || ALL_SUBJECTS;
  return list.filter((s) => ALL_SUBJECTS.includes(s));
}