import { fmtDateTime } from "@/lib/format";

export type ChatMessage = { from: string; text: string; at: string };

export function ChatThread({ messages, buyerName }: { messages: ChatMessage[]; buyerName?: string | null }) {
  return (
    <div className="space-y-3">
      {messages.map((m, i) => {
        const isBuyer = m.from === "buyer";
        return (
          <div key={i} className={`flex ${isBuyer ? "justify-start" : "justify-end"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                isBuyer
                  ? "rounded-tl-sm bg-muted text-foreground"
                  : "rounded-tr-sm bg-navy-600 text-white dark:bg-navy-500"
              }`}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
              <p className={`mt-1 text-[10px] ${isBuyer ? "text-muted-foreground" : "text-white/60"}`}>
                {isBuyer ? buyerName ?? "Buyer" : "AQUIFERT AI"} · {fmtDateTime(m.at)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
