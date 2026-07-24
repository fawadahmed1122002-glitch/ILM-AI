import { z } from "zod";
import { CATEGORY_SLUGS } from "./categories";

const contentBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("paragraph"), text: z.string().min(1) }),
  z.object({ type: z.literal("heading"), text: z.string().min(1) }),
  z.object({ type: z.literal("list"), items: z.array(z.string().min(1)).min(1) }),
  z.object({ type: z.literal("callout"), text: z.string().min(1) }),
  z.object({
    type: z.literal("table"),
    headers: z.array(z.string()).min(1),
    rows: z.array(z.array(z.string())).min(1),
  }),
  z.object({
    type: z.literal("faq"),
    items: z.array(z.object({ question: z.string().min(1), answer: z.string().min(1) })).min(1),
  }),
]);

export const blogPostSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be lowercase kebab-case"),
  title: z.string().min(1).max(160),
  excerpt: z.string().min(1).max(300),
  // must match one of the slugs defined in lib/blog/categories.ts
  category: z.enum(CATEGORY_SLUGS as [string, ...string[]]),
  publishedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "publishedDate must be YYYY-MM-DD"),
  readingMinutes: z.number().int().positive().max(60),
  content: z.array(contentBlockSchema).min(1),
});

export type ContentBlock = z.infer<typeof contentBlockSchema>;
export type BlogPost = z.infer<typeof blogPostSchema>;