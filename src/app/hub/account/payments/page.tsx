import { redirect } from "next/navigation";

export default function PaymentsPage() {
  redirect("/hub/billing");
}
