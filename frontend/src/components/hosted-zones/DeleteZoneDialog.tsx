"use client";

import { Alert } from "@/components/ui/Alert";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ApiError } from "@/lib/api-client";
import { displayName, plural } from "@/lib/format";
import type { HostedZone } from "@/lib/types";

// Every zone starts with an apex NS and SOA record; only the rest are the user's.
const DEFAULT_RECORDS = 2;

interface DeleteZoneDialogProps {
  zone: HostedZone;
  loading: boolean;
  error: unknown;
  onConfirm: (force: boolean) => void;
  onCancel: () => void;
}

export function DeleteZoneDialog({ zone, loading, error, onConfirm, onCancel }: DeleteZoneDialogProps) {
  const userRecords = Math.max(zone.record_count - DEFAULT_RECORDS, 0);
  return (
    <ConfirmDialog
      title="Delete hosted zone"
      confirmLabel="Delete"
      requireText="delete"
      loading={loading}
      error={error instanceof ApiError ? error.message : error ? "The hosted zone couldn't be deleted." : null}
      // Records are deleted along with the zone; the typed confirmation below is the user's consent to that.
      onConfirm={() => onConfirm(userRecords > 0)}
      onCancel={onCancel}
    >
      <p>
        Are you sure you want to delete the hosted zone <strong>{displayName(zone.name)}</strong>? This action can&apos;t be undone.
      </p>
      {userRecords > 0 && (
        <div style={{ marginTop: 12 }}>
          <Alert type="warning" header={`This hosted zone contains ${plural(userRecords, "record")}`}>
            All records other than the default NS and SOA records will be permanently deleted with the zone.
          </Alert>
        </div>
      )}
    </ConfirmDialog>
  );
}
