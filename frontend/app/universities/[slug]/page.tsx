import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { UNIVERSITIES, getUniversityBySlug } from "../data";

export function generateStaticParams() {
  return UNIVERSITIES.map((u) => ({ slug: u.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const uni = getUniversityBySlug(slug);
  if (!uni) return { title: "University Not Found | PrepXMentor" };

  return {
    title: `${uni.name} Admission Guide — ${uni.test} Merit Formula & Test Pattern | PrepXMentor`,
    description: `${uni.fullName}: ${uni.test} test pattern, merit formula, subjects covered, and programs offered. ${uni.meritFormula ?? "Merit formula pending verification."}`,
  };
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const config: Record<string, { label: string; className: string }> = {
    high: { label: "Verified", className: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" },
    medium: { label: "Likely accurate", className: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800" },
    low: { label: "Unconfirmed", className: "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800" },
    unverified: { label: "Not verified", className: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700" },
  };
  const c = config[confidence] ?? config.unverified;
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${c.className}`}>
      {c.label}
    </span>
  );
}

export default async function UniversityDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const uni = getUniversityBySlug(slug);

  if (!uni) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14 animate-fade-up">

      {/* Breadcrumb */}
      <Link href="/universities" className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 no-underline mb-6 transition-colors">
        &larr; All Universities
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
            {uni.test}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500">{uni.category} &middot; {uni.city}</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-2">
          {uni.name}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">{uni.fullName}</p>
      </div>

      {/* About */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-5">
        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{uni.about}</p>
      </div>

      {/* Merit formula */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">Merit Formula</h2>
          <ConfidenceBadge confidence={uni.formulaConfidence} />
        </div>
        {uni.meritFormula ? (
          <p className="text-slate-700 dark:text-slate-300 text-base font-medium">{uni.meritFormula}</p>
        ) : (
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            We could not verify an official merit formula for {uni.name} yet. Please check{" "}
            <a href={uni.website} target="_blank" rel="noopener noreferrer" className="text-teal-600 dark:text-teal-400 hover:underline">
              {uni.website.replace("https://", "")}
            </a>{" "}
            directly before relying on any figure you find elsewhere.
          </p>
        )}
        {uni.formulaConfidence === "low" && uni.meritFormula && (
          <p className="text-amber-600 dark:text-amber-400 text-xs mt-2">
            This formula has only one supporting source so far &mdash; confirm against the official prospectus before making decisions based on it.
          </p>
        )}
      </div>

      {/* Test details */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-5">
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Test Pattern</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-3 text-center">
            <p className="text-slate-900 dark:text-slate-100 font-bold text-sm">{uni.totalQuestions}</p>
            <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wide mt-0.5">Questions</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-3 text-center">
            <p className="text-slate-900 dark:text-slate-100 font-bold text-sm">{uni.duration}</p>
            <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wide mt-0.5">Duration</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-3 text-center">
            <p className="text-slate-900 dark:text-slate-100 font-bold text-sm">{uni.testType}</p>
            <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wide mt-0.5">Format</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-3 text-center">
            <p className="text-slate-900 dark:text-slate-100 font-bold text-sm">{uni.negativeMarking ? "Yes" : "No"}</p>
            <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wide mt-0.5">Neg. Marking</p>
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">Subjects Covered</p>
          <div className="flex flex-wrap gap-1.5">
            {uni.subjects.map((s) => (
              <span key={s} className="text-xs px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400">
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Programs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-5">
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">Popular Programs</h2>
        <ul className="space-y-1.5">
          {uni.topPrograms.map((p) => (
            <li key={p} className="text-slate-600 dark:text-slate-300 text-sm flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-teal-500 flex-shrink-0" />
              {p}
            </li>
          ))}
        </ul>
        <p className="text-slate-400 dark:text-slate-500 text-xs mt-3">
          Seats (approximate, may vary by year): {uni.seats}
        </p>
      </div>

      {/* Fees & Dates - honest placeholder */}
      <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 mb-5">
        <h2 className="font-display text-base font-bold text-slate-700 dark:text-slate-300 mb-2">Fees & Admission Dates</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
          Fee structures and admission timelines change year to year and are not yet
          verified in our database. Visit{" "}
          <a href={uni.website} target="_blank" rel="noopener noreferrer" className="text-teal-600 dark:text-teal-400 hover:underline">
            {uni.website.replace("https://", "")}
          </a>{" "}
          for current, official figures.
        </p>
      </div>

      {/* CTA */}
      <div className="rounded-2xl bg-gradient-to-br from-teal-600 to-teal-700 dark:from-teal-700 dark:to-teal-800 p-6 text-center">
        <h2 className="font-display text-lg font-bold text-white mb-2">
          Prepare for {uni.test} with PrepXMentor
        </h2>
        <p className="text-teal-100 text-sm mb-5">
          Bilingual AI explanations and MCQ practice, reviewed for accuracy.
        </p>
        <Link href="/register"
          className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-white text-teal-700 font-semibold text-sm hover:bg-teal-50 transition-colors no-underline">
          Get Started Free
        </Link>
      </div>

    </div>
  );
}
