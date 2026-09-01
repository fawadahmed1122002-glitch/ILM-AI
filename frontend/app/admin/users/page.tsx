"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { authStorage } from "@/lib/auth";

// ------------------------------------------------------------------
// Response shapes (subsets of what the existing admin endpoints return)
// ------------------------------------------------------------------

interface AdminUserRow {
  id: string;
  email: string;
  full_name: string;
  role: string;
  plan: string;
  product_id: string | null;
  target_tracks: string[] | null;
  current_class: string | null;
  is_email_verified: boolean;
  created_at: string;
}

interface UserListResponse {
  total: number;
  users: AdminUserRow[];
}

interface PaymentRecord {
  id: string;
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

interface ProductInfo {
  name: string;
  price_pkr: number;
}

const PAGE_SIZE = 50;
// Same values the backend's grant path accepts (payment_service.ALLOWED_METHODS)
const METHODS = ["manual", "jazzcash", "easypaisa", "safepay"];

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PlanPill({ plan }: { plan: string }) {
  const classes =
    plan === "pro"
      ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400"
      : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400";
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${classes}`}>{plan}</span>
  );
}

interface PlanChangeModalState {
  user: AdminUserRow;
  targetPlan: "free" | "pro";
  productId: string;
  amount: string;
  method: string;
  transactionRef: string;
}

export default function AdminUsersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [usersLoading, setUsersLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const fetchSeq = useRef(0);

  const [products, setProducts] = useState<Record<string, ProductInfo>>({});
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  // Cache of per-user payment history so re-expanding doesn't re-fetch.
  // Invalidated for a user after a successful plan change.
  const [paymentsByUser, setPaymentsByUser] = useState<Record<string, PaymentRecord[]>>({});
  const [historyError, setHistoryError] = useState("");

  const [modal, setModal] = useState<PlanChangeModalState | null>(null);
  const [modalError, setModalError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successBanner, setSuccessBanner] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  // Debounce the search box so typing doesn't fire a fetch per keystroke
  // (same 300ms convention as the MCQ bank browser).
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const buildUsersQuery = (offset: number) => {
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });
    if (debouncedSearch) params.set("q", debouncedSearch);
    return params.toString();
  };

  const fetchUsers = async (offset: number, replace: boolean) => {
    const seq = ++fetchSeq.current;
    if (replace) {
      setUsersLoading(true);
      setError("");
    } else {
      setLoadingMore(true);
    }
    try {
      const token = authStorage.getToken();
      const res = await api.get<UserListResponse>(
        `/admin/users?${buildUsersQuery(offset)}`,
        token || undefined
      );
      if (seq !== fetchSeq.current) return;
      if (replace) {
        setUsers(res.users);
      } else {
        // Guard against any duplicate rows across pages
        setUsers((prev) => {
          const seen = new Set(prev.map((u) => u.id));
          return [...prev, ...res.users.filter((r) => !seen.has(r.id))];
        });
      }
      setTotal(res.total);
      setHasMore(res.users.length === PAGE_SIZE);
    } catch (err) {
      if (seq === fetchSeq.current) {
        setError(err instanceof Error ? err.message : "Failed to load users");
      }
    } finally {
      if (seq === fetchSeq.current) {
        setUsersLoading(false);
        setLoadingMore(false);
      }
    }
  };

  const fetchProducts = async () => {
    try {
      const token = authStorage.getToken();
      const res = await api.get<{ products: Record<string, ProductInfo> }>(
        "/admin/products",
        token || undefined
      );
      setProducts(res.products);
    } catch {
      // Only affects the plan-change modal's product names/prices;
      // the user list itself still renders.
    }
  };

  useEffect(() => {
    if (user) fetchUsers(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, debouncedSearch]);

  useEffect(() => {
    if (user) fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchUserPayments = async (userId: string) => {
    try {
      setHistoryError("");
      const token = authStorage.getToken();
      const rows = await api.get<PaymentRecord[]>(
        `/admin/payments?user_id=${userId}&limit=50`,
        token || undefined
      );
      setPaymentsByUser((prev) => ({ ...prev, [userId]: rows }));
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : "Failed to load payment history");
    }
  };

  const toggleExpand = (u: AdminUserRow) => {
    const next = expandedUserId === u.id ? null : u.id;
    setExpandedUserId(next);
    setHistoryError("");
    if (next && paymentsByUser[next] === undefined) {
      fetchUserPayments(next);
    }
  };

  const openPlanChange = (u: AdminUserRow) => {
    const productIds = Object.keys(products);
    const defaultProductId = productIds[0] || "";
    setModal({
      user: u,
      // Default to the opposite plan -- the change the admin is presumably here to make.
      targetPlan: u.plan === "pro" ? "free" : "pro",
      productId: defaultProductId,
      amount: String(products[defaultProductId]?.price_pkr ?? ""),
      method: "manual",
      transactionRef: `admin-plan-change-${Date.now()}`,
    });
    setModalError("");
  };

  const confirmPlanChange = async () => {
    if (!modal) return;
    const { user: target, targetPlan, productId, amount, method, transactionRef } = modal;

    let resolvedAmount = 0;
    if (targetPlan === "pro") {
      resolvedAmount = Number(amount);
      if (!productId) {
        setModalError("Select a product to grant.");
        return;
      }
      if (!Number.isFinite(resolvedAmount) || resolvedAmount < 0) {
        setModalError("Amount must be a number ≥ 0.");
        return;
      }
    }

    setSubmitting(true);
    setModalError("");
    try {
      const token = authStorage.getToken();
      await api.post<PaymentRecord>(
        `/admin/users/${target.id}/plan`,
        targetPlan === "pro"
          ? {
              plan: targetPlan,
              product_id: productId,
              amount: resolvedAmount,
              method,
              transaction_ref: transactionRef.trim() || null,
            }
          : {
              plan: targetPlan,
              amount: 0,
              method,
              transaction_ref: transactionRef.trim() || null,
            },
        token || undefined
      );

      const fromPlan = target.plan;
      // Reflect the change in the list without a full refetch
      setUsers((prev) =>
        prev.map((u) =>
          u.id === target.id
            ? { ...u, plan: targetPlan, product_id: targetPlan === "pro" ? productId : null }
            : u
        )
      );
      // Stale history now -- drop it and refetch if this user is expanded
      setPaymentsByUser((prev) => {
        const next = { ...prev };
        delete next[target.id];
        return next;
      });
      if (expandedUserId === target.id) fetchUserPayments(target.id);

      setSuccessBanner(`Plan changed from ${fromPlan} to ${targetPlan} for ${target.email}.`);
      setModal(null);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Plan change failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (!user) return null;

  const productIds = Object.keys(products);
  const modalProduct = modal && modal.productId ? products[modal.productId] : undefined;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          User Management
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          {usersLoading ? "Loading..." : `${total} user${total === 1 ? "" : "s"}`}
        </p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email or name..."
          className="flex-1 min-w-[160px] px-3 py-2 rounded-lg text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
        />
      </div>

      {successBanner && (
        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 text-sm rounded-xl flex items-start justify-between gap-3">
          <span>{successBanner}</span>
          <button
            onClick={() => setSuccessBanner("")}
            className="text-emerald-600 dark:text-emerald-400 font-semibold shrink-0"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm rounded-xl">
          {error}
        </div>
      )}

      {usersLoading && (
        <div className="text-center py-16">
          <div className="inline-block w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!usersLoading && users.length === 0 && !error && (
        <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            No users match the current search.
          </p>
        </div>
      )}

      {!usersLoading && users.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium text-center">Verified</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const expanded = expandedUserId === u.id;
                const history = paymentsByUser[u.id];
                return (
                  <UserRow
                    key={u.id}
                    user={u}
                    expanded={expanded}
                    history={history}
                    historyError={expanded ? historyError : ""}
                    onToggle={() => toggleExpand(u)}
                    onChangePlan={() => openPlanChange(u)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!usersLoading && hasMore && !error && (
        <button
          onClick={() => fetchUsers(users.length, false)}
          disabled={loadingMore}
          className="mt-4 w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          {loadingMore ? "Loading..." : "Load more"}
        </button>
      )}

      {/* ---- Plan change confirmation modal ---- */}
      {modal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => !submitting && setModal(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
              Change Plan
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              This affects real user access and billing state. Confirm the payment outside the
              system before submitting.
            </p>

            <div className="mb-4 text-sm text-slate-700 dark:text-slate-300">
              <p className="font-medium text-slate-900 dark:text-slate-100">{modal.user.email}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {modal.user.full_name} · current plan:{" "}
                {modal.user.plan}
                {modal.user.product_id ? ` (${modal.user.product_id})` : ""}
              </p>
            </div>

            <div className="space-y-3 mb-4">
              <label className="block">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  New plan
                </span>
                <select
                  value={modal.targetPlan}
                  onChange={(e) =>
                    setModal({ ...modal, targetPlan: e.target.value as "free" | "pro" })
                  }
                  className="mt-1 w-full px-3 py-2 rounded-lg text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  <option value="pro">pro</option>
                  <option value="free">free</option>
                </select>
              </label>

              {modal.targetPlan === "pro" && (
                <>
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Product to grant
                    </span>
                    <select
                      value={modal.productId}
                      onChange={(e) => {
                        const productId = e.target.value;
                        setModal({
                          ...modal,
                          productId,
                          amount: String(products[productId]?.price_pkr ?? ""),
                        });
                      }}
                      className="mt-1 w-full px-3 py-2 rounded-lg text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                    >
                      {productIds.map((id) => (
                        <option key={id} value={id}>
                          {products[id]?.name || id} — PKR {products[id]?.price_pkr}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Amount (PKR)
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={modal.amount}
                      onChange={(e) => setModal({ ...modal, amount: e.target.value })}
                      className="mt-1 w-full px-3 py-2 rounded-lg text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                    />
                  </label>
                </>
              )}

              <label className="block">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Method
                </span>
                <select
                  value={modal.method}
                  onChange={(e) => setModal({ ...modal, method: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  {METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Transaction ref
                </span>
                <input
                  type="text"
                  value={modal.transactionRef}
                  onChange={(e) => setModal({ ...modal, transactionRef: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono"
                />
              </label>
            </div>

            {/* Explicit before/after summary -- the confirmation step before submit */}
            <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300">
              Change <span className="font-semibold">{modal.user.email}</span> from{" "}
              <span className="font-semibold">{modal.user.plan}</span> to{" "}
              <span className="font-semibold">{modal.targetPlan}</span>
              {modal.targetPlan === "pro" && modalProduct
                ? ` (${modalProduct.name}, PKR ${modal.amount || "0"}, ${modal.method})`
                : ` (${modal.method})`}
              .
            </div>

            {modalError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm rounded-xl">
                {modalError}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setModal(null)}
                disabled={submitting}
                className="flex-1 py-2 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmPlanChange}
                disabled={submitting || (modal.targetPlan === "pro" && productIds.length === 0)}
                className="flex-1 py-2 bg-teal-700 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {submitting ? "Applying..." : "Confirm change"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// One user row plus its inline-expanded detail panel (rendered as a
// sibling <tr> so the table stays a single element).
function UserRow({
  user: u,
  expanded,
  history,
  historyError,
  onToggle,
  onChangePlan,
}: {
  user: AdminUserRow;
  expanded: boolean;
  history: PaymentRecord[] | undefined;
  historyError: string;
  onToggle: () => void;
  onChangePlan: () => void;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="border-b border-slate-100 dark:border-slate-800/50 last:border-0 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
      >
        <td className="px-4 py-3">
          <p className="text-slate-900 dark:text-slate-100 font-medium">
            {u.full_name}
            {u.role === "admin" && (
              <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400">
                admin
              </span>
            )}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
        </td>
        <td className="px-4 py-3">
          <PlanPill plan={u.plan} />
        </td>
        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.product_id || "—"}</td>
        <td className="px-4 py-3 text-center">
          {u.is_email_verified ? (
            <span className="text-emerald-600 dark:text-emerald-400">✓</span>
          ) : (
            <span className="text-slate-400 dark:text-slate-500">—</span>
          )}
        </td>
        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
          {formatTime(u.created_at)}
        </td>
        <td className="px-4 py-3 text-slate-400 dark:text-slate-500 text-xs text-right whitespace-nowrap">
          {expanded ? "▲" : "▼"}
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-slate-100 dark:border-slate-800/50 last:border-0">
          <td colSpan={6} className="px-4 py-4 bg-slate-50 dark:bg-slate-800/30">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-sm mb-5">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                  Plan
                </p>
                <p className="text-slate-900 dark:text-slate-100">
                  {u.plan}
                  {u.product_id ? ` · ${u.product_id}` : ""}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                  Target tracks
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                  {u.target_tracks?.length ? u.target_tracks.join(", ") : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                  Current class
                </p>
                <p className="text-slate-600 dark:text-slate-300">{u.current_class || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                  Email verified
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                  {u.is_email_verified ? "Yes" : "No"}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Payment history
              </p>
              {historyError && (
                <p className="text-sm text-red-600 dark:text-red-400">{historyError}</p>
              )}
              {!historyError && history === undefined && (
                <p className="text-sm text-slate-400 dark:text-slate-500">Loading...</p>
              )}
              {!historyError && history !== undefined && history.length === 0 && (
                <p className="text-sm text-slate-400 dark:text-slate-500">No payment records.</p>
              )}
              {history !== undefined && history.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        <th className="px-3 py-2 font-medium">When</th>
                        <th className="px-3 py-2 font-medium text-right">Amount</th>
                        <th className="px-3 py-2 font-medium">Method</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">Product</th>
                        <th className="px-3 py-2 font-medium">Ref</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((p) => (
                        <tr
                          key={p.id}
                          className="border-b border-slate-100 dark:border-slate-800/50 last:border-0"
                        >
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {formatTime(p.created_at)}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-200 whitespace-nowrap">
                            {p.currency} {Number(p.amount).toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{p.method}</td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{p.status}</td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                            {p.product_id || p.plan || "—"}
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-500 dark:text-slate-400 max-w-[120px] truncate">
                            {p.transaction_ref || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  // Prevent the row-toggle click from collapsing the panel
                  e.stopPropagation();
                  onChangePlan();
                }}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Change Plan
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
