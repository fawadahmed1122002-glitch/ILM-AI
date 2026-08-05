const TOKEN_KEY = "ilmai_token";
const USER_KEY = "ilmai_user";

export interface AuthUser {
  user_id: string;
  full_name: string;
  plan: string;
  access_token: string;
  email: string;
  field: string | null;
  interested_tests: string[] | null;
}

export const authStorage = {
  save: (user: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, user.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  getToken: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  getUser: (): AuthUser | null => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};