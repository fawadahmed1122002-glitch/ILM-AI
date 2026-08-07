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
  subjects: string[] | null;
  interested_tests: string[] | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
  refreshUser: () => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Decodes a JWT's payload WITHOUT verifying the signature (that's the
// backend's job) -- this is only used client-side to read the `exp` claim
// so we can proactively detect an expired token before making a doomed API
// call. Never trust this for anything security-sensitive; it's purely a UX
// optimization to avoid showing a false "logged in" state.
function isTokenExpired(token: string): boolean {
  try {
    const payloadBase64 = token.split(".")[1];
    const payload = JSON.parse(atob(payloadBase64));
    if (!payload.exp) return false; // no exp claim -- assume valid, let backend decide
    const expiresAtMs = payload.exp * 1000;
    return Date.now() >= expiresAtMs;
  } catch {
    // Malformed token -- treat as expired/invalid rather than crashing.
    return true;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, { user: null, loading: true });

  useEffect(() => {
    const user = authStorage.getUser();
    if (user && !isTokenExpired(user.access_token)) {
      dispatch({ type: "SET_USER", payload: user });
    } else {
      // Either no stored user, or the stored token has expired -- clear
      // any stale session data so the app doesn't show a false "logged in"
      // state that then breaks on the first real API call.
      if (user) authStorage.clear();
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, []);

  const login = (user: AuthUser) => {
    authStorage.save(user);
    dispatch({ type: "SET_USER", payload: user });
  };

  const logout = () => {
    authStorage.clear();
    dispatch({ type: "CLEAR_USER" });
  };

  // Re-fetches the current user's state from the server (plan, name, email,
  // field, subjects, interested_tests) and merges it into the existing
  // stored session, WITHOUT requiring a fresh login. access_token is
  // preserved from the existing session since /auth/me doesn't issue a new
  // one. Returns the updated user, or null if the refresh failed (e.g.
  // token expired -- caller should handle that, typically by calling
  // logout() and redirecting to /login).
  const refreshUser = async (): Promise<AuthUser | null> => {
    const current = authStorage.getUser();
    if (!current) return null;
    if (isTokenExpired(current.access_token)) {
      logout();
      return null;
    }
    try {
      const fresh = await api.get<MeResponse>("/auth/me", current.access_token);
      const updated: AuthUser = {
        ...current,
        full_name: fresh.full_name,
        email: fresh.email,
        plan: fresh.plan,
        field: fresh.field,
        subjects: fresh.subjects,
        interested_tests: fresh.interested_tests,
      };
      authStorage.save(updated);
      dispatch({ type: "SET_USER", payload: updated });
      return updated;
    } catch {
      // /auth/me failed (expired token rejected server-side, network error,
      // etc.) -- log out cleanly rather than leaving a broken session.
      logout();
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