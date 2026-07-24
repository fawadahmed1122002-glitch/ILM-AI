import Link from "next/link";

// PrepXMentor site-wide footer.
// Drop this into components/Footer.tsx and import it in your root layout.tsx
// (below the <main> content, inside the <body>).

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

  return (
    <footer className="border-t border-neutral-200 bg-neutral-50 text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {/* Brand column */}
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2">
              {/* Swap for your actual PXM wordmark / owl mascot asset */}
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                PrepXMentor
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
              Bilingual AI tutor for ECAT &amp; MDCAT — explanations and MCQs
              in English and Urdu, aligned to the new syllabus.
            </p>
          </div>

          <FooterColumn title="Product" links={footerLinks.product} />
          <FooterColumn title="Company" links={footerLinks.company} />
          <FooterColumn title="Legal" links={footerLinks.legal} />
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-neutral-200 pt-6 dark:border-neutral-800 sm:flex-row">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            © {year} PrepXMentor. All rights reserved.
          </p>

          <a
            href="https://wa.me/923000000000"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-emerald-700"
          >
            Chat with us on WhatsApp
          </a>
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
      <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
        {title}
      </h3>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-neutral-500 transition hover:text-emerald-600 dark:text-neutral-400 dark:hover:text-emerald-400"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}