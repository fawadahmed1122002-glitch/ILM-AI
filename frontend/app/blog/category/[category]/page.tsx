import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPostsByCategory, paginate } from "@/lib/blog/repository";
import { SITE_URL, SITE_NAME } from "@/lib/blog/seo";
import { CATEGORY_SLUGS, categoryLabel, isCategorySlug } from "@/lib/blog/categories";
import { CategoryNav } from "../../components/CategoryNav";
import { PostCard } from "../../components/PostCard";
import { Pagination } from "../../components/Pagination";

export function generateStaticParams() {
  return CATEGORY_SLUGS.map((category) => ({ category }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  if (!isCategorySlug(category)) return { title: "Category Not Found | PrepXMentor" };

  const label = categoryLabel(category);
  const title = `${label} — PrepXMentor Blog`;
  const description = `${label} articles from the PrepXMentor blog: exam strategy, syllabus breakdowns, and admission guidance.`;
  const url = `${SITE_URL}/blog/category/${category}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: SITE_NAME, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { category } = await params;
  if (!isCategorySlug(category)) notFound();

  const { page } = await searchParams;
  const { items, currentPage, totalPages } = paginate(getPostsByCategory(category), Number(page) || 1);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-16 animate-fade-up">

      <div className="mb-8 text-center">
        <span className="inline-block text-xs font-semibold uppercase tracking-widest text-teal-600 dark:text-teal-400 mb-3">
          PrepXMentor Blog
        </span>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-3">
          {categoryLabel(category)}
        </h1>
      </div>

      <CategoryNav active={category} />

      {items.length === 0 ? (
        <p className="text-center text-slate-500 dark:text-slate-400 text-sm">
          No posts in this category yet — check back soon.
        </p>
      ) : (
        <div className="space-y-5">
          {items.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      )}

      <Pagination basePath={`/blog/category/${category}`} currentPage={currentPage} totalPages={totalPages} />
    </div>
  );
}