import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import * as s from "@db/schema";
import { effUser, assertStaff, logActivity, notify, fmtActor } from "./rbac";
import { MILESTONES } from "@contracts/constants";

type Milestone = { key: string; label: string; done: boolean; current: boolean; timestamp: string | null; location: string };
type RoutePoint = { name: string; lat: number; lng: number };

/** Advance a shipment one milestone (simulated carrier feed) */
async function maybeAdvance<T extends s.Shipment>(shipment: T): Promise<T> {
  if (shipment.status === "DELIVERED") return shipment;
  const ageMs = Date.now() - new Date(shipment.lastAdvancedAt).getTime();
  if (ageMs < 45_000) return shipment; // max one advance per 45s
  if (Math.random() > 0.45) {
    await getDb().update(s.shipments).set({ lastAdvancedAt: new Date() }).where(eq(s.shipments.id, shipment.id));
    return shipment;
  }
  const idx = MILESTONES.indexOf(shipment.status);
  const nextIdx = Math.min(idx + 1, MILESTONES.length - 1);
  const next = MILESTONES[nextIdx];
  const delayed = !shipment.delayed && Math.random() < 0.1;
  const delayDays = delayed ? 1 + Math.floor(Math.random() * 3) : shipment.delayDays;
  const eta = shipment.eta ? new Date(new Date(shipment.eta).getTime() + (delayed ? delayDays * 864e5 : 0)) : null;

  const route = (shipment.route as RoutePoint[]) ?? [];
  const posMap = [0, 0.02, 0.05, 0.12, 0.35 + Math.random() * 0.4, 0.92, 0.95, 0.97, 0.99, 1];
  const p = posMap[nextIdx];
  let lat = shipment.currentLat, lng = shipment.currentLng, loc = shipment.currentLocation;
  if (route.length >= 2) {
    const segFloat = p * (route.length - 1);
    const seg = Math.min(Math.floor(segFloat), route.length - 2);
    const frac = segFloat - seg;
    lat = route[seg].lat + (route[seg + 1].lat - route[seg].lat) * frac;
    lng = route[seg].lng + (route[seg + 1].lng - route[seg].lng) * frac;
    loc = p >= 1 ? route[route.length - 1].name : `Near ${route[seg + 1].name}`;
  }
  const milestones = ((shipment.milestones as Milestone[]) ?? []).map((m) => {
    const mIdx = MILESTONES.indexOf(m.key as (typeof MILESTONES)[number]);
    return {
      ...m,
      done: mIdx <= nextIdx,
      current: mIdx === nextIdx,
      timestamp: mIdx === nextIdx ? new Date().toISOString() : m.timestamp,
    };
  });
  await getDb()
    .update(s.shipments)
    .set({
      status: next, currentLat: lat, currentLng: lng, currentLocation: loc,
      milestones, eta, delayed: delayed || shipment.delayed, delayDays, lastAdvancedAt: new Date(),
    })
    .where(eq(s.shipments.id, shipment.id));
  if (delayed) {
    await logActivity("System", `Delivery exception: shipment #${shipment.id} ETA revised +${delayDays} days`, "shipment", String(shipment.id));
  }
  return { ...shipment, status: next, currentLat: lat, currentLng: lng, currentLocation: loc, milestones, eta, delayed: delayed || shipment.delayed, delayDays } as T;
}

export const trackingRouter = createRouter({
  /** Staff: all shipments (advances the simulation) */
  list: authedQuery.query(async ({ ctx }) => {
    assertStaff(await effUser(ctx.user));
    const db = getDb();
    const rows = await db.query.shipments.findMany({
      with: { order: { with: { quote: { with: { request: { with: { buyer: true } } } } } } },
      orderBy: desc(s.shipments.updatedAt),
      limit: 100,
    });
    return Promise.all(rows.map(maybeAdvance));
  }),

  /** Buyer: shipments on my orders */
  mine: authedQuery.query(async ({ ctx }) => {
    const me = await effUser(ctx.user);
    const db = getDb();
    const rows = await db.query.shipments.findMany({
      with: { order: { with: { quote: { with: { request: true } } } } },
      orderBy: desc(s.shipments.updatedAt),
      limit: 100,
    });
    const mineRows = rows.filter((r) => r.order?.quote?.request?.buyerId === me.id);
    return Promise.all(mineRows.map(maybeAdvance));
  }),

  /** Supplier: shipments where my quote was accepted */
  forSupplier: authedQuery.query(async ({ ctx }) => {
    const me = await effUser(ctx.user);
    const db = getDb();
    const rows = await db.query.shipments.findMany({
      with: { order: { with: { quote: { with: { request: true } } } } },
      orderBy: desc(s.shipments.updatedAt),
      limit: 100,
    });
    const own = rows.filter((r) => r.order?.quote?.supplierId === me.id);
    return Promise.all(own.map(maybeAdvance));
  }),

  add: authedQuery
    .input(
      z.object({
        orderId: z.number(),
        containerNumber: z.string().min(4),
        bolNumber: z.string().min(3),
        vesselName: z.string().min(2),
        carrier: z.string().min(2),
        departurePort: z.string().min(2),
        destinationPort: z.string().min(2),
        eta: z.coerce.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      assertStaff(me);
      const db = getDb();
      const ROUTE: RoutePoint[] = [
        { name: input.departurePort, lat: 31.23, lng: 121.47 },
        { name: "Singapore Strait", lat: 1.26, lng: 103.82 },
        { name: "Colombo, LK", lat: 6.93, lng: 79.85 },
        { name: "Suez Canal, EG", lat: 30.42, lng: 32.34 },
        { name: "Gibraltar Strait", lat: 35.95, lng: -5.65 },
        { name: "English Channel", lat: 49.9, lng: -2.5 },
        { name: input.destinationPort, lat: 51.95, lng: 1.31 },
      ];
      const milestones: Milestone[] = MILESTONES.map((m, i) => ({
        key: m,
        label: m.replace(/_/g, " "),
        done: i === 0,
        current: i === 0,
        timestamp: i === 0 ? new Date().toISOString() : null,
        location: i === 0 ? input.departurePort : "",
      }));
      const [{ id }] = await db
        .insert(s.shipments)
        .values({
          orderId: input.orderId,
          containerNumber: input.containerNumber,
          bolNumber: input.bolNumber,
          vesselName: input.vesselName,
          carrier: input.carrier,
          departurePort: input.departurePort,
          destinationPort: input.destinationPort,
          milestones,
          route: ROUTE,
          currentLocation: input.departurePort,
          currentLat: ROUTE[0].lat,
          currentLng: ROUTE[0].lng,
          eta: input.eta,
          status: "BOOKED",
        })
        .returning({ id: s.shipments.id });
      await db.update(s.orders).set({ shipmentStatus: "BOOKED" }).where(eq(s.orders.id, input.orderId));
      await logActivity(fmtActor(me), `Added shipment ${input.containerNumber} to tracking`, "shipment", String(id), me.id);
      return { id };
    }),

  /** Supplier updates shipping details (BOL upload simulated as metadata) */
  manage: authedQuery
    .input(
      z.object({
        shipmentId: z.number(),
        containerNumber: z.string().min(4),
        vesselName: z.string().min(2),
        carrier: z.string().min(2),
        bolNumber: z.string().min(3),
        bolFileName: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      const db = getDb();
      const shipment = await db.query.shipments.findFirst({
        where: eq(s.shipments.id, input.shipmentId),
        with: { order: { with: { quote: true } } },
      });
      if (!shipment || shipment.order?.quote?.supplierId !== me.id) throw new Error("Shipment not found");
      await db
        .update(s.shipments)
        .set({
          containerNumber: input.containerNumber,
          vesselName: input.vesselName,
          carrier: input.carrier,
          bolNumber: input.bolNumber,
          status: "GATE_IN",
          trackingData: { bolFile: input.bolFileName ?? null, uploadedBy: me.name },
        })
        .where(eq(s.shipments.id, input.shipmentId));
      if (input.bolFileName) {
        await db.insert(s.documents).values({
          orderId: shipment.orderId,
          type: "BOL",
          name: input.bolFileName,
          url: "#",
          uploadedBy: me.id,
        });
      }
      const buyerId = shipment.order?.quote
        ? (await db.query.requests.findFirst({ where: eq(s.requests.id, (shipment.order.quote as s.Quote).requestId) }))?.buyerId
        : null;
      if (buyerId) {
        await notify(buyerId, "ORDER_SHIPPED", "Shipment details received", `Container ${input.containerNumber} (${input.vesselName}) has been gated in.`, "/buyer/orders");
      }
      await logActivity(fmtActor(me), `Updated shipment ${input.containerNumber} (BOL ${input.bolNumber})`, "shipment", String(input.shipmentId), me.id);
      return { ok: true };
    }),
});
