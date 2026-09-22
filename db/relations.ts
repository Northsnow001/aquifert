import { relations } from "drizzle-orm";
import {
  users,
  organizations,
  memberships,
  requests,
  quotes,
  orders,
  shipments,
  conversations,
  financingApplications,
  invoices,
  documents,
  notifications,
  supplierRequests,
  supplierProducts,
} from "./schema";

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  membership: many(memberships),
  requests: many(requests),
  notifications: many(notifications),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(users),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  user: one(users, { fields: [memberships.userId], references: [users.id] }),
}));

export const requestsRelations = relations(requests, ({ one, many }) => ({
  buyer: one(users, { fields: [requests.buyerId], references: [users.id] }),
  quotes: many(quotes),
  supplierRequests: many(supplierRequests),
}));

export const quotesRelations = relations(quotes, ({ one }) => ({
  request: one(requests, { fields: [quotes.requestId], references: [requests.id] }),
  supplier: one(users, { fields: [quotes.supplierId], references: [users.id] }),
  order: one(orders),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  quote: one(quotes, { fields: [orders.quoteId], references: [quotes.id] }),
  shipment: one(shipments),
  invoices: many(invoices),
  documents: many(documents),
}));

export const shipmentsRelations = relations(shipments, ({ one }) => ({
  order: one(orders, { fields: [shipments.orderId], references: [orders.id] }),
}));

export const conversationsRelations = relations(conversations, ({ one }) => ({
  request: one(requests, { fields: [conversations.requestId], references: [requests.id] }),
}));

export const financingRelations = relations(financingApplications, ({ one }) => ({
  buyer: one(users, { fields: [financingApplications.buyerId], references: [users.id] }),
  order: one(orders, { fields: [financingApplications.orderId], references: [orders.id] }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  order: one(orders, { fields: [invoices.orderId], references: [orders.id] }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  order: one(orders, { fields: [documents.orderId], references: [orders.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const supplierRequestsRelations = relations(supplierRequests, ({ one }) => ({
  request: one(requests, { fields: [supplierRequests.requestId], references: [requests.id] }),
  supplier: one(users, { fields: [supplierRequests.supplierId], references: [users.id] }),
}));

export const supplierProductsRelations = relations(supplierProducts, ({ one }) => ({
  supplier: one(users, { fields: [supplierProducts.supplierId], references: [users.id] }),
}));
