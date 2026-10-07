"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { User } from "@/lib/types";

export const SESSION_KEY = ["session"] as const;

export function useSession() {
  return useQuery({
    queryKey: SESSION_KEY,
    queryFn: () => api<{ user: User }>("/auth/session").then((r) => r.user),
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (credentials: { username: string; password: string }) =>
      api<{ user: User }>("/auth/login", { method: "POST", body: credentials }).then((r) => r.user),
    onSuccess: (user) => queryClient.setQueryData(SESSION_KEY, user),
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: () => api("/auth/logout", { method: "POST" }),
    // Even if the call fails the user asked to leave. A full navigation drops every cached
    // query and any in-memory state of the previous session, and avoids a "?next=" redirect race.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- deliberate hard navigation, see above
    onSettled: () => window.location.assign("/login"),
  });
}
