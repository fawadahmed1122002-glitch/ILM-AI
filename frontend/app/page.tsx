import type { Metadata } from "next";
import LandingClient from "./LandingClient";
import { SITE_URL } from "./universities/data";

// NOTE: assumes this file replaces your existing root app/page.tsx (route "/").
// Adjust the "./universities/data" import path if your actual folder layout
// differs from what's been built out in this conversation so far.

const TITLE = "PrepXMentor — AI Study Partner for ECAT, MDCAT & NET";
const DESCRIPTION =
  "Understand any topic in English or Urdu, drill real past papers, and sit timed mock tests — an AI study partner built for Pakistan's entry tests.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "PrepXMentor",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "PrepXMentor",
  url: SITE_URL,
  description: DESCRIPTION,
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "PrepXMentor",
  url: SITE_URL,
};

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <LandingClient />
    </>
  );
}