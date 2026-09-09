import { randomBytes } from "crypto";
import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
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

export const noteVisibilityEnum = pgEnum("note_visibility", [
  "INTERNAL",
  "CUSTOMER",
]);

export const attachmentVisibilityEnum = pgEnum("attachment_visibility", [
  "INTERNAL",
  "CUSTOMER",
]);

export const intakeCheckResultEnum = pgEnum("intake_check_result", [
  "PASS",
  "FAIL",
  "NOT_TESTED",
  "NOT_APPLICABLE",
]);

export const quoteStatusEnum = pgEnum("quote_status", [
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
]);

export const quoteItemKindEnum = pgEnum("quote_item_kind", [
  "SERVICE",
  "PART",
  "CUSTOM",
]);

export const warrantyClaimStatusEnum = pgEnum("warranty_claim_status", [
  "OPEN",
  "IN_PROGRESS",
  "APPROVED",
  "REJECTED",
  "RESOLVED",
  "CLOSED",
]);

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email").notNull(),
    /** Legacy single-line address; kept in sync from structured billing fields. */
    address: text("address"),
    streetAddress: text("street_address").notNull().default(""),
    postalCode: text("postal_code").notNull().default(""),
    city: text("city").notNull().default(""),
    country: text("country").notNull().default("Norge"),
    notes: text("notes"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
  },
  (t) => [
    index("customers_email_idx").on(t.email),
    index("customers_name_idx").on(t.name),
    index("customers_phone_idx").on(t.phone),
  ],
);

export const devices = pgTable(
  "devices",
  {
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
    ownershipType: ownershipTypeEnum("ownership_type")
      .notNull()
      .default("CUSTOMER"),
    customerId: uuid("customer_id").references(() => customers.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("devices_imei_idx").on(t.imei),
    index("devices_serial_number_idx").on(t.serialNumber),
    index("devices_customer_id_idx").on(t.customerId),
  ],
);

export const repairTickets = pgTable(
  "repair_tickets",
  {
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
    /** Unpredictable public link token — never use ticket number alone. */
    publicAccessToken: text("public_access_token")
      .notNull()
      .unique()
      .$defaultFn(() => randomBytes(32).toString("hex"))
      .default(
        sql`replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')`,
      ),
    estimatedCompletionDate: timestamp("estimated_completion_date", {
      withTimezone: true,
    }),
    customerPriceOre: integer("customer_price_ore"),
    estimatedPartsCostOre: integer("estimated_parts_cost_ore"),
    actualPartsCostOre: integer("actual_parts_cost_ore"),
    otherCostsOre: integer("other_costs_ore").notNull().default(0),
    paymentStatus: paymentStatusEnum("payment_status")
      .notNull()
      .default("UNPAID"),
    warrantyDays: integer("warranty_days").default(90),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("repair_tickets_ticket_number_idx").on(t.ticketNumber),
    index("repair_tickets_status_idx").on(t.status),
    index("repair_tickets_customer_id_idx").on(t.customerId),
    index("repair_tickets_device_id_idx").on(t.deviceId),
    index("repair_tickets_public_access_token_idx").on(t.publicAccessToken),
    index("repair_tickets_assignee_id_idx").on(t.assigneeId),
  ],
);

/** Structured intake / mottakskontroll for a repair ticket. */
export const repairIntakeInspections = pgTable(
  "repair_intake_inspections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketId: uuid("ticket_id")
      .notNull()
      .unique()
      .references(() => repairTickets.id, { onDelete: "cascade" }),
    inspectedById: text("inspected_by_id").references(() => users.id),
    /** Free-text damage documentation at intake. */
    damageNotes: text("damage_notes"),
    /** Physical zones: front, back, left, right, top, bottom, screen, frame, back_glass, camera. */
    physicalZones: jsonb("physical_zones")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    /** Checklist keyed results. */
    checklist: jsonb("checklist")
      .$type<
        Record<
          string,
          {
            result: "PASS" | "FAIL" | "NOT_TESTED" | "NOT_APPLICABLE";
            note?: string;
          }
        >
      >()
      .notNull()
      .default({}),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("repair_intake_inspections_ticket_id_idx").on(t.ticketId)],
);

export const repairTicketStatusHistory = pgTable(
  "repair_ticket_status_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => repairTickets.id, { onDelete: "cascade" }),
    fromStatus: repairStatusEnum("from_status"),
    toStatus: repairStatusEnum("to_status").notNull(),
    changedById: text("changed_by_id").references(() => users.id),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("repair_ticket_status_history_ticket_id_idx").on(t.ticketId)],
);

export const diagnosticResultEnum = pgEnum("diagnostic_result", [
  "PASS",
  "FAIL",
  "NOT_TESTED",
  "NOT_APPLICABLE",
  "UNKNOWN",
]);

export const diagnostics = pgTable(
  "diagnostics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketId: uuid("ticket_id").references(() => repairTickets.id, {
      onDelete: "cascade",
    }),
    refurbishmentId: uuid("refurbishment_id"),
    technicianId: text("technician_id").references(() => users.id),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("diagnostics_ticket_id_idx").on(t.ticketId)],
);

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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const repairNotes = pgTable(
  "repair_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => repairTickets.id, { onDelete: "cascade" }),
    authorId: text("author_id").references(() => users.id),
    content: text("content").notNull(),
    visibility: noteVisibilityEnum("visibility").notNull().default("INTERNAL"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("repair_notes_ticket_id_idx").on(t.ticketId)],
);

export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    category: text("category"),
    description: text("description"),
    visibility: attachmentVisibilityEnum("visibility")
      .notNull()
      .default("INTERNAL"),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    storagePath: text("storage_path").notNull(),
    createdById: text("created_by_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("attachments_entity_idx").on(t.entityType, t.entityId),
    index("attachments_visibility_idx").on(t.visibility),
  ],
);

export const repairServices = pgTable(
  "repair_services",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => repairTickets.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id),
    priceOre: integer("price_ore").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("repair_services_ticket_id_idx").on(t.ticketId)],
);

export const quotes = pgTable(
  "quotes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketId: uuid("ticket_id").references(() => repairTickets.id, {
      onDelete: "set null",
    }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    status: quoteStatusEnum("status").notNull().default("DRAFT"),
    totalOre: integer("total_ore").notNull().default(0),
    notes: text("notes"),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    createdById: text("created_by_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("quotes_ticket_id_idx").on(t.ticketId),
    index("quotes_customer_id_idx").on(t.customerId),
    index("quotes_status_idx").on(t.status),
  ],
);

export const quoteItems = pgTable("quote_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  quoteId: uuid("quote_id")
    .notNull()
    .references(() => quotes.id, { onDelete: "cascade" }),
  kind: quoteItemKindEnum("kind").notNull().default("CUSTOM"),
  serviceId: uuid("service_id").references(() => services.id),
  partId: uuid("part_id"),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPriceOre: integer("unit_price_ore").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const warranties = pgTable(
  "warranties",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => repairTickets.id, { onDelete: "cascade" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    days: integer("days").notNull().default(90),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("warranties_ticket_id_idx").on(t.ticketId)],
);

export const warrantyClaims = pgTable(
  "warranty_claims",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    warrantyId: uuid("warranty_id")
      .notNull()
      .references(() => warranties.id, { onDelete: "cascade" }),
    ticketId: uuid("ticket_id").references(() => repairTickets.id),
    status: warrantyClaimStatusEnum("status").notNull().default("OPEN"),
    description: text("description").notNull(),
    resolution: text("resolution"),
    createdById: text("created_by_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("warranty_claims_warranty_id_idx").on(t.warrantyId),
    index("warranty_claims_status_idx").on(t.status),
  ],
);

export const activityEvents = pgTable(
  "activity_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    type: text("type").notNull(),
    message: text("message").notNull(),
    actorId: text("actor_id").references(() => users.id),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("activity_events_entity_idx").on(t.entityType, t.entityId),
    index("activity_events_created_at_idx").on(t.createdAt),
  ],
);

export const idSequences = pgTable(
  "id_sequences",
  {
    kind: text("kind").notNull(),
    year: integer("year").notNull(),
    lastValue: integer("last_value").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.kind, t.year] })],
);

export const settings = pgTable("settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: text("actor_id").references(() => users.id),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    action: text("action").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("audit_logs_entity_idx").on(t.entityType, t.entityId),
    index("audit_logs_created_at_idx").on(t.createdAt),
  ],
);
