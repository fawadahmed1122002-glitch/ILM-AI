"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { UNIVERSITIES } from "./data";

// NOTE ON DATA CONFIDENCE:
// Merit formulas below were verified via web research (multiple independent
// sources, official pages where possible) as of Jul 2026. Confidence level
// noted per entry. Operational stats (question count, duration, seats,
// negative marking) were NOT independently verified and should be confirmed
// against each university's official prospectus before being relied on.

const CATEGORIES = [
  { key: "all",         label: "All Universities" },
  { key: "Engineering", label: "Engineering" },
  { key: "Medical",     label: "Medical" },
  { key: "Computing",   label: "Computing" },
  { key: "Veterinary",  label: "Veterinary" },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Engineering: { bg: "bg-blue-50 dark:bg-blue-900/20",   text: "text-blue-700 dark:text-blue-400",   dot: "bg-blue-500" },
  Medical:     { bg: "bg-rose-50 dark:bg-rose-900/20",   text: "text-rose-700 dark:text-rose-400",   dot: "bg-rose-500" },
  Computing:   { bg: "bg-teal-50 dark:bg-teal-900/20",   text: "text-teal-700 dark:text-teal-400",   dot: "bg-teal-500" },
  Veterinary:  { bg: "bg-green-50 dark:bg-green-900/20", text: "text-green-700 dark:text-green-400", dot: "bg-green-500" },
};

function CategoryBadge({ category }: { category: string }) {
  const c = CATEGORY_COLORS[category] ?? { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-400", dot: "bg-slate-400" };
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

function MeritFormulaBox({ formula, confidence }: { formula: string | null; confidence: string }) {
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
        {confidence === "low" && (
          <span className="text-[9px] uppercase tracking-wide text-amber-600 dark:text-amber-400 font-semibold">Unconfirmed</span>
        )}
      </div>
      <p className="text-slate-700 dark:text-slate-300 text-xs font-medium mt-0.5 leading-snug">
        {formula}
      </p>
    </div>
  );
}

export default function UniversitiesClient() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return UNIVERSITIES.filter((u) => {
      const matchCategory = activeCategory === "all" || u.category === activeCategory;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.fullName.toLowerCase().includes(q) ||
        u.test.toLowerCase().includes(q) ||
        u.city.toLowerCase().includes(q) ||
        u.subjects.some((s) => s.toLowerCase().includes(q));
      return matchCategory && matchSearch;
    });
  }, [activeCategory, search]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 sm:py-16 animate-fade-up">

      <div className="mb-6 text-center">
        <span className="inline-block text-xs font-semibold uppercase tracking-widest text-teal-600 dark:text-teal-400 mb-3">
          Pakistan Entry Tests
        </span>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-3">
          University Admissions Guide
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-base max-w-2xl mx-auto leading-relaxed">
          Test patterns, merit formulas, and top programs for Pakistan's leading
          engineering, medical, and computing universities.
        </p>
      </div>

      <div className="mb-10 max-w-2xl mx-auto bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-center">
        <p className="text-amber-700 dark:text-amber-400 text-xs">
          Information is for planning guidance only. Always confirm dates, fees,
          and merit criteria with the official university website before making
          admission decisions.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        {[
          { label: "Universities", value: `${UNIVERSITIES.length}` },
          { label: "Engineering",  value: `${UNIVERSITIES.filter(u => u.category === "Engineering").length}` },
          { label: "Medical",      value: `${UNIVERSITIES.filter(u => u.category === "Medical").length}` },
          { label: "Computing",    value: `${UNIVERSITIES.filter(u => u.category === "Computing").length}` },
        ].map((s) => (
          <StatChip key={s.label} {...s} />
        ))}
      </div>

      <div className="relative mb-6">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search by university, test, subject, or city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-600 transition"
          aria-label="Search universities"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-8" role="group" aria-label="Filter by category">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setActiveCategory(c.key)}
            className={`text-sm px-4 py-2 rounded-full font-medium transition-all border
              ${activeCategory === c.key
                ? "bg-teal-600 dark:bg-teal-500 text-white border-teal-600 dark:border-teal-500"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-700"
              }`}
            aria-pressed={activeCategory === c.key}
          >
            {c.label}
            {c.key !== "all" && (
              <span className="ml-1.5 text-xs opacity-60">
                {UNIVERSITIES.filter(u => u.category === c.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {search && (
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          {filtered.length === 0
            ? "No universities match your search."
            : `${filtered.length} result${filtered.length !== 1 ? "s" : ""} for "${search}"`}
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-400 dark:text-slate-500 text-base">
            No universities found. Try a different search or category.
          </p>
          <button
            onClick={() => { setSearch(""); setActiveCategory("all"); }}
            className="mt-4 text-teal-600 dark:text-teal-400 text-sm font-medium hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((u) => (
            <Link
              key={u.slug}
              href={`/universities/${u.slug}`}
              className="group block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 no-underline hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-md hover:shadow-teal-100 dark:hover:shadow-teal-900/20 transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                    {u.name}
                  </h2>
                  <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5 truncate">
                    {u.city}
                  </p>
                </div>
                <TestBadge test={u.test} />
              </div>

              <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed mb-4 line-clamp-2">
                {u.fullName}
              </p>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <StatChip label="Questions" value={String(u.totalQuestions)} />
                <StatChip label="Duration"  value={u.duration} />
                <StatChip label="Min Agg."  value={u.minAggregate} />
              </div>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {u.subjects.slice(0, 4).map((s) => (
                  <span
                    key={s}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  >
                    {s}
                  </span>
                ))}
                {u.subjects.length > 4 && (
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-500">
                    +{u.subjects.length - 4}
                  </span>
                )}
              </div>

              <MeritFormulaBox formula={u.meritFormula} confidence={u.formulaConfidence} />

              <div className="flex items-center justify-between">
                <CategoryBadge category={u.category} />
                <div className="flex items-center gap-1.5">
                  {u.negativeMarking && (
                    <span className="text-[10px] text-rose-500 dark:text-rose-400 font-medium bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-full">
                      −ve marking
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {u.testType}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {u.seats} seats
                </span>
                <span className="text-xs text-teal-600 dark:text-teal-400 font-medium group-hover:underline">
                  View full guide →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-14 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-700 dark:from-teal-700 dark:to-teal-800 p-8 text-center">
        <h2 className="font-display text-xl sm:text-2xl font-bold text-white mb-2">
          Prepare for these tests with PrepXMentor
        </h2>
        <p className="text-teal-100 text-sm max-w-lg mx-auto mb-6">
          Bilingual AI explanations and MCQ practice aligned to the new 2025
          syllabus — for ECAT, MDCAT, and NET.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-teal-700 font-semibold text-sm hover:bg-teal-50 transition-colors no-underline"
          >
            Start free trial
          </Link>
          <Link
            href="/upgrade"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-teal-500/30 text-white font-semibold text-sm hover:bg-teal-500/50 transition-colors no-underline border border-teal-400/40"
          >
            See pricing — PKR 799/mo
          </Link>
        </div>
      </div>
    </div>
  );
}
