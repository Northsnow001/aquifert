import { redirect } from "next/navigation";

export default function LegacyDocumentsPage() {
  redirect("/hub/trade/documents");
}
