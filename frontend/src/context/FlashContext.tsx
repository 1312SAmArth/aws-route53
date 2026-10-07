"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import type { AlertType } from "@/components/ui/Alert";

export interface FlashMessage {
  id: number;
  type: AlertType;
  header: string;
  content?: string;
}

interface FlashApi {
  messages: FlashMessage[];
  notify: (message: Omit<FlashMessage, "id">) => void;
  dismiss: (id: number) => void;
}

const FlashContext = createContext<FlashApi | null>(null);

const AUTO_DISMISS_MS = 8000;

export function FlashProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<FlashMessage[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setMessages((all) => all.filter((m) => m.id !== id)), []);

  const notify = useCallback(
    (message: Omit<FlashMessage, "id">) => {
      const id = nextId.current++;
      setMessages((all) => [...all.slice(-2), { ...message, id }]);
      // Errors stay until dismissed so they can't be missed.
      if (message.type !== "error") window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ messages, notify, dismiss }), [messages, notify, dismiss]);
  return <FlashContext.Provider value={value}>{children}</FlashContext.Provider>;
}

export function useFlash(): FlashApi {
  const ctx = useContext(FlashContext);
  if (!ctx) throw new Error("useFlash must be used inside <FlashProvider>");
  return ctx;
}
