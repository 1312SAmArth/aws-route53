import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import styles from "./ComingSoon.module.css";

interface ComingSoonProps {
  title: string;
  icon: IconName;
  description: string;
  capabilities: string[];
}

/** Placeholder for console sections outside the assignment's core scope. */
export function ComingSoon({ title, icon, description, capabilities }: ComingSoonProps) {
  return (
    <>
      <Breadcrumbs items={[{ label: title }]} />
      <PageHeader title={title} badge={<Badge tone="orange">Coming soon</Badge>} description={description} />
      <Container>
        <div className={styles.body}>
          <span className={styles.iconWrap}>
            <Icon name={icon} size={32} />
          </span>
          <h2 className={styles.heading}>{title} isn&apos;t available in this version</h2>
          <p className={styles.text}>This section is part of the Route 53 console but is not implemented in this clone yet. Here&apos;s what it&apos;s for:</p>
          <ul className={styles.list}>
            {capabilities.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <LinkButton href="/hosted-zones" variant="primary">
            Go to hosted zones
          </LinkButton>
        </div>
      </Container>
    </>
  );
}
