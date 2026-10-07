import { ComingSoon } from "@/components/ComingSoon";

export default function Page() {
  return (
    <ComingSoon
      title="Resolver"
      icon="resolver"
      description="Resolve DNS queries between your VPCs and your on-premises network."
      capabilities={["Forward queries with inbound and outbound endpoints", "Create rules for specific domain names", "Log and filter DNS queries with DNS Firewall"]}
    />
  );
}
