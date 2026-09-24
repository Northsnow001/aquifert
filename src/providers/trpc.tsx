import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import superjson from "superjson";
import type { AppRouter } from "../../server/router";
import type { ReactNode } from "react";

export const trpc = createTRPCReact<AppRouter>();

const queryClient = new QueryClient();
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        // Vercel file routing does not treat api/trpc/[procedure].ts as a
        // dynamic segment for this Vite project, so the browser rewrites
        // /api/trpc/<proc> → /api/rpc?trpcPath=<proc>.
        const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";
        const url = new URL(raw, base);
        const marker = "/api/trpc/";
        if (url.pathname.startsWith(marker)) {
          const procedurePath = url.pathname.slice(marker.length);
          url.pathname = "/api/rpc";
          url.searchParams.set("trpcPath", procedurePath);
        }
        return globalThis.fetch(url.toString(), {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

export function TRPCProvider({ children }: { children: ReactNode }) {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
