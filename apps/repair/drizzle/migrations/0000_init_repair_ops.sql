CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'TECHNICIAN', 'VIEWER');--> statement-breakpoint
CREATE TYPE "public"."attachment_visibility" AS ENUM('INTERNAL', 'CUSTOMER');--> statement-breakpoint
CREATE TYPE "public"."diagnostic_result" AS ENUM('PASS', 'FAIL', 'NOT_TESTED', 'NOT_APPLICABLE', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."intake_check_result" AS ENUM('PASS', 'FAIL', 'NOT_TESTED', 'NOT_APPLICABLE');--> statement-breakpoint
CREATE TYPE "public"."note_visibility" AS ENUM('INTERNAL', 'CUSTOMER');--> statement-breakpoint
CREATE TYPE "public"."ownership_type" AS ENUM('CUSTOMER', 'SD_SOLUTIONS', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('UNPAID', 'PARTIAL', 'PAID', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."quote_item_kind" AS ENUM('SERVICE', 'PART', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."quote_status" AS ENUM('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."repair_status" AS ENUM('NEW', 'DIAGNOSTICS', 'WAITING_FOR_CUSTOMER', 'WAITING_FOR_PART', 'APPROVED', 'IN_REPAIR', 'TESTING', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED', 'RETURNED');--> statement-breakpoint
CREATE TYPE "public"."warranty_claim_status" AS ENUM('OPEN', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'RESOLVED', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."inventory_action" AS ENUM('RECEIVED', 'USED', 'RETURNED', 'ADJUSTED', 'DAMAGED', 'SOLD', 'TRANSFERRED');--> statement-breakpoint
CREATE TYPE "public"."part_type" AS ENUM('OEM', 'ORIGINAL_PULL', 'SOFT_OLED', 'HARD_OLED', 'LCD', 'INCELL', 'BATTERY', 'FLEX', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."price_source" AS ENUM('MANUAL', 'CSV', 'OFFICIAL_API', 'UNVERIFIED');--> statement-breakpoint
CREATE TYPE "public"."purchase_order_status" AS ENUM('DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."cost_category" AS ENUM('PURCHASE', 'SHIPPING', 'PART', 'CONSUMABLE', 'TOOL', 'PLATFORM_FEE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."flip_status" AS ENUM('SEARCHING', 'CANDIDATE', 'PURCHASED', 'RECEIVED', 'DIAGNOSTICS', 'WAITING_FOR_PARTS', 'IN_REPAIR', 'TESTING', 'READY_TO_LIST', 'LISTED', 'RESERVED', 'SOLD', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('DRAFT', 'READY', 'LISTED', 'RESERVED', 'SOLD', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."risk_level" AS ENUM('GREEN', 'YELLOW', 'RED');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "user_role" DEFAULT 'TECHNICIAN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "activity_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"actor_id" text,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"category" text,
	"description" text,
	"visibility" "attachment_visibility" DEFAULT 'INTERNAL' NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"storage_path" text NOT NULL,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"address" text,
	"notes" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_activity_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand" text DEFAULT 'Apple' NOT NULL,
	"model" text NOT NULL,
	"variant" text,
	"storage" text,
	"color" text,
	"serial_number" text,
	"imei" text,
	"battery_health" integer,
	"condition" text,
	"ownership_type" "ownership_type" DEFAULT 'CUSTOMER' NOT NULL,
	"customer_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diagnostic_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"diagnostics_id" uuid NOT NULL,
	"check_key" text NOT NULL,
	"result" "diagnostic_result" DEFAULT 'NOT_TESTED' NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "diagnostics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid,
	"refurbishment_id" uuid,
	"technician_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "id_sequences" (
	"kind" text NOT NULL,
	"year" integer NOT NULL,
	"last_value" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "id_sequences_kind_year_pk" PRIMARY KEY("kind","year")
);
--> statement-breakpoint
CREATE TABLE "quote_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" uuid NOT NULL,
	"kind" "quote_item_kind" DEFAULT 'CUSTOM' NOT NULL,
	"service_id" uuid,
	"part_id" uuid,
	"description" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price_ore" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid,
	"customer_id" uuid NOT NULL,
	"status" "quote_status" DEFAULT 'DRAFT' NOT NULL,
	"total_ore" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"valid_until" timestamp with time zone,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repair_intake_inspections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"inspected_by_id" text,
	"damage_notes" text,
	"physical_zones" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"checklist" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "repair_intake_inspections_ticket_id_unique" UNIQUE("ticket_id")
);
--> statement-breakpoint
CREATE TABLE "repair_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"author_id" text,
	"content" text NOT NULL,
	"visibility" "note_visibility" DEFAULT 'INTERNAL' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repair_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"price_ore" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repair_ticket_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"from_status" "repair_status",
	"to_status" "repair_status" NOT NULL,
	"changed_by_id" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repair_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_number" text NOT NULL,
	"customer_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"customer_problem" text NOT NULL,
	"internal_problem" text,
	"physical_condition" text,
	"status" "repair_status" DEFAULT 'NEW' NOT NULL,
	"assignee_id" text,
	"public_access_token" text DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '') NOT NULL,
	"estimated_completion_date" timestamp with time zone,
	"customer_price_ore" integer,
	"estimated_parts_cost_ore" integer,
	"actual_parts_cost_ore" integer,
	"other_costs_ore" integer DEFAULT 0 NOT NULL,
	"payment_status" "payment_status" DEFAULT 'UNPAID' NOT NULL,
	"warranty_days" integer DEFAULT 90,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "repair_tickets_ticket_number_unique" UNIQUE("ticket_number"),
	CONSTRAINT "repair_tickets_public_access_token_unique" UNIQUE("public_access_token")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"customer_price_ore" integer NOT NULL,
	"estimated_parts_cost_ore" integer,
	"estimated_labor_minutes" integer,
	"warranty_days" integer DEFAULT 90,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "services_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "warranties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"days" integer DEFAULT 90 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warranty_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"warranty_id" uuid NOT NULL,
	"ticket_id" uuid,
	"status" "warranty_claim_status" DEFAULT 'OPEN' NOT NULL,
	"description" text NOT NULL,
	"resolution" text,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"part_id" uuid NOT NULL,
	"action" "inventory_action" NOT NULL,
	"quantity_delta" integer NOT NULL,
	"unit_cost_ore" integer,
	"resulting_quantity" integer NOT NULL,
	"repair_ticket_id" uuid,
	"refurbishment_id" uuid,
	"purchase_order_id" uuid,
	"note" text,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "part_model_compat" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"part_id" uuid NOT NULL,
	"model_key" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"brand" text,
	"part_type" "part_type" DEFAULT 'OTHER' NOT NULL,
	"cost_price_ore" integer DEFAULT 0 NOT NULL,
	"sell_price_ore" integer,
	"quantity_on_hand" integer DEFAULT 0 NOT NULL,
	"minimum_stock" integer DEFAULT 0 NOT NULL,
	"location" text,
	"warranty_days" integer,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parts_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "purchase_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"part_id" uuid,
	"description" text NOT NULL,
	"quantity_ordered" integer NOT NULL,
	"quantity_received" integer DEFAULT 0 NOT NULL,
	"unit_cost_ore" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"po_number" text NOT NULL,
	"supplier_id" uuid NOT NULL,
	"status" "purchase_order_status" DEFAULT 'DRAFT' NOT NULL,
	"ordered_at" timestamp with time zone,
	"expected_delivery_at" timestamp with time zone,
	"shipping_ore" integer DEFAULT 0 NOT NULL,
	"total_ore" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_orders_po_number_unique" UNIQUE("po_number")
);
--> statement-breakpoint
CREATE TABLE "repair_parts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"part_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_cost_ore" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_parts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"part_id" uuid,
	"supplier_sku" text,
	"product_url" text,
	"public_price_ore" integer,
	"pro_price_ore" integer,
	"currency" text DEFAULT 'NOK' NOT NULL,
	"shipping_cost_ore" integer,
	"price_source" "price_source" DEFAULT 'MANUAL' NOT NULL,
	"last_verified_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"website" text,
	"contact" text,
	"currency" text DEFAULT 'NOK' NOT NULL,
	"default_shipping_ore" integer DEFAULT 0,
	"api_supported" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flip_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_url" text,
	"platform" text DEFAULT 'FINN',
	"seller" text,
	"listing_id" text,
	"model" text NOT NULL,
	"storage" text,
	"color" text,
	"asking_price_ore" integer NOT NULL,
	"shipping_ore" integer DEFAULT 0 NOT NULL,
	"reported_fault" text,
	"condition" text,
	"estimated_repair_ore" integer DEFAULT 0 NOT NULL,
	"estimated_resale_ore" integer DEFAULT 0 NOT NULL,
	"estimated_investment_ore" integer DEFAULT 0 NOT NULL,
	"estimated_profit_ore" integer DEFAULT 0 NOT NULL,
	"estimated_roi_bps" integer DEFAULT 0 NOT NULL,
	"risk" "risk_level" DEFAULT 'YELLOW' NOT NULL,
	"notes" text,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"converted_refurbishment_id" uuid
);
--> statement-breakpoint
CREATE TABLE "refurbishment_acquisitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"refurbishment_id" uuid NOT NULL,
	"purchase_price_ore" integer NOT NULL,
	"shipping_ore" integer DEFAULT 0 NOT NULL,
	"platform" text,
	"seller" text,
	"payment_method" text,
	"listing_url" text,
	"original_description" text,
	"purchased_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refurbishment_costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"refurbishment_id" uuid NOT NULL,
	"category" "cost_category" NOT NULL,
	"label" text NOT NULL,
	"amount_ore" integer NOT NULL,
	"is_business_asset" boolean DEFAULT false NOT NULL,
	"part_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refurbishments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flip_number" text NOT NULL,
	"candidate_id" uuid,
	"status" "flip_status" DEFAULT 'PURCHASED' NOT NULL,
	"model" text NOT NULL,
	"storage" text,
	"color" text,
	"serial_number" text,
	"imei" text,
	"battery_health" integer,
	"activation_lock_clear" boolean DEFAULT false NOT NULL,
	"find_my_off" boolean DEFAULT false NOT NULL,
	"estimated_purchase_ore" integer,
	"actual_purchase_ore" integer,
	"estimated_repair_ore" integer,
	"actual_repair_ore" integer,
	"estimated_sale_ore" integer,
	"actual_sale_ore" integer,
	"estimated_profit_ore" integer,
	"actual_profit_ore" integer,
	"estimated_roi_bps" integer,
	"actual_roi_bps" integer,
	"notes" text,
	"created_by_id" text,
	"purchased_at" timestamp with time zone,
	"received_at" timestamp with time zone,
	"sold_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refurbishments_flip_number_unique" UNIQUE("flip_number")
);
--> statement-breakpoint
CREATE TABLE "resale_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"refurbishment_id" uuid NOT NULL,
	"platform" text DEFAULT 'FINN' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"sale_price_ore" integer NOT NULL,
	"minimum_price_ore" integer,
	"condition" text,
	"battery_health" integer,
	"replaced_parts_summary" text,
	"listing_url" text,
	"status" "listing_status" DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"refurbishment_id" uuid NOT NULL,
	"listing_id" uuid,
	"sale_price_ore" integer NOT NULL,
	"platform" text,
	"buyer_name" text,
	"shipping_ore" integer DEFAULT 0 NOT NULL,
	"platform_fees_ore" integer DEFAULT 0 NOT NULL,
	"other_fees_ore" integer DEFAULT 0 NOT NULL,
	"sold_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnostic_results" ADD CONSTRAINT "diagnostic_results_diagnostics_id_diagnostics_id_fk" FOREIGN KEY ("diagnostics_id") REFERENCES "public"."diagnostics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnostics" ADD CONSTRAINT "diagnostics_ticket_id_repair_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."repair_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnostics" ADD CONSTRAINT "diagnostics_technician_id_users_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_ticket_id_repair_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."repair_tickets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_intake_inspections" ADD CONSTRAINT "repair_intake_inspections_ticket_id_repair_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."repair_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_intake_inspections" ADD CONSTRAINT "repair_intake_inspections_inspected_by_id_users_id_fk" FOREIGN KEY ("inspected_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_notes" ADD CONSTRAINT "repair_notes_ticket_id_repair_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."repair_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_notes" ADD CONSTRAINT "repair_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_services" ADD CONSTRAINT "repair_services_ticket_id_repair_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."repair_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_services" ADD CONSTRAINT "repair_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_ticket_status_history" ADD CONSTRAINT "repair_ticket_status_history_ticket_id_repair_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."repair_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_ticket_status_history" ADD CONSTRAINT "repair_ticket_status_history_changed_by_id_users_id_fk" FOREIGN KEY ("changed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_tickets" ADD CONSTRAINT "repair_tickets_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_tickets" ADD CONSTRAINT "repair_tickets_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_tickets" ADD CONSTRAINT "repair_tickets_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_ticket_id_repair_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."repair_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_warranty_id_warranties_id_fk" FOREIGN KEY ("warranty_id") REFERENCES "public"."warranties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_ticket_id_repair_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."repair_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_repair_ticket_id_repair_tickets_id_fk" FOREIGN KEY ("repair_ticket_id") REFERENCES "public"."repair_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_model_compat" ADD CONSTRAINT "part_model_compat_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_parts" ADD CONSTRAINT "repair_parts_ticket_id_repair_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."repair_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_parts" ADD CONSTRAINT "repair_parts_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_parts" ADD CONSTRAINT "supplier_parts_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_parts" ADD CONSTRAINT "supplier_parts_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flip_candidates" ADD CONSTRAINT "flip_candidates_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refurbishment_acquisitions" ADD CONSTRAINT "refurbishment_acquisitions_refurbishment_id_refurbishments_id_fk" FOREIGN KEY ("refurbishment_id") REFERENCES "public"."refurbishments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refurbishment_costs" ADD CONSTRAINT "refurbishment_costs_refurbishment_id_refurbishments_id_fk" FOREIGN KEY ("refurbishment_id") REFERENCES "public"."refurbishments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refurbishment_costs" ADD CONSTRAINT "refurbishment_costs_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refurbishments" ADD CONSTRAINT "refurbishments_candidate_id_flip_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."flip_candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refurbishments" ADD CONSTRAINT "refurbishments_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resale_listings" ADD CONSTRAINT "resale_listings_refurbishment_id_refurbishments_id_fk" FOREIGN KEY ("refurbishment_id") REFERENCES "public"."refurbishments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resales" ADD CONSTRAINT "resales_refurbishment_id_refurbishments_id_fk" FOREIGN KEY ("refurbishment_id") REFERENCES "public"."refurbishments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resales" ADD CONSTRAINT "resales_listing_id_resale_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."resale_listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "activity_events_entity_idx" ON "activity_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "activity_events_created_at_idx" ON "activity_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "attachments_entity_idx" ON "attachments" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "attachments_visibility_idx" ON "attachments" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "customers_email_idx" ON "customers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "customers_name_idx" ON "customers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "customers_phone_idx" ON "customers" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "devices_imei_idx" ON "devices" USING btree ("imei");--> statement-breakpoint
CREATE INDEX "devices_serial_number_idx" ON "devices" USING btree ("serial_number");--> statement-breakpoint
CREATE INDEX "devices_customer_id_idx" ON "devices" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "diagnostics_ticket_id_idx" ON "diagnostics" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "quotes_ticket_id_idx" ON "quotes" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "quotes_customer_id_idx" ON "quotes" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "quotes_status_idx" ON "quotes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "repair_intake_inspections_ticket_id_idx" ON "repair_intake_inspections" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "repair_notes_ticket_id_idx" ON "repair_notes" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "repair_services_ticket_id_idx" ON "repair_services" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "repair_ticket_status_history_ticket_id_idx" ON "repair_ticket_status_history" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "repair_tickets_ticket_number_idx" ON "repair_tickets" USING btree ("ticket_number");--> statement-breakpoint
CREATE INDEX "repair_tickets_status_idx" ON "repair_tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "repair_tickets_customer_id_idx" ON "repair_tickets" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "repair_tickets_device_id_idx" ON "repair_tickets" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "repair_tickets_public_access_token_idx" ON "repair_tickets" USING btree ("public_access_token");--> statement-breakpoint
CREATE INDEX "repair_tickets_assignee_id_idx" ON "repair_tickets" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "warranties_ticket_id_idx" ON "warranties" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "warranty_claims_warranty_id_idx" ON "warranty_claims" USING btree ("warranty_id");--> statement-breakpoint
CREATE INDEX "warranty_claims_status_idx" ON "warranty_claims" USING btree ("status");--> statement-breakpoint
CREATE INDEX "inventory_transactions_part_id_idx" ON "inventory_transactions" USING btree ("part_id");--> statement-breakpoint
CREATE INDEX "inventory_transactions_created_at_idx" ON "inventory_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "parts_sku_idx" ON "parts" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "parts_name_idx" ON "parts" USING btree ("name");--> statement-breakpoint
CREATE INDEX "parts_active_idx" ON "parts" USING btree ("active");--> statement-breakpoint
CREATE INDEX "purchase_orders_po_number_idx" ON "purchase_orders" USING btree ("po_number");--> statement-breakpoint
CREATE INDEX "repair_parts_ticket_id_idx" ON "repair_parts" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "repair_parts_part_id_idx" ON "repair_parts" USING btree ("part_id");--> statement-breakpoint
CREATE INDEX "supplier_parts_supplier_id_idx" ON "supplier_parts" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "supplier_parts_part_id_idx" ON "supplier_parts" USING btree ("part_id");--> statement-breakpoint
CREATE INDEX "flip_candidates_model_idx" ON "flip_candidates" USING btree ("model");--> statement-breakpoint
CREATE INDEX "refurbishments_flip_number_idx" ON "refurbishments" USING btree ("flip_number");--> statement-breakpoint
CREATE INDEX "refurbishments_status_idx" ON "refurbishments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "refurbishments_imei_idx" ON "refurbishments" USING btree ("imei");