"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ArrowLeftRight, ArrowUp, Calculator, FileText, Library } from "lucide-react";
import { AquibotAvatar } from "@/components/app/aquibot-avatar";

const PROMPTS = [
  "Summarise this week's urea Telex",
  "What is moving phosphate prices?",
  "Is potash well supplied right now?",
  "Explain the latest paper forward curve",
];

const ACTIONS = [
  { href: "/hub/freight-calculator", label: "Price a freight", icon: Calculator },
  { href: "/hub/netback", label: "Check netback", icon: ArrowLeftRight },
  { href: "/hub/library", label: "Open the Library", icon: Library },
  { href: "/hub/order-desk", label: "Request a quote", icon: FileText },
];

const subscribe = () => () => {};
function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

export function HomeHero({ name }: { name: string }) {
  const router = useRouter();
  const hello = useSyncExternalStore(subscribe, greeting, () => "Welcome back");
  const [value, setValue] = useState("");
  const [hint, setHint] = useState(0);
  const first = name.trim().split(/\s+/)[0] || "there";

  useEffect(() => {
    const timer = setInterval(() => setHint((index) => (index + 1) % PROMPTS.length), 4000);
    return () => clearInterval(timer);
  }, []);

  const ask = () => {
    const text = value.trim() || PROMPTS[hint];
    router.push(`/hub/aquibot?q=${encodeURIComponent(text)}`);
  };

  return (
    <section className="aq-rise flex flex-col items-center px-1 pb-2 pt-2 text-center sm:pt-4">
      <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-[32px]">
        {hello}, {first}.
        <span className="block text-mid sm:inline"> What do you want to look at today?</span>
      </h1>
      <form
        className="mt-5 w-full max-w-[640px]"
        onSubmit={(event) => {
          event.preventDefault();
          ask();
        }}
      >
        <div className="flex items-center gap-2 rounded-full border border-black/[.08] bg-white py-1.5 pl-1.5 pr-1.5 shadow-[0_10px_32px_-14px_rgb(11_30_45/0.3)] transition-shadow focus-within:shadow-[0_10px_32px_-10px_rgb(47_111_179/0.4)] focus-within:ring-2 focus-within:ring-blue/40">
          <AquibotAvatar size={36} />
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={PROMPTS[hint]}
            aria-label="Ask Aquibot"
            className="min-w-0 flex-1 bg-transparent px-1 text-[15px] text-ink outline-none"
          />
          <button type="submit" aria-label="Ask Aquibot" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue text-white transition hover:bg-blue-dim">
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </form>
      <div className="mt-4 flex max-w-full flex-wrap justify-center gap-2">
        {ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/[.07] bg-white px-3.5 py-2 text-[13px] font-medium text-ink no-underline shadow-[0_1px_2px_rgb(16_38_59/0.05)] transition hover:-translate-y-px hover:border-blue/30 hover:text-blue"
          >
            <action.icon className="h-3.5 w-3.5 text-blue" />
            {action.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
