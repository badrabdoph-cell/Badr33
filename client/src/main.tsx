import { trpc } from "@/lib/trpc";
import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";
import { installGlobalErrorHandlers } from "@/lib/globalError";

const shouldAllowContextMenu = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest("input, textarea, [contenteditable='true'], [data-allow-contextmenu]")
  );
};

if (typeof window !== "undefined") {
  installGlobalErrorHandlers();

  const root = document.documentElement;
  root.lang = "ar";
  root.dir = "rtl";
  root.setAttribute("translate", "no");
  root.classList.add("notranslate");
  if (document.body) {
    document.body.setAttribute("translate", "no");
    document.body.setAttribute("dir", "rtl");
    document.body.classList.add("notranslate");
  }

  document.addEventListener(
    "contextmenu",
    (event) => {
      if (shouldAllowContextMenu(event.target)) return;
      event.preventDefault();
    },
    { capture: true }
  );

  document.addEventListener(
    "dragstart",
    (event) => {
      const target = event.target as HTMLElement | null;
      if (target && target.tagName === "IMG") {
        event.preventDefault();
      }
    },
    { capture: true }
  );

  document.addEventListener("keydown", (event) => {
    if (event.key === "PrintScreen") {
      event.preventDefault();
      return;
    }

    const key = event.key.toLowerCase();
    const meta = event.ctrlKey || event.metaKey;

    if (meta && ["s", "p", "u"].includes(key)) {
      event.preventDefault();
      return;
    }

    if (meta && event.shiftKey && ["i", "j", "c"].includes(key)) {
      event.preventDefault();
    }
  });

  const analyticsEndpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT as string | undefined;
  const analyticsWebsiteId = import.meta.env.VITE_ANALYTICS_WEBSITE_ID as string | undefined;
  if (analyticsEndpoint && analyticsWebsiteId) {
    const normalized = analyticsEndpoint.replace(/\/$/, "");
    const src = `${normalized}/umami`;
    if (!document.querySelector('script[data-umami="true"]')) {
      const script = document.createElement("script");
      script.defer = true;
      script.src = src;
      script.setAttribute("data-website-id", analyticsWebsiteId);
      script.setAttribute("data-umami", "true");
      document.body.appendChild(script);
    }
  }
}

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;
  const isUnauthorized =
    error.message === UNAUTHED_ERR_MSG || error.message === NOT_ADMIN_ERR_MSG;

  if (!isUnauthorized) return;

  if (window.location.pathname.startsWith("/admin")) {
    window.location.reload();
    return;
  }

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
