import { saveEnquiry } from "@/app/(auth)/actions";

async function submitOrder(formData: FormData) {
  "use server";
  await saveEnquiry("order_enquiries", {
    product: String(formData.get("product") ?? ""),
    quantity: String(formData.get("quantity") ?? ""),
    origin: String(formData.get("origin") ?? ""),
    destination: String(formData.get("destination") ?? ""),
    incoterm: String(formData.get("incoterm") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
}

export default function OrderDeskPage() {
  return (
    <section className="max-w-2xl rounded-xl border border-border bg-surface p-5">
      <h1 className="text-lg font-black">Order Desk</h1>
      <p className="mt-1 text-sm text-mid">Submit a product enquiry. This build stores the form and does not route it to a trading desk.</p>
      <form action={submitOrder} className="mt-4 grid gap-3 md:grid-cols-2">
        <input name="product" required placeholder="Product" className="rounded-lg border border-border px-3 py-2 text-sm" />
        <input name="quantity" required placeholder="Quantity (MT)" className="rounded-lg border border-border px-3 py-2 text-sm" />
        <input name="origin" placeholder="Origin preference" className="rounded-lg border border-border px-3 py-2 text-sm" />
        <input name="destination" placeholder="Destination" className="rounded-lg border border-border px-3 py-2 text-sm" />
        <input name="incoterm" placeholder="Incoterm" className="rounded-lg border border-border px-3 py-2 text-sm" />
        <textarea name="notes" placeholder="Notes" className="rounded-lg border border-border px-3 py-2 text-sm md:col-span-2" rows={4} />
        <button type="submit" className="rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white md:col-span-2">
          Submit enquiry to trading desk
        </button>
      </form>
    </section>
  );
}
