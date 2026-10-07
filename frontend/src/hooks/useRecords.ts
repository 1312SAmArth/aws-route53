"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildQuery } from "@/lib/api-client";
import type { DnsRecord, Page, RecordInput, RecordType, RoutingPolicy } from "@/lib/types";

export interface RecordListParams {
  page: number;
  pageSize: number;
  search: string;
  type: RecordType | "";
  policy: RoutingPolicy | "";
  alias: "true" | "false" | "";
}

export function useRecords(zoneId: string, params: RecordListParams) {
  return useQuery({
    queryKey: ["records", zoneId, params],
    queryFn: ({ signal }) =>
      api<Page<DnsRecord>>(
        `/hosted-zones/${zoneId}/records${buildQuery({ page: params.page, page_size: params.pageSize, search: params.search, type: params.type, routing_policy: params.policy, alias: params.alias })}`,
        { signal },
      ),
    placeholderData: keepPreviousData,
  });
}

export function useRecord(recordId: number) {
  return useQuery({
    queryKey: ["record", recordId],
    queryFn: ({ signal }) => api<DnsRecord>(`/records/${recordId}`, { signal }),
  });
}

function useInvalidateAfterRecordWrite(zoneId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["records", zoneId] }),
      queryClient.invalidateQueries({ queryKey: ["zone", zoneId] }),
      queryClient.invalidateQueries({ queryKey: ["zones"] }),
    ]);
}

export function useCreateRecord(zoneId: string) {
  const invalidate = useInvalidateAfterRecordWrite(zoneId);
  return useMutation({
    mutationFn: (input: RecordInput) => api<DnsRecord>(`/hosted-zones/${zoneId}/records`, { method: "POST", body: input }),
    onSuccess: invalidate,
  });
}

export function useUpdateRecord(zoneId: string, recordId: number) {
  const invalidate = useInvalidateAfterRecordWrite(zoneId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<RecordInput>) => api<DnsRecord>(`/records/${recordId}`, { method: "PATCH", body: input }),
    onSuccess: (record) => {
      queryClient.setQueryData(["record", recordId], record);
      return invalidate();
    },
  });
}

export function useDeleteRecords(zoneId: string) {
  const invalidate = useInvalidateAfterRecordWrite(zoneId);
  return useMutation({
    mutationFn: async (ids: number[]) => {
      if (ids.length === 1) {
        await api(`/records/${ids[0]}`, { method: "DELETE" });
        return { deleted: 1 };
      }
      return api<{ deleted: number }>(`/hosted-zones/${zoneId}/records/batch-delete`, { method: "POST", body: { ids } });
    },
    onSuccess: invalidate,
  });
}

export interface ImportResult {
  created: number;
  skipped: { line: number; reason: string }[];
}

export function useImportRecords(zoneId: string) {
  const invalidate = useInvalidateAfterRecordWrite(zoneId);
  return useMutation({
    mutationFn: (content: string) => api<ImportResult>(`/hosted-zones/${zoneId}/records/import`, { method: "POST", body: { content } }),
    onSuccess: invalidate,
  });
}
