import { aquibotSessions } from "@/data/sample";

export default function AquibotPage() {
  const active = aquibotSessions[0];
  return (
    <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="rounded-xl border border-border bg-surface">
        <p className="border-b border-border px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-mid">
          Past sessions
        </p>
        {aquibotSessions.map((session) => (
          <p key={session.id} className="border-b border-border px-4 py-3 text-sm">
            {session.title}
          </p>
        ))}
      </aside>
      <section className="rounded-xl border border-border bg-surface p-5">
        <h1 className="text-lg font-black">{active.title}</h1>
        <div className="mt-4 space-y-3">
          {active.messages.map((message) => (
            <p
              key={message.text}
              className={`rounded-lg px-3 py-2 text-sm ${message.role === "user" ? "bg-blue-light" : "bg-s2 text-mid"}`}
            >
              {message.text}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}
