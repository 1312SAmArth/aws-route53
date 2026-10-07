"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Inputs";
import { useLogin, useSession } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api-client";
import styles from "./login.module.css";

/** Only follow same-site relative paths, so `?next=` can't bounce a user to another origin. */
function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/hosted-zones";
}

function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const session = useSession();
  const login = useLogin();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);

  // Someone with a live session who opens /login goes straight to the console.
  const signedIn = session.isSuccess;
  useEffect(() => {
    if (signedIn) router.replace(next);
  }, [signedIn, next, router]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (!username.trim() || !password) return;
    login.mutate({ username: username.trim(), password }, { onSuccess: () => router.replace(next) });
  };

  const missingUsername = touched && !username.trim();
  const missingPassword = touched && !password;
  const failure = login.error instanceof ApiError ? login.error : null;

  return (
    <form className={styles.card} onSubmit={submit} noValidate>
      <h1 className={styles.heading}>Sign in</h1>
      {failure && (
        <Alert type="error" header={failure.isNetworkError ? "Service unavailable" : "Authentication failed"}>
          {failure.message}
        </Alert>
      )}
      <FormField id="username" label="Username" error={missingUsername ? "Enter your username." : null}>
        {(props) => (
          <Input {...props} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus maxLength={64} />
        )}
      </FormField>
      <FormField id="password" label="Password" error={missingPassword ? "Enter your password." : null}>
        {(props) => (
          <Input {...props} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" maxLength={128} />
        )}
      </FormField>
      <Button type="submit" variant="primary" loading={login.isPending} className={styles.submit}>
        Sign in
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className={styles.page}>
      <div className={styles.brand}>
        <span className={styles.logo}>aws</span>
        <span className={styles.service}>Route 53 Management Console</span>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className={styles.note}>
        {process.env.NEXT_PUBLIC_DEMO_HINT ?? "Demo environment: sign in with the demo credentials listed in the project README."}
      </p>
    </main>
  );
}
