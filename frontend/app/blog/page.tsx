import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts, paginate } from "@/lib/blog/repository";
import { SITE_URL, SITE_NAME } from "@/lib/blog/seo";
import { CategoryNav } from "./components/CategoryNav";
import { PostCard } from "./components/PostCard";
import { Pagination } from "./components/Pagination";

const TITLE = "Blog — Exam Strategy & University Guides | PrepXMentor";
const DESCRIPTION =
  "Exam strategy, syllabus breakdowns, and university admission guides for ECAT, MDCAT, NET, and the FAST Entry Test.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/blog` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}/blog`, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const { items, currentPage, totalPages } = paginate(getAllPosts(), Number(page) || 1);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-16 animate-fade-up">

      <div className="mb-8 text-center">
        <span className="inline-block text-xs font-semibold uppercase tracking-widest text-teal-600 dark:text-teal-400 mb-3">
          PrepXMentor Blog
        </span>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-3">
          Exam Strategy & University Guides
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-base max-w-xl mx-auto leading-relaxed">
          Practical, no-fluff guidance for ECAT, MDCAT, NET, and FAST Entry Test prep.
        </p>
      </div>

      <CategoryNav />

      <div className="space-y-5">
        {items.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>

      <Pagination basePath="/blog" currentPage={currentPage} totalPages={totalPages} />

      <div className="mt-14 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-700 dark:from-teal-700 dark:to-teal-800 p-8 text-center">
        <h2 className="font-display text-xl sm:text-2xl font-bold text-white mb-2">
          Study smarter, not just longer
        </h2>
        <p className="text-teal-100 text-sm max-w-lg mx-auto mb-6">
          Bilingual AI explanations and human-reviewed MCQ practice, built around
          exactly the tests covered on this blog.
        </p>
        <Link
          href="/register"
          className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-teal-700 font-semibold text-sm hover:bg-teal-50 transition-colors no-underline"
        >
          Get Started Free
        </Link>
      </div>
    </div>
  );
}