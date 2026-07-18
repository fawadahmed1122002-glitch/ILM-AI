"use client";

import Link from "next/link";
import { useState, useMemo } from "react";

// ── Data ──────────────────────────────────────────────────────────────────────
const UNIVERSITIES = [
  // ── Engineering ────────────────────────────────────────────────────────────
  {
    slug: "uet",
    name: "UET Lahore",
    fullName: "University of Engineering and Technology, Lahore",
    category: "Engineering",
    test: "ECAT",
    city: "Lahore",
    totalQuestions: 100,
    duration: "2 hours",
    meritFormula: "FSc 40% + Matric 10% + ECAT 50%",
    subjects: ["Physics", "Maths", "Chemistry", "English"],
    minAggregate: "60%",
    negativeMarking: false,
    seats: "~4,000",
    testType: "Paper-based",
    topPrograms: ["Civil Engineering", "Electrical Engineering", "Mechanical Engineering", "CS"],
    website: "https://uet.edu.pk",
  },
  {
    slug: "nust",
    name: "NUST",
    fullName: "National University of Sciences and Technology",
    category: "Engineering",
    test: "NET",
    city: "Islamabad",
    totalQuestions: 200,
    duration: "3 hours",
    meritFormula: "FSc 15% + Matric 5% + NET 80%",
    subjects: ["Physics", "Maths", "Chemistry / CS", "English", "Intelligence"],
    minAggregate: "Varies by program",
    negativeMarking: true,
    seats: "~2,500",
    testType: "Paper-based",
    topPrograms: ["Electrical Engineering", "CS", "Mechanical Engineering", "BBA"],
    website: "https://nust.edu.pk",
  },
  {
    slug: "giki",
    name: "GIKI",
    fullName: "Ghulam Ishaq Khan Institute of Engineering Sciences and Technology",
    category: "Engineering",
    test: "ECAT / GAT",
    city: "Topi, KPK",
    totalQuestions: 100,
    duration: "2 hours",
    meritFormula: "FSc 50% + ECAT / GAT 50%",
    subjects: ["Physics", "Maths", "Chemistry", "English"],
    minAggregate: "65%",
    negativeMarking: false,
    seats: "~600",
    testType: "Paper-based",
    topPrograms: ["Electrical Engineering", "Mechanical Engineering", "Engineering Sciences"],
    website: "https://giki.edu.pk",
  },
  // ── Computing ───────────────────────────────────────────────────────────────
  {
    slug: "fast",
    name: "FAST-NUCES",
    fullName: "National University of Computer and Emerging Sciences",
    category: "Computing",
    test: "FAST Entry Test",
    city: "Lahore · Islamabad · Karachi · Peshawar · CFD",
    totalQuestions: 100,
    duration: "2 hours",
    meritFormula: "FSc 50% + FAST Test 50%",
    subjects: ["Maths", "English", "IQ / Analytical"],
    minAggregate: "55%",
    negativeMarking: false,
    seats: "~3,000",
    testType: "Computer-based",
    topPrograms: ["BS Computer Science", "BS Software Engineering", "BS AI", "BS Electrical"],
    website: "https://nu.edu.pk",
  },
  // ── Medical ─────────────────────────────────────────────────────────────────
  {
    slug: "mdcat",
    name: "MDCAT",
    fullName: "Medical and Dental College Admission Test — Punjab",
    category: "Medical",
    test: "MDCAT",
    city: "All Punjab districts",
    totalQuestions: 210,
    duration: "3.5 hours",
    meritFormula: "FSc 40% + Matric 10% + MDCAT 50%",
    subjects: ["Biology", "Chemistry", "Physics", "English"],
    minAggregate: "65%",
    negativeMarking: true,
    seats: "Varies by college",
    testType: "Computer-based",
    topPrograms: ["MBBS", "BDS"],
    website: "https://uhs.edu.pk",
  },
  {
    slug: "king-edward",
    name: "King Edward Medical University",
    fullName: "King Edward Medical University, Lahore",
    category: "Medical",
    test: "MDCAT",
    city: "Lahore",
    totalQuestions: 210,
    duration: "3.5 hours",
    meritFormula: "FSc 40% + Matric 10% + MDCAT 50%",
    subjects: ["Biology", "Chemistry", "Physics", "English"],
    minAggregate: "75%+",
    negativeMarking: true,
    seats: "~250 MBBS",
    testType: "Computer-based",
    topPrograms: ["MBBS"],
    website: "https://kemu.edu.pk",
  },
  {
    slug: "allama-iqbal",
    name: "Allama Iqbal Medical College",
    fullName: "Allama Iqbal Medical College, Lahore",
    category: "Medical",
    test: "MDCAT",
    city: "Lahore",
    totalQuestions: 210,
    duration: "3.5 hours",
    meritFormula: "FSc 40% + Matric 10% + MDCAT 50%",
    subjects: ["Biology", "Chemistry", "Physics", "English"],
    minAggregate: "72%+",
    negativeMarking: true,
    seats: "~250 MBBS",
    testType: "Computer-based",
    topPrograms: ["MBBS"],
    website: "https://aimc.edu.pk",
  },
  {
    slug: "fatima-jinnah",
    name: "Fatima Jinnah Medical University",
    fullName: "Fatima Jinnah Medical University, Lahore",
    category: "Medical",
    test: "MDCAT",
    city: "Lahore",
    totalQuestions: 210,
    duration: "3.5 hours",
    meritFormula: "FSc 40% + Matric 10% + MDCAT 50%",
    subjects: ["Biology", "Chemistry", "Physics", "English"],
    minAggregate: "70%+",
    negativeMarking: true,
    seats: "~150 MBBS",
    testType: "Computer-based",
    topPrograms: ["MBBS"],
    website: "https://fjmu.edu.pk",
  },
  // ── General ─────────────────────────────────────────────────────────────────
  {
    slug: "pu",
    name: "University of the Punjab",
    fullName: "University of the Punjab, Lahore",
    category: "General",
    test: "PU Entry Test",
    city: "Lahore",
    totalQuestions: 80,
    duration: "90 minutes",
    meritFormula: "FSc 50% + Matric 10% + Test 40%",
    subjects: ["Subject-specific", "English", "IQ"],
    minAggregate: "45%",
    negativeMarking: false,
    seats: "~5,000+",
    testType: "Paper-based",
    topPrograms: ["BS Physics", "BS Chemistry", "LLB", "BS IT", "MBA"],
    website: "https://pu.edu.pk",
  },
  {
    slug: "gcu",
    name: "GCU Lahore",
    fullName: "Government College University, Lahore",
    category: "General",
    test: "GCU Entry Test",
    city: "Lahore",
    totalQuestions: 80,
    duration: "90 minutes",
    meritFormula: "FSc 60% + Matric 10% + Test 30%",
    subjects: ["Subject-specific", "English", "General Knowledge"],
    minAggregate: "50%",
    negativeMarking: false,
    seats: "~2,000",
    testType: "Paper-based",
    topPrograms: ["BS Mathematics", "BS Chemistry", "BS Physics", "BS CS"],
    website: "https://gcu.edu.pk",
  },
  {
    slug: "umt",
    name: "UMT",
    fullName: "University of Management and Technology, Lahore",
    category: "Business & Tech",
    test: "UMT Admission Test",
    city: "Lahore",
    totalQuestions: 60,
    duration: "60 minutes",
    meritFormula: "FSc 50% + Matric 10% + Test 40%",
    subjects: ["English", "Maths", "IQ / Analytical"],
    minAggregate: "45%",
    negativeMarking: false,
    seats: "~3,000",
    testType: "Computer-based",
    topPrograms: ["BBA", "BS CS", "BS Software Engineering", "BS Data Science"],
    website: "https://umt.edu.pk",
  },
  {
    slug: "ucp",
    name: "UCP",
    fullName: "University of Central Punjab, Lahore",
    category: "Business & Tech",
    test: "UCP Entry Test",
    city: "Lahore",
    totalQuestions: 60,
    duration: "60 minutes",
    meritFormula: "FSc 50% + Matric 10% + Test 40%",
    subjects: ["English", "Maths", "General Knowledge"],
    minAggregate: "45%",
    negativeMarking: false,
    seats: "~3,500",
    testType: "Computer-based",
    topPrograms: ["BBA", "BS CS", "BS Pharmacy", "MBBS", "LLB"],
    website: "https://ucp.edu.pk",
  },
  {
    slug: "uvas",
    name: "UVAS",
    fullName: "University of Veterinary and Animal Sciences, Lahore",
    category: "Veterinary",
    test: "UVAS Entry Test",
    city: "Lahore",
    totalQuestions: 100,
    duration: "2 hours",
    meritFormula: "FSc 40% + Matric 10% + Test 50%",
    subjects: ["Biology", "Chemistry", "Physics", "English"],
    minAggregate: "55%",
    negativeMarking: false,
    seats: "~800",
    testType: "Paper-based",
    topPrograms: ["DVM", "BS Zoology", "BS Food Science", "BS Bioinformatics"],
    website: "https://uvas.edu.pk",
  },
];

// ── Category config ───────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: "all",            label: "All Universities" },
  { key: "Engineering",    label: "Engineering" },
  { key: "Medical",        label: "Medical" },
  { key: "Computing",      label: "Computing" },
  { key: "General",        label: "General" },
  { key: "Business & Tech",label: "Business & Tech" },
  { key: "Veterinary",     label: "Veterinary" },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Engineering:     { bg: "bg-blue-50 dark:bg-blue-900/20",    text: "text-blue-700 dark:text-blue-400",    dot: "bg-blue-500" },
  Medical:         { bg: "bg-rose-50 dark:bg-rose-900/20",    text: "text-rose-700 dark:text-rose-400",    dot: "bg-rose-500" },
  Computing:       { bg: "bg-teal-50 dark:bg-teal-900/20",    text: "text-teal-700 dark:text-teal-400",    dot: "bg-teal-500" },
  General:         { bg: "bg-violet-50 dark:bg-violet-900/20",text: "text-violet-700 dark:text-violet-400",dot: "bg-violet-500" },
  "Business & Tech":{ bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-700 dark:text-amber-400",  dot: "bg-amber-500" },
  Veterinary:      { bg: "bg-green-50 dark:bg-green-900/20",  text: "text-green-700 dark:text-green-400",  dot: "bg-green-500" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
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

// ── Main page ─────────────────────────────────────────────────────────────────
export default function UniversitiesPage() {
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

      {/* ── Header ── */}
      <div className="mb-10 text-center">
        <span className="inline-block text-xs font-semibold uppercase tracking-widest text-teal-600 dark:text-teal-400 mb-3">
          Pakistan Entry Tests
        </span>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-3">
          University Admissions Guide
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-base max-w-2xl mx-auto leading-relaxed">
          Test patterns, merit formulas, seat counts, and top programs for
          Pakistan's leading engineering, medical, and computing universities.
        </p>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-10">
        {[
          { label: "Universities", value: `${UNIVERSITIES.length}` },
          { label: "Engineering",  value: `${UNIVERSITIES.filter(u => u.category === "Engineering").length}` },
          { label: "Medical",      value: `${UNIVERSITIES.filter(u => u.category === "Medical").length}` },
          { label: "Computing",    value: `${UNIVERSITIES.filter(u => u.category === "Computing").length}` },
          { label: "Business",     value: `${UNIVERSITIES.filter(u => u.category === "Business & Tech").length}` },
          { label: "General",      value: `${UNIVERSITIES.filter(u => u.category === "General").length}` },
        ].map((s) => (
          <StatChip key={s.label} {...s} />
        ))}
      </div>

      {/* ── Search ── */}
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

      {/* ── Category filter ── */}
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

      {/* ── Results count ── */}
      {search && (
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          {filtered.length === 0
            ? "No universities match your search."
            : `${filtered.length} result${filtered.length !== 1 ? "s" : ""} for "${search}"`}
        </p>
      )}

      {/* ── University cards ── */}
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
              {/* Card header */}
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

              {/* Full name */}
              <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed mb-4 line-clamp-2">
                {u.fullName}
              </p>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <StatChip label="Questions" value={String(u.totalQuestions)} />
                <StatChip label="Duration"  value={u.duration} />
                <StatChip label="Min Agg."  value={u.minAggregate} />
              </div>

              {/* Subjects */}
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

              {/* Merit formula */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-2 mb-4">
                <span className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">Merit formula</span>
                <p className="text-slate-700 dark:text-slate-300 text-xs font-medium mt-0.5 leading-snug">
                  {u.meritFormula}
                </p>
              </div>

              {/* Footer */}
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

              {/* Hover CTA */}
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

      {/* ── PrepXMentor CTA ── */}
      <div className="mt-14 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-700 dark:from-teal-700 dark:to-teal-800 p-8 text-center">
        <h2 className="font-display text-xl sm:text-2xl font-bold text-white mb-2">
          Prepare for any of these tests with PrepXMentor
        </h2>
        <p className="text-teal-100 text-sm max-w-lg mx-auto mb-6">
          Bilingual AI explanations and MCQ practice aligned to the new 2025
          syllabus — for ECAT, MDCAT, NET, and FAST entry tests.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-teal-700 font-semibold text-sm hover:bg-teal-50 transition-colors no-underline"
          >
            Start free trial
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-teal-500/30 text-white font-semibold text-sm hover:bg-teal-500/50 transition-colors no-underline border border-teal-400/40"
          >
            See pricing — PKR 799/mo
          </Link>
        </div>
      </div>
    </div>
  );
}