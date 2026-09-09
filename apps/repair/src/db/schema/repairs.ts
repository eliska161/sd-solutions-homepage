import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

export const ownershipTypeEnum = pgEnum("ownership_type", [
  "CUSTOMER",
  "SD_SOLUTIONS",
  "UNKNOWN",
]);

export const repairStatusEnum = pgEnum("repair_status", [
  "NEW",
  "DIAGNOSTICS",
  "WAITING_FOR_CUSTOMER",
  "WAITING_FOR_PART",
  "APPROVED",
  "IN_REPAIR",
  "TESTING",
  "READY_FOR_PICKUP",
  "COMPLETED",
  "CANCELLED",
  "RETURNED",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "UNPAID",
  "PARTIAL",
  "PAID",
  "REFUNDED",
]);

export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
});

export const devices = pgTable("devices", {
  id: uuid("id").defaultRandom().primaryKey(),
  brand: text("brand").notNull().default("Apple"),
  model: text("model").notNull(),
  variant: text("variant"),
  storage: text("storage"),
  color: text("color"),
  serialNumber: text("serial_number"),
  imei: text("imei"),
  batteryHealth: integer("battery_health"),
  condition: text("condition"),
  ownershipType: ownershipTypeEnum("ownership_type").notNull().default("CUSTOMER"),
  customerId: uuid("customer_id").references(() => customers.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const repairTickets = pgTable("repair_tickets", {
  id: uuid("id").defaultRandom().primaryKey(),
  ticketNumber: text("ticket_number").notNull().unique(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id),
  deviceId: uuid("device_id")
    .notNull()
    .references(() => devices.id),
  customerProblem: text("customer_problem").notNull(),
  internalProblem: text("internal_problem"),
  physicalCondition: text("physical_condition"),
  status: repairStatusEnum("status").notNull().default("NEW"),
  assigneeId: text("assignee_id").references(() => users.id),
  customerPriceOre: integer("customer_price_ore"),
  estimatedPartsCostOre: integer("estimated_parts_cost_ore"),
  actualPartsCostOre: integer("actual_parts_cost_ore"),
  otherCostsOre: integer("other_costs_ore").notNull().default(0),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("UNPAID"),
  warrantyDays: integer("warranty_days").default(90),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const repairTicketStatusHistory = pgTable("repair_ticket_status_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  ticketId: uuid("ticket_id")
    .notNull()
    .references(() => repairTickets.id, { onDelete: "cascade" }),
  fromStatus: repairStatusEnum("from_status"),
  toStatus: repairStatusEnum("to_status").notNull(),
  changedById: text("changed_by_id").references(() => users.id),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const diagnosticResultEnum = pgEnum("diagnostic_result", [
  "PASS",
  "FAIL",
  "NOT_TESTED",
  "NOT_APPLICABLE",
  "UNKNOWN",
]);

export const diagnostics = pgTable("diagnostics", {
  id: uuid("id").defaultRandom().primaryKey(),
  ticketId: uuid("ticket_id").references(() => repairTickets.id, {
    onDelete: "cascade",
  }),
  refurbishmentId: uuid("refurbishment_id"),
  technicianId: text("technician_id").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const diagnosticResults = pgTable("diagnostic_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  diagnosticsId: uuid("diagnostics_id")
    .notNull()
    .references(() => diagnostics.id, { onDelete: "cascade" }),
  checkKey: text("check_key").notNull(),
  result: diagnosticResultEnum("result").notNull().default("NOT_TESTED"),
  note: text("note"),
});

export const services = pgTable("services", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  customerPriceOre: integer("customer_price_ore").notNull(),
  estimatedPartsCostOre: integer("estimated_parts_cost_ore"),
  estimatedLaborMinutes: integer("estimated_labor_minutes"),
  warrantyDays: integer("warranty_days").default(90),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: text("actor_id").references(() => users.id),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  before: jsonb("before"),
  after: jsonb("after"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
