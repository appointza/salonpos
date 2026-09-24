import type { AxiosHeaders, RawAxiosRequestHeaders } from "axios";
import { axiosInstance } from "@/utils/axiosinterceptor.util";
import { authTokenStore } from "@/utils/auth-token.util";

const ETAG_PREFIX = "salon-http-etag:";
const MAX_ETAG_BYTES = 5000;

type EtagCache = { Data: unknown; Etag: string };

function setHeader(headers: RawAxiosRequestHeaders | AxiosHeaders, key: string, value: string) {
  (headers as Record<string, string>)[key] = value;
}

function hasHeader(headers: RawAxiosRequestHeaders | AxiosHeaders, key: string) {
  const h = headers as Record<string, unknown>;
  return key in h || key.toLowerCase() in h;
}

function etagKey(url: string) {
  return `${ETAG_PREFIX}${url}`;
}

function readEtagCache(url: string): EtagCache | null {
  try {
    const raw = localStorage.getItem(etagKey(url));
    return raw ? (JSON.parse(raw) as EtagCache) : null;
  } catch {
    return null;
  }
}

async function writeEtagCache(url: string, cache: EtagCache) {
  try {
    const serialized = JSON.stringify(cache);
    if (serialized.length > MAX_ETAG_BYTES) return;
    localStorage.setItem(etagKey(url), serialized);
  } catch {
    /* ignore quota errors */
  }
}

export class AxiosHelperUtils {
  createAuthorizationHeader(
    headers: RawAxiosRequestHeaders | AxiosHeaders,
    skipAuthorization = false,
  ): RawAxiosRequestHeaders | AxiosHeaders {
    const next = { ...headers } as RawAxiosRequestHeaders;
    if (!skipAuthorization) {
      const token = authTokenStore.getAccessToken();
      if (token) next.Authorization = `Bearer ${token}`;
    }
    if (!hasHeader(next, "Accept")) next.Accept = "application/json";
    if (!hasHeader(next, "Content-Type")) next["Content-Type"] = "application/json";
    return next;
  }

  async get<T>(
    url: string,
    skipAuthorization = false,
    headers: RawAxiosRequestHeaders | AxiosHeaders = {},
  ) {
    headers = this.createAuthorizationHeader(headers, skipAuthorization);
    const cached = readEtagCache(url);

    if (cached?.Etag) {
      setHeader(headers, "If-None-Match", cached.Etag);
    }

    const response = await axiosInstance.get<T>(url, { headers, validateStatus: (s) => s < 500 });

    if (response.status === 304 && cached) {
      return cached.Data as T;
    }

    const etag = response.headers.etag ?? response.headers.ETag;
    if (etag && response.status === 200) {
      await writeEtagCache(url, { Data: response.data, Etag: String(etag) });
    }

    return response.data;
  }

  async delete<T>(
    url: string,
    skipAuthorization = false,
    headers: RawAxiosRequestHeaders | AxiosHeaders = {},
  ) {
    headers = this.createAuthorizationHeader(headers, skipAuthorization);
    const response = await axiosInstance.delete<T>(url, { headers });
    return response.data;
  }

  async post<T>(
    url: string,
    data: unknown,
    skipAuthorization = false,
    headers: RawAxiosRequestHeaders | AxiosHeaders = {},
  ) {
    headers = this.createAuthorizationHeader(headers, skipAuthorization);
    const response = await axiosInstance.post<T>(url, data, { headers });
    return response.data;
  }

  async put<T>(
    url: string,
    data: unknown,
    skipAuthorization = false,
    headers: RawAxiosRequestHeaders | AxiosHeaders = {},
  ) {
    headers = this.createAuthorizationHeader(headers, skipAuthorization);
    const response = await axiosInstance.put<T>(url, data, { headers });
    return response.data;
  }
}

export const axiosHelper = new AxiosHelperUtils();
