import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BLOG_POSTS, getPostBySlug, ContentBlock } from "../data";

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Post Not Found | PrepXMentor" };

  return {
    title: `${post.title} | PrepXMentor Blog`,
    description: post.excerpt,
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function Block({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "heading":
      return (
        <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-8 mb-3">
          {block.text}
        </h2>
      );
    case "paragraph":
      return (
        <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed mb-4">
          {block.text}
        </p>
      );
    case "list":
      return (
        <ul className="space-y-2 mb-4 list-disc list-inside text-slate-600 dark:text-slate-300">
          {block.items.map((item, i) => (
            <li key={i} className="leading-relaxed">{item}</li>
          ))}
        </ul>
      );
    case "callout":
      return (
        <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-xl px-4 py-3 mb-4">
          <p className="text-teal-700 dark:text-teal-400 text-sm leading-relaxed">{block.text}</p>
        </div>
      );
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) notFound();

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 sm:py-14 animate-fade-up">

      {/* Breadcrumb */}
      <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 no-underline mb-6 transition-colors">
        &larr; All Posts
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400">
            {post.category}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {formatDate(post.publishedDate)} &middot; {post.readingMinutes} min read
          </span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
          {post.title}
        </h1>
      </div>

      {/* Body */}
      <div>
        {post.content.map((block, i) => (
          <Block key={i} block={block} />
        ))}
      </div>

      {/* CTA */}
      <div className="mt-12 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-700 dark:from-teal-700 dark:to-teal-800 p-6 text-center">
        <h2 className="font-display text-lg font-bold text-white mb-2">
          Put this into practice with PrepXMentor
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