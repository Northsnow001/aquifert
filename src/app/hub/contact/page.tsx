import { saveEnquiry } from "@/app/(auth)/actions";

async function submitContact(formData: FormData) {
  "use server";
  await saveEnquiry("contact_messages", {
    channel: "message",
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    message: String(formData.get("message") ?? ""),
  });
}

export default function ContactPage() {
  return (
    <section className="max-w-xl rounded-xl border border-border bg-surface p-5">
      <h1 className="text-lg font-black">Contact Us</h1>
      <p className="mt-1 text-sm text-mid">Send a note to the Aquifert desk.</p>
      <form action={submitContact} className="mt-4 space-y-3">
        <input name="name" placeholder="Name" className="w-full rounded-lg border border-border px-3 py-2 text-sm" />
        <input name="email" type="email" required placeholder="Email" className="w-full rounded-lg border border-border px-3 py-2 text-sm" />
        <textarea name="message" required rows={5} placeholder="Message" className="w-full rounded-lg border border-border px-3 py-2 text-sm" />
        <button type="submit" className="rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white">
          Send
        </button>
      </form>
    </section>
  );
}
