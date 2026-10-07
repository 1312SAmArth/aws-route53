"use client";

import { useParams, useRouter } from "next/navigation";
import { ZoneLoader } from "@/components/hosted-zones/ZoneLoader";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { RecordForm } from "@/components/records/RecordForm";
import { LinkButton } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { useFlash } from "@/context/FlashContext";
import { useRecord, useUpdateRecord } from "@/hooks/useRecords";
import { ApiError } from "@/lib/api-client";
import { displayName } from "@/lib/format";
import type { RecordInput } from "@/lib/types";

export default function EditRecordPage() {
  const { zoneId, recordId } = useParams<{ zoneId: string; recordId: string }>();
  const id = Number(recordId);
  const router = useRouter();
  const flash = useFlash();
  const record = useRecord(id);
  const updateRecord = useUpdateRecord(zoneId, id);
  const backHref = `/hosted-zones/${zoneId}`;

  /** The default NS/SOA records only accept a TTL (and NS values); the API rejects anything else. */
  const toPatch = (input: RecordInput): Partial<RecordInput> =>
    record.data?.is_system ? { ttl: input.ttl, ...(record.data.type === "NS" ? { values: input.values } : {}) } : input;

  return (
    <ZoneLoader zoneId={zoneId}>
      {(zone) => (
        <>
          <Breadcrumbs
            items={[
              { label: "Hosted zones", href: "/hosted-zones" },
              { label: displayName(zone.name), href: backHref },
              { label: "Edit record" },
            ]}
          />
          <PageHeader title="Edit record" description={record.data ? `${record.data.type} record ${displayName(record.data.name)}` : undefined} />
          {record.isPending ? (
            <Container>
              <LoadingState label="Loading record" />
            </Container>
          ) : record.isError || record.data.hosted_zone_id !== zone.id ? (
            <Container>
              {record.error instanceof ApiError && record.error.status !== 404 ? (
                <ErrorState error={record.error} onRetry={() => record.refetch()} title="Unable to load record" />
              ) : (
                <EmptyState
                  title="Record not found"
                  description="This record does not exist in this hosted zone. It may have been deleted."
                  action={
                    <LinkButton href={backHref} variant="primary">
                      Back to hosted zone
                    </LinkButton>
                  }
                />
              )}
            </Container>
          ) : (
            <RecordForm
              zone={zone}
              record={record.data}
              submitting={updateRecord.isPending}
              serverError={updateRecord.error instanceof ApiError ? updateRecord.error : null}
              cancelHref={backHref}
              onSubmit={(input) =>
                updateRecord.mutate(toPatch(input), {
                  onSuccess: (updated) => {
                    flash.notify({ type: "success", header: `Successfully updated ${updated.type} record ${displayName(updated.name)}.` });
                    router.push(backHref);
                  },
                })
              }
            />
          )}
        </>
      )}
    </ZoneLoader>
  );
}
