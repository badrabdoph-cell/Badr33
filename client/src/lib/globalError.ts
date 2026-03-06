export type GlobalErrorInfo = {
  id: string;
  message: string;
  stack?: string;
  time: string;
  source?: string;
  details?: string;
};

type Listener = (error: GlobalErrorInfo) => void;

let lastError: GlobalErrorInfo | null = null;
const listeners = new Set<Listener>();
let handlersInstalled = false;

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return { message: error.message || "Unknown error", stack: error.stack };
  }
  if (typeof error === "string") {
    return { message: error, stack: undefined };
  }
  try {
    return { message: JSON.stringify(error), stack: undefined };
  } catch {
    return { message: "Unknown error", stack: undefined };
  }
}

export function reportGlobalError(
  error: unknown,
  source?: string,
  details?: string
) {
  if (typeof window === "undefined") return;
  const normalized = normalizeError(error);
  const info: GlobalErrorInfo = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    message: normalized.message,
    stack: normalized.stack,
    time: new Date().toISOString(),
    source,
    details,
  };
  lastError = info;
  listeners.forEach((listener) => listener(info));
}

export function getLastGlobalError() {
  return lastError;
}

export function subscribeGlobalError(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function formatGlobalError(error: GlobalErrorInfo) {
  const parts = [
    `Time: ${error.time}`,
    error.source ? `Source: ${error.source}` : undefined,
    `Message: ${error.message}`,
    error.details ? `Details: ${error.details}` : undefined,
    error.stack ? `Stack:\\n${error.stack}` : undefined,
  ].filter(Boolean);
  return parts.join("\\n");
}

export function installGlobalErrorHandlers() {
  if (typeof window === "undefined" || handlersInstalled) return;
  handlersInstalled = true;
  window.addEventListener("error", (event) => {
    reportGlobalError(event.error ?? event.message, "window.error");
  });
  window.addEventListener("unhandledrejection", (event) => {
    reportGlobalError(event.reason, "unhandledrejection");
  });
}
