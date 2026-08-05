"use client";

import { createContext, useContext, useEffect, useReducer, ReactNode } from "react";
import { AuthUser, authStorage } from "@/lib/auth";
import { api } from "@/lib/api";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
}

type AuthAction =
  | { type: "SET_USER"; payload: AuthUser }
  | { type: "CLEAR_USER" }
  | { type: "SET_LOADING"; payload: boolean };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "SET_USER":
      return { ...state, user: action.payload, loading: false };
    case "CLEAR_USER":
      return { ...state, user: null, loading: false };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

interface MeResponse {
  user_id: string;
  full_name: string;
  email: string;
  plan: string;
  field: string | null;
  interested_tests: string[] | null;
  subjects: string[] | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
  refreshUser: () => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, { user: null, loading: true });

  useEffect(() => {
    const user = authStorage.getUser();
    if (user) dispatch({ type: "SET_USER", payload: user });
    else dispatch({ type: "SET_LOADING", payload: false });
  }, []);

  const login = (user: AuthUser) => {
    authStorage.save(user);
    dispatch({ type: "SET_USER", payload: user });
  };

  const logout = () => {
    authStorage.clear();
    dispatch({ type: "CLEAR_USER" });
  };

  // Re-fetches the current user's state from the server (plan, name, email)
  // and merges it into the existing stored session, WITHOUT requiring a
  // fresh login. access_token is preserved from the existing session since
  // /auth/me doesn't issue a new one. Returns the updated user, or null if
  // the refresh failed (e.g. token expired -- caller should handle that).
  const refreshUser = async (): Promise<AuthUser | null> => {
    const current = authStorage.getUser();
    if (!current) return null;
    try {
      const fresh = await api.get<MeResponse>("/auth/me", current.access_token);
      const updated: AuthUser = {
        ...current,
        full_name: fresh.full_name,
        email: fresh.email,
        plan: fresh.plan,
        field: fresh.field,
        interested_tests: fresh.interested_tests,
        subjects: fresh.subjects,
      };
      authStorage.save(updated);
      dispatch({ type: "SET_USER", payload: updated });
      return updated;
    } catch {
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ user: state.user, loading: state.loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}