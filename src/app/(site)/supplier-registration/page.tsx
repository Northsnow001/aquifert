import type { Metadata } from "next";
import SupplierRegistration from "@/marketing/pages/SupplierRegistration";

export const metadata: Metadata = {
  title: "Supplier registration | Aquifert",
  robots: { index: false, follow: false },
};

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function SupplierRegistrationPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const query = await searchParams;
  return <SupplierRegistration code={first(query.code).slice(0, 40)} email={first(query.email).slice(0, 320)} />;
}
