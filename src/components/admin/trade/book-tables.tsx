"use client";

import { TradeGrid, TradeLive, Td, Th } from "@/components/admin/trade/live-table";
import { EmptyState, Pill } from "@/components/admin/ui";
import { formatStamp } from "@/lib/content-types";
import type { TradeBuyer, TradeFreightQuote, TradeQuote, TradeRfq } from "@/lib/trade/types";

export function BuyersBoard({ initial }: { initial: TradeBuyer[] }) {
  return (
    <TradeLive resource="buyers" table="trade_buyers" initial={initial} render={(rows) => (
      <div className="aq-card overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState title="No buyers yet" body="Buyer WhatsApp RFQs will create rows here once that workflow writes to Supabase." />
        ) : (
          <TradeGrid>
            <thead>
              <tr>
                <Th>Code</Th>
                <Th>Company</Th>
                <Th>Contact</Th>
                <Th>WhatsApp</Th>
                <Th>KYC</Th>
                <Th>Status</Th>
                <Th>Updated</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <Td className="font-medium">{row.code}</Td>
                  <Td>{row.companyName}</Td>
                  <Td>
                    <div>{row.contactName}</div>
                    <div className="text-[12px] text-dim">{row.email}</div>
                  </Td>
                  <Td className="font-mono text-[12px]">{row.whatsappE164 || "—"}</Td>
                  <Td><Pill>{row.kycStatus}</Pill></Td>
                  <Td><Pill tone="teal">{row.status}</Pill></Td>
                  <Td className="text-dim">{row.updatedAt ? formatStamp(row.updatedAt) : "—"}</Td>
                </tr>
              ))}
            </tbody>
          </TradeGrid>
        )}
      </div>
    )} />
  );
}

export function RfqsBoard({ initial }: { initial: TradeRfq[] }) {
  return (
    <TradeLive resource="rfqs" table="trade_rfqs" initial={initial} render={(rows) => (
      <div className="aq-card overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState title="No buyer requests yet" body="This is the RFQ spine (the old Buyer Requests sheet). New WhatsApp RFQs will land here." />
        ) : (
          <TradeGrid>
            <thead>
              <tr>
                <Th>RFQ</Th>
                <Th>Buyer</Th>
                <Th>Product</Th>
                <Th>Qty</Th>
                <Th>Route</Th>
                <Th>Status</Th>
                <Th>Quotes</Th>
                <Th>Updated</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <Td className="font-medium">{row.code}</Td>
                  <Td>{row.buyerCompany || "—"}</Td>
                  <Td>{row.productLabel}</Td>
                  <Td>{row.quantityMt != null ? `${row.quantityMt} MT` : "—"}</Td>
                  <Td className="text-mid">{[row.incoterm, row.destinationPort || row.destinationCountry].filter(Boolean).join(" ")}</Td>
                  <Td><Pill tone={row.status === "awaiting_desk" ? "amber" : "blue"}>{row.status.replaceAll("_", " ")}</Pill></Td>
                  <Td>{row.readyQuoteCount}</Td>
                  <Td className="text-dim">{row.updatedAt ? formatStamp(row.updatedAt) : "—"}</Td>
                </tr>
              ))}
            </tbody>
          </TradeGrid>
        )}
      </div>
    )} />
  );
}

export function QuotesBoard({ initial }: { initial: TradeQuote[] }) {
  return (
    <TradeLive resource="quotes" table="trade_quotes" initial={initial} render={(rows) => (
      <div className="aq-card overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState title="No supplier quotes yet" body="RFQ replies and weekly rates share this table. The shortlist takes the first three priced replies by time." />
        ) : (
          <TradeGrid>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Kind</Th>
                <Th>RFQ</Th>
                <Th>Supplier</Th>
                <Th>Product</Th>
                <Th>Price</Th>
                <Th>Qty</Th>
                <Th>Load</Th>
                <Th>Ready</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <Td className="text-dim">{row.receivedAt ? formatStamp(row.receivedAt) : "—"}</Td>
                  <Td>{row.kind}</Td>
                  <Td className="font-medium">{row.rfqCode || "—"}</Td>
                  <Td>{row.supplierName || "—"}</Td>
                  <Td>{row.productLabel}</Td>
                  <Td>{row.unitPrice != null ? `${row.unitPrice} ${row.currency}` : "—"}</Td>
                  <Td>{row.quantityMt != null ? `${row.quantityMt} MT` : "—"}</Td>
                  <Td>{row.loadPort || "—"}</Td>
                  <Td><Pill tone={row.ready ? "teal" : "amber"}>{row.ready ? "ready" : row.status}</Pill></Td>
                </tr>
              ))}
            </tbody>
          </TradeGrid>
        )}
      </div>
    )} />
  );
}

export function FreightBoard({ initial }: { initial: TradeFreightQuote[] }) {
  return (
    <TradeLive resource="freight" table="trade_freight_quotes" initial={initial} render={(rows) => (
      <div className="aq-card overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState title="No freight quotes yet" body="Weekly and per-RFQ forwarder rates land here." />
        ) : (
          <TradeGrid>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Kind</Th>
                <Th>Route</Th>
                <Th>Rate</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <Td className="text-dim">{row.receivedAt ? formatStamp(row.receivedAt) : "—"}</Td>
                  <Td>{row.kind}</Td>
                  <Td>{[row.originPort, row.destinationPort].filter(Boolean).join(" → ") || "—"}</Td>
                  <Td>{row.isNoOffer ? "No offer" : row.rate != null ? `${row.rate} ${row.currency}` : "—"}</Td>
                </tr>
              ))}
            </tbody>
          </TradeGrid>
        )}
      </div>
    )} />
  );
}
