import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { LinkButton } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/States";

export default function NotFound() {
  return (
    <>
      <Breadcrumbs items={[{ label: "Page not found" }]} />
      <Container>
        <EmptyState
          title="Page not found"
          description="The page you're looking for doesn't exist or has been moved."
          action={<LinkButton href="/hosted-zones" variant="primary">Go to hosted zones</LinkButton>}
        />
      </Container>
    </>
  );
}
