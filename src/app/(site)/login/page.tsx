import type { Metadata } from "next";
import { Suspense } from "react";
import Login from "@/marketing/pages/Login";

export const metadata: Metadata = {
  title: "Sign in | Aquifert",
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}
