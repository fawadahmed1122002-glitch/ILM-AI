"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { PRODUCTS } from "@/lib/products";

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

const TRUST_TESTS = ["ECAT", "MDCAT", "NET"];
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
            then quizzes you on it with AI-generated practice questions grounded in your syllabus.
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
    title: "AI-generated practice, grounded in your syllabus",
    description:
      "Every MCQ is generated from your actual textbook content and reviewed for accuracy — not generic questions that don't match what's on your exam.",
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

type LoopTab = "understand" | "practice" | "track";

const LOOP_CONTENT: Record<LoopTab, { label: string; heading: string; body: string }> = {
  understand: {
    label: "Understand",
    heading: "Ask like you'd ask a person",
    body:
      "Type the exact question you're stuck on. Get an explanation grounded in your own textbook, in the language that actually makes it click.",
  },
  practice: {
    label: "Practice",
    heading: "Test yourself as you go",
    body:
      "After every explanation, drill the concept immediately with AI-generated MCQs tied to that exact topic — not a generic question bank.",
  },
  track: {
    label: "Track",
    heading: "Watch your weak topics shrink",
    body:
      "Every question you answer is logged. The system flags exactly which topics need more work, so your next session focuses where it actually matters.",
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
  { n: 1, title: "Ask", body: "Type any question you're stuck on." },
  { n: 2, title: "Understand", body: "Get an explanation tied to your exact textbook and board." },
  { n: 3, title: "Practice", body: "Drill AI-generated MCQs on that exact topic." },
  { n: 4, title: "Track", body: "See exactly which topics you're weakest on." },
  { n: 5, title: "Improve", body: "Your next session rebalances toward what needs work." },
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
            <p className="font-mono text-5xl sm:text-6xl font-bold text-teal-400">From Rs. 799</p>
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
            Every question you answer is tracked in one place — so you're reacting to real
            data on test day, not a gut feeling.
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
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-4">Topic accuracy trend</p>
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

function Pricing() {
  const cheapest = Math.min(...PRODUCTS.map((p) => p.price));
  return (
    <section id="pricing" className="bg-white dark:bg-slate-950 py-20 sm:py-28">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-3">
            Pick exactly what you're prepping for
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-base">
            Plans start at Rs. {cheapest}/month. No hidden academy fees.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
            <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">Free</p>
            <p className="font-mono text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">Rs. 0</p>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li>3 topic explanations / day</li>
              <li>5 MCQ sessions / day</li>
            </ul>
          </div>
          {PRODUCTS.map((product) => (
            <div key={product.id} className="bg-slate-950 border border-teal-500/40 rounded-2xl p-6">
              <p className="text-xs uppercase tracking-wide text-teal-400 mb-2">{product.name}</p>
              <p className="font-mono text-3xl font-bold text-white mb-1">
                Rs. {product.price}<span className="text-sm font-normal text-slate-400 ml-1">/mo</span>
              </p>
              <p className="text-xs text-slate-400 mb-4">{product.description}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link href="/register" className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-teal-500 text-slate-950 font-semibold text-sm hover:bg-teal-400 transition-colors no-underline">
            Start free — no card needed
          </Link>
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