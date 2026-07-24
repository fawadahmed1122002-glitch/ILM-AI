import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  UNIVERSITIES,
  getUniversityBySlug,
  formatMeritFormula,
  formatCityLine,
  categoryToSlug,
  getMeritCalculatorUrl,
  SITE_URL,
  type FormulaConfidence,
  type University,
} from "../data";
import UniversityLogo from "../UniversityLogo";

export function generateStaticParams() {
  return UNIVERSITIES.map((u) => ({ slug: u.slug }));
}

// generateStaticParams already enumerates every valid slug -- this makes
// Next 404 immediately at the routing layer for anything outside that list,
// rather than rendering generateMetadata/the page component and relying on
// notFound() inside. Also guarantees this route is fully static.
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const uni = getUniversityBySlug(slug);
  if (!uni) return { title: "University Not Found | PrepXMentor", robots: { index: false } };

  const noEntryTest = uni.totalQuestions === 0;
  const titleTestPart = noEntryTest ? "Merit & Eligibility" : `${uni.test} Merit Formula`;
  // Kept short and name-first so it doesn't get truncated in SERPs -- the
  // previous template ("${uni.name} Admission Guide — ${titleTestPart} |
  // PrepXMentor") ran past 100 characters for longer names like
  // "FAST-NUCES (Engineering)".
  const title = `${uni.name}: ${titleTestPart} | PrepXMentor`;
  const formula = formatMeritFormula(uni.meritWeights);
  const description = `${uni.fullName} admission guide: ${
    noEntryTest ? "eligibility criteria, " : `${uni.test} pattern, `
  }merit formula & top programs. ${formula ?? "Merit formula pending verification."}`.slice(0, 155);
  const url = `${SITE_URL}/universities/${uni.slug}`;

  const imageUrl = uni.image ? `${SITE_URL}${uni.image}` : undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      ...(imageUrl ? { images: [{ url: imageUrl }] } : {}),
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  };
}

function ConfidenceBadge({ confidence }: { confidence: FormulaConfidence }) {
  const config: Record<FormulaConfidence, { label: string; className: string }> = {
    high: { label: "Verified", className: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" },
    medium: { label: "Likely accurate", className: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800" },
    low: { label: "Unconfirmed", className: "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800" },
    unverified: { label: "Not verified", className: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700" },
  };
  const c = config[confidence];
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${c.className}`}>
      {c.label}
    </span>
  );
}

// Formats a possibly-null value for a stat cell. `0` (verified no-test count)
// is left alone; `null` (format simply not yet verified) becomes an honest
// placeholder rather than the literal text "null".
function statValue(value: string | number | boolean | null): string {
  if (value === null) return "Not published";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function UniversityJsonLd({ uni }: { uni: University }) {
  const url = `${SITE_URL}/universities/${uni.slug}`;
  const programs = uni.allPrograms ?? uni.topPrograms;
  const collegeLd = {
    "@context": "https://schema.org",
    "@type": "CollegeOrUniversity",
    name: uni.fullName,
    alternateName: uni.name,
    url: uni.website,
    ...(uni.image ? { image: `${SITE_URL}${uni.image}` } : {}),
    ...(uni.establishedYear ? { foundingDate: String(uni.establishedYear) } : {}),
    address: {
      "@type": "PostalAddress",
      addressLocality: uni.city,
      addressRegion: uni.province,
      addressCountry: "PK",
    },
    hasCourse: programs.map((p) => ({
      "@type": "Course",
      name: p,
      provider: { "@type": "CollegeOrUniversity", name: uni.fullName },
    })),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Universities", item: `${SITE_URL}/universities` },
      { "@type": "ListItem", position: 2, name: uni.category, item: `${SITE_URL}/universities/category/${categoryToSlug(uni.category)}` },
      { "@type": "ListItem", position: 3, name: uni.name, item: url },
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collegeLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
    </>
  );
}

export default async function UniversityDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const uni = getUniversityBySlug(slug);

  if (!uni) notFound();

  // Only UVAS currently has totalQuestions === 0, meaning we've confirmed
  // there genuinely is no entry test. Everything else either has a known
  // question count, or has totalQuestions: null meaning the format simply
  // hasn't been verified yet -- NOT the same thing as "no test exists".
  const noEntryTest = uni.totalQuestions === 0;
  const formatUnverified = uni.totalQuestions === null;
  const meritFormula = formatMeritFormula(uni.meritWeights);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14 animate-fade-up">
      <UniversityJsonLd uni={uni} />

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mb-6">
        <Link href="/universities" className="hover:text-teal-600 dark:hover:text-teal-400 no-underline transition-colors">
          Universities
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          href={`/universities/category/${categoryToSlug(uni.category)}`}
          className="hover:text-teal-600 dark:hover:text-teal-400 no-underline transition-colors"
        >
          {uni.category}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-slate-400 dark:text-slate-500">{uni.name}</span>
      </div>

      {/* Header */}
      <div className="mb-8 flex items-start gap-4">
        <UniversityLogo uni={uni} size={64} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
              {uni.test}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">{uni.category} &middot; {formatCityLine(uni)}</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-2">
            {uni.name}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{uni.fullName}</p>
        </div>
      </div>

      {/* About */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-5">
        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{uni.about}</p>
      </div>

      {/* Admission Criteria: merit formula + minimum aggregate + subjects +
          a direct link into the merit calculator, which reads this same
          university record via its slug. */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">Admission Criteria</h2>
          <ConfidenceBadge confidence={uni.formulaConfidence} />
        </div>

        <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">Merit Formula</p>
        {meritFormula ? (
          <p className="text-slate-700 dark:text-slate-300 text-base font-medium mb-4">{meritFormula}</p>
        ) : (
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
            We could not verify an official merit formula for {uni.name} yet
            {uni.formulaConfidence === "low" ? " — sources found conflicting or incomplete figures" : ""}.
            Please check{" "}
            <a href={uni.website} target="_blank" rel="noopener noreferrer" className="text-teal-600 dark:text-teal-400 hover:underline">
              {uni.website.replace("https://", "")}
            </a>{" "}
            directly before relying on any figure you find elsewhere.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-3">
            <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wide mb-0.5">Minimum Aggregate</p>
            <p className="text-slate-900 dark:text-slate-100 font-bold text-sm">{uni.minAggregate}</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-3">
            <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wide mb-0.5">Negative Marking</p>
            <p className="text-slate-900 dark:text-slate-100 font-bold text-sm">{statValue(uni.negativeMarking)}</p>
          </div>
        </div>

        <div className="mb-5">
          <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">Subjects Covered</p>
          <div className="flex flex-wrap gap-1.5">
            {uni.subjects.map((s) => (
              <span key={s} className="text-xs px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400">
                {s}
              </span>
            ))}
          </div>
        </div>

        <Link
          href={getMeritCalculatorUrl(uni.slug)}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-teal-600 dark:bg-teal-500 text-white font-semibold text-sm hover:bg-teal-700 dark:hover:bg-teal-600 transition-colors no-underline"
        >
          Calculate your {uni.name} merit →
        </Link>

        <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-3">
          Last verified: {uni.lastVerified}
        </p>
      </div>

      {/* Test Pattern: exam mechanics only (subjects moved to Admission Criteria above) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-5">
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Test Pattern</h2>

        {noEntryTest ? (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3">
            <p className="text-emerald-700 dark:text-emerald-400 text-sm font-medium">
              No entry test required for merit calculation.
            </p>
            <p className="text-emerald-600/80 dark:text-emerald-400/70 text-xs mt-1">
              {uni.testType}
            </p>
          </div>
        ) : (
          <>
            {formatUnverified && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 mb-4">
                <p className="text-amber-700 dark:text-amber-400 text-xs font-medium">
                  Exact test format (question count / duration) not yet independently verified — {uni.name} does require an entry test, but we couldn't confirm the specifics from official sources yet.
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-3 text-center">
                <p className="text-slate-900 dark:text-slate-100 font-bold text-sm">{statValue(uni.totalQuestions)}</p>
                <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wide mt-0.5">Questions</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-3 text-center">
                <p className="text-slate-900 dark:text-slate-100 font-bold text-sm">{statValue(uni.duration)}</p>
                <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wide mt-0.5">Duration</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-3 text-center">
                <p className="text-slate-900 dark:text-slate-100 font-bold text-sm">{statValue(uni.testType)}</p>
                <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wide mt-0.5">Format</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-3 text-center">
                <p className="text-slate-900 dark:text-slate-100 font-bold text-sm">{statValue(uni.negativeMarking)}</p>
                <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wide mt-0.5">Neg. Marking</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Programs Offered: full catalog once verified (allPrograms), falling
          back to the curated topPrograms subset with an honest note rather
          than presenting a partial list as complete. Plain text for now --
          per-program blog links go here once those posts exist; each name
          just needs to become a <Link> at that point, no structural change. */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-5">
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">
          {uni.allPrograms ? "Programs Offered" : "Popular Programs"}
        </h2>
        <ul className="space-y-1.5">
          {(uni.allPrograms ?? uni.topPrograms).map((p) => (
            <li key={p} className="text-slate-600 dark:text-slate-300 text-sm flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-teal-500 flex-shrink-0" />
              {p}
            </li>
          ))}
        </ul>
        {!uni.allPrograms && (
          <p className="text-slate-400 dark:text-slate-500 text-xs mt-3">
            Full program list not yet added — showing top programs.{" "}
            <a href={uni.website} target="_blank" rel="noopener noreferrer" className="text-teal-600 dark:text-teal-400 hover:underline">
              See the official site
            </a>{" "}
            for the complete list.
          </p>
        )}
        <p className="text-slate-400 dark:text-slate-500 text-xs mt-3">
          Seats (approximate, may vary by year): {uni.seats}
        </p>
      </div>

      {/* Fees & Dates - honest placeholder */}
      <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 mb-5">
        <h2 className="font-display text-base font-bold text-slate-700 dark:text-slate-300 mb-2">Fees & Important Dates</h2>
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
          {noEntryTest ? `Strengthen Your FSc Marks for ${uni.name}` : `Prepare for ${uni.test} with PrepXMentor`}
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