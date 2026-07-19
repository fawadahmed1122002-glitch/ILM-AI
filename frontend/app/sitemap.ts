import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://prepxmentor.up.railway.app";

  // University slugs — must match your data
  const universitySlugs = [
    "uet",
    "nust",
    "fast",
    "mdcat",
    "king-edward",
    "allama-iqbal",
    "fatima-jinnah",
    "uvas",
  ];

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/universities`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.6,
    },
  ];

  // University pages
  const universityPages: MetadataRoute.Sitemap = universitySlugs.map(
    (slug) => ({
      url: `${baseUrl}/universities/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })
  );

  return [...staticPages, ...universityPages];
}