import Link from "next/link";

export function Pagination({
  basePath,
  currentPage,
  totalPages,
}: {
  basePath: string; // e.g. "/blog" or "/blog/category/exam-strategy"
  currentPage: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const hrefFor = (page: number) => (page === 1 ? basePath : `${basePath}?page=${page}`);

  return (
    <nav aria-label="Blog pagination" className="mt-10 flex items-center justify-center gap-3">
      {currentPage > 1 ? (
        <Link href={hrefFor(currentPage - 1)} className="text-sm font-medium text-teal-600 dark:text-teal-400 no-underline hover:underline">
          &larr; Previous
        </Link>
      ) : (
        <span className="text-sm font-medium text-slate-300 dark:text-slate-700">&larr; Previous</span>
      )}

      <span className="text-sm text-slate-400 dark:text-slate-500">
        Page {currentPage} of {totalPages}
      </span>

      {currentPage < totalPages ? (
        <Link href={hrefFor(currentPage + 1)} className="text-sm font-medium text-teal-600 dark:text-teal-400 no-underline hover:underline">
          Next &rarr;
        </Link>
      ) : (
        <span className="text-sm font-medium text-slate-300 dark:text-slate-700">Next &rarr;</span>
      )}
    </nav>
  );
}