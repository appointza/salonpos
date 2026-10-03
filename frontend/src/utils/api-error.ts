/** Pull the human message from Krios/ActionRes-style API error bodies. */
export function readApiBodyMessage(data: unknown): string {
  if (data == null) return "";
  if (typeof data === "string") {
    const text = data.trim();
    if (!text) return "";
    try {
      return readApiBodyMessage(JSON.parse(text));
    } catch {
      return text;
    }
  }
  if (typeof data === "object") {
    const o = data as Record<string, unknown>;
    for (const key of ["message", "errorMessage", "Message", "ErrorMessage"]) {
      const value = o[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }
  return "";
}

export function applyApiErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") return error;
  const e = error as { message?: string; response?: { data?: unknown } };
  const fromBody = readApiBodyMessage(e.response?.data);
  if (fromBody) e.message = fromBody;
  return error;
}

export function apiErrorMessage(err: unknown, fallback: string) {
  applyApiErrorMessage(err);
  if (err instanceof Error) {
    const msg = err.message.trim();
    if (msg && !/^Request failed with status code \d+$/i.test(msg) && msg !== "400") return msg;
  }
  const fromBody =
    err && typeof err === "object" && "response" in err
      ? readApiBodyMessage((err as { response?: { data?: unknown } }).response?.data)
      : "";
  return fromBody || fallback;
}
