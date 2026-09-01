"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { authStorage } from "@/lib/auth";

// ------------------------------------------------------------------
// Response shapes (subsets of what the existing admin endpoints return)
// ------------------------------------------------------------------

interface PaymentRecord {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  transaction_ref: string | null;
  plan: string | null;
  product_id: string | null;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
}

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
}

const PAGE_SIZE = 50;
// GET /admin/payments caps limit at 200 server-side; fetch the max and
// filter/paginate client-side (the endpoint is used exactly as-is).
const FETCH_LIMIT = 200;

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// "YYYY-MM-DD" (UTC) for a record, compared against the date-range inputs
function utcDay(iso: string): string {
  return iso.slice(0, 10);
}

function StatusPill({ status }: { status: string }) {
  // Palette matches the pills on /admin and /admin/mcqs/bank. Status
  // options are derived from the data itself, so unknown values fall
  // back to the neutral slate style.
  const classes =
    status === "completed"
      ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400"
      : status === "failed"
      ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400"
      : status === "pending"
      ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
      : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400";
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${classes}`}>
      {status}
    </span>
  );
}

export default function AdminPaymentsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [emailsById, setEmailsById] = useState<Record<string, string>>({});
  const [usersLoadFailed, setUsersLoadFailed] = useState(false);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  // Debounce the search box so filtering doesn't run per keystroke
  // (same 300ms convention as the MCQ bank browser).
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!user) return;
    const token = authStorage.getToken() || undefined;
    setPaymentsLoading(true);
    setError("");

    // Users fetch is supplementary: it only resolves user_id -> email for
    // the User column and the email search. If it fails the audit log
    // still renders with truncated user ids.
    Promise.allSettled([
      api.get<PaymentRecord[]>(`/admin/payments?limit=${FETCH_LIMIT}`, token),
      api.get<{ total: number; users: AdminUser[] }>(`/admin/users?limit=${FETCH_LIMIT}`, token),
    ]).then(([paymentsRes, usersRes]) => {
      if (paymentsRes.status === "fulfilled") {
        setPayments(paymentsRes.value);
      } else {
        setError(
          paymentsRes.reason instanceof Error
            ? paymentsRes.reason.message
            : "Failed to load payment audit log"
        );
      }

      if (usersRes.status === "fulfilled") {
        const map: Record<string, string> = {};
        for (const u of usersRes.value.users) map[u.id] = u.email;
        setEmailsById(map);
      } else {
        setUsersLoadFailed(true);
      }
      setPaymentsLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Status filter options come from the data -- never invent categories
  // that don't exist in the payments table.
  const statuses = useMemo(
    () => Array.from(new Set(payments.map((p) => p.status))).sort(),
    [payments]
  );

  const filtered = useMemo(() => {
    const needle = debouncedSearch.toLowerCase();
    return payments.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      const day = utcDay(p.created_at);
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      if (needle) {
        const email = emailsById[p.user_id] || "";
        const ref = p.transaction_ref || "";
        if (!email.toLowerCase().includes(needle) && !ref.toLowerCase().includes(needle)) {
          return false;
        }
      }
      return true;
    });
  }, [payments, statusFilter, dateFrom, dateTo, debouncedSearch, emailsById]);

  // Any filter change restarts pagination from the first page
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [statusFilter, dateFrom, dateTo, debouncedSearch]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;
  const atServerCap = payments.length >= FETCH_LIMIT;

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Payment Audit Log
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          {paymentsLoading
            ? "Loading..."
            : `${filtered.length} of ${payments.length} records shown · read-only`}
          {atServerCap && " · capped at the 200 most recent records"}
        </p>
        {usersLoadFailed && (
          <p className="text-amber-600 dark:text-amber-400 text-xs mt-1">
            Could not load user emails — showing user IDs instead.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
        >
          <option value="all">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          aria-label="From date"
          className="px-3 py-2 rounded-lg text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          aria-label="To date"
          className="px-3 py-2 rounded-lg text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
        />

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search email or transaction ref..."
          className="flex-1 min-w-[160px] px-3 py-2 rounded-lg text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
        />
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm rounded-xl">
          {error}
        </div>
      )}

      {paymentsLoading && (
        <div className="text-center py-16">
          <div className="inline-block w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!paymentsLoading && !error && filtered.length === 0 && (
        <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            No payments match the current filters.
          </p>
        </div>
      )}

      {!paymentsLoading && !error && filtered.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Product / Plan</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Status / Validity</th>
                <th className="px-4 py-3 font-medium">Transaction Ref</th>
                <th className="px-4 py-3 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => {
                const email = emailsById[p.user_id];
                const expired = p.valid_until ? new Date(p.valid_until) < new Date() : null;
                return (
                  <tr
                    key={p.id}
                    className="border-b border-slate-100 dark:border-slate-800/50 last:border-0"
                  >
                    <td className="px-4 py-3 text-slate-900 dark:text-slate-100">
                      {email || (
                        <span className="text-slate-400 dark:text-slate-500 font-mono text-xs">
                          {p.user_id.slice(0, 8)}…
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {p.product_id || p.plan || "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-900 dark:text-slate-100 font-medium whitespace-nowrap">
                      {p.currency} {Number(p.amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.method}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={p.status} />
                      {p.valid_until && (
                        <p
                          className={`text-xs mt-1 whitespace-nowrap ${
                            expired
                              ? "text-slate-400 dark:text-slate-500"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {expired ? "expired" : "valid until"} {formatDate(p.valid_until)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {p.transaction_ref ? (
                        <span
                          className="font-mono text-xs text-slate-500 dark:text-slate-400 block max-w-[160px] truncate"
                          title={p.transaction_ref}
                        >
                          {p.transaction_ref}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                      {formatTime(p.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!paymentsLoading && hasMore && !error && (
        <button
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          className="mt-4 w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          Load more
        </button>
      )}
    </div>
  );
}
