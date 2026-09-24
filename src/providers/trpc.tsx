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
        const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";
        const url = new URL(raw, base);
        const marker = "/api/trpc/";
        let procedurePath = "";
        if (url.pathname.startsWith(marker)) {
          procedurePath = url.pathname.slice(marker.length);
          url.pathname = "/api/rpc";
          url.searchParams.set("trpcPath", procedurePath);
        }
        const response = globalThis.fetch(url.toString(), {
          ...(init ?? {}),
          credentials: "include",
        });
        // #region agent log
        void response.then((res) => {
          fetch("http://127.0.0.1:7493/ingest/4e11581d-7f60-4e24-b571-b73ce990ecc0",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"9db8e3"},body:JSON.stringify({sessionId:"9db8e3",runId:"post-fix",hypothesisId:"A",location:"src/providers/trpc.tsx:fetch",message:"trpc response",data:{procedurePath,status:res.status,contentType:res.headers.get("content-type")},timestamp:Date.now()})}).catch(()=>{});
        }).catch(() => {});
        // #endregion
        return response;
      },
    }),
  ],
});

export function TRPCProvider({ children }: { children: ReactNode }) {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
