import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AuthGate } from "@/components/layout/AuthGate";
import { LoadingState } from "@/components/ui/States";

export default function ConsoleLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthGate>
      <AppShell>
        {/* useSearchParams-based pages need a Suspense boundary above them */}
        <Suspense fallback={<LoadingState />}>{children}</Suspense>
      </AppShell>
    </AuthGate>
  );
}
