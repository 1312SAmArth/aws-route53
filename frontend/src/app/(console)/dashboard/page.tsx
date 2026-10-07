"use client";

import Link from "next/link";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorState } from "@/components/ui/States";
import { useZones } from "@/hooks/useZones";
import styles from "./dashboard.module.css";

const OTHER_SERVICES: { href: string; title: string; icon: IconName; text: string }[] = [
  { href: "/health-checks", title: "Health checks", icon: "health", text: "Monitor endpoints and fail over DNS automatically." },
  { href: "/traffic-policies", title: "Traffic policies", icon: "traffic", text: "Build complex routing rules visually." },
  { href: "/resolver", title: "Resolver", icon: "resolver", text: "Resolve DNS between VPCs and your network." },
  { href: "/profiles", title: "Profiles", icon: "profiles", text: "Share DNS settings across VPCs and accounts." },
];

export default function DashboardPage() {
  // One large page is enough for an account-level summary; the list endpoint already returns each zone's record count.
  const zones = useZones({ page: 1, pageSize: 100, search: "", type: "" });
  const items = zones.data?.items ?? [];
  const recordCount = items.reduce((sum, z) => sum + z.record_count, 0);
  const privateCount = items.filter((z) => z.type === "PRIVATE").length;

  const stat = (value: number | undefined) => (zones.isPending || value === undefined ? "–" : value);

  return (
    <>
      <Breadcrumbs items={[{ label: "Dashboard" }]} />
      <PageHeader title="Route 53 dashboard" description="An overview of the DNS resources in this account." />

      {zones.isError ? (
        <Container>
          <ErrorState error={zones.error} onRetry={() => zones.refetch()} />
        </Container>
      ) : (
        <Container
          title="DNS management"
          actions={
            <LinkButton href="/hosted-zones/new" variant="primary">
              Create hosted zone
            </LinkButton>
          }
        >
          <dl className={styles.stats}>
            <div className={styles.stat}>
              <dt>Hosted zones</dt>
              <dd>
                <Link href="/hosted-zones">{stat(zones.data?.total)}</Link>
              </dd>
            </div>
            <div className={styles.stat}>
              <dt>Private zones</dt>
              <dd>{stat(zones.data && privateCount)}</dd>
            </div>
            <div className={styles.stat}>
              <dt>DNS records</dt>
              <dd>{stat(zones.data && recordCount)}</dd>
            </div>
          </dl>
        </Container>
      )}

      <Container title="More Route 53 features" description="These sections are not implemented in this version.">
        <ul className={styles.cards}>
          {OTHER_SERVICES.map((s) => (
            <li key={s.href} className={styles.card}>
              <Icon name={s.icon} size={20} />
              <div>
                <div className={styles.cardTitle}>
                  <Link href={s.href}>{s.title}</Link> <Badge tone="orange">Coming soon</Badge>
                </div>
                <p className={styles.cardText}>{s.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
