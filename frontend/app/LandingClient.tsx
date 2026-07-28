"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";

// ============================================================================
// Respects the "reduced motion" requirement from the design quality floor:
// anyone with prefers-reduced-motion sees the final, settled state of every
// animated sequence immediately, no auto-cycling.
// ============================================================================
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = () => setReduced(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

// ============================================================================
// HERO DEMO CONTENT -- real, curriculum-accurate examples (not placeholder
// text) across the three boards/tests this product actually targets.
// ============================================================================
interface DemoExample {
  subject: string;
  question: string;
  explanation: string;
  mcqPrompt: string;
  options: string[];
  correctIndex: number;
}

const DEMO_EXAMPLES: DemoExample[] = [
  {
    subject: "Chemistry — Punjab Board",
    question: "Why does water have a higher boiling point than H₂S?",
    explanation:
      "Water molecules form hydrogen bonds with each other — much stronger than the weak forces holding H₂S together. Breaking those bonds takes more energy, so water boils at a higher temperature.",
    mcqPrompt: "Which force explains this?",
    options: ["Hydrogen bonding", "Van der Waals forces", "Ionic bonding", "Metallic bonding"],
    correctIndex: 0,
  },
  {
    subject: "Biology — MDCAT",
    question: "What's the key difference between mitosis and meiosis?",
    explanation:
      "Mitosis produces two identical cells for growth and repair. Meiosis produces four genetically distinct cells for reproduction, halving the chromosome number along the way.",
    mcqPrompt: "How many daughter cells does meiosis produce?",
    options: ["1", "2", "4", "8"],
    correctIndex: 2,
  },
  {
    subject: "Physics — ECAT",
    question: "Why does a spinning skater speed up when pulling their arms in?",
    explanation:
      "Angular momentum is conserved. Pulling the arms in reduces the skater's moment of inertia, so rotational speed increases to keep angular momentum constant.",
    mcqPrompt: "Which quantity stays constant here?",
    options: ["Angular momentum", "Linear momentum", "Kinetic energy", "Torque"],
    correctIndex: 0,
  },
];

const TRUST_TESTS = ["ECAT", "MDCAT", "NET", "NAT", "GAT"];
const TRUST_UNIS = ["NUST", "UET", "GIKI", "PIEAS", "FAST-NUCES"];

type DemoStage = "question" | "explanation" | "mcq" | "answered";

function HeroDemo() {
  const reducedMotion = usePrefersReducedMotion();
  const [exampleIndex, setExampleIndex] = useState(0);
  const [stage, setStage] = useState<DemoStage>(reducedMotion ? "answered" : "question");
  const [pickedOption, setPickedOption] = useState<number | null>(reducedMotion ? 0 : null);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const example = DEMO_EXAMPLES[exampleIndex];

  useEffect(() => {
    if (reducedMotion) return; // static final state, no scripted playback

    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
    setStage("question");
    setPickedOption(null);

    timeouts.current.push(setTimeout(() => setStage("explanation"), 1100));
    timeouts.current.push(setTimeout(() => setStage("mcq"), 3600));
    timeouts.current.push(
      setTimeout(() => {
        setPickedOption(example.correctIndex);
        setStage("answered");
      }, 5600)
    );
    timeouts.current.push(
      setTimeout(() => {
        setExampleIndex((i) => (i + 1) % DEMO_EXAMPLES.length);
      }, 8200)
    );

    return () => timeouts.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exampleIndex, reducedMotion]);

  return (
    <div className="relative bg-slate-900/60 border border-white/10 rounded-2xl p-5 sm:p-6 backdrop-blur-sm shadow-2xl shadow-black/40">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-mono uppercase tracking-widest text-teal-400/80">{example.subject}</span>
        <span className="flex gap-1" aria-hidden="true">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400/70" />
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400/70" />
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/70" />
        </span>
      </div>

      <p className="text-slate-100 text-sm font-medium mb-3 leading-snug">{example.question}</p>

      <div
        className={`transition-all duration-500 ${
          stage === "question" ? "opacity-0 max-h-0" : "opacity-100 max-h-40"
        } overflow-hidden`}
      >
        <p className="text-slate-400 text-xs leading-relaxed border-l-2 border-teal-500/40 pl-3 mb-4">
          {example.explanation}
        </p>
      </div>

      <div
        className={`transition-all duration-500 ${
          stage === "mcq" || stage === "answered" ? "opacity-100 max-h-96" : "opacity-0 max-h-0"
        } overflow-hidden`}
      >
        <p className="text-[10px] font-mono uppercase tracking-wide text-slate-500 mb-2">{example.mcqPrompt}</p>
        <div className="grid grid-cols-1 gap-1.5">
          {example.options.map((opt, i) => {
            const isCorrect = i === example.correctIndex;
            const isPicked = stage === "answered" && pickedOption === i;
            return (
              <div
                key={opt}
                className={`text-xs px-3 py-2 rounded-lg border font-mono transition-colors duration-300 ${
                  isPicked && isCorrect
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                    : "bg-white/5 border-white/10 text-slate-300"
                }`}
              >
                {opt}
                {isPicked && isCorrect && <span className="float-right" aria-hidden="true">✓</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative bg-slate-950 overflow-hidden">
      {/* Ambient signal-teal glow -- restrained, single light source, not a busy gradient mesh */}
      <div
        aria-hidden="true"
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-teal-500/10 blur-[120px]"
      />
      <div className="relative max-w-6xl mx-auto px-4 pt-16 pb-20 sm:pt-24 sm:pb-28 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-teal-400 bg-teal-500/10 border border-teal-500/20 rounded-full px-3 py-1 mb-6">
            Built for ECAT · MDCAT · NET
          </span>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.4rem] font-bold text-white tracking-tight leading-[1.05] mb-5">
            Understand it once.<br />
            <span className="text-teal-400">Drill it</span> until it sticks.
          </h1>
          <p className="text-slate-400 text-base sm:text-lg leading-relaxed mb-8 max-w-lg">
            An AI study partner that explains your exact textbook topic — in English or Urdu —
            then tests you on it with real past papers and timed mock exams.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-teal-500 text-slate-950 font-semibold text-sm hover:bg-teal-400 transition-colors no-underline"
            >
              Start free — no card needed
            </Link>
            <a
              href="#loop"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-white/15 text-white font-semibold text-sm hover:border-white/30 transition-colors no-underline"
            >
              See how it works
            </a>
          </div>
        </div>

        <HeroDemo />
      </div>
    </section>
  );
}

function TrustStrip() {
  return (
    <div className="bg-slate-950 border-t border-white/5 py-6">
      <div className="max-w-6xl mx-auto px-4">
        <p className="text-center text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-4">
          Aligned to the tests and universities students actually prep for
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {[...TRUST_TESTS, ...TRUST_UNIS].map((name) => (
            <span key={name} className="font-mono text-sm text-slate-500 tracking-wide">
              {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

interface Pillar {
  title: string;
  description: string;
  accent?: boolean;
}

const PILLARS: Pillar[] = [
  {
    title: "Textbook-accurate, page-referenced",
    description:
      "Every explanation is tied to the exact FSc, Matric, or A-Level textbook your board actually assigned — not a generic answer that doesn't match what's on your exam.",
  },
  {
    title: "Bilingual by default",
    description:
      "Ask in English or Urdu, get explained back in whichever makes the concept click. Language stops being the barrier between you and the topic.",
    accent: true,
  },
  {
    title: "Real past papers, timed mock tests",
    description:
      "Practice on actual past paper questions, then sit full-length mock exams under real test-day timing — not just an endless MCQ feed.",
  },
  {
    title: "Adaptive weak-topic drilling",
    description:
      "The system tracks exactly where you're losing marks and quietly rebalances your next session toward it, instead of drilling what you've already mastered.",
  },
];

function Pillars() {
  return (
    <section className="bg-white dark:bg-slate-950 py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-4">
        <div className="max-w-2xl mb-12">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-teal-600 dark:text-teal-400 mb-3">
            Why not just use ChatGPT
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            A general model doesn't know your board's syllabus.
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PILLARS.map((p) => (
            <div
              key={p.title}
              className={`rounded-2xl p-6 border ${
                p.accent
                  ? "bg-slate-950 border-slate-900 text-white"
                  : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              }`}
            >
              <h3 className={`font-display text-base font-bold mb-2 ${p.accent ? "text-teal-400" : "text-slate-900 dark:text-slate-100"}`}>
                {p.title}
              </h3>
              <p className={`text-sm leading-relaxed ${p.accent ? "text-slate-300" : "text-slate-500 dark:text-slate-400"}`}>
                {p.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

type LoopTab = "understand" | "practice" | "mock";

const LOOP_CONTENT: Record<LoopTab, { label: string; heading: string; body: string }> = {
  understand: {
    label: "Understand",
    heading: "Ask like you'd ask a person",
    body:
      "Type or photograph the exact question you're stuck on. Get an explanation grounded in your own textbook, in the language that actually makes it click.",
  },
  practice: {
    label: "Practice",
    heading: "Drill it with real past paper questions",
    body:
      "Not generic MCQs — actual past paper questions from ECAT, MDCAT, and NET, filtered to the topics you're weakest on right now.",
  },
  mock: {
    label: "Mock Test",
    heading: "Sit the real thing before you sit the real thing",
    body:
      "Full-length, timed mock exams that mirror the actual test format — so test day feels like the tenth time, not the first.",
  },
};

function DeepDive() {
  const [tab, setTab] = useState<LoopTab>("understand");
  return (
    <section id="loop" className="bg-slate-50 dark:bg-slate-900/40 py-20 sm:py-28">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-10">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-teal-600 dark:text-teal-400 mb-3">
            The Loop
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            One continuous prep cycle
          </h2>
        </div>

        <div className="flex justify-center gap-2 mb-8" role="tablist" aria-label="Study loop stages">
          {(Object.keys(LOOP_CONTENT) as LoopTab[]).map((key) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`text-sm px-5 py-2.5 rounded-full font-medium border transition-colors ${
                tab === key
                  ? "bg-teal-600 dark:bg-teal-500 text-white border-teal-600 dark:border-teal-500"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
              }`}
            >
              {LOOP_CONTENT[key].label}
            </button>
          ))}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-10 text-center max-w-2xl mx-auto">
          <h3 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">
            {LOOP_CONTENT[tab].heading}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            {LOOP_CONTENT[tab].body}
          </p>
        </div>
      </div>
    </section>
  );
}

const PROCESS_STEPS = [
  { n: 1, title: "Ask", body: "Type or photograph any question you're stuck on." },
  { n: 2, title: "Understand", body: "Get an explanation tied to your exact textbook and board." },
  { n: 3, title: "Practice", body: "Drill real past paper questions on that exact topic." },
  { n: 4, title: "Simulate", body: "Sit a full timed mock test under real exam conditions." },
  { n: 5, title: "Track", body: "See your weak topics shrink, session over session." },
];

function ProcessSteps() {
  return (
    <section className="bg-white dark:bg-slate-950 py-20 sm:py-28">
      <div className="max-w-5xl mx-auto px-4">
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight text-center mb-14">
          Five steps, every session
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-6">
          {PROCESS_STEPS.map((s) => (
            <div key={s.n} className="text-center">
              <div className="w-9 h-9 rounded-full bg-slate-900 dark:bg-teal-500 text-white dark:text-slate-950 font-mono font-bold text-sm flex items-center justify-center mx-auto mb-3">
                {s.n}
              </div>
              <h3 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">{s.title}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs leading-snug">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CostComparison() {
  return (
    <section className="bg-slate-950 py-20 sm:py-28">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <span className="inline-block text-xs font-semibold uppercase tracking-widest text-teal-400 mb-6">
          The Math
        </span>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 mb-8">
          <div>
            <p className="font-mono text-4xl sm:text-5xl font-bold text-slate-500 line-through decoration-rose-500/60">
              Rs. 40,000+
            </p>
            <p className="text-slate-500 text-xs uppercase tracking-wide mt-2">Traditional academy, per season</p>
          </div>
          <span className="text-slate-600 text-2xl" aria-hidden="true">→</span>
          <div>
            <p className="font-mono text-5xl sm:text-6xl font-bold text-teal-400">Rs. 1,500</p>
            <p className="text-slate-400 text-xs uppercase tracking-wide mt-2">PrepXMentor, per month</p>
          </div>
        </div>
        <p className="text-slate-400 text-sm max-w-lg mx-auto leading-relaxed">
          One AI mentor, available at 2am the night before a test — for less than a single
          academy session usually costs.
        </p>
      </div>
    </section>
  );
}

function GrowthVisualized() {
  // Simple, flat SVG sparkline -- deliberately not a stock photo of a dashboard,
  // to keep one consistent visual language with the hero demo above.
  const points = "0,38 20,34 40,36 60,24 80,20 100,10 120,14 140,4";
  return (
    <section className="bg-slate-900 py-20 sm:py-28">
      <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
            Watch your weak topics shrink
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-6 max-w-md">
            Every mock test score, every drilled topic, tracked in one place — so you're
            reacting to real data on test day, not a gut feeling.
          </p>
          <div className="flex flex-col gap-3 max-w-sm">
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-slate-300">14-day streak</span>
              <span className="font-mono text-teal-400 text-sm">🔥 14</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-slate-300">Weakest topic</span>
              <span className="font-mono text-amber-400 text-sm">Thermodynamics</span>
            </div>
          </div>
        </div>
        <div className="bg-slate-950 border border-white/10 rounded-2xl p-6">
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-4">Mock test score trend</p>
          <svg viewBox="0 0 140 44" className="w-full h-32" preserveAspectRatio="none" aria-hidden="true">
            <polyline points={points} fill="none" stroke="#2dd4bf" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="flex justify-between text-[10px] font-mono text-slate-600 mt-2">
            <span>Week 1</span>
            <span>Week 8</span>
          </div>
        </div>
      </div>
    </section>
  );
}

interface PricingTier {
  name: string;
  price: string;
  cadence: string;
  features: string[];
  cta: string;
  featured?: boolean;
}

const PRICING_TIERS: PricingTier[] = [
  {
    name: "Free",
    price: "Rs. 0",
    cadence: "forever",
    features: ["3 topic explanations / day", "5 MCQ sessions / day", "English only"],
    cta: "Try for free",
  },
  {
    name: "Pro",
    price: "Rs. 799",
    cadence: "/ month",
    features: ["Unlimited topic explanations", "Unlimited MCQ practice", "Bilingual (English + Urdu)", "Full progress dashboard", "Weak topic detection"],
    cta: "Get Pro access",
    featured: true,
  },
];

function Pricing() {
  return (
    <section id="pricing" className="bg-white dark:bg-slate-950 py-20 sm:py-28">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-3">
            Simple, transparent pricing
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-base">Invest in your future. No hidden academy fees.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl p-6 border flex flex-col ${
                tier.featured
                  ? "bg-slate-950 border-teal-500/40 shadow-xl shadow-teal-950/20"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              }`}
            >
              {tier.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-mono uppercase tracking-widest bg-teal-500 text-slate-950 px-3 py-1 rounded-full">
                  Most popular
                </span>
              )}
              <p className={`text-xs uppercase tracking-wide mb-2 ${tier.featured ? "text-teal-400" : "text-slate-400 dark:text-slate-500"}`}>
                {tier.name}
              </p>
              <p className={`font-mono text-3xl font-bold mb-1 ${tier.featured ? "text-white" : "text-slate-900 dark:text-slate-100"}`}>
                {tier.price}
                <span className={`text-sm font-normal ml-1 ${tier.featured ? "text-slate-400" : "text-slate-400 dark:text-slate-500"}`}>
                  {tier.cadence}
                </span>
              </p>
              <ul className="space-y-2 my-6 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className={`text-sm flex items-start gap-2 ${tier.featured ? "text-slate-300" : "text-slate-600 dark:text-slate-300"}`}>
                    <span className={tier.featured ? "text-teal-400" : "text-teal-600 dark:text-teal-400"} aria-hidden="true">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className={`inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-semibold text-sm no-underline transition-colors ${
                  tier.featured
                    ? "bg-teal-500 text-slate-950 hover:bg-teal-400"
                    : "border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-teal-300 dark:hover:border-teal-700"
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function LandingClient() {
  return (
    <div className="animate-fade-up">
      <Hero />
      <TrustStrip />
      <Pillars />
      <DeepDive />
      <ProcessSteps />
      <CostComparison />
      <GrowthVisualized />
      <Pricing />
    </div>
  );
}