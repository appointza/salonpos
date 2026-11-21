import { TOKEN_COOKIE, TOKEN_STORAGE_KEY, readPersistedJson, writePersistedJson } from "@/persist-auth";

export const TOKEN_KEY = TOKEN_STORAGE_KEY;

export type AuthTokens = {
  access_token: string;
  refresh_token: string;
  userId?: number;
  userName?: string;
};

export const authTokenStore = {
  get(): AuthTokens | null {
    const tokens = readPersistedJson<AuthTokens>(TOKEN_STORAGE_KEY, TOKEN_COOKIE);
    if (!tokens?.access_token) return null;
    return tokens;
  },

  getAccessToken(): string | null {
    return this.get()?.access_token ?? null;
  },

  getRefreshToken(): string | null {
    return this.get()?.refresh_token ?? null;
  },

  set(tokens: AuthTokens) {
    writePersistedJson(TOKEN_STORAGE_KEY, TOKEN_COOKIE, tokens);
  },

  clear() {
    writePersistedJson(TOKEN_STORAGE_KEY, TOKEN_COOKIE, null);
  },
};
