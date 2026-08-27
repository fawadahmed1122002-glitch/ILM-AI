const TOKEN_KEY = "ilmai_token";
const USER_KEY = "ilmai_user";

// TODO(security): migrate JWT storage from localStorage to an httpOnly cookie.
// Why localStorage is still used: the backend (/auth/login, /auth/register)
// currently returns the JWT only in the JSON body (TokenResponse.access_token)
// and has no Set-Cookie support, and every API call (lib/api.ts) attaches the
// token via an Authorization: Bearer header read from localStorage. Switching
// storage here alone would break auth.
// Migration path:
//   1. Backend: set the JWT as an httpOnly, Secure, SameSite=Lax cookie on
//      login/register (response.set_cookie) and accept cookie-based auth in
//      get_current_user alongside the Bearer header.
//   2. Frontend: stop persisting the token here (keep only the user profile),
//      drop the Authorization header in lib/api.ts, and send credentials:
//      "include" so the cookie is attached automatically.
//   3. Remove TOKEN_KEY entirely once all clients have migrated.

export interface AuthUser {
  user_id: string;
  full_name: string;
  plan: string;
  access_token: string;
  email: string;
  field: string | null;
  interested_tests: string[] | null;
  subjects: string[] | null;
  is_email_verified: boolean;
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