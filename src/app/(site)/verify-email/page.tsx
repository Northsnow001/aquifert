import type { Metadata } from "next";
import { Suspense } from "react";
import VerifyEmail from "@/marketing/pages/VerifyEmail";

export const metadata: Metadata = {
  title: "Verify your email | Aquifert",
  robots: { index: false },
};

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmail />
    </Suspense>
  );
}
