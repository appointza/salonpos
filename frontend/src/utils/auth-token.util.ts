const TOKEN_KEY = "salon-crm-tokens-v1";

export type AuthTokens = {
  access_token: string;
  refresh_token: string;
  userId?: number;
  userName?: string;
};

export const authTokenStore = {
  get(): AuthTokens | null {
    try {
      const raw = localStorage.getItem(TOKEN_KEY);
      return raw ? (JSON.parse(raw) as AuthTokens) : null;
    } catch {
      return null;
    }
  },

  getAccessToken(): string | null {
    return this.get()?.access_token ?? null;
  },

  getRefreshToken(): string | null {
    return this.get()?.refresh_token ?? null;
  },

  set(tokens: AuthTokens) {
    try {
      localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
    } catch {
      /* ignore */
    }
  },

  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};
