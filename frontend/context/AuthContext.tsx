"use client";

import { createContext, useContext, useEffect, useReducer, ReactNode } from "react";
import { AuthUser, authStorage } from "@/lib/auth";

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

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, { user: null, loading: true });

  useEffect(() => {
    // Restore session from localStorage on mount
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

  return (
    <AuthContext.Provider value={{ user: state.user, loading: state.loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}