"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api, ApiError } from "@/lib/api";
import { authStorage } from "@/lib/auth";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface ChatStartResponse {
  thread_id: string;
  subject: string;
  topic: string;
  created: boolean;
  messages: ChatMessage[];
}

interface ChatSendResponse {
  thread_id: string;
  user_message_id: string;
  message_id: string;
  response: string;
}

interface StudyChatDrawerProps {
  open: boolean;
  onClose: () => void;
  subject: string;
  topic: string;
  // Called on 401 so the page can do its standard logout + redirect.
  onUnauthorized?: () => void;
}

export default function StudyChatDrawer({
  open, onClose, subject, topic, onUnauthorized,
}: StudyChatDrawerProps) {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [startLoading, setStartLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Mount/exit-animation state: the drawer stays mounted while its
  // slide-out animation plays (250ms) instead of vanishing instantly.
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
      const t = setTimeout(() => {
        setMounted(false);
        setClosing(false);
      }, 250); // matches .animate-slide-out-right duration
      return () => clearTimeout(t);
    }
  }, [open, mounted]);

  // Lock page scroll while the drawer is up so the dimmed content
  // behind the backdrop can't be scrolled.
  useEffect(() => {
    if (!mounted) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [mounted]);

  // Get-or-create the persistent thread for (user, subject, topic) and
  // load any existing history. Runs every time the drawer opens, so a
  // returning student always sees their saved conversation.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setThreadId(null);
    setMessages([]);
    setError("");
    setInput("");
    setStartLoading(true);
    (async () => {
      try {
        const token = authStorage.getToken();
        const data = await api.post<ChatStartResponse>(
          "/study/chat/start", { subject, topic }, token || undefined
        );
        if (cancelled) return;
        setThreadId(data.thread_id);
        setMessages(data.messages);
      } catch (err: unknown) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          onUnauthorized?.();
          return;
        }
        setError(err instanceof Error ? err.message : "Couldn't open the chat. Please try again.");
      } finally {
        if (!cancelled) setStartLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, subject, topic, onUnauthorized]);

  // Auto-scroll to the latest message whenever the thread updates.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending, startLoading]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = input.trim();
    if (!content || !threadId || sending) return;
    setError("");
    setSending(true);
    try {
      const token = authStorage.getToken();
      const data = await api.post<ChatSendResponse>(
        `/study/chat/threads/${threadId}/messages`, { content }, token || undefined
      );
      // Append both sides once the server confirms -- both rows are
      // persisted, and the response carries their real ids.
      setMessages((prev) => [
        ...prev,
        { id: data.user_message_id, role: "user", content, created_at: new Date().toISOString() },
        { id: data.message_id, role: "assistant", content: data.response, created_at: new Date().toISOString() },
      ]);
      setInput("");
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized?.();
        return;
      }
      if (err instanceof ApiError && err.status === 429) {
        setError("You're sending messages too quickly -- wait a moment and try again.");
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    } finally {
      setSending(false);
    }
  };

  if (!mounted) return null;

  // Portal to document.body: any transformed ancestor (e.g. the Study
  // page's animate-fade-up, whose fill-mode: both keeps translateY(0)
  // forever) becomes the containing block for position:fixed and would
  // confine this overlay to the page content box. Rendering at <body>
  // guarantees viewport-wide coverage. Safe during SSR too -- mounted
  // only ever becomes true client-side, after mount.
  return createPortal(
    // z-[60] -- above the mobile topbar (z-50) and desktop sidebar (z-40).
    <div className="fixed inset-0 z-[60] flex justify-end">
      {/* Backdrop: solid dim over ALL page content (incl. sidebar), click-to-close */}
      <div
        className={`absolute inset-0 bg-black/60 dark:bg-black/75 ${closing ? "animate-fade-out" : "animate-fade-in"}`}
        onClick={onClose}
      />

      {/* Drawer panel: solid card bg, full height, pinned right edge.
          drawer-edge-shadow casts LEFT, separating the edge from the
          dimmed backdrop (built-in Tailwind shadows aren't directional). */}
      <div className={`relative w-full max-w-md h-full bg-white dark:bg-slate-900 border-l border-slate-300 dark:border-slate-700 drawer-edge-shadow flex flex-col ${closing ? "animate-slide-out-right" : "animate-slide-in-right"}`}>
        {/* Header -- pinned at top (flex-shrink-0), never scrolls */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">Study Chat</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {subject} &middot; {topic}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close chat"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Messages -- the ONLY scrolling region. min-h-0 is required:
            without it a flex child refuses to shrink below its content
            height and the whole panel overflows instead of scrolling. */}
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
          {startLoading && (
            <div className="text-center py-12">
              <div className="inline-block w-7 h-7 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-3">Loading conversation...</p>
            </div>
          )}

          {!startLoading && messages.length === 0 && !error && (
            <div className="text-center py-12">
              <p className="text-slate-600 dark:text-slate-300 text-sm font-medium">No messages yet</p>
              <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                Ask your first question about {topic} -- English ya Roman Urdu mein.
              </p>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                m.role === "user"
                  ? "bg-teal-700 dark:bg-teal-600 text-white rounded-br-md"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-bl-md"
              }`}>
                {m.content}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="inline-block w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          )}
        </div>

        {/* Inline error */}
        {error && (
          <div className="mx-4 mb-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* Input -- pinned at bottom (flex-shrink-0), never scrolls */}
        <form onSubmit={handleSend} className="px-4 pb-4 pt-2 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
          <div className="flex gap-2">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a follow-up..."
              maxLength={2000}
              disabled={startLoading || !threadId}
              className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-colors disabled:opacity-50" />
            <button type="submit" disabled={sending || startLoading || !threadId || !input.trim()}
              className="px-5 py-2.5 bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {sending ? "..." : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
