"use client";

import { useRouter } from "next/navigation";
import { HostedZoneForm } from "@/components/hosted-zones/HostedZoneForm";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { useFlash } from "@/context/FlashContext";
import { useCreateZone } from "@/hooks/useZones";
import { ApiError } from "@/lib/api-client";
import { displayName } from "@/lib/format";

export default function CreateHostedZonePage() {
  const router = useRouter();
  const flash = useFlash();
  const createZone = useCreateZone();

  return (
    <>
      <Breadcrumbs items={[{ label: "Hosted zones", href: "/hosted-zones" }, { label: "Create hosted zone" }]} />
      <PageHeader title="Create hosted zone" description="Configure the domain you want Route 53 to route traffic for." />
      <HostedZoneForm
        submitting={createZone.isPending}
        serverError={createZone.error instanceof ApiError ? createZone.error : null}
        cancelHref="/hosted-zones"
        onSubmit={(input) =>
          createZone.mutate(input, {
            onSuccess: (zone) => {
              flash.notify({ type: "success", header: `Successfully created hosted zone ${displayName(zone.name)}.` });
              router.push(`/hosted-zones/${zone.id}`);
            },
          })
        }
      />
    </>
  );
}
