"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildQuery } from "@/lib/api-client";
import type { HostedZone, HostedZoneInput, Page, ZoneType } from "@/lib/types";

export interface ZoneListParams {
  page: number;
  pageSize: number;
  search: string;
  type: ZoneType | "";
}

export function useZones(params: ZoneListParams) {
  return useQuery({
    queryKey: ["zones", params],
    queryFn: ({ signal }) =>
      api<Page<HostedZone>>(`/hosted-zones${buildQuery({ page: params.page, page_size: params.pageSize, search: params.search, type: params.type })}`, { signal }),
    placeholderData: keepPreviousData,
  });
}

export function useZone(zoneId: string) {
  return useQuery({
    queryKey: ["zone", zoneId],
    queryFn: ({ signal }) => api<HostedZone>(`/hosted-zones/${zoneId}`, { signal }),
  });
}

export function useCreateZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: HostedZoneInput) => api<HostedZone>("/hosted-zones", { method: "POST", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["zones"] }),
  });
}

export function useUpdateZone(zoneId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { comment: string | null }) => api<HostedZone>(`/hosted-zones/${zoneId}`, { method: "PATCH", body: input }),
    onSuccess: (zone) => {
      queryClient.setQueryData(["zone", zoneId], zone);
      return queryClient.invalidateQueries({ queryKey: ["zones"] });
    },
  });
}

export function useDeleteZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ zoneId, force }: { zoneId: string; force?: boolean }) =>
      api(`/hosted-zones/${zoneId}${buildQuery({ force: force ? "true" : undefined })}`, { method: "DELETE" }),
    onSuccess: (_, { zoneId }) => {
      queryClient.removeQueries({ queryKey: ["zone", zoneId] });
      queryClient.removeQueries({ queryKey: ["records", zoneId] });
      return queryClient.invalidateQueries({ queryKey: ["zones"] });
    },
  });
}
