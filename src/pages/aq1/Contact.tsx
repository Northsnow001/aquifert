import { useState } from "react";
import { MessageCircle, PhoneCall, Mail, PhoneForwarded } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shared/PageHeader";
import { InfoTip } from "@/components/aq1/InfoTip";
import { useAq1Tips } from "@/components/aq1/tips";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

const CHANNELS = [
  { key: "whatsapp" as const, icon: MessageCircle, title: "WhatsApp the desk", desc: "Fastest for a quick question. Typically answered within a couple of hours in the trading day." },
  { key: "book_call" as const, icon: PhoneCall, title: "Book a call", desc: "A scheduled 20-minute call with a trader. Usually available within 1–2 business days." },
  { key: "message" as const, icon: Mail, title: "Send a message", desc: "Email-style message to the desk. We reply within one business day." },
  { key: "callback" as const, icon: PhoneForwarded, title: "Request a callback", desc: "Leave your number in the message and we'll call you back within one business day." },
];

export default function Aq1Contact() {
  const tips = useAq1Tips();
  const { user, organization } = useProfile();
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]["key"]>("message");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const send = trpc.aq1.contact.useMutation({
    onSuccess: () => { setSent(true); toast.success("Sent — the desk has it"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
      <PageHeader
        title={<span className="inline-flex items-center">Contact Us <InfoTip label="Contact Us" text={tips.contact} /></span>}
        description="Reach a person, not a screen."
      />
      <div className="grid gap-3 md:grid-cols-2" role="radiogroup" aria-label="Contact channel">
        {CHANNELS.map((c) => (
          <button key={c.key} type="button" role="radio" aria-checked={channel === c.key} onClick={() => { setChannel(c.key); setSent(false); }}
            className={`min-h-11 rounded-lg border p-4 text-left transition-colors ${channel === c.key ? "border-teal-600 bg-teal-50 dark:bg-teal-500/10" : "border-border hover:border-teal-500/50"}`}>
            <c.icon className="h-5 w-5 text-navy-700 dark:text-navy-300" aria-hidden />
            <p className="mt-2 text-sm font-semibold">{c.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{c.desc}</p>
          </button>
        ))}
      </div>
      <Card><CardContent className="grid gap-4 p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div><Label htmlFor="ct-name">Name</Label><Input id="ct-name" className="mt-1" defaultValue={user?.name ?? ""} readOnly /></div>
          <div><Label htmlFor="ct-email">Email</Label><Input id="ct-email" className="mt-1" defaultValue={user?.email ?? ""} readOnly /></div>
        </div>
        <div><Label htmlFor="ct-company">Company</Label><Input id="ct-company" className="mt-1" defaultValue={organization?.name ?? ""} readOnly /></div>
        <div>
          <Label htmlFor="ct-msg">Message {channel === "callback" ? "(include your phone number)" : ""}</Label>
          <Textarea id="ct-msg" className="mt-1" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} />
        </div>
        {sent ? (
          <p role="status" className="rounded-md bg-teal-50 p-3 text-sm text-teal-800 dark:bg-teal-500/10 dark:text-teal-200">
            Received. {CHANNELS.find((c) => c.key === channel)?.desc}
          </p>
        ) : (
          <div><Button disabled={send.isPending} onClick={() => send.mutate({ channel, name: user?.name ?? "", email: user?.email ?? "", company: organization?.name ?? "", message })}>
            {send.isPending ? "Sending…" : "Send"}
          </Button></div>
        )}
      </CardContent></Card>
    </div>
  );
}
