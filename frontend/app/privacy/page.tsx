// Drop into app/privacy/page.tsx
// Update the effective date and contact details before publishing.

const EFFECTIVE_DATE = "24 July 2026";
const CONTACT_EMAIL = "support@prepxmentor.com";

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 lg:px-8">
      <h1 className="text-3xl font-bold text-neutral-900 dark:text-white sm:text-4xl">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
        Effective date: {EFFECTIVE_DATE}
      </p>

      <div className="prose-content mt-10 space-y-8 text-neutral-700 dark:text-neutral-300">
        <Section title="1. Introduction">
          <p>
            PrepXMentor (&ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;us&rdquo;)
            provides an AI-powered bilingual (English/Urdu) test-preparation
            platform for ECAT and MDCAT students in Pakistan. This Privacy
            Policy explains what information we collect, how we use it, and
            the choices you have. By using PrepXMentor, you agree to the
            practices described here.
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Account information:</strong> name, email address,
              phone number, password (stored hashed, never in plain text).
            </li>
            <li>
              <strong>Study activity:</strong> topics you study, questions
              you ask, MCQ attempts and scores, subject preferences, and
              language preference — used to power your progress dashboard
              and weak-topic alerts.
            </li>
            <li>
              <strong>Payment information:</strong> when you upgrade to Pro,
              payment is processed via JazzCash or EasyPaisa. We do not
              store your full card, wallet PIN, or banking credentials — that
              is handled directly by the payment provider.
            </li>
            <li>
              <strong>Technical data:</strong> device type, browser, and
              basic usage logs, collected to keep the platform secure and
              working correctly.
            </li>
          </ul>
        </Section>

        <Section title="3. How We Use Your Information">
          <ul className="list-disc space-y-2 pl-6">
            <li>To deliver explanations, MCQs, and progress tracking.</li>
            <li>To process your subscription and send payment confirmations.</li>
            <li>
              To identify weak topics and personalize your study experience.
            </li>
            <li>
              To communicate with you — for example, service updates or
              responses to support requests (via WhatsApp or email, based on
              what you provide).
            </li>
            <li>To improve platform quality, including MCQ accuracy.</li>
          </ul>
        </Section>

        <Section title="4. Data Sharing">
          <p>
            We do <strong>not sell</strong> your personal data to advertisers
            or third parties. Your data is shared only with:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              Payment processors (JazzCash / EasyPaisa) — solely to complete
              your subscription payment.
            </li>
            <li>
              Infrastructure providers (e.g. our hosting provider) — solely
              to operate the platform, under standard data-processing terms.
            </li>
            <li>
              Law enforcement or regulators, only if legally required.
            </li>
          </ul>
        </Section>

        <Section title="5. Data Retention">
          <p>
            We retain your account and study data for as long as your
            account is active, so your progress history stays intact. If you
            delete your account, we remove your personal data within a
            reasonable period, except where we&rsquo;re required to retain
            records (e.g. payment records) for legal or accounting purposes.
          </p>
        </Section>

        <Section title="6. Your Rights">
          <ul className="list-disc space-y-2 pl-6">
            <li>Request a copy of the data we hold about you.</li>
            <li>Request correction of inaccurate information.</li>
            <li>Request deletion of your account and associated data.</li>
            <li>Opt out of non-essential communications at any time.</li>
          </ul>
          <p>
            To exercise any of these rights, contact us at{" "}
            <a
              className="text-emerald-600 dark:text-emerald-400"
              href={`mailto:${CONTACT_EMAIL}`}
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>

        <Section title="7. Students Under 18">
          <p>
            Many of our users are intermediate (FSc) students, some of whom
            are under 18. We collect only the information necessary to
            provide the tutoring service and do not knowingly use minors'
            data for any purpose beyond delivering and improving that
            service. Parents or guardians may contact us to review or delete
            a minor&rsquo;s account data.
          </p>
        </Section>

        <Section title="8. Security">
          <p>
            We use industry-standard measures to protect your data, including
            password hashing, encrypted connections (HTTPS), and rate
            limiting to prevent abuse. No system is 100% secure, but we work
            to keep your information safe and will notify affected users in
            the event of a significant data breach.
          </p>
        </Section>

        <Section title="9. Changes to This Policy">
          <p>
            We may update this Privacy Policy as PrepXMentor grows. We&rsquo;ll
            update the effective date above when changes are made, and for
            significant changes, we&rsquo;ll notify active users directly.
          </p>
        </Section>

        <Section title="10. Contact Us">
          <p>
            Questions about this policy? Reach us at{" "}
            <a
              className="text-emerald-600 dark:text-emerald-400"
              href={`mailto:${CONTACT_EMAIL}`}
            >
              {CONTACT_EMAIL}
            </a>{" "}
            or via the{" "}
            <a
              className="text-emerald-600 dark:text-emerald-400"
              href="/contact"
            >
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