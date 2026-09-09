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
import { parts } from "./inventory";

export const flipStatusEnum = pgEnum("flip_status", [
  "SEARCHING",
  "CANDIDATE",
  "PURCHASED",
  "RECEIVED",
  "DIAGNOSTICS",
  "WAITING_FOR_PARTS",
  "IN_REPAIR",
  "TESTING",
  "READY_TO_LIST",
  "LISTED",
  "RESERVED",
  "SOLD",
  "ARCHIVED",
]);

export const riskLevelEnum = pgEnum("risk_level", ["GREEN", "YELLOW", "RED"]);

export const listingStatusEnum = pgEnum("listing_status", [
  "DRAFT",
  "READY",
  "LISTED",
  "RESERVED",
  "SOLD",
  "CANCELLED",
]);

export const costCategoryEnum = pgEnum("cost_category", [
  "PURCHASE",
  "SHIPPING",
  "PART",
  "CONSUMABLE",
  "TOOL",
  "PLATFORM_FEE",
  "OTHER",
]);

export const flipCandidates = pgTable(
  "flip_candidates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listingUrl: text("listing_url"),
    platform: text("platform").default("FINN"),
    seller: text("seller"),
    listingId: text("listing_id"),
    model: text("model").notNull(),
    storage: text("storage"),
    color: text("color"),
    askingPriceOre: integer("asking_price_ore").notNull(),
    shippingOre: integer("shipping_ore").notNull().default(0),
    reportedFault: text("reported_fault"),
    condition: text("condition"),
    estimatedRepairOre: integer("estimated_repair_ore").notNull().default(0),
    estimatedResaleOre: integer("estimated_resale_ore").notNull().default(0),
    estimatedInvestmentOre: integer("estimated_investment_ore")
      .notNull()
      .default(0),
    estimatedProfitOre: integer("estimated_profit_ore").notNull().default(0),
    estimatedRoiBps: integer("estimated_roi_bps").notNull().default(0),
    risk: riskLevelEnum("risk").notNull().default("YELLOW"),
    notes: text("notes"),
    createdById: text("created_by_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    convertedRefurbishmentId: uuid("converted_refurbishment_id"),
  },
  (t) => [index("flip_candidates_model_idx").on(t.model)],
);

export const refurbishments = pgTable(
  "refurbishments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    flipNumber: text("flip_number").notNull().unique(),
    candidateId: uuid("candidate_id").references(() => flipCandidates.id),
    status: flipStatusEnum("status").notNull().default("PURCHASED"),
    model: text("model").notNull(),
    storage: text("storage"),
    color: text("color"),
    serialNumber: text("serial_number"),
    imei: text("imei"),
    batteryHealth: integer("battery_health"),
    activationLockClear: boolean("activation_lock_clear")
      .notNull()
      .default(false),
    findMyOff: boolean("find_my_off").notNull().default(false),
    estimatedPurchaseOre: integer("estimated_purchase_ore"),
    actualPurchaseOre: integer("actual_purchase_ore"),
    estimatedRepairOre: integer("estimated_repair_ore"),
    actualRepairOre: integer("actual_repair_ore"),
    estimatedSaleOre: integer("estimated_sale_ore"),
    actualSaleOre: integer("actual_sale_ore"),
    estimatedProfitOre: integer("estimated_profit_ore"),
    actualProfitOre: integer("actual_profit_ore"),
    estimatedRoiBps: integer("estimated_roi_bps"),
    actualRoiBps: integer("actual_roi_bps"),
    notes: text("notes"),
    createdById: text("created_by_id").references(() => users.id),
    purchasedAt: timestamp("purchased_at", { withTimezone: true }),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    soldAt: timestamp("sold_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("refurbishments_flip_number_idx").on(t.flipNumber),
    index("refurbishments_status_idx").on(t.status),
    index("refurbishments_imei_idx").on(t.imei),
  ],
);

export const refurbishmentAcquisitions = pgTable("refurbishment_acquisitions", {
  id: uuid("id").defaultRandom().primaryKey(),
  refurbishmentId: uuid("refurbishment_id")
    .notNull()
    .references(() => refurbishments.id, { onDelete: "cascade" }),
  purchasePriceOre: integer("purchase_price_ore").notNull(),
  shippingOre: integer("shipping_ore").notNull().default(0),
  platform: text("platform"),
  seller: text("seller"),
  paymentMethod: text("payment_method"),
  listingUrl: text("listing_url"),
  originalDescription: text("original_description"),
  purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull(),
});

export const refurbishmentCosts = pgTable("refurbishment_costs", {
  id: uuid("id").defaultRandom().primaryKey(),
  refurbishmentId: uuid("refurbishment_id")
    .notNull()
    .references(() => refurbishments.id, { onDelete: "cascade" }),
  category: costCategoryEnum("category").notNull(),
  label: text("label").notNull(),
  amountOre: integer("amount_ore").notNull(),
  isBusinessAsset: boolean("is_business_asset").notNull().default(false),
  partId: uuid("part_id").references(() => parts.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const resaleListings = pgTable("resale_listings", {
  id: uuid("id").defaultRandom().primaryKey(),
  refurbishmentId: uuid("refurbishment_id")
    .notNull()
    .references(() => refurbishments.id, { onDelete: "cascade" }),
  platform: text("platform").notNull().default("FINN"),
  title: text("title").notNull(),
  description: text("description"),
  salePriceOre: integer("sale_price_ore").notNull(),
  minimumPriceOre: integer("minimum_price_ore"),
  condition: text("condition"),
  batteryHealth: integer("battery_health"),
  replacedPartsSummary: text("replaced_parts_summary"),
  listingUrl: text("listing_url"),
  status: listingStatusEnum("status").notNull().default("DRAFT"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const resales = pgTable("resales", {
  id: uuid("id").defaultRandom().primaryKey(),
  refurbishmentId: uuid("refurbishment_id")
    .notNull()
    .references(() => refurbishments.id, { onDelete: "cascade" }),
  listingId: uuid("listing_id").references(() => resaleListings.id),
  salePriceOre: integer("sale_price_ore").notNull(),
  platform: text("platform"),
  buyerName: text("buyer_name"),
  shippingOre: integer("shipping_ore").notNull().default(0),
  platformFeesOre: integer("platform_fees_ore").notNull().default(0),
  otherFeesOre: integer("other_fees_ore").notNull().default(0),
  soldAt: timestamp("sold_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
