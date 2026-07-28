"use client";

import { useState } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="mb-6 space-y-3">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div
            key={i}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between gap-3 text-left px-4 py-4 no-underline"
            >
              <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                {item.question}
              </span>
              <svg
                width="18"
                height="18"
                viewBox="0 0 20 20"
                fill="none"
                className={`shrink-0 text-teal-600 dark:text-teal-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              >
                <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* CSS-grid slide technique: animating 0fr -> 1fr gives a smooth
                height transition without needing to measure content height in JS. */}
            <div
              className="grid transition-[grid-template-rows] duration-300 ease-in-out"
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed px-4 pb-4">
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}