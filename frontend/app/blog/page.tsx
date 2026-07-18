import type { Metadata } from "next";
import Link from "next/link";
import { BLOG_POSTS } from "./data";

export const metadata: Metadata = {
  title: "Blog — Exam Strategy & University Guides | PrepXMentor",
  description:
    "Exam strategy, syllabus breakdowns, and university admission guides for ECAT, MDCAT, NET, and the FAST Entry Test.",
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  "Exam Strategy": { bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-700 dark:text-blue-400" },
  "University Guides": { bg: "bg-teal-50 dark:bg-teal-900/20", text: "text-teal-700 dark:text-teal-400" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default function BlogPage() {
  const posts = [...BLOG_POSTS].sort(
    (a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-16 animate-fade-up">

      <div className="mb-10 text-center">
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

      <div className="space-y-5">
        {posts.map((post) => {
          const c = CATEGORY_COLORS[post.category] ?? { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-400" };
          return (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 no-underline hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-md hover:shadow-teal-100 dark:hover:shadow-teal-900/20 transition-all duration-200"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.bg} ${c.text}`}>
                  {post.category}
                </span>
                <span className="text-slate-400 dark:text-slate-500 text-xs">
                  {formatDate(post.publishedDate)} &middot; {post.readingMinutes} min read
                </span>
              </div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mb-2 leading-snug">
                {post.title}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-3">
                {post.excerpt}
              </p>
              <span className="text-xs text-teal-600 dark:text-teal-400 font-medium group-hover:underline">
                Read more &rarr;
              </span>
            </Link>
          );
        })}
      </div>

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