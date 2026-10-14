"use client";

import { ErrorPanel } from "@/components/app/error-panel";

export default function HubError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorPanel error={error} retry={retry} compact />;
}
