import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

const queryClient = new QueryClient();

// Public paths where we should NOT auto-redirect to OAuth login.
// These pages have their own login UI (email+password form) or are fully public.
const PUBLIC_PATHS = ["/", "/login", "/info", "/get-started", "/activate-account",
  "/webinar", "/refinance", "/first-time-buyer", "/book",
  "/partner-program", "/privacy-policy", "/terms",
  "/lead-capture", "/mortgage",
];

const isPublicPath = () => {
  if (typeof window === "undefined") return true;
  const path = window.location.pathname;
  return PUBLIC_PATHS.some(p => path === p || path.startsWith(p + "/") || path.startsWith("/webinar") || path.startsWith("/seo") || path.startsWith("/portal") || path.startsWith("/book"));
};

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;
  // Never redirect on public pages — they have their own login UI
  if (isPublicPath()) return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  // Redirect to /api/client-login (email+password) instead of Manus OAuth.
  // /api/* routes are NOT intercepted by the Manus hosting platform.
  window.location.replace("/api/client-login");
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
