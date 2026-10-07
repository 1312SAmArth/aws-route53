import { ComingSoon } from "@/components/ComingSoon";

export default function Page() {
  return (
    <ComingSoon
      title="Profiles"
      icon="profiles"
      description="Apply a consistent set of DNS settings to many VPCs and accounts."
      capabilities={["Group private hosted zones, Resolver rules and DNS Firewall rule groups", "Share a profile across AWS accounts", "Associate a profile with multiple VPCs"]}
    />
  );
}
