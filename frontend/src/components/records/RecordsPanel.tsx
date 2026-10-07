"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, LinkButton } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Container } from "@/components/ui/Container";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Select } from "@/components/ui/Inputs";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { useFlash } from "@/context/FlashContext";
import { useListParams } from "@/hooks/useListParams";
import { useDeleteRecords, useRecords } from "@/hooks/useRecords";
import { ApiError } from "@/lib/api-client";
import { displayName, plural } from "@/lib/format";
import { RECORD_TYPES, type DnsRecord, type HostedZone, type RecordType } from "@/lib/types";
import { ImportZoneFileDialog } from "./ImportZoneFileDialog";
import { RecordDetails } from "./RecordDetails";
import { RecordValues } from "./RecordValues";
import styles from "./RecordsPanel.module.css";

const PAGE_SIZE = 10;

const columns: Column<DnsRecord>[] = [
  {
    id: "name",
    header: "Record name",
    cell: (r) => <span className={styles.name}>{displayName(r.name)}</span>,
    width: "220px",
  },
  { id: "type", header: "Type", cell: (r) => r.type, width: "80px" },
  { id: "policy", header: "Routing policy", cell: (r) => (r.routing_policy === "WEIGHTED" ? "Weighted" : "Simple"), width: "130px" },
  { id: "differentiator", header: "Differentiator", cell: (r) => (r.set_identifier ? `${r.set_identifier} (weight ${r.weight})` : "–"), width: "170px" },
  { id: "alias", header: "Alias", cell: (r) => (r.alias_target ? "Yes" : "No"), width: "70px" },
  { id: "value", header: "Value / route traffic to", cell: (r) => <RecordValues record={r} /> },
  { id: "health", header: "Evaluate target health", cell: (r) => (r.alias_target ? (r.evaluate_target_health ? "Yes" : "No") : "–"), width: "160px" },
  { id: "ttl", header: "TTL (seconds)", cell: (r) => r.ttl ?? "–", width: "120px", align: "right" },
];

export function RecordsPanel({ zone }: { zone: HostedZone }) {
  const router = useRouter();
  const flash = useFlash();
  const [{ page, search, type }, setList] = useListParams();
  const recordType = (RECORD_TYPES as readonly string[]).includes(type) ? (type as RecordType) : "";

  const records = useRecords(zone.id, { page, pageSize: PAGE_SIZE, search, type: recordType });
  const deleteRecords = useDeleteRecords(zone.id);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [importing, setImporting] = useState(false);

  const items = records.data?.items ?? [];
  const total = records.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selected = items.filter((r) => selectedIds.includes(String(r.id)));
  const single = selected.length === 1 ? selected[0] : undefined;
  const hasSystem = selected.some((r) => r.is_system);
  const filtered = search !== "" || recordType !== "";

  const overshoot = records.data !== undefined && page > pageCount;
  useEffect(() => {
    if (overshoot) setList({ page: pageCount });
  }, [overshoot, pageCount, setList]);

  // Selection belongs to the rows on screen: changing page or filter clears it so actions never hit hidden rows.
  const changeList = (patch: Parameters<typeof setList>[0]) => {
    setSelectedIds([]);
    setList(patch);
  };

  const confirmDelete = () => {
    const ids = selected.map((r) => r.id);
    deleteRecords.mutate(ids, {
      onSuccess: () => {
        flash.notify({ type: "success", header: `Successfully deleted ${plural(ids.length, "record")}.` });
        setSelectedIds([]);
        setConfirmingDelete(false);
        deleteRecords.reset();
      },
    });
  };

  const emptyContent = filtered ? (
    <EmptyState
      title="No matching records"
      description="No records match your filter. Try a different search term or record type."
      action={<Button onClick={() => changeList({ search: "", type: "" })}>Clear filter</Button>}
    />
  ) : (
    <EmptyState
      title="No records"
      description="This hosted zone has no records. Create a record to start routing traffic."
      action={
        <LinkButton href={`/hosted-zones/${zone.id}/records/new`} variant="primary">
          Create record
        </LinkButton>
      }
    />
  );

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  return (
    <div className={styles.panel}>
      <Container
        id="records"
        title="Records"
        count={records.data ? total : undefined}
        description="Records define how traffic is routed for this domain and its subdomains."
        flush
        actions={
          <>
            <Button variant="icon" icon="refresh" aria-label="Refresh records" onClick={() => records.refetch()} disabled={records.isFetching} />
            <Button disabled={!single} onClick={() => single && router.push(`/hosted-zones/${zone.id}/records/${single.id}/edit`)}>
              Edit record
            </Button>
            <Button disabled={selected.length === 0 || hasSystem} onClick={() => setConfirmingDelete(true)}>
              Delete {selected.length > 1 ? "records" : "record"}
            </Button>
            <Button onClick={() => setImporting(true)}>Import zone file</Button>
            <LinkButton href={`/hosted-zones/${zone.id}/records/new`} variant="primary">
              Create record
            </LinkButton>
          </>
        }
      >
        <div className={styles.filters}>
          <div className={styles.search}>
            <SearchInput
              value={search}
              onChange={(value) => changeList({ search: value })}
              placeholder="Filter records by property or value"
              ariaLabel="Filter records"
            />
          </div>
          <div className={styles.typeFilter}>
            <Select aria-label="Filter by record type" value={recordType} onChange={(e) => changeList({ type: e.target.value })}>
              <option value="">All types</option>
              {RECORD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
          <div className={styles.pager}>
            {records.data && total > 0 && (
              <span className={styles.range}>
                {rangeStart}–{rangeEnd} of {total}
              </span>
            )}
            <Pagination page={page} pageCount={pageCount} onChange={(p) => changeList({ page: p })} />
          </div>
        </div>
        {hasSystem && (
          <p className={styles.hint} role="status">
            The default NS and SOA records can&apos;t be deleted. Deselect them to delete other records.
          </p>
        )}
        <DataTable
          caption={`DNS records in ${displayName(zone.name)}`}
          columns={columns}
          rows={items}
          getRowId={(r) => String(r.id)}
          selectionMode="multi"
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          loading={records.isPending}
          error={records.isError ? <ErrorState error={records.error} onRetry={() => records.refetch()} title="Unable to load records" /> : undefined}
          empty={emptyContent}
        />
      </Container>

      {single && <RecordDetails zone={zone} record={single} />}

      {importing && <ImportZoneFileDialog zoneId={zone.id} onClose={() => setImporting(false)} />}

      {confirmingDelete && (
        <ConfirmDialog
          title={selected.length === 1 ? "Delete record" : `Delete ${selected.length} records`}
          confirmLabel="Delete"
          loading={deleteRecords.isPending}
          error={deleteRecords.error instanceof ApiError ? deleteRecords.error.message : deleteRecords.error ? "The records couldn't be deleted." : null}
          onConfirm={confirmDelete}
          onCancel={() => {
            setConfirmingDelete(false);
            deleteRecords.reset();
          }}
        >
          <p>{selected.length === 1 ? "Are you sure you want to delete this record?" : "Are you sure you want to delete these records?"} This action can&apos;t be undone.</p>
          <ul className={styles.deleteList}>
            {selected.map((r) => (
              <li key={r.id}>
                <strong>{displayName(r.name)}</strong> <span className={styles.muted}>({r.type})</span>
              </li>
            ))}
          </ul>
        </ConfirmDialog>
      )}
    </div>
  );
}
