import Link from "next/link";
import type { University, Category } from "./data";
import { formatMeritFormula, formatCityLine } from "./data";
import UniversityLogo from "./UniversityLogo";

// Plain presentational component -- no "use client", no data fetching.
// Safe to import into both server components (category/[category]/page.tsx)
// and client components (UniversitiesClient.tsx): it has no server-only APIs,
// so it renders identically in either tree without forcing an RSC boundary.

const CATEGORY_COLORS: Record<Category, { bg: string; text: string; dot: string }> = {
  Engineering: { bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-700 dark:text-blue-400", dot: "bg-blue-500" },
  Medical: { bg: "bg-rose-50 dark:bg-rose-900/20", text: "text-rose-700 dark:text-rose-400", dot: "bg-rose-500" },
  Computing: { bg: "bg-teal-50 dark:bg-teal-900/20", text: "text-teal-700 dark:text-teal-400", dot: "bg-teal-500" },
  Veterinary: { bg: "bg-green-50 dark:bg-green-900/20", text: "text-green-700 dark:text-green-400", dot: "bg-green-500" },
};

function CategoryBadge({ category }: { category: Category }) {
  const c = CATEGORY_COLORS[category];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {category}
    </span>
  );
}

function TestBadge({ test }: { test: string }) {
  return (
    <span className="inline-flex items-center text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
      {test}
    </span>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-2 min-w-0">
      <span className="text-slate-900 dark:text-slate-100 font-bold text-sm leading-tight truncate w-full text-center">{value}</span>
      <span className="text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wide mt-0.5">{label}</span>
    </div>
  );
}

// 0 means "verified: no test" (e.g. UVAS). null means "format not yet verified".
function formatQuestions(totalQuestions: number | null): string {
  if (totalQuestions === null) return "Not published";
  if (totalQuestions === 0) return "None";
  return String(totalQuestions);
}

function formatDuration(duration: string | null): string {
  return duration ?? "Not published";
}

function MeritFormulaBox({ uni }: { uni: University }) {
  const formula = formatMeritFormula(uni.meritWeights);
  if (!formula) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2 mb-4">
        <span className="text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-400 font-semibold">Merit formula</span>
        <p className="text-amber-700 dark:text-amber-400 text-xs font-medium mt-0.5 leading-snug">
          Not yet verified — confirm on the official university website
        </p>
      </div>
    );
  }
  return (
    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-2 mb-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">Merit formula</span>
        {uni.formulaConfidence === "low" && (
          <span className="text-[9px] uppercase tracking-wide text-amber-600 dark:text-amber-400 font-semibold">Unconfirmed</span>
        )}
      </div>
      <p className="text-slate-700 dark:text-slate-300 text-xs font-medium mt-0.5 leading-snug">
        {formula}
      </p>
    </div>
  );
}

export default function UniversityCard({ uni }: { uni: University }) {
  return (
    <Link
      href={`/universities/${uni.slug}`}
      className="group block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 no-underline hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-md hover:shadow-teal-100 dark:hover:shadow-teal-900/20 transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <UniversityLogo uni={uni} size={40} />
          <div className="min-w-0">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
              {uni.name}
            </h2>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5 truncate" title={[uni.city, ...uni.campuses].join(", ")}>
              {formatCityLine(uni)}
            </p>
          </div>
        </div>
        <TestBadge test={uni.test} />
      </div>

      <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed mb-4 line-clamp-2">
        {uni.fullName}
      </p>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatChip label="Questions" value={formatQuestions(uni.totalQuestions)} />
        <StatChip label="Duration" value={formatDuration(uni.duration)} />
        <StatChip label="Min Agg." value={uni.minAggregate} />
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {uni.subjects.slice(0, 4).map((s) => (
          <span
            key={s}
            className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
          >
            {s}
          </span>
        ))}
        {uni.subjects.length > 4 && (
          <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-500">
            +{uni.subjects.length - 4}
          </span>
        )}
      </div>

      <MeritFormulaBox uni={uni} />

      <div className="flex items-center justify-between">
        <CategoryBadge category={uni.category} />
        <div className="flex items-center gap-1.5">
          {uni.negativeMarking && (
            <span className="text-[10px] text-rose-500 dark:text-rose-400 font-medium bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-full">
              −ve marking
            </span>
          )}
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            {uni.testType}
          </span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {uni.seats} seats
        </span>
        <span className="text-xs text-teal-600 dark:text-teal-400 font-medium group-hover:underline">
          View full guide →
        </span>
      </div>
    </Link>
  );
}