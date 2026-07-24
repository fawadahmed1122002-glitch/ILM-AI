// Drop into app/terms/page.tsx
// Update the effective date and contact details before publishing.

const EFFECTIVE_DATE = "24 July 2026";
const CONTACT_EMAIL = "support@prepxmentor.com";

export default function TermsOfUsePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 lg:px-8">
      <h1 className="text-3xl font-bold text-neutral-900 dark:text-white sm:text-4xl">
        Terms of Use
      </h1>
      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
        Effective date: {EFFECTIVE_DATE}
      </p>

      <div className="prose-content mt-10 space-y-8 text-neutral-700 dark:text-neutral-300">
        <Section title="1. Acceptance of Terms">
          <p>
            By creating an account or using PrepXMentor, you agree to these
            Terms of Use and our Privacy Policy. If you are under 18, you
            confirm that a parent or guardian is aware of and consents to
            your use of the platform.
          </p>
        </Section>

        <Section title="2. What PrepXMentor Provides">
          <p>
            PrepXMentor is an AI-powered study tool offering bilingual
            (English/Urdu) topic explanations and practice MCQs for ECAT and
            MDCAT preparation, generated using retrieval-augmented AI grounded
            in syllabus content. It is a study aid, not a guarantee of exam
            performance or admission outcomes.
          </p>
        </Section>

        <Section title="3. Accounts">
          <ul className="list-disc space-y-2 pl-6">
            <li>You must provide accurate information when registering.</li>
            <li>
              You are responsible for keeping your password secure and for
              all activity under your account.
            </li>
            <li>
              One account is intended for one individual student — sharing
              login credentials to bypass free-tier limits is not permitted.
            </li>
          </ul>
        </Section>

        <Section title="4. Subscriptions &amp; Payment">
          <ul className="list-disc space-y-2 pl-6">
            <li>
              The Free tier is available at no cost, with daily limits on
              explanations and MCQ sessions.
            </li>
            <li>
              The Pro tier is a recurring monthly subscription, currently
              priced at PKR 799/month, payable via JazzCash or EasyPaisa.
            </li>
            <li>
              Subscriptions renew monthly until cancelled. You can cancel at
              any time; access continues until the end of the paid period.
            </li>
            <li>
              Refunds are considered on a case-by-case basis — contact us
              within 3 days of payment if you believe a charge was made in
              error.
            </li>
            <li>
              Prices may change with advance notice to active subscribers.
            </li>
          </ul>
        </Section>

        <Section title="5. Acceptable Use">
          <p>You agree not to:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              Attempt to scrape, resell, or redistribute PrepXMentor content
              or the MCQ bank without permission.
            </li>
            <li>
              Attempt to bypass free-tier limits through automated tools or
              multiple accounts.
            </li>
            <li>
              Use the platform to submit harmful, abusive, or unlawful
              content.
            </li>
            <li>
              Interfere with the platform&rsquo;s normal operation or attempt
              unauthorized access to other accounts or systems.
            </li>
          </ul>
        </Section>

        <Section title="6. Content Accuracy Disclaimer">
          <p>
            Explanations and MCQs are AI-generated and grounded in the
            textbook/syllabus content we&rsquo;ve ingested, and reviewed by our
            subject-matter reviewer(s) where noted. While we work to keep
            content accurate and syllabus-aligned, we do not guarantee that
            every explanation or question is error-free. If you spot an
            issue, please report it via the{" "}
            <a className="text-emerald-600 dark:text-emerald-400" href="/contact">
              Contact Us
            </a>{" "}
            page — we review flagged content and correct it promptly.
          </p>
        </Section>

        <Section title="7. Intellectual Property">
          <p>
            All platform content — including the MCQ bank, explanations,
            branding, and underlying software — is the property of
            PrepXMentor. You may use it for personal study purposes only, and
            may not copy, redistribute, or use it to build a competing
            product.
          </p>
        </Section>

        <Section title="8. Limitation of Liability">
          <p>
            PrepXMentor is provided &ldquo;as is&rdquo; as a study aid. To the
            maximum extent permitted by law, we are not liable for exam
            results, admission outcomes, or any indirect or consequential
            damages arising from use of the platform. Our total liability for
            any claim is limited to the amount you paid us in the preceding
            month.
          </p>
        </Section>

        <Section title="9. Termination">
          <p>
            We may suspend or terminate accounts that violate these Terms,
            including misuse of free-tier limits or abusive behaviour toward
            staff. You may stop using PrepXMentor and delete your account at
            any time by contacting us.
          </p>
        </Section>

        <Section title="10. Changes to These Terms">
          <p>
            We may update these Terms as the platform evolves. Continued use
            of PrepXMentor after changes take effect means you accept the
            updated Terms. Material changes will be communicated to active
            subscribers.
          </p>
        </Section>

        <Section title="11. Governing Law">
          <p>
            These Terms are governed by the laws of Pakistan. Any disputes
            will be subject to the jurisdiction of the courts of Lahore,
            Punjab.
          </p>
        </Section>

        <Section title="12. Contact Us">
          <p>
            Questions about these Terms? Reach us at{" "}
            <a
              className="text-emerald-600 dark:text-emerald-400"
              href={`mailto:${CONTACT_EMAIL}`}
            >
              {CONTACT_EMAIL}
            </a>{" "}
            or via the{" "}
            <a className="text-emerald-600 dark:text-emerald-400" href="/contact">
              Contact Us
            </a>{" "}
            page.
          </p>
        </Section>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed sm:text-base">
        {children}
      </div>
    </section>
  );
}