import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { repairTickets } from "./repairs";

export const partTypeEnum = pgEnum("part_type", [
  "OEM",
  "ORIGINAL_PULL",
  "SOFT_OLED",
  "HARD_OLED",
  "LCD",
  "INCELL",
  "BATTERY",
  "FLEX",
  "OTHER",
]);

export const inventoryActionEnum = pgEnum("inventory_action", [
  "RECEIVED",
  "USED",
  "RETURNED",
  "ADJUSTED",
  "DAMAGED",
  "SOLD",
  "TRANSFERRED",
]);

export const purchaseOrderStatusEnum = pgEnum("purchase_order_status", [
  "DRAFT",
  "ORDERED",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CANCELLED",
]);

export const repairPartStatusEnum = pgEnum("repair_part_status", [
  "USED",
  "ORDERED",
  "CANCELLED",
]);

export const priceSourceEnum = pgEnum("price_source", [
  "MANUAL",
  "CSV",
  "OFFICIAL_API",
  "UNVERIFIED",
]);

export const suppliers = pgTable("suppliers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  website: text("website"),
  contact: text("contact"),
  currency: text("currency").notNull().default("NOK"),
  defaultShippingOre: integer("default_shipping_ore").default(0),
  apiSupported: boolean("api_supported").notNull().default(false),
  active: boolean("active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const parts = pgTable(
  "parts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sku: text("sku").notNull().unique(),
    name: text("name").notNull(),
    category: text("category"),
    brand: text("brand"),
    partType: partTypeEnum("part_type").notNull().default("OTHER"),
    costPriceOre: integer("cost_price_ore").notNull().default(0),
    sellPriceOre: integer("sell_price_ore"),
    quantityOnHand: integer("quantity_on_hand").notNull().default(0),
    minimumStock: integer("minimum_stock").notNull().default(0),
    location: text("location"),
    warrantyDays: integer("warranty_days"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("parts_sku_idx").on(t.sku),
    index("parts_name_idx").on(t.name),
    index("parts_active_idx").on(t.active),
  ],
);

export const partModelCompat = pgTable("part_model_compat", {
  id: uuid("id").defaultRandom().primaryKey(),
  partId: uuid("part_id")
    .notNull()
    .references(() => parts.id, { onDelete: "cascade" }),
  modelKey: text("model_key").notNull(),
});

export const supplierParts = pgTable(
  "supplier_parts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    partId: uuid("part_id").references(() => parts.id),
    supplierSku: text("supplier_sku"),
    productUrl: text("product_url"),
    publicPriceOre: integer("public_price_ore"),
    proPriceOre: integer("pro_price_ore"),
    currency: text("currency").notNull().default("NOK"),
    shippingCostOre: integer("shipping_cost_ore"),
    priceSource: priceSourceEnum("price_source").notNull().default("MANUAL"),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    active: boolean("active").notNull().default(true),
  },
  (t) => [
    index("supplier_parts_supplier_id_idx").on(t.supplierId),
    index("supplier_parts_part_id_idx").on(t.partId),
  ],
);

export const repairParts = pgTable(
  "repair_parts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** Workshop repair ticket — null when used on a flip. */
    ticketId: uuid("ticket_id").references(() => repairTickets.id, {
      onDelete: "cascade",
    }),
    /** Flip / refurbishment — null when used on a workshop ticket. */
    refurbishmentId: uuid("refurbishment_id"),
    partId: uuid("part_id")
      .notNull()
      .references(() => parts.id),
    quantity: integer("quantity").notNull().default(1),
    unitCostOre: integer("unit_cost_ore").notNull().default(0),
    status: repairPartStatusEnum("status").notNull().default("USED"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("repair_parts_ticket_id_idx").on(t.ticketId),
    index("repair_parts_refurbishment_id_idx").on(t.refurbishmentId),
    index("repair_parts_part_id_idx").on(t.partId),
  ],
);

export const inventoryTransactions = pgTable(
  "inventory_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    partId: uuid("part_id")
      .notNull()
      .references(() => parts.id),
    action: inventoryActionEnum("action").notNull(),
    quantityDelta: integer("quantity_delta").notNull(),
    unitCostOre: integer("unit_cost_ore"),
    resultingQuantity: integer("resulting_quantity").notNull(),
    repairTicketId: uuid("repair_ticket_id").references(() => repairTickets.id),
    refurbishmentId: uuid("refurbishment_id"),
    purchaseOrderId: uuid("purchase_order_id"),
    note: text("note"),
    createdById: text("created_by_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("inventory_transactions_part_id_idx").on(t.partId),
    index("inventory_transactions_created_at_idx").on(t.createdAt),
  ],
);

export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    poNumber: text("po_number").notNull().unique(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    status: purchaseOrderStatusEnum("status").notNull().default("DRAFT"),
    orderedAt: timestamp("ordered_at", { withTimezone: true }),
    expectedDeliveryAt: timestamp("expected_delivery_at", {
      withTimezone: true,
    }),
    shippingOre: integer("shipping_ore").notNull().default(0),
    totalOre: integer("total_ore").notNull().default(0),
    notes: text("notes"),
    createdById: text("created_by_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("purchase_orders_po_number_idx").on(t.poNumber)],
);

export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  purchaseOrderId: uuid("purchase_order_id")
    .notNull()
    .references(() => purchaseOrders.id, { onDelete: "cascade" }),
  partId: uuid("part_id").references(() => parts.id),
  description: text("description").notNull(),
  quantityOrdered: integer("quantity_ordered").notNull(),
  quantityReceived: integer("quantity_received").notNull().default(0),
  unitCostOre: integer("unit_cost_ore").notNull(),
});
