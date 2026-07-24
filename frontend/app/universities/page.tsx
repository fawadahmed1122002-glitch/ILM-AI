import type { Metadata } from "next";
import UniversitiesClient from "./UniversitiesClient";
import { UNIVERSITIES, SITE_URL } from "./data";

// Title shortened to fit within Google's ~60-char SERP display limit --
// the previous version ("University Admissions Guide — ECAT, MDCAT, NET,
// FAST Test Patterns & Merit Formulas | PrepXMentor") ran well past 100
// characters and would have been truncated mid-word in search results.
const TITLE = "University Admissions Guide (Pakistan) | PrepXMentor";
const DESCRIPTION =
  "Merit formulas, test patterns, and admission info for UET, NUST, FAST-NUCES, King Edward Medical University, and 15+ other Pakistani universities.";
const PAGE_URL = `${SITE_URL}/universities`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: PAGE_URL,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function UniversitiesPage() {
  // ItemList JSON-LD linking to every university's detail page -- gives
  // search engines an explicit, indexable map of this directory's contents.
  // Rendered server-side (this file has no "use client"), so it costs
  // nothing on the client and is present in the initial HTML for crawlers.
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Pakistani Universities — Admission Guides",
    itemListElement: UNIVERSITIES.map((u, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/universities/${u.slug}`,
      name: u.name,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />
      <UniversitiesClient />
    </>
  );
}