import { ComingSoon } from "@/components/ComingSoon";

export default function Page() {
  return (
    <ComingSoon
      title="Traffic policies"
      icon="traffic"
      description="Visually build routing rules that combine weighted, latency, geolocation and failover routing."
      capabilities={["Design multi-step routing decisions in a visual editor", "Version policies and roll changes out to many records", "Attach a policy to a hosted zone as a policy record"]}
    />
  );
}
