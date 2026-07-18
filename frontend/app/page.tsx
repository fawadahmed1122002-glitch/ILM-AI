import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="animate-fade-up">

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-12 sm:pt-20 pb-16 sm:pb-24 text-center">
        <div className="flex justify-center mb-6">
          <Image src="/owl-mascot.png" alt="PrepXMentor Mentor" width={120} height={116} priority />
        </div>
        <div className="inline-block px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-xs font-semibold uppercase tracking-wider mb-5">
          Pakistan's Bilingual AI Exam Mentor
        </div>
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-5 leading-tight">
          Study smarter for ECAT & MDCAT<br className="hidden sm:block" /> in English or Urdu
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg max-w-2xl mx-auto mb-8">
          Bilingual AI explanations, syllabus-grounded MCQs, and progress tracking &mdash;
          every answer reviewed for accuracy before it reaches you. Built for Pakistani
          FSc students, in the language you actually think in.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/register"
            className="w-full sm:w-auto px-8 py-3 bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-sm font-semibold rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-teal-500/20 no-underline text-center">
            Get Started Free
          </Link>
          <Link href="/login"
            className="w-full sm:w-auto px-8 py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors no-underline text-center">
            Login
          </Link>
        </div>
      </section>

      {/* Value props */}
      <section className="max-w-5xl mx-auto px-4 pb-16 sm:pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              Bilingual, by design
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Every explanation in English and Urdu &mdash; not a translation afterthought,
              built into the core product from day one.
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              Human-reviewed accuracy
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Every MCQ is checked by a subject-matter expert before it reaches you &mdash;
              not just AI-generated and shipped.
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              Track your weak topics
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Per-topic accuracy tracking flags exactly what to review next, so you never
              guess what to study.
            </p>
          </div>
        </div>
      </section>

      {/* Test coverage */}
      <section className="max-w-5xl mx-auto px-4 pb-16 sm:pb-24">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 text-center mb-8">
          Tests we cover
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { name: "ECAT", status: "live" },
            { name: "MDCAT", status: "live" },
            { name: "NUST NET", status: "soon" },
            { name: "FAST-NUCES", status: "soon" },
            { name: "GIKI", status: "soon" },
          ].map((t) => (
            <div key={t.name}
              className={`rounded-xl p-4 text-center border ${
                t.status === "live"
                  ? "bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800"
                  : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
              }`}>
              <p className={`font-semibold text-sm ${
                t.status === "live" ? "text-teal-700 dark:text-teal-400" : "text-slate-500 dark:text-slate-400"
              }`}>
                {t.name}
              </p>
              <p className="text-[11px] mt-1 text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                {t.status === "live" ? "Live now" : "Coming soon"}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Resource cards: Universities / Merit Calculator / Blog */}
      <section className="max-w-5xl mx-auto px-4 pb-20 sm:pb-28">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 text-center mb-8">
          Plan your admission, not just your prep
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Link href="/universities"
            className="block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 no-underline hover:border-teal-300 dark:hover:border-teal-700 transition-colors">
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              University Pages
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Admission dates, fees, programs, and test patterns for UET, King Edward,
              Allama Iqbal, Dow, NUST, FAST, and GIKI.
            </p>
          </Link>
          <Link href="/merit-calculator"
            className="block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 no-underline hover:border-teal-300 dark:hover:border-teal-700 transition-colors">
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              Merit Calculator
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Estimate your admission chances using verified, official merit formulas
              &mdash; not guesswork.
            </p>
          </Link>
          <Link href="/blog"
            className="block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 no-underline hover:border-teal-300 dark:hover:border-teal-700 transition-colors">
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              Blog
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Exam guides, syllabus breakdowns, and prep strategy for ECAT, MDCAT, and beyond.
            </p>
          </Link>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="max-w-3xl mx-auto px-4 pb-20 sm:pb-28 text-center">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">
          Start studying in the language you think in
        </h2>
        <Link href="/register"
          className="inline-block px-8 py-3 bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-sm font-semibold rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-teal-500/20 no-underline">
          Get Started Free
        </Link>
      </section>

    </div>
  );
}
