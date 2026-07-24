import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CATEGORIES,
  categoryToSlug,
  slugToCategory,
  getUniversitiesByCategory,
  SITE_URL,
  type Category,
} from "../../data";
import UniversityCard from "../../UniversityCard";

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: categoryToSlug(c) }));
}

export const dynamicParams = false;

// One unique, substantive intro paragraph per category -- not just filtered
// cards. This is what keeps these pages from reading as thin/near-duplicate
// slices of the main listing page, and gives each page its own genuine H1 +
// body copy for ranking on category-level queries like "engineering
// universities in Pakistan merit formula".
const CATEGORY_INTROS: Record<Category, string> = {
  Engineering:
    "Pakistan's engineering universities each run their own entry test and merit formula — UET's ECAT, NUST's NET, GIKI's and PIEAS's own admission tests among them — and the weighting given to Matric, FSc, and the test itself varies significantly from one to the next. Some, like NED, exclude Matric from merit entirely; others, like GIKI, weight the test at 85%. Compare the verified formulas below before deciding where to focus your prep time.",
  Computing:
    "Pakistan's dedicated computing universities — FAST-NUCES and ITU chief among them — run their own entry tests separate from the engineering-wide ECAT. Merit formulas here tend to weight FSc and the entry test more evenly than engineering-focused institutions. Compare test patterns, subjects covered, and verified merit formulas below.",
  Medical:
    "Every public and UHS-affiliated medical college in Punjab uses the same MDCAT-based merit formula — Matric 10% + FSc 40% + MDCAT 50% — but closing merit differs sharply by college and campus. King Edward Medical University consistently closes highest, followed by Allama Iqbal, Fatima Jinnah, and LMDC. Compare seat counts, minimum aggregates, and closing-merit context below.",
  Veterinary:
    "Pakistan's veterinary sciences admissions work differently from engineering or medical entry: UVAS, the country's leading veterinary university, bases merit purely on Matric and FSc academic marks — no entry test score factors into the ranking at all. See the verified formula and eligibility details below.",
};

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category: categorySlug } = await params;
  const category = slugToCategory(categorySlug);
  if (!category) return { title: "Category Not Found | PrepXMentor", robots: { index: false } };

  const title = `${category} Universities in Pakistan — Merit Formulas | PrepXMentor`;
  const description = `Compare merit formulas, entry tests, and top programs across ${category.toLowerCase()} universities in Pakistan.`.slice(0, 155);
  const url = `${SITE_URL}/universities/category/${categorySlug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: categorySlug } = await params;
  const category = slugToCategory(categorySlug);
  if (!category) notFound();

  const universities = getUniversitiesByCategory(category);
  const pageUrl = `${SITE_URL}/universities/category/${categorySlug}`;

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${category} Universities in Pakistan`,
    itemListElement: universities.map((u, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/universities/${u.slug}`,
      name: u.name,
    })),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Universities", item: `${SITE_URL}/universities` },
      { "@type": "ListItem", position: 2, name: category, item: pageUrl },
    ],
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 sm:py-16 animate-fade-up">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mb-6">
        <Link href="/universities" className="hover:text-teal-600 dark:hover:text-teal-400 no-underline transition-colors">
          Universities
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-slate-400 dark:text-slate-500">{category}</span>
      </div>

      <div className="mb-8">
        <span className="inline-block text-xs font-semibold uppercase tracking-widest text-teal-600 dark:text-teal-400 mb-3">
          Pakistan Entry Tests
        </span>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-4">
          {category} Universities in Pakistan
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-base max-w-3xl leading-relaxed">
          {CATEGORY_INTROS[category]}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        <Link
          href="/universities"
          className="text-sm px-4 py-2 rounded-full font-medium border bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-700 no-underline"
        >
          All Universities
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c}
            href={`/universities/category/${categoryToSlug(c)}`}
            className={`text-sm px-4 py-2 rounded-full font-medium border no-underline transition-all
              ${c === category
                ? "bg-teal-600 dark:bg-teal-500 text-white border-teal-600 dark:border-teal-500"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-700"
              }`}
          >
            {c}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
        {universities.map((u) => (
          <UniversityCard key={u.slug} uni={u} />
        ))}
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-teal-600 to-teal-700 dark:from-teal-700 dark:to-teal-800 p-8 text-center">
        <h2 className="font-display text-xl sm:text-2xl font-bold text-white mb-2">
          Prepare for {category.toLowerCase()} entry tests with PrepXMentor
        </h2>
        <p className="text-teal-100 text-sm max-w-lg mx-auto mb-6">
          Bilingual AI explanations and MCQ practice aligned to the new 2025 syllabus.
        </p>
        <Link
          href="/register"
          className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-teal-700 font-semibold text-sm hover:bg-teal-50 transition-colors no-underline"
        >
          Start free trial
        </Link>
      </div>
    </div>
  );
}