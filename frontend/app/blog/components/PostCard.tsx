import Link from "next/link";
import type { BlogPost } from "@/lib/blog/schema";
import { categoryLabel, categoryStyle, type CategorySlug } from "@/lib/blog/categories";
import { formatDate } from "@/lib/blog/seo";

export function PostCard({ post }: { post: BlogPost }) {
  const slug = post.category as CategorySlug;
  const style = categoryStyle(slug);

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 no-underline hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-md hover:shadow-teal-100 dark:hover:shadow-teal-900/20 transition-all duration-200"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${style.bg} ${style.text}`}>
          {categoryLabel(slug)}
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
}