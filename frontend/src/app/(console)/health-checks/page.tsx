import { ComingSoon } from "@/components/ComingSoon";

export default function Page() {
  return (
    <ComingSoon
      title="Health checks"
      icon="health"
      description="Monitor the health of your endpoints and route traffic away from unhealthy resources."
      capabilities={["Check endpoints over HTTP, HTTPS or TCP", "Combine checks and monitor CloudWatch alarms", "Drive DNS failover from health status"]}
    />
  );
}
