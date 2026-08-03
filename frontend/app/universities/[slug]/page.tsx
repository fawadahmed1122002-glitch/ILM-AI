import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import UniversityLogo from "../UniversityLogo";
import {
  UNIVERSITIES,
  getUniversityBySlug,
  formatMeritFormula,
  formatCityLine,
  categoryToSlug,
  getMeritCalculatorUrl,
  SITE_URL,
} from "../data";

export function generateStaticParams() {
  return UNIVERSITIES.map((u) => ({ slug: u.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const uni = getUniversityBySlug(slug);
  if (!uni) return {};

  const formula = formatMeritFormula(uni.meritWeights);
  const pageUrl = `${SITE_URL}/universities/${uni.slug}`;
  const title = `${uni.name} Merit Formula & Admission Criteria | PrepXMentor`;
  const description = formula
    ? `${uni.name}'s official merit formula (${formula}), minimum aggregate ${uni.minAggregate}, and admission details for ${uni.category.toLowerCase()} programs at ${uni.city}.`
    : `${uni.name} admission criteria, test details, and program info for ${uni.category.toLowerCase()} programs at ${uni.city}. Merit formula not yet independently verified.`;

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: "PrepXMentor",
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

const CONFIDENCE_CONFIG: Record<string, { label: string; className: string; note: string }> = {
  high: {
    label: "Verified",
    className: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    note: "Confirmed via an official university source or strong convergence of independent sources.",
  },
  medium: {
    label: "Likely accurate",
    className: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    note: "Found on official-adjacent pages, but not stated as a single clean weighted split.",
  },
  low: {
    label: "Unconfirmed",
    className: "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800",
    note: "Sources conflict or no official formula was located \u2014 verify directly before relying on this.",
  },
  unverified: {
    label: "Not verified",
    className: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700",
    note: "Not independently researched yet.",
  },
};

function FactRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-b-0">
      <span className="text-slate-400 dark:text-slate-500 text-xs">{label}</span>
      <span className="text-slate-700 dark:text-slate-300 text-xs font-medium text-right">{value}</span>
    </div>
  );
}

export default async function UniversityDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const uni = getUniversityBySlug(slug);
  if (!uni) notFound();

  const formula = formatMeritFormula(uni.meritWeights);
  const cityLine = formatCityLine(uni);
  const pageUrl = `${SITE_URL}/universities/${uni.slug}`;
  const confidence = CONFIDENCE_CONFIG[uni.formulaConfidence] ?? CONFIDENCE_CONFIG.unverified;
  const categorySlug = categoryToSlug(uni.category);

  const collegeJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollegeOrUniversity",
    name: uni.fullName,
    alternateName: uni.name,
    url: uni.website,
    description: uni.about,
    address: {
      "@type": "PostalAddress",
      addressLocality: uni.city,
      addressRegion: uni.province,
      addressCountry: "PK",
    },
    ...(uni.establishedYear ? { foundingDate: String(uni.establishedYear) } : {}),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Universities", item: `${SITE_URL}/universities` },
      { "@type": "ListItem", position: 3, name: uni.category, item: `${SITE_URL}/universities/category/${categorySlug}` },
      { "@type": "ListItem", position: 4, name: uni.name, item: pageUrl },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collegeJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div className="max-w-4xl mx-auto px-4 py-10 sm:py-16 animate-fade-up">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-slate-400 dark:text-slate-500">
          <Link href="/universities" className="hover:text-teal-600 dark:hover:text-teal-400 hover:underline no-underline">Universities</Link>
          <span className="mx-1.5">/</span>
          <Link href={`/universities/category/${categorySlug}`} className="hover:text-teal-600 dark:hover:text-teal-400 hover:underline no-underline">{uni.category}</Link>
          <span className="mx-1.5">/</span>
          <span className="text-slate-600 dark:text-slate-300">{uni.name}</span>
        </nav>

        <div className="flex items-start gap-4 mb-6">
          <UniversityLogo uni={uni} size={64} rounded="rounded-2xl" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{uni.name}</h1>
              <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border flex-shrink-0 ${confidence.className}`}>
                {confidence.label}
              </span>
            </div>
            <p className="text-slate-400 dark:text-slate-500 text-sm">{uni.fullName}</p>
          </div>
        </div>

        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-8">{uni.about}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">Merit formula</h2>
            {formula ? (
              <>
                <p className="font-display text-lg font-bold text-teal-700 dark:text-teal-400 mb-1">{formula}</p>
                <p className={`text-[11px] ${uni.formulaConfidence === "low" ? "text-amber-600 dark:text-amber-400" : "text-slate-400 dark:text-slate-500"}`}>
                  {confidence.note}
                </p>
              </>
            ) : (
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                No single official formula found &mdash; {confidence.note.toLowerCase()}
              </p>
            )}
            <Link
              href={getMeritCalculatorUrl(uni.slug)}
              className="inline-flex items-center mt-4 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline no-underline"
            >
              Calculate my merit for {uni.name} &rarr;
            </Link>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">Key facts</h2>
            <FactRow label="Test" value={uni.test} />
            <FactRow label="Test type" value={uni.testType} />
            <FactRow label="Questions" value={uni.totalQuestions !== null ? String(uni.totalQuestions) : null} />
            <FactRow label="Duration" value={uni.duration} />
            <FactRow label="Negative marking" value={uni.negativeMarking === null ? null : uni.negativeMarking ? "Yes" : "No"} />
            <FactRow label="Min. aggregate" value={uni.minAggregate} />
            <FactRow label="Seats" value={uni.seats} />
            <FactRow label="Location" value={cityLine} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-3">Test subjects</h2>
            <div className="flex flex-wrap gap-2">
              {uni.subjects.map((s) => (
                <span key={s} className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{s}</span>
              ))}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-3">
              {uni.allPrograms ? "All programs" : "Top programs"}
            </h2>
            <div className="flex flex-wrap gap-2">
              {(uni.allPrograms ?? uni.topPrograms).map((p) => (
                <span key={p} className="text-xs font-medium px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400">{p}</span>
              ))}
            </div>
            {!uni.allPrograms && (
              <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-3">
                Highlights only &mdash; full program catalog not yet added. Check {uni.website.replace("https://", "")} for the complete list.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 mb-10 text-xs text-slate-400 dark:text-slate-500">
          <span>Last verified {uni.lastVerified}</span>
          <a href={uni.website} target="_blank" rel="noopener noreferrer" className="text-teal-600 dark:text-teal-400 hover:underline no-underline">
            {uni.website.replace("https://", "")} &rarr;
          </a>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-teal-600 to-teal-700 dark:from-teal-700 dark:to-teal-800 p-8 text-center">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-white mb-2">See if your marks are competitive</h2>
          <p className="text-teal-100 text-sm max-w-lg mx-auto mb-6">Enter your marks and get an instant estimated merit score for {uni.name}, using their official weighting.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href={getMeritCalculatorUrl(uni.slug)} className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-teal-700 font-semibold text-sm hover:bg-teal-50 transition-colors no-underline">
              Open Merit Calculator
            </Link>
            <Link href={`/universities/category/${categorySlug}`} className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-teal-500/30 text-white font-semibold text-sm hover:bg-teal-500/50 transition-colors no-underline border border-teal-400/40">
              More {uni.category} universities
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}