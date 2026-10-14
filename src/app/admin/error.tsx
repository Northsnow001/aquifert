"use client";

import { ErrorPanel } from "@/components/app/error-panel";

export default function AdminError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorPanel error={error} retry={retry} compact />;
}
