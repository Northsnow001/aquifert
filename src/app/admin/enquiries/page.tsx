import { redirect } from "next/navigation";

export default async function EnquiriesAdminPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  if (type === "contact") redirect("/admin/desk/inquiries?view=enquiries&tab=contact");
  if (type === "order") redirect("/admin/desk/inquiries?tab=app");
  redirect("/admin/desk/inquiries?view=enquiries");
}
