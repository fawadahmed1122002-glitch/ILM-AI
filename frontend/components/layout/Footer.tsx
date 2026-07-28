import Link from "next/link";
import Image from "next/image";
import { CONTACT_EMAIL, CONTACT_WHATSAPP, SOCIAL_LINKS } from "../../app/contact/contact-data";

// PrepXMentor site-wide footer.
// Lives at components/layout/Footer.tsx, imported in your root layout.tsx
// (below the <main> content, inside the <body>).
//
// NOTE: this pulls CONTACT_EMAIL/CONTACT_WHATSAPP/SOCIAL_LINKS from
// app/contact/contact-data.ts rather than hardcoding a second copy of the
// same contact info here -- one source of truth. The "../../" in the import
// above is two levels up (components/layout/ -> components/ -> project root)
// then back down into app/contact/ -- if you ever move this file, that path
// needs to move with it.
//
// /ecat, /mdcat, and /about below are not routes built in this conversation --
// confirm they exist (or plan to) before shipping, same as /privacy and /terms.

const footerLinks = {
  product: [
    { label: "ECAT Prep", href: "/ecat" },
    { label: "MDCAT Prep", href: "/mdcat" },
    { label: "Universities", href: "/universities" },
    { label: "Merit Calculator", href: "/merit-calculator" },
    { label: "Blog", href: "/blog" },
  ],
  company: [
    { label: "About Us", href: "/about" },
    { label: "Contact Us", href: "/contact" },
    { label: "Pricing", href: "/#pricing" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
};

export default function Footer() {
  const year = new Date().getFullYear();
  const whatsappHref = CONTACT_WHATSAPP ? `https://wa.me/${CONTACT_WHATSAPP.replace(/[^0-9]/g, "")}` : null;

  return (
    <footer className="border-t border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {/* Brand column */}
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="flex items-center gap-2 no-underline">
              <Image src="/pxm-logo.png" alt="PrepXMentor" width={28} height={28} className="w-7 h-7" />
              <span className="text-lg font-bold text-teal-700 dark:text-teal-400">
                PrepXMentor
              </span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Bilingual AI study partner for Pakistan's entry tests — topic
              explanations, MCQ practice, past papers, and mock tests in
              English and Urdu.
            </p>
          </div>

          <FooterColumn title="Product" links={footerLinks.product} />
          <FooterColumn title="Company" links={footerLinks.company} />
          <FooterColumn title="Legal" links={footerLinks.legal} />
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 dark:border-slate-800 sm:flex-row">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            © {year} PrepXMentor. All rights reserved.
          </p>

          <div className="flex items-center gap-3">
            {SOCIAL_LINKS.map((s) => (
              <a
                key={s.label}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-500 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400 no-underline"
              >
                {s.label}
              </a>
            ))}

            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-xs text-slate-500 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400 no-underline"
            >
              {CONTACT_EMAIL}
            </a>

            {/* Only renders once CONTACT_WHATSAPP is a real number in
                contact-data.ts -- no placeholder number shown in the meantime. */}
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-teal-700"
              >
                Chat with us on WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
        {title}
      </h3>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-slate-500 transition hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400 no-underline"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}