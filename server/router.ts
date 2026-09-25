import { authRouter } from "./auth-router";
import { createRouter, publicQuery } from "./middleware";
import { profileRouter } from "./profile-router";
import { adminRouter } from "./admin-router";
import { commsRouter } from "./comms-router";
import { requestsRouter } from "./requests-router";
import { quotesRouter } from "./quotes-router";
import { ordersRouter } from "./orders-router";
import { trackingRouter } from "./tracking-router";
import { marketRouter } from "./market-router";
import { membershipRouter } from "./membership-router";
import { financingRouter } from "./financing-router";
import { notificationsRouter } from "./notifications-router";
import { supplierRouter } from "./supplier-router";
import { financeRouter } from "./finance-router";
import { tradeRouter } from "./trade-router";
import { docgateRouter } from "./docgate-router";
import { agentRouter } from "./agent-router";
import { pricesRouter } from "./prices-router";
import { leadsRouter } from "./leads-router";
import { identityRouter } from "./identity-router";
import { hubRouter } from "./hub-router";
import { engagementRouter } from "./engagement-router";
import { nitrogenRouter } from "./nitrogen-router";
import { libraryRouter } from "./library-router";
import { libraryAdminRouter } from "./library-admin-router";
import { aq1Router } from "./aq1-router";
import { analyticsRouter } from "./analytics-router";
import { billingRouter } from "./billing-router";
import { alertsRouter } from "./alerts-router";
import { newsletterRouter } from "./newsletter-router";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  profile: profileRouter,
  admin: adminRouter,
  comms: commsRouter,
  requests: requestsRouter,
  quotes: quotesRouter,
  orders: ordersRouter,
  tracking: trackingRouter,
  market: marketRouter,
  membership: membershipRouter,
  financing: financingRouter,
  notifications: notificationsRouter,
  supplier: supplierRouter,
  finance: financeRouter,
  trade: tradeRouter,
  docgate: docgateRouter,
  agent: agentRouter,
  prices: pricesRouter,
  leads: leadsRouter,
  identity: identityRouter,
  hub: hubRouter,
  engagement: engagementRouter,
  nitrogen: nitrogenRouter,
  library: libraryRouter,
  libraryAdmin: libraryAdminRouter,
  aq1: aq1Router,
  analytics: analyticsRouter,
  billing: billingRouter,
  alerts: alertsRouter,
  newsletter: newsletterRouter,
});

export type AppRouter = typeof appRouter;
