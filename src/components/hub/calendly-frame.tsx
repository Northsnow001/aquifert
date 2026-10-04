"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { CALENDLY_ORIGIN, calendlyLink } from "@/lib/calendly";

const noop = () => () => {};

type CalendlyMessage = { event?: string; payload?: { invitee?: { uri?: string } } };

export function CalendlyFrame({
  name,
  email,
  campaign,
  content,
  onScheduled,
  className = "",
}: {
  name?: string;
  email?: string;
  campaign?: string;
  content?: string;
  onScheduled?: (inviteeUri: string) => void;
  className?: string;
}) {
  const host = useSyncExternalStore(noop, () => window.location.host, () => "");
  const handler = useRef(onScheduled);

  useEffect(() => {
    handler.current = onScheduled;
  }, [onScheduled]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== CALENDLY_ORIGIN) return;
      const data = event.data as CalendlyMessage | null;
      if (data?.event === "calendly.event_scheduled") handler.current?.(data.payload?.invitee?.uri ?? "");
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (!host) return null;
  return (
    <iframe
      src={calendlyLink({ name, email, campaign, content, embedDomain: host })}
      title="Aquifert Calendly scheduling"
      className={`w-full border-0 ${className}`}
    />
  );
}
