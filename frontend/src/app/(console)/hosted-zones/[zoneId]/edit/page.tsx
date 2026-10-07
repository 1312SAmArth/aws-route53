"use client";

import { useParams, useRouter } from "next/navigation";
import { HostedZoneForm } from "@/components/hosted-zones/HostedZoneForm";
import { ZoneLoader } from "@/components/hosted-zones/ZoneLoader";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { useFlash } from "@/context/FlashContext";
import { useUpdateZone } from "@/hooks/useZones";
import { ApiError } from "@/lib/api-client";
import { displayName } from "@/lib/format";

export default function EditHostedZonePage() {
  const { zoneId } = useParams<{ zoneId: string }>();
  const router = useRouter();
  const flash = useFlash();
  const updateZone = useUpdateZone(zoneId);

  return (
    <ZoneLoader zoneId={zoneId}>
      {(zone) => (
        <>
          <Breadcrumbs
            items={[
              { label: "Hosted zones", href: "/hosted-zones" },
              { label: displayName(zone.name), href: `/hosted-zones/${zone.id}` },
              { label: "Edit hosted zone" },
            ]}
          />
          <PageHeader title="Edit hosted zone" description={`Change the description of ${displayName(zone.name)}.`} />
          <HostedZoneForm
            zone={zone}
            submitting={updateZone.isPending}
            serverError={updateZone.error instanceof ApiError ? updateZone.error : null}
            cancelHref={`/hosted-zones/${zone.id}`}
            onSubmit={(input) =>
              updateZone.mutate(
                { comment: input.comment ?? null },
                {
                  onSuccess: () => {
                    flash.notify({ type: "success", header: `Successfully updated hosted zone ${displayName(zone.name)}.` });
                    router.push(`/hosted-zones/${zone.id}`);
                  },
                },
              )
            }
          />
        </>
      )}
    </ZoneLoader>
  );
}
