// Mirrors backend/app/core/academic_fields.py FIELD_SUBJECTS -- keep in sync.
const FIELD_SUBJECTS: Record<string, string[]> = {
  "pre-engineering": ["Physics", "Chemistry", "Mathematics", "English"],
  "pre-medical": ["Biology", "Chemistry", "Physics", "English"],
  "ics-physics": ["Mathematics", "Physics", "Computer Science", "English"],
  "ics-stats": ["Mathematics", "Statistics", "Computer Science", "English"],
};

const ALL_SUBJECTS = ["Biology", "Chemistry", "Physics", "Mathematics", "Computer Science", "English", "Statistics"];

// Returns the subjects a student should see based on their registered field.
// Falls back to ALL_SUBJECTS if no field is set (e.g. pre-launch accounts,
// or a student who skipped the field picker) so nobody sees an empty list.
// Also filters out "English" and "Statistics" since neither has ingested
// content yet -- remove these filters once that content exists.
export function subjectsForField(field: string | null | undefined): string[] {
  const raw = field ? FIELD_SUBJECTS[field] : null;
  const list = raw && raw.length > 0 ? raw : ALL_SUBJECTS;
  return list.filter((s) => ALL_SUBJECTS.includes(s));
}