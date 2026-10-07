"use client";

import { useParams, useRouter } from "next/navigation";
import { ZoneLoader } from "@/components/hosted-zones/ZoneLoader";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { RecordForm } from "@/components/records/RecordForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { useFlash } from "@/context/FlashContext";
import { useCreateRecord } from "@/hooks/useRecords";
import { ApiError } from "@/lib/api-client";
import { displayName } from "@/lib/format";

export default function CreateRecordPage() {
  const { zoneId } = useParams<{ zoneId: string }>();
  const router = useRouter();
  const flash = useFlash();
  const createRecord = useCreateRecord(zoneId);

  return (
    <ZoneLoader zoneId={zoneId}>
      {(zone) => (
        <>
          <Breadcrumbs
            items={[
              { label: "Hosted zones", href: "/hosted-zones" },
              { label: displayName(zone.name), href: `/hosted-zones/${zone.id}` },
              { label: "Create record" },
            ]}
          />
          <PageHeader title="Create record" description={`Add a DNS record to ${displayName(zone.name)}.`} />
          <RecordForm
            zone={zone}
            submitting={createRecord.isPending}
            serverError={createRecord.error instanceof ApiError ? createRecord.error : null}
            cancelHref={`/hosted-zones/${zone.id}`}
            onSubmit={(input) =>
              createRecord.mutate(input, {
                onSuccess: (record) => {
                  flash.notify({ type: "success", header: `Successfully created ${record.type} record ${displayName(record.name)}.` });
                  router.push(`/hosted-zones/${zone.id}`);
                },
              })
            }
          />
        </>
      )}
    </ZoneLoader>
  );
}
