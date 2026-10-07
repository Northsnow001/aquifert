import type { Metadata } from "next";
import { Suspense } from "react";
import SessionExpired from "@/marketing/pages/SessionExpired";

export const metadata: Metadata = {
  title: "Session timed out | Aquifert",
  robots: { index: false },
};

export default function SessionExpiredPage() {
  return (
    <Suspense>
      <SessionExpired />
    </Suspense>
  );
}
