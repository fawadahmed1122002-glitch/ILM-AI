"use client";
import Link from "next/link";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (!user) return null;

  return (
    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
  <Link
    href="/study"
    className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-emerald-200 transition-colors group"
  >
    <div className="text-2xl mb-2">📚</div>
    <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600">
      Start Studying
    </h3>
    <p className="text-sm text-gray-500 mt-1">
      Ask any topic in English or Roman Urdu
    </p>
  </Link>

  <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
    <div className="text-2xl mb-2">📊</div>
    <h3 className="font-semibold text-gray-400">Progress</h3>
    <p className="text-sm text-gray-400 mt-1">Coming soon</p>
  </div>
</div>
  );
}