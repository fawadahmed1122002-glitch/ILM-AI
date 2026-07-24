import Link from "next/link";
import { CATEGORY_SLUGS, categoryLabel, categoryStyle, type CategorySlug } from "@/lib/blog/categories";

export function CategoryNav({ active }: { active?: CategorySlug }) {
  return (
    <div className="flex flex-wrap justify-center gap-2 mb-10">
      <Link
        href="/blog"
        className={`text-xs font-semibold px-3 py-1.5 rounded-full no-underline transition-colors ${
          !active
            ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
        }`}
      >
        All Posts
      </Link>
      {CATEGORY_SLUGS.map((slug) => {
        const style = categoryStyle(slug);
        const isActive = active === slug;
        return (
          <Link
            key={slug}
            href={`/blog/category/${slug}`}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full no-underline transition-colors ${
              isActive ? `${style.bg} ${style.text} ring-1 ring-inset ring-current` : `${style.bg} ${style.text} opacity-70 hover:opacity-100`
            }`}
          >
            {categoryLabel(slug)}
          </Link>
        );
      })}
    </div>
  );
}