import Link from "next/link";
import { Card, EmptyState, PageHeader, Pill } from "@/components/admin/ui";
import { DEAL_STATUS_LABEL, type DealStatus } from "@/lib/desk-hitl/types";
import { listDeskDeals } from "@/lib/desk-hitl/store";

export const dynamic = "force-dynamic";

const TONE: Record<DealStatus, "amber" | "blue" | "teal" | "neutral"> = {
  waiting_desk: "amber",
  indication_sent: "blue",
  negotiating: "blue",
  firm_interest: "teal",
  closed: "neutral",
};

export default async function DeskShortlistsPage() {
  const deals = await listDeskDeals();
  const waiting = deals.filter(
    (d) => d.status === "waiting_desk" || d.pi?.status === "review" || d.firmOffer?.status === "review",
  ).length;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Desk shortlists"
        description="WF8 drops the first three offers here. Pick one, add your margin, send the indication. After the buyer confirms terms, the firm offer waits here until you send it."
      />
      <Card>
        {deals.length === 0 ? (
          <EmptyState
            title="No shortlists yet"
            body="When the RFQ closer finds matching offers, they appear here. Point WF8 True at POST /api/desk/shortlists."
          />
        ) : (
          <ul>
            {deals.map((deal) => {
              const foReview = deal.firmOffer?.status === "review";
              const foSent = deal.firmOffer?.status === "sent";
              const piReview = deal.pi?.status === "review";
              const piSent = deal.pi?.status === "sent";
              const contractSent = deal.salesContract?.status === "sent";
              return (
              <li key={deal.id} className="border-b border-border last:border-b-0">
                <Link href={`/admin/desk/${deal.id}`} className="flex items-start justify-between gap-3 px-4 py-3.5 no-underline hover:bg-s2/50">
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-semibold text-ink">{deal.product}</span>
                    <span className="mt-0.5 block text-[12.5px] text-mid">
                      {deal.buyerName || deal.buyerCompany || deal.buyerPhone || "Buyer"}
                      {deal.quantityMt ? ` · ${deal.quantityMt} MT` : ""}
                      {deal.destination ? ` → ${deal.destination}` : ""}
                    </span>
                    <span className="mt-0.5 block font-mono text-[11px] text-dim">{deal.requestId}</span>
                  </span>
                  <Pill
                    tone={
                      deal.status === "closed"
                        ? "neutral"
                        : piReview || foReview
                          ? "amber"
                          : contractSent || piSent || foSent
                            ? "teal"
                            : TONE[deal.status]
                    }
                  >
                    {deal.status === "closed"
                      ? "Closed"
                      : piReview
                        ? "PI to review"
                        : foReview
                          ? "FO to review"
                          : contractSent
                            ? "Contract sent"
                            : piSent
                              ? "PI sent"
                              : foSent
                                ? "FO sent"
                                : DEAL_STATUS_LABEL[deal.status]}
                  </Pill>
                </Link>
              </li>
              );
            })}
          </ul>
        )}
      </Card>
      {waiting ? <p className="mt-3 text-[12.5px] text-mid">{waiting} waiting for you (indication, FO or PI review).</p> : null}
    </div>
  );
}
