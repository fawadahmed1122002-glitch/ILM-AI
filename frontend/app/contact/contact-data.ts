import { SITE_URL } from "../universities/data";

// ============================================================================
// CONTACT CONFIG -- every value below is a placeholder. Replace before launch;
// none of this was verified/researched, same rule this codebase applies to
// admission data: don't ship a guessed fact as if it were real.
// ============================================================================

// TODO: replace with your real support inbox if this isn't it.
export const CONTACT_EMAIL = "support@prepxmentor.com";

// TODO: set to your real WhatsApp business number, e.g. "923001234567"
// (country code + number, no + or spaces). Left null (not a guessed
// placeholder string) so the UI can honestly hide/disable WhatsApp-dependent
// features until it's real, the same pattern used for `image` in
// universities/data.ts. NOTE: the contact form's WhatsApp-submission flow
// depends on this being real -- until it is, the form falls back to mailto.
export const CONTACT_WHATSAPP: string | null = null;

// TODO: add real profiles; leave empty to hide the socials row entirely.
export const SOCIAL_LINKS: { label: string; url: string }[] = [
  // { label: "Instagram", url: "https://instagram.com/prepxmentor" },
];

export const CONTACT_TOPICS = [
  "General question",
  "Billing / payment issue",
  "Report a wrong MCQ or answer",
  "Academy partnership",
  "Technical problem",
] as const;
export type ContactTopic = (typeof CONTACT_TOPICS)[number];

const PAGE_URL = `${SITE_URL}/contact`;

export const contactPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  url: PAGE_URL,
  name: "Contact PrepXMentor",
  mainEntity: {
    "@type": "Organization",
    name: "PrepXMentor",
    url: SITE_URL,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: CONTACT_EMAIL,
      ...(CONTACT_WHATSAPP ? { telephone: `+${CONTACT_WHATSAPP}` } : {}),
      areaServed: "PK",
      availableLanguage: ["English", "Urdu"],
    },
  },
};

export const contactBreadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Contact", item: PAGE_URL },
  ],
};