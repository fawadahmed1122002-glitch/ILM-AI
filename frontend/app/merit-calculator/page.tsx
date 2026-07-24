import type { Metadata } from "next";
import { Suspense } from "react";
import MeritCalculatorClient from "./MeritCalculatorClient";
import { SITE_URL } from "../universities/data";

// NOTE: assumes this file lives at app/merit-calculator/page.tsx (route
// "/merit-calculator"), inferred from the "../universities/data" import
// path shared with MeritCalculatorClient. If the real route differs,
// update PAGE_URL below to match.
const PAGE_URL = `${SITE_URL}/merit-calculator`;

const TITLE = "Merit Calculator for Pakistani Universities | PrepXMentor";
const DESCRIPTION =
  "Calculate your admission merit score for UET, NUST, FAST, GIKI, PIEAS, MDCAT medical colleges, UVAS and more — using each university's official formula.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: PAGE_URL,
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: PAGE_URL,
    siteName: "PrepXMentor",
    type: "website",
    // TODO: add a real 1200x630 OG image once one is designed, e.g.:
    // images: [{ url: `${SITE_URL}/og/merit-calculator.png`, width: 1200, height: 630 }],
  },
  twitter: {
    // Switch to "summary_large_image" once an OG image is added above.
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
  },
};

const webApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Merit Calculator",
  url: PAGE_URL,
  description: DESCRIPTION,
  applicationCategory: "EducationalApplication",
  operatingSystem: "Any",
  isAccessibleForFree: true,
  provider: {
    "@type": "Organization",
    name: "PrepXMentor",
    url: SITE_URL,
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Merit Calculator", item: PAGE_URL },
  ],
};

export default function MeritCalculatorPage() {
  return (
    <>
      {/* Structured data: rendered server-side, so it's present in the
          initial HTML regardless of client JS -- crawlable immediately. */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webApplicationJsonLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {/* useSearchParams() inside MeritCalculatorClient (for ?university=
          deep-linking) requires a Suspense boundary -- without it, Next
          forces this entire route out of static generation and into
          fully client-side rendering. With it, only this subtree opts
          into dynamic rendering; the JSON-LD and page shell above stay
          static and crawlable. */}
      <Suspense fallback={null}>
        <MeritCalculatorClient />
      </Suspense>
    </>
  );
}