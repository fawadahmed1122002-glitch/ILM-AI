"use client";

import { useState } from "react";

// Drop into app/contact/page.tsx
// No backend required — submits by opening a prefilled WhatsApp chat.
// Swap WHATSAPP_NUMBER and CONTACT_EMAIL for your real values.

const WHATSAPP_NUMBER = "923000000000"; // country code + number, no + or spaces
const CONTACT_EMAIL = "support@prepxmentor.com";

const SUBJECTS = [
  "General question",
  "Billing / payment issue",
  "Report a wrong MCQ or answer",
  "Academy partnership",
  "Technical problem",
];

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [message, setMessage] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const text = `Hi PrepXMentor team,%0A%0AName: ${encodeURIComponent(
      name
    )}%0AEmail: ${encodeURIComponent(email)}%0ASubject: ${encodeURIComponent(
      subject
    )}%0A%0AMessage:%0A${encodeURIComponent(message)}`;

    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, "_blank");
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 lg:px-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white sm:text-4xl">
          Get in Touch
        </h1>
        <p className="mt-3 text-neutral-500 dark:text-neutral-400">
          Questions, feedback, or found a wrong MCQ? We usually reply within a
          few hours.
        </p>
      </div>

      {/* Direct contact options */}
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-2xl border border-neutral-200 p-5 transition hover:border-emerald-500 dark:border-neutral-800"
        >
          <p className="font-semibold text-neutral-900 dark:text-white">
            WhatsApp
          </p>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Fastest way to reach us — most students hear back same day.
          </p>
        </a>

        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="rounded-2xl border border-neutral-200 p-5 transition hover:border-emerald-500 dark:border-neutral-800"
        >
          <p className="font-semibold text-neutral-900 dark:text-white">
            Email
          </p>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {CONTACT_EMAIL}
          </p>
        </a>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="mt-12 space-y-5 rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Your name">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="Ali Raza"
            />
          </Field>

          <Field label="Email">
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="ali@example.com"
            />
          </Field>
        </div>

        <Field label="Subject">
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="input"
          >
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Message">
          <textarea
            required
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="input resize-none"
            placeholder="Tell us what's going on..."
          />
        </Field>

        <button
          type="submit"
          className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          Send via WhatsApp
        </button>
        <p className="text-center text-xs text-neutral-400">
          Opens WhatsApp with your message pre-filled — nothing is sent
          automatically.
        </p>
      </form>

      {/* Minimal shared input styling via Tailwind @apply-like inline class.
          If you prefer, move this into your globals.css:
          .input { @apply w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-emerald-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white; }
      */}
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {label}
      </span>
      {children}
    </label>
  );
}