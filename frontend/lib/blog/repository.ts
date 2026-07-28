import fs from "node:fs";
import path from "node:path";
import { blogPostSchema, type BlogPost } from "./schema";
import type { CategorySlug } from "./categories";

const CONTENT_DIR = path.join(process.cwd(), "content", "blog");
export const POSTS_PER_PAGE = 20;

// Module-scope memoization: content/blog is only read from disk once per
// server process in PRODUCTION (build time, or first request in a long-running
// server) — not on every call. In development, we deliberately always re-read:
// content/blog/*.json files aren't imported by any module, so Next's Fast
// Refresh has no way to know a new/edited post file should invalidate this
// cache, which otherwise makes newly added posts invisible until a full dev
// server restart. Deliberately not React's cache() here either — that API's
// availability depends on the exact React/Next version in use, and this is
// static build-time content, not per-request state, so a plain module cache
// is both simpler and more portable.
let cachedPosts: BlogPost[] | null = null;

/**
 * Reads every *.json file in content/blog, validates it against the schema,
 * and returns all posts sorted newest-first.
 *
 * Invalid files are logged and skipped rather than crashing the whole build —
 * at 400-500 bulk-uploaded posts, one bad file shouldn't take the site down.
 */
export function getAllPosts(): BlogPost[] {
  if (cachedPosts && process.env.NODE_ENV === "production") return cachedPosts;

  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".json"));

  const posts: BlogPost[] = [];
  for (const file of files) {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf-8");

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[blog] Skipping "${file}" — invalid JSON syntax:`, (err as Error).message);
      continue;
    }

    const parsed = blogPostSchema.safeParse(json);
    if (!parsed.success) {
      // eslint-disable-next-line no-console
      console.error(`[blog] Skipping invalid post file "${file}":`, parsed.error.flatten());
      continue;
    }
    if (parsed.data.slug !== file.replace(/\.json$/, "")) {
      // eslint-disable-next-line no-console
      console.warn(`[blog] Filename "${file}" doesn't match its slug "${parsed.data.slug}" — using the file's slug field.`);
    }
    posts.push(parsed.data);
  }

  cachedPosts = posts.sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime());
  return cachedPosts;
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return getAllPosts().find((p) => p.slug === slug);
}

export function getPostsByCategory(category: CategorySlug): BlogPost[] {
  return getAllPosts().filter((p) => p.category === category);
}

export function paginate<T>(items: T[], page: number, perPage: number = POSTS_PER_PAGE) {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    currentPage: safePage,
    totalPages,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
  };
}