"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DeleteZoneDialog } from "@/components/hosted-zones/DeleteZoneDialog";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button, LinkButton } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { CopyButton } from "@/components/ui/CopyButton";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Inputs";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { ZoneTypeBadge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { useFlash } from "@/context/FlashContext";
import { useListParams } from "@/hooks/useListParams";
import { useDeleteZone, useZones } from "@/hooks/useZones";
import { displayName } from "@/lib/format";
import type { HostedZone, ZoneType } from "@/lib/types";
import styles from "./hosted-zones.module.css";

const PAGE_SIZE = 10;

const columns: Column<HostedZone>[] = [
  {
    id: "name",
    header: "Hosted zone name",
    cell: (z) => <Link href={`/hosted-zones/${z.id}`}>{displayName(z.name)}</Link>,
  },
  { id: "type", header: "Type", cell: (z) => <ZoneTypeBadge type={z.type} />, width: "100px" },
  { id: "createdBy", header: "Created by", cell: (z) => z.created_by, width: "120px" },
  { id: "records", header: "Record count", cell: (z) => z.record_count, width: "120px", align: "right" },
  { id: "comment", header: "Description", cell: (z) => z.comment ?? <span className={styles.muted}>–</span> },
  {
    id: "id",
    header: "Hosted zone ID",
    cell: (z) => (
      <span className={styles.idCell}>
        <span className="mono">{z.id}</span>
        <CopyButton text={z.id} label="hosted zone ID" />
      </span>
    ),
    width: "250px",
  },
];

export default function HostedZonesPage() {
  const router = useRouter();
  const flash = useFlash();
  const [{ page, search, type }, setList] = useListParams();
  const zoneType: ZoneType | "" = type === "PUBLIC" || type === "PRIVATE" ? type : "";

  const zones = useZones({ page, pageSize: PAGE_SIZE, search, type: zoneType });
  const deleteZone = useDeleteZone();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  const items = zones.data?.items ?? [];
  const total = zones.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selected = items.find((z) => z.id === selectedIds[0]);
  const filtered = search !== "" || zoneType !== "";

  // A page past the end (e.g. after deleting the last row of the last page) steps back instead of showing nothing.
  const overshoot = zones.data !== undefined && page > pageCount;
  useEffect(() => {
    if (overshoot) setList({ page: pageCount });
  }, [overshoot, pageCount, setList]);

  const confirmDelete = (force: boolean) => {
    if (!selected) return;
    deleteZone.mutate(
      { zoneId: selected.id, force },
      {
        onSuccess: () => {
          flash.notify({ type: "success", header: `Successfully deleted hosted zone ${displayName(selected.name)}.` });
          setSelectedIds([]);
          setDeleting(false);
          deleteZone.reset();
        },
      },
    );
  };

  const emptyContent = filtered ? (
    <EmptyState
      title="No matching hosted zones"
      description="No hosted zones match your filter. Try a different search term or clear the filter."
      action={
        <Button
          onClick={() => {
            setList({ search: "", type: "" });
          }}
        >
          Clear filter
        </Button>
      }
    />
  ) : (
    <EmptyState
      title="No hosted zones"
      description="You don't have any hosted zones yet. Create one to start managing DNS records for a domain."
      action={
        <LinkButton href="/hosted-zones/new" variant="primary">
          Create hosted zone
        </LinkButton>
      }
    />
  );

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  return (
    <>
      <Breadcrumbs items={[{ label: "Hosted zones" }]} />
      <PageHeader
        title="Hosted zones"
        description="A hosted zone is a container for records, and records contain information about how you want to route traffic for a specific domain, such as example.com, and its subdomains."
      />
      <Container
        id="zones"
        title="Hosted zones"
        count={zones.data ? total : undefined}
        actions={
          <>
            <Button variant="icon" icon="refresh" aria-label="Refresh hosted zones" onClick={() => zones.refetch()} disabled={zones.isFetching} />
            <Button disabled={!selected} onClick={() => selected && router.push(`/hosted-zones/${selected.id}`)}>
              View details
            </Button>
            <Button disabled={!selected} onClick={() => selected && router.push(`/hosted-zones/${selected.id}/edit`)}>
              Edit
            </Button>
            <Button disabled={!selected} onClick={() => setDeleting(true)}>
              Delete
            </Button>
            <LinkButton href="/hosted-zones/new" variant="primary">
              Create hosted zone
            </LinkButton>
          </>
        }
        flush
      >
        <div className={styles.filters}>
          <div className={styles.search}>
            <SearchInput
              value={search}
              onChange={(value) => setList({ search: value })}
              placeholder="Filter hosted zones by property or value"
              ariaLabel="Filter hosted zones"
            />
          </div>
          <div className={styles.typeFilter}>
            <Select aria-label="Filter by type" value={zoneType} onChange={(e) => setList({ type: e.target.value })}>
              <option value="">All types</option>
              <option value="PUBLIC">Public</option>
              <option value="PRIVATE">Private</option>
            </Select>
          </div>
          <div className={styles.pager}>
            {zones.data && total > 0 && (
              <span className={styles.range}>
                {rangeStart}–{rangeEnd} of {total}
              </span>
            )}
            <Pagination page={page} pageCount={pageCount} onChange={(p) => setList({ page: p })} />
          </div>
        </div>
        <DataTable
          caption="Hosted zones"
          columns={columns}
          rows={items}
          getRowId={(z) => z.id}
          selectionMode="single"
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          loading={zones.isPending}
          error={zones.isError ? <ErrorState error={zones.error} onRetry={() => zones.refetch()} title="Unable to load hosted zones" /> : undefined}
          empty={emptyContent}
        />
      </Container>

      {deleting && selected && (
        <DeleteZoneDialog
          zone={selected}
          loading={deleteZone.isPending}
          error={deleteZone.error}
          onConfirm={confirmDelete}
          onCancel={() => {
            setDeleting(false);
            deleteZone.reset();
          }}
        />
      )}
    </>
  );
}
