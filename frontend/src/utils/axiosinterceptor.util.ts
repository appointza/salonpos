import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { authTokenStore } from "@/utils/auth-token.util";
import { environment } from "@/utils/environment.util";

type QueueConfig = InternalAxiosRequestConfig & {
  retry?: boolean;
  __skipQueuePolling?: boolean;
};

let isRefreshing = false;
const failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null) {
  for (const promise of failedQueue) {
    if (error) promise.reject(error);
    else if (token) promise.resolve(token);
  }
  failedQueue.length = 0;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function getBaseUrlForRequest(config: QueueConfig) {
  if (config.baseURL) return String(config.baseURL);
  try {
    const u = new URL(config.url ?? "", config.baseURL || window.location.origin);
    return `${u.protocol}//${u.host}`;
  } catch {
    return environment.baseurl || "";
  }
}

function buildQueuePollUrl(config: QueueConfig, queueId: string) {
  const base = getBaseUrlForRequest(config);
  return `${base}/File/QueueResultStatus/${queueId}`;
}

async function pollQueueUntilDone(
  queueId: string,
  originalConfig: QueueConfig,
  opts?: { initialDelayMs?: number; pollEveryMs?: number; maxAttempts?: number },
): Promise<AxiosResponse> {
  const initialDelayMs = opts?.initialDelayMs ?? 0;
  const pollEveryMs = opts?.pollEveryMs ?? 2000;
  const maxAttempts = opts?.maxAttempts ?? 180;
  const pollUrl = buildQueuePollUrl(originalConfig, queueId);

  if (initialDelayMs > 0) await sleep(initialDelayMs);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const pollResp = await axios.get(pollUrl, {
      headers: originalConfig.headers,
      __skipQueuePolling: true,
    } as QueueConfig);

    const status = String(pollResp.data?.status ?? pollResp.data?.Status ?? "").toLowerCase();
    const isCompleted = Boolean(pollResp.data?.IsCompleted) || status === "completed";
    const isFailed = status === "failed" || Boolean(pollResp.data?.IsFailed);

    if (isCompleted) {
      const finalData =
        pollResp.data?.data ?? pollResp.data?.Data ?? pollResp.data?.Result ?? pollResp.data;
      return {
        data: finalData,
        status: 200,
        statusText: "OK",
        headers: pollResp.headers,
        config: originalConfig,
        request: pollResp.request,
      };
    }

    if (isFailed) {
      const err = new Error("Queue processing failed") as Error & { response?: AxiosResponse };
      err.response = pollResp;
      throw err;
    }

    await sleep(pollEveryMs);
  }

  const timeoutErr = new Error("Queue polling timed out") as Error & { code?: string };
  timeoutErr.code = "QUEUE_POLL_TIMEOUT";
  throw timeoutErr;
}

function extractQueueInfo(respOrData: AxiosResponse | { data?: unknown }) {
  const data = (respOrData as AxiosResponse).data ?? respOrData;
  const d = data as Record<string, unknown>;
  const queueId =
    d.QueueId ??
    d.queueId ??
    d.QueueID ??
    (d.Data as Record<string, unknown> | undefined)?.QueueId ??
    (d.Result as Record<string, unknown> | undefined)?.queueId;

  const statusLike =
    (respOrData as AxiosResponse).status ?? d.StatusCode ?? d.statusCode ?? d.Status ?? d.status;
  const initialDelayMs = Number(statusLike) === 601 ? 2000 : 0;

  return { queueId: queueId ? String(queueId) : undefined, initialDelayMs };
}

function shouldHandleAsQueued(resp: AxiosResponse, config: QueueConfig) {
  if (!resp || config.__skipQueuePolling) return false;
  const bodyStatusCode =
    (resp.data as Record<string, unknown>)?.StatusCode ?? (resp.data as Record<string, unknown>)?.statusCode;
  return resp.status === 600 || resp.status === 601 || bodyStatusCode === 600 || bodyStatusCode === 601;
}

/** Wire when backend exposes refresh tokens. */
async function refreshAccessToken(): Promise<string> {
  const refresh = authTokenStore.getRefreshToken();
  if (!refresh) throw new Error("No refresh token");
  throw new Error("Token refresh not configured");
}

const axiosInstance = axios.create({
  baseURL: environment.baseurl,
  headers: { Accept: "application/json" },
});

axiosInstance.interceptors.response.use(
  (response) => {
    if (shouldHandleAsQueued(response, response.config as QueueConfig)) {
      const { queueId, initialDelayMs } = extractQueueInfo(response);
      if (queueId) {
        return pollQueueUntilDone(queueId, response.config as QueueConfig, {
          initialDelayMs,
          pollEveryMs: 2000,
        });
      }
    }
    return response;
  },
  async (error: { config?: QueueConfig; response?: AxiosResponse }) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    if (error.response?.status === 401 && !originalRequest.retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(axiosInstance(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest.retry = true;
      isRefreshing = true;

      try {
        const token = await refreshAccessToken();
        authTokenStore.set({
          ...authTokenStore.get()!,
          access_token: token,
        });
        processQueue(null, token);
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        authTokenStore.clear();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 304) {
      return Promise.resolve(error.response);
    }

    if (originalRequest.__skipQueuePolling) {
      return Promise.reject(error);
    }

    if (
      error.response &&
      (error.response.status === 600 || error.response.status === 601) &&
      error.response.data
    ) {
      const { queueId, initialDelayMs } = extractQueueInfo(error.response);
      if (queueId) {
        return pollQueueUntilDone(queueId, originalRequest, { initialDelayMs, pollEveryMs: 2000 });
      }
    }

    if (error.response?.status === 600) {
      return Promise.resolve(error.response);
    }

    return Promise.reject(error);
  },
);

export { axiosInstance, axiosInstance as axios };
