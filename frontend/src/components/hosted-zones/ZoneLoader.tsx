"use client";

import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { LinkButton } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { useZone } from "@/hooks/useZones";
import { ApiError } from "@/lib/api-client";
import type { HostedZone } from "@/lib/types";

export function ZoneLoader({ zoneId, children }: { zoneId: string; children: (zone: HostedZone) => ReactNode }) {
  const zone = useZone(zoneId);

  if (zone.data) return <>{children(zone.data)}</>;

  const notFound = zone.error instanceof ApiError && zone.error.status === 404;
  return (
    <>
      <Breadcrumbs items={[{ label: "Hosted zones", href: "/hosted-zones" }, { label: notFound ? "Not found" : "Loading…" }]} />
      <Container>
        {zone.isPending ? (
          <LoadingState label="Loading hosted zone" />
        ) : notFound ? (
          <EmptyState
            title="Hosted zone not found"
            description="This hosted zone doesn't exist. It may have been deleted."
            action={
              <LinkButton href="/hosted-zones" variant="primary">
                Back to hosted zones
              </LinkButton>
            }
          />
        ) : (
          <ErrorState error={zone.error} onRetry={() => zone.refetch()} title="Unable to load hosted zone" />
        )}
      </Container>
    </>
  );
}
