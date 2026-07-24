import { MetadataRoute } from "next";
import { UNIVERSITIES } from "./universities/data";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://prepxmentor.up.railway.app";

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

  // University pages — sourced directly from data.ts, so this list can
  // never drift out of sync with what actually exists as a page again.
  const universityPages: MetadataRoute.Sitemap = UNIVERSITIES.map((u) => ({
    url: `${baseUrl}/universities/${u.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...universityPages];
}