"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { UNIVERSITIES, CATEGORIES, CATEGORY_COUNTS, categoryToSlug } from "./data";
import UniversityCard from "./UniversityCard";

// NOTE ON DATA CONFIDENCE:
// Merit formulas below were verified via web research (multiple independent
// sources, official pages where possible) as of Jul 2026. Confidence level
// noted per entry. 5 entries (Punjab University, UCP, UMT, Bahria, Air
// University) are marked "low" confidence and have no verified formula --
// see data.ts for details on the specific conflicts found. Operational
// stats (question count, duration, seats, negative marking) were NOT
// independently verified except where noted.

// Category filtering now happens via real links to /universities/category/[slug]
// (see data.ts + category/[category]/page.tsx) instead of only a client-side
// toggle -- each category gets its own indexable, bookmarkable URL with its
// own metadata and JSON-LD. This page stays the "all universities" view with
// client-side search as a progressive-enhancement layer on top.

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-2 min-w-0">
      <span className="text-slate-900 dark:text-slate-100 font-bold text-sm leading-tight truncate w-full text-center">{value}</span>
      <span className="text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wide mt-0.5">{label}</span>
    </div>
  );
}

export default function UniversitiesClient() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return UNIVERSITIES;
    return UNIVERSITIES.filter((u) => {
      return (
        u.name.toLowerCase().includes(q) ||
        u.fullName.toLowerCase().includes(q) ||
        u.test.toLowerCase().includes(q) ||
        u.city.toLowerCase().includes(q) ||
        u.campuses.some((c) => c.toLowerCase().includes(q)) ||
        u.subjects.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [search]);

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

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-10">
        <StatChip label="Universities" value={`${UNIVERSITIES.length}`} />
        {CATEGORIES.map((c) => (
          <StatChip key={c} label={c} value={`${CATEGORY_COUNTS[c]}`} />
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

      {/* Category pills now navigate to real, indexable category pages
          instead of only toggling client state. */}
      <div className="flex flex-wrap gap-2 mb-8" role="group" aria-label="Browse by category">
        <span className="text-sm px-4 py-2 rounded-full font-medium bg-teal-600 dark:bg-teal-500 text-white border border-teal-600 dark:border-teal-500">
          All Universities
          <span className="ml-1.5 text-xs opacity-60">{UNIVERSITIES.length}</span>
        </span>
        {CATEGORIES.map((c) => (
          <Link
            key={c}
            href={`/universities/category/${categoryToSlug(c)}`}
            className="text-sm px-4 py-2 rounded-full font-medium transition-all border bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-700 no-underline"
          >
            {c}
            <span className="ml-1.5 text-xs opacity-60">{CATEGORY_COUNTS[c]}</span>
          </Link>
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
            No universities found. Try a different search.
          </p>
          <button
            onClick={() => setSearch("")}
            className="mt-4 text-teal-600 dark:text-teal-400 text-sm font-medium hover:underline"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((u) => (
            <UniversityCard key={u.slug} uni={u} />
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