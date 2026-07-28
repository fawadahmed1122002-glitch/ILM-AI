"use client";

import { useState } from "react";
import type { ReactNode, FormEvent } from "react";
import { CONTACT_EMAIL, CONTACT_WHATSAPP, CONTACT_TOPICS } from "./contact-data";

// No backend required: submits by opening a prefilled WhatsApp chat once
// CONTACT_WHATSAPP is set in contact-data.ts. Until then, falls back to a
// prefilled mailto: link so the form is never pointing at a broken/fake
// channel -- there is no hardcoded placeholder number in this file.
const hasWhatsApp = !!CONTACT_WHATSAPP;
const whatsappUrl = hasWhatsApp ? `https://wa.me/${CONTACT_WHATSAPP}` : null;

export default function ContactClient() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState<string>(CONTACT_TOPICS[0]);
  const [message, setMessage] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (hasWhatsApp) {
      const text =
        `Hi PrepXMentor team,%0A%0AName: ${encodeURIComponent(name)}` +
        `%0AEmail: ${encodeURIComponent(email)}%0ASubject: ${encodeURIComponent(subject)}` +
        `%0A%0AMessage:%0A${encodeURIComponent(message)}`;
      window.open(`https://wa.me/${CONTACT_WHATSAPP}?text=${text}`, "_blank");
    } else {
      const body = `Name: ${name}\nEmail: ${email}\n\n${message}`;
      window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 lg:px-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">
          Get in Touch
        </h1>
        <p className="mt-3 text-slate-500 dark:text-slate-400">
          Questions, feedback, or found a wrong MCQ? We usually reply within a
          few hours.
        </p>
      </div>

      {/* Direct contact options */}
      <div className={`mt-10 grid gap-4 ${hasWhatsApp ? "sm:grid-cols-2" : "sm:grid-cols-1 max-w-sm mx-auto"}`}>
        {hasWhatsApp && whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-2xl border border-slate-200 p-5 transition hover:border-teal-500 dark:border-slate-800"
          >
            <p className="font-semibold text-slate-900 dark:text-white">
              WhatsApp
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Fastest way to reach us — most students hear back same day.
            </p>
          </a>
        )}

        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="rounded-2xl border border-slate-200 p-5 transition hover:border-teal-500 dark:border-slate-800"
        >
          <p className="font-semibold text-slate-900 dark:text-white">
            Email
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {CONTACT_EMAIL}
          </p>
        </a>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="mt-12 space-y-5 rounded-2xl border border-slate-200 p-6 dark:border-slate-800"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Your name">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="Ali Raza"
            />
          </Field>

          <Field label="Email">
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="ali@example.com"
            />
          </Field>
        </div>

        <Field label="Subject">
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={inputClass}
          >
            {CONTACT_TOPICS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Message">
          <textarea
            required
            minLength={10}
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={`${inputClass} resize-none`}
            placeholder="Tell us what's going on..."
          />
        </Field>

        <button
          type="submit"
          className="w-full rounded-xl bg-teal-600 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
        >
          {hasWhatsApp ? "Send via WhatsApp" : "Send via Email"}
        </button>
        <p className="text-center text-xs text-slate-400 dark:text-slate-500">
          {hasWhatsApp
            ? "Opens WhatsApp with your message pre-filled — nothing is sent automatically."
            : "Opens your email app with your message pre-filled — nothing is sent automatically."}
        </p>
      </form>
    </main>
  );
}

// Inline Tailwind utility classes instead of a global `.input` class --
// the original relied on a class defined only in a code comment, so unless
// someone remembered to also paste it into globals.css, every field would
// render with zero styling (no border, no padding, no focus state).
const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </span>
      {children}
    </label>
  );
}