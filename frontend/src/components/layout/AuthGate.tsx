"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, type ReactNode } from "react";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useSession } from "@/hooks/useAuth";
import { ApiError, onSessionExpired } from "@/lib/api-client";
import styles from "./AuthGate.module.css";

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const session = useSession();

  const redirectToLogin = useCallback(() => {
    const next = `${pathname}${window.location.search}`;
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [pathname, router]);

  const unauthenticated = session.error instanceof ApiError && session.error.status === 401;

  useEffect(() => {
    if (unauthenticated) redirectToLogin();
  }, [unauthenticated, redirectToLogin]);

  useEffect(() => onSessionExpired(redirectToLogin), [redirectToLogin]);

  if (session.isPending || unauthenticated) {
    return (
      <div className={styles.full}>
        <LoadingState label="Loading console" />
      </div>
    );
  }
  if (session.isError) {
    return (
      <div className={styles.full}>
        <ErrorState title="Unable to reach Route 53" error={session.error} onRetry={() => session.refetch()} />
      </div>
    );
  }
  return <>{children}</>;
}
