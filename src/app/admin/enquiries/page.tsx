import { redirect } from "next/navigation";

export default async function EnquiriesAdminPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const next = new URLSearchParams({ view: "enquiries" });
  if (type === "order") next.set("tab", "app");
  if (type === "contact") next.set("tab", "contact");
  redirect(`/admin/desk/inquiries?${next.toString()}`);
}
