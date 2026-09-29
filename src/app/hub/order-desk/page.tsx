import { OrderDeskBoard } from "@/components/hub/order-desk-board";
import { getSession } from "@/lib/session";

export default async function OrderDeskPage() {
  const user = await getSession();
  return <OrderDeskBoard name={user?.name ?? ""} email={user?.email ?? ""} />;
}
