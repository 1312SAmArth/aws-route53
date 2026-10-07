"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { DeleteZoneDialog } from "@/components/hosted-zones/DeleteZoneDialog";
import { ZoneLoader } from "@/components/hosted-zones/ZoneLoader";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { RecordsPanel } from "@/components/records/RecordsPanel";
import { ZoneTypeBadge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { CopyButton } from "@/components/ui/CopyButton";
import { ExpandableSection } from "@/components/ui/ExpandableSection";
import { KeyValueGrid } from "@/components/ui/KeyValueGrid";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/States";
import { Tabs } from "@/components/ui/Tabs";
import { useFlash } from "@/context/FlashContext";
import { useDeleteZone } from "@/hooks/useZones";
import { displayName, formatDateTime } from "@/lib/format";
import type { HostedZone } from "@/lib/types";
import styles from "./zone-detail.module.css";

function ComingSoonTab({ title }: { title: string }) {
  return (
    <Container>
      <EmptyState title={title} description="This feature isn't available in this version of the console." />
    </Container>
  );
}

function ZoneDetails({ zone }: { zone: HostedZone }) {
  return (
    <Container>
      <ExpandableSection title="Hosted zone details">
        <KeyValueGrid
          items={[
            { label: "Hosted zone name", value: displayName(zone.name) },
            {
              label: "Hosted zone ID",
              value: (
                <span className="mono">
                  {zone.id} <CopyButton text={zone.id} label="hosted zone ID" />
                </span>
              ),
            },
            { label: "Type", value: <ZoneTypeBadge type={zone.type} /> },
            { label: "Description", value: zone.comment ?? "–" },
            { label: "Record count", value: zone.record_count },
            { label: "Created by", value: zone.created_by },
            { label: "Created", value: formatDateTime(zone.created_at) },
            ...(zone.type === "PRIVATE" ? [{ label: "Associated VPC", value: `${zone.vpc_id} (${zone.vpc_region})` }] : []),
            {
              label: "Name servers",
              value: (
                <ul className={styles.servers}>
                  {zone.name_servers.map((ns) => (
                    <li key={ns}>
                      <span className="mono">{ns}</span> <CopyButton text={ns} label="name server" />
                    </li>
                  ))}
                </ul>
              ),
            },
          ]}
        />
      </ExpandableSection>
    </Container>
  );
}

export default function HostedZoneDetailPage() {
  const { zoneId } = useParams<{ zoneId: string }>();
  const router = useRouter();
  const flash = useFlash();
  const deleteZone = useDeleteZone();
  const [tab, setTab] = useState("records");
  const [deleting, setDeleting] = useState(false);

  return (
    <ZoneLoader zoneId={zoneId}>
      {(zone) => (
        <>
          <Breadcrumbs items={[{ label: "Hosted zones", href: "/hosted-zones" }, { label: displayName(zone.name) }]} />
          <PageHeader
            title={displayName(zone.name)}
            badge={<ZoneTypeBadge type={zone.type} />}
            actions={
              <>
                <LinkButton href={`/api/hosted-zones/${zone.id}/export?format=json`} icon="download" download>
                  Export JSON
                </LinkButton>
                <LinkButton href={`/api/hosted-zones/${zone.id}/export?format=bind`} icon="download" download>
                  Export BIND
                </LinkButton>
                <Button onClick={() => setDeleting(true)}>Delete zone</Button>
                <LinkButton href={`/hosted-zones/${zone.id}/edit`}>Edit hosted zone</LinkButton>
              </>
            }
          />
          <ZoneDetails zone={zone} />
          <Tabs
            idPrefix="zone"
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "records", label: "Records", content: <RecordsPanel zone={zone} /> },
              { id: "dnssec", label: "DNSSEC signing", content: <ComingSoonTab title="DNSSEC signing" /> },
              { id: "tags", label: "Hosted zone tags", content: <ComingSoonTab title="Hosted zone tags" /> },
            ]}
          />
          {deleting && (
            <DeleteZoneDialog
              zone={zone}
              loading={deleteZone.isPending}
              error={deleteZone.error}
              onCancel={() => {
                setDeleting(false);
                deleteZone.reset();
              }}
              onConfirm={(force) =>
                deleteZone.mutate(
                  { zoneId: zone.id, force },
                  {
                    onSuccess: () => {
                      flash.notify({ type: "success", header: `Successfully deleted hosted zone ${displayName(zone.name)}.` });
                      router.push("/hosted-zones");
                    },
                  },
                )
              }
            />
          )}
        </>
      )}
    </ZoneLoader>
  );
}
