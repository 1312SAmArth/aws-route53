"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ApiError } from "@/lib/api-client";
import { FlashProvider } from "./FlashContext";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        // Retry once for connectivity blips; never retry a response the server deliberately sent.
        retry: (failureCount, error) => error instanceof ApiError && error.status === 0 && failureCount < 1,
      },
    },
  });
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(makeQueryClient);
  return (
    <QueryClientProvider client={client}>
      <FlashProvider>{children}</FlashProvider>
    </QueryClientProvider>
  );
}
