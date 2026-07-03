"use client";

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
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900">
        Welcome, {user.full_name} 👋
      </h1>
      <p className="text-gray-500 mt-1">
        Plan: <span className="font-medium text-emerald-600 uppercase">{user.plan}</span>
      </p>
      <div className="mt-8 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <p className="text-gray-400 text-sm">Study interface coming next...</p>
      </div>
    </div>
  );
}