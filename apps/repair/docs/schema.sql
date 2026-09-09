-- SD Solutions Repair Ops — schema only (no demo data)
-- Paste into Neon SQL Editor and Run

--
-- PostgreSQL database dump
--


-- Dumped from database version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: attachment_visibility; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.attachment_visibility AS ENUM (
    'INTERNAL',
    'CUSTOMER'
);


--
-- Name: cost_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cost_category AS ENUM (
    'PURCHASE',
    'SHIPPING',
    'PART',
    'CONSUMABLE',
    'TOOL',
    'PLATFORM_FEE',
    'OTHER'
);


--
-- Name: diagnostic_result; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.diagnostic_result AS ENUM (
    'PASS',
    'FAIL',
    'NOT_TESTED',
    'NOT_APPLICABLE',
    'UNKNOWN'
);


--
-- Name: flip_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.flip_status AS ENUM (
    'SEARCHING',
    'CANDIDATE',
    'PURCHASED',
    'RECEIVED',
    'DIAGNOSTICS',
    'WAITING_FOR_PARTS',
    'IN_REPAIR',
    'TESTING',
    'READY_TO_LIST',
    'LISTED',
    'RESERVED',
    'SOLD',
    'ARCHIVED'
);


--
-- Name: intake_check_result; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.intake_check_result AS ENUM (
    'PASS',
    'FAIL',
    'NOT_TESTED',
    'NOT_APPLICABLE'
);


--
-- Name: inventory_action; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.inventory_action AS ENUM (
    'RECEIVED',
    'USED',
    'RETURNED',
    'ADJUSTED',
    'DAMAGED',
    'SOLD',
    'TRANSFERRED'
);


--
-- Name: listing_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.listing_status AS ENUM (
    'DRAFT',
    'READY',
    'LISTED',
    'RESERVED',
    'SOLD',
    'CANCELLED'
);


--
-- Name: note_visibility; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.note_visibility AS ENUM (
    'INTERNAL',
    'CUSTOMER'
);


--
-- Name: ownership_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ownership_type AS ENUM (
    'CUSTOMER',
    'SD_SOLUTIONS',
    'UNKNOWN'
);


--
-- Name: part_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.part_type AS ENUM (
    'OEM',
    'ORIGINAL_PULL',
    'SOFT_OLED',
    'HARD_OLED',
    'LCD',
    'INCELL',
    'BATTERY',
    'FLEX',
    'OTHER'
);


--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_status AS ENUM (
    'UNPAID',
    'PARTIAL',
    'PAID',
    'REFUNDED'
);


--
-- Name: price_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.price_source AS ENUM (
    'MANUAL',
    'CSV',
    'OFFICIAL_API',
    'UNVERIFIED'
);


--
-- Name: purchase_order_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.purchase_order_status AS ENUM (
    'DRAFT',
    'ORDERED',
    'PARTIALLY_RECEIVED',
    'RECEIVED',
    'CANCELLED'
);


--
-- Name: quote_item_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.quote_item_kind AS ENUM (
    'SERVICE',
    'PART',
    'CUSTOM'
);


--
-- Name: quote_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.quote_status AS ENUM (
    'DRAFT',
    'SENT',
    'ACCEPTED',
    'REJECTED',
    'EXPIRED',
    'CANCELLED'
);


--
-- Name: repair_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.repair_status AS ENUM (
    'NEW',
    'DIAGNOSTICS',
    'WAITING_FOR_CUSTOMER',
    'WAITING_FOR_PART',
    'APPROVED',
    'IN_REPAIR',
    'TESTING',
    'READY_FOR_PICKUP',
    'COMPLETED',
    'CANCELLED',
    'RETURNED'
);


--
-- Name: risk_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.risk_level AS ENUM (
    'GREEN',
    'YELLOW',
    'RED'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'ADMIN',
    'TECHNICIAN',
    'VIEWER'
);


--
-- Name: warranty_claim_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.warranty_claim_status AS ENUM (
    'OPEN',
    'IN_PROGRESS',
    'APPROVED',
    'REJECTED',
    'RESOLVED',
    'CLOSED'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts (
    id text NOT NULL,
    account_id text NOT NULL,
    provider_id text NOT NULL,
    user_id text NOT NULL,
    access_token text,
    refresh_token text,
    id_token text,
    access_token_expires_at timestamp with time zone,
    refresh_token_expires_at timestamp with time zone,
    scope text,
    password text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: activity_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    type text NOT NULL,
    message text NOT NULL,
    actor_id text,
    meta jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    category text,
    file_name text NOT NULL,
    mime_type text NOT NULL,
    size integer NOT NULL,
    storage_path text NOT NULL,
    created_by_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    description text,
    visibility public.attachment_visibility DEFAULT 'INTERNAL'::public.attachment_visibility NOT NULL
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id text,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    action text NOT NULL,
    before jsonb,
    after jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    phone text,
    email text,
    address text,
    notes text,
    archived_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_activity_at timestamp with time zone
);


--
-- Name: devices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.devices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    brand text DEFAULT 'Apple'::text NOT NULL,
    model text NOT NULL,
    variant text,
    storage text,
    color text,
    serial_number text,
    imei text,
    battery_health integer,
    condition text,
    ownership_type public.ownership_type DEFAULT 'CUSTOMER'::public.ownership_type NOT NULL,
    customer_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: diagnostic_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.diagnostic_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    diagnostics_id uuid NOT NULL,
    check_key text NOT NULL,
    result public.diagnostic_result DEFAULT 'NOT_TESTED'::public.diagnostic_result NOT NULL,
    note text
);


--
-- Name: diagnostics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.diagnostics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid,
    refurbishment_id uuid,
    technician_id text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: flip_candidates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flip_candidates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    listing_url text,
    platform text DEFAULT 'FINN'::text,
    seller text,
    listing_id text,
    model text NOT NULL,
    storage text,
    color text,
    asking_price_ore integer NOT NULL,
    shipping_ore integer DEFAULT 0 NOT NULL,
    reported_fault text,
    condition text,
    estimated_repair_ore integer DEFAULT 0 NOT NULL,
    estimated_resale_ore integer DEFAULT 0 NOT NULL,
    estimated_investment_ore integer DEFAULT 0 NOT NULL,
    estimated_profit_ore integer DEFAULT 0 NOT NULL,
    estimated_roi_bps integer DEFAULT 0 NOT NULL,
    risk public.risk_level DEFAULT 'YELLOW'::public.risk_level NOT NULL,
    notes text,
    created_by_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    converted_refurbishment_id uuid
);


--
-- Name: id_sequences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.id_sequences (
    kind text NOT NULL,
    year integer NOT NULL,
    last_value integer DEFAULT 0 NOT NULL
);


--
-- Name: inventory_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    part_id uuid NOT NULL,
    action public.inventory_action NOT NULL,
    quantity_delta integer NOT NULL,
    unit_cost_ore integer,
    resulting_quantity integer NOT NULL,
    repair_ticket_id uuid,
    refurbishment_id uuid,
    purchase_order_id uuid,
    note text,
    created_by_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: part_model_compat; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.part_model_compat (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    part_id uuid NOT NULL,
    model_key text NOT NULL
);


--
-- Name: parts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sku text NOT NULL,
    name text NOT NULL,
    category text,
    brand text,
    part_type public.part_type DEFAULT 'OTHER'::public.part_type NOT NULL,
    cost_price_ore integer DEFAULT 0 NOT NULL,
    sell_price_ore integer,
    quantity_on_hand integer DEFAULT 0 NOT NULL,
    minimum_stock integer DEFAULT 0 NOT NULL,
    location text,
    warranty_days integer,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: purchase_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    purchase_order_id uuid NOT NULL,
    part_id uuid,
    description text NOT NULL,
    quantity_ordered integer NOT NULL,
    quantity_received integer DEFAULT 0 NOT NULL,
    unit_cost_ore integer NOT NULL
);


--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    po_number text NOT NULL,
    supplier_id uuid NOT NULL,
    status public.purchase_order_status DEFAULT 'DRAFT'::public.purchase_order_status NOT NULL,
    ordered_at timestamp with time zone,
    expected_delivery_at timestamp with time zone,
    shipping_ore integer DEFAULT 0 NOT NULL,
    total_ore integer DEFAULT 0 NOT NULL,
    notes text,
    created_by_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: quote_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid NOT NULL,
    kind public.quote_item_kind DEFAULT 'CUSTOM'::public.quote_item_kind NOT NULL,
    service_id uuid,
    part_id uuid,
    description text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price_ore integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quotes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid,
    customer_id uuid NOT NULL,
    status public.quote_status DEFAULT 'DRAFT'::public.quote_status NOT NULL,
    total_ore integer DEFAULT 0 NOT NULL,
    notes text,
    valid_until timestamp with time zone,
    created_by_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: refurbishment_acquisitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refurbishment_acquisitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    refurbishment_id uuid NOT NULL,
    purchase_price_ore integer NOT NULL,
    shipping_ore integer DEFAULT 0 NOT NULL,
    platform text,
    seller text,
    payment_method text,
    listing_url text,
    original_description text,
    purchased_at timestamp with time zone NOT NULL
);


--
-- Name: refurbishment_costs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refurbishment_costs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    refurbishment_id uuid NOT NULL,
    category public.cost_category NOT NULL,
    label text NOT NULL,
    amount_ore integer NOT NULL,
    is_business_asset boolean DEFAULT false NOT NULL,
    part_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: refurbishments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refurbishments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    flip_number text NOT NULL,
    candidate_id uuid,
    status public.flip_status DEFAULT 'PURCHASED'::public.flip_status NOT NULL,
    model text NOT NULL,
    storage text,
    color text,
    serial_number text,
    imei text,
    battery_health integer,
    activation_lock_clear boolean DEFAULT false NOT NULL,
    find_my_off boolean DEFAULT false NOT NULL,
    estimated_purchase_ore integer,
    actual_purchase_ore integer,
    estimated_repair_ore integer,
    actual_repair_ore integer,
    estimated_sale_ore integer,
    actual_sale_ore integer,
    estimated_profit_ore integer,
    actual_profit_ore integer,
    estimated_roi_bps integer,
    actual_roi_bps integer,
    notes text,
    created_by_id text,
    purchased_at timestamp with time zone,
    received_at timestamp with time zone,
    sold_at timestamp with time zone,
    archived_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: repair_intake_inspections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.repair_intake_inspections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    inspected_by_id text,
    damage_notes text,
    physical_zones jsonb DEFAULT '{}'::jsonb NOT NULL,
    checklist jsonb DEFAULT '{}'::jsonb NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: repair_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.repair_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    author_id text,
    content text NOT NULL,
    visibility public.note_visibility DEFAULT 'INTERNAL'::public.note_visibility NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: repair_parts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.repair_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    part_id uuid NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    unit_cost_ore integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: repair_services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.repair_services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    service_id uuid NOT NULL,
    price_ore integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: repair_ticket_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.repair_ticket_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    from_status public.repair_status,
    to_status public.repair_status NOT NULL,
    changed_by_id text,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: repair_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.repair_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_number text NOT NULL,
    customer_id uuid NOT NULL,
    device_id uuid NOT NULL,
    customer_problem text NOT NULL,
    internal_problem text,
    physical_condition text,
    status public.repair_status DEFAULT 'NEW'::public.repair_status NOT NULL,
    assignee_id text,
    customer_price_ore integer,
    estimated_parts_cost_ore integer,
    actual_parts_cost_ore integer,
    other_costs_ore integer DEFAULT 0 NOT NULL,
    payment_status public.payment_status DEFAULT 'UNPAID'::public.payment_status NOT NULL,
    warranty_days integer DEFAULT 90,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    public_access_token text DEFAULT replace(((gen_random_uuid())::text || (gen_random_uuid())::text), '-'::text, ''::text) NOT NULL,
    estimated_completion_date timestamp with time zone
);


--
-- Name: resale_listings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resale_listings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    refurbishment_id uuid NOT NULL,
    platform text DEFAULT 'FINN'::text NOT NULL,
    title text NOT NULL,
    description text,
    sale_price_ore integer NOT NULL,
    minimum_price_ore integer,
    condition text,
    battery_health integer,
    replaced_parts_summary text,
    listing_url text,
    status public.listing_status DEFAULT 'DRAFT'::public.listing_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: resales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    refurbishment_id uuid NOT NULL,
    listing_id uuid,
    sale_price_ore integer NOT NULL,
    platform text,
    buyer_name text,
    shipping_ore integer DEFAULT 0 NOT NULL,
    platform_fees_ore integer DEFAULT 0 NOT NULL,
    other_fees_ore integer DEFAULT 0 NOT NULL,
    sold_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    customer_price_ore integer NOT NULL,
    estimated_parts_cost_ore integer,
    estimated_labor_minutes integer,
    warranty_days integer DEFAULT 90,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    token text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_address text,
    user_agent text,
    user_id text NOT NULL
);


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: supplier_parts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid NOT NULL,
    part_id uuid,
    supplier_sku text,
    product_url text,
    public_price_ore integer,
    pro_price_ore integer,
    currency text DEFAULT 'NOK'::text NOT NULL,
    shipping_cost_ore integer,
    price_source public.price_source DEFAULT 'MANUAL'::public.price_source NOT NULL,
    last_verified_at timestamp with time zone,
    active boolean DEFAULT true NOT NULL
);


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    website text,
    contact text,
    currency text DEFAULT 'NOK'::text NOT NULL,
    default_shipping_ore integer DEFAULT 0,
    api_supported boolean DEFAULT false NOT NULL,
    active boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    image text,
    role public.user_role DEFAULT 'TECHNICIAN'::public.user_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: verifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verifications (
    id text NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: warranties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.warranties (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    days integer DEFAULT 90 NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: warranty_claims; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.warranty_claims (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    warranty_id uuid NOT NULL,
    ticket_id uuid,
    status public.warranty_claim_status DEFAULT 'OPEN'::public.warranty_claim_status NOT NULL,
    description text NOT NULL,
    resolution text,
    created_by_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: activity_events activity_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_events
    ADD CONSTRAINT activity_events_pkey PRIMARY KEY (id);


--
-- Name: attachments attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: devices devices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);


--
-- Name: diagnostic_results diagnostic_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_results
    ADD CONSTRAINT diagnostic_results_pkey PRIMARY KEY (id);


--
-- Name: diagnostics diagnostics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostics
    ADD CONSTRAINT diagnostics_pkey PRIMARY KEY (id);


--
-- Name: flip_candidates flip_candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flip_candidates
    ADD CONSTRAINT flip_candidates_pkey PRIMARY KEY (id);


--
-- Name: id_sequences id_sequences_kind_year_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.id_sequences
    ADD CONSTRAINT id_sequences_kind_year_pk PRIMARY KEY (kind, year);


--
-- Name: inventory_transactions inventory_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_pkey PRIMARY KEY (id);


--
-- Name: part_model_compat part_model_compat_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.part_model_compat
    ADD CONSTRAINT part_model_compat_pkey PRIMARY KEY (id);


--
-- Name: parts parts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parts
    ADD CONSTRAINT parts_pkey PRIMARY KEY (id);


--
-- Name: parts parts_sku_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parts
    ADD CONSTRAINT parts_sku_unique UNIQUE (sku);


--
-- Name: purchase_order_items purchase_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_po_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_po_number_unique UNIQUE (po_number);


--
-- Name: quote_items quote_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_pkey PRIMARY KEY (id);


--
-- Name: quotes quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_pkey PRIMARY KEY (id);


--
-- Name: refurbishment_acquisitions refurbishment_acquisitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refurbishment_acquisitions
    ADD CONSTRAINT refurbishment_acquisitions_pkey PRIMARY KEY (id);


--
-- Name: refurbishment_costs refurbishment_costs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refurbishment_costs
    ADD CONSTRAINT refurbishment_costs_pkey PRIMARY KEY (id);


--
-- Name: refurbishments refurbishments_flip_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refurbishments
    ADD CONSTRAINT refurbishments_flip_number_unique UNIQUE (flip_number);


--
-- Name: refurbishments refurbishments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refurbishments
    ADD CONSTRAINT refurbishments_pkey PRIMARY KEY (id);


--
-- Name: repair_intake_inspections repair_intake_inspections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repair_intake_inspections
    ADD CONSTRAINT repair_intake_inspections_pkey PRIMARY KEY (id);


--
-- Name: repair_intake_inspections repair_intake_inspections_ticket_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repair_intake_inspections
    ADD CONSTRAINT repair_intake_inspections_ticket_id_key UNIQUE (ticket_id);


--
-- Name: repair_notes repair_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repair_notes
    ADD CONSTRAINT repair_notes_pkey PRIMARY KEY (id);


--
-- Name: repair_parts repair_parts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repair_parts
    ADD CONSTRAINT repair_parts_pkey PRIMARY KEY (id);


--
-- Name: repair_services repair_services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repair_services
    ADD CONSTRAINT repair_services_pkey PRIMARY KEY (id);


--
-- Name: repair_ticket_status_history repair_ticket_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repair_ticket_status_history
    ADD CONSTRAINT repair_ticket_status_history_pkey PRIMARY KEY (id);


--
-- Name: repair_tickets repair_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repair_tickets
    ADD CONSTRAINT repair_tickets_pkey PRIMARY KEY (id);


--
-- Name: repair_tickets repair_tickets_public_access_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repair_tickets
    ADD CONSTRAINT repair_tickets_public_access_token_unique UNIQUE (public_access_token);


--
-- Name: repair_tickets repair_tickets_ticket_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repair_tickets
    ADD CONSTRAINT repair_tickets_ticket_number_unique UNIQUE (ticket_number);


--
-- Name: resale_listings resale_listings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resale_listings
    ADD CONSTRAINT resale_listings_pkey PRIMARY KEY (id);


--
-- Name: resales resales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resales
    ADD CONSTRAINT resales_pkey PRIMARY KEY (id);


--
-- Name: services services_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_code_unique UNIQUE (code);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_token_unique UNIQUE (token);


--
-- Name: settings settings_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_key_unique UNIQUE (key);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: supplier_parts supplier_parts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_parts
    ADD CONSTRAINT supplier_parts_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: verifications verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verifications
    ADD CONSTRAINT verifications_pkey PRIMARY KEY (id);


--
-- Name: warranties warranties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warranties
    ADD CONSTRAINT warranties_pkey PRIMARY KEY (id);


--
-- Name: warranty_claims warranty_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warranty_claims
    ADD CONSTRAINT warranty_claims_pkey PRIMARY KEY (id);


--
-- Name: accounts_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_user_id_idx ON public.accounts USING btree (user_id);


--
-- Name: activity_events_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX activity_events_created_at_idx ON public.activity_events USING btree (created_at);


--
-- Name: activity_events_entity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX activity_events_entity_idx ON public.activity_events USING btree (entity_type, entity_id);


--
-- Name: attachments_entity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attachments_entity_idx ON public.attachments USING btree (entity_type, entity_id);


--
-- Name: attachments_visibility_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attachments_visibility_idx ON public.attachments USING btree (visibility);


--
-- Name: audit_logs_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_created_at_idx ON public.audit_logs USING btree (created_at);


--
-- Name: audit_logs_entity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_entity_idx ON public.audit_logs USING btree (entity_type, entity_id);


--
-- Name: customers_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customers_email_idx ON public.customers USING btree (email);


--
-- Name: customers_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customers_name_idx ON public.customers USING btree (name);


--
-- Name: customers_phone_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customers_phone_idx ON public.customers USING btree (phone);


--
-- Name: devices_customer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX devices_customer_id_idx ON public.devices USING btree (customer_id);


--
-- Name: devices_imei_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX devices_imei_idx ON public.devices USING btree (imei);


--
-- Name: devices_serial_number_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX devices_serial_number_idx ON public.devices USING btree (serial_number);


--
-- Name: diagnostics_ticket_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX diagnostics_ticket_id_idx ON public.diagnostics USING btree (ticket_id);


--
-- Name: flip_candidates_model_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX flip_candidates_model_idx ON public.flip_candidates USING btree (model);


--
-- Name: inventory_transactions_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inventory_transactions_created_at_idx ON public.inventory_transactions USING btree (created_at);


--
-- Name: inventory_transactions_part_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inventory_transactions_part_id_idx ON public.inventory_transactions USING btree (part_id);


--
-- Name: parts_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX parts_active_idx ON public.parts USING btree (active);


--
-- Name: parts_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX parts_name_idx ON public.parts USING btree (name);


--
-- Name: parts_sku_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX parts_sku_idx ON public.parts USING btree (sku);


--
-- Name: purchase_orders_po_number_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX purchase_orders_po_number_idx ON public.purchase_orders USING btree (po_number);


--
-- Name: quotes_customer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quotes_customer_id_idx ON public.quotes USING btree (customer_id);


--
-- Name: quotes_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quotes_status_idx ON public.quotes USING btree (status);


--
-- Name: quotes_ticket_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quotes_ticket_id_idx ON public.quotes USING btree (ticket_id);


--
-- Name: refurbishments_flip_number_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX refurbishments_flip_number_idx ON public.refurbishments USING btree (flip_number);


--
-- Name: refurbishments_imei_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX refurbishments_imei_idx ON public.refurbishments USING btree (imei);


--
-- Name: refurbishments_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX refurbishments_status_idx ON public.refurbishments USING btree (status);


--
-- Name: repair_intake_inspections_ticket_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX repair_intake_inspections_ticket_id_idx ON public.repair_intake_inspections USING btree (ticket_id);


--
-- Name: repair_notes_ticket_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX repair_notes_ticket_id_idx ON public.repair_notes USING btree (ticket_id);


--
-- Name: repair_parts_part_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX repair_parts_part_id_idx ON public.repair_parts USING btree (part_id);


--
-- Name: repair_parts_ticket_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX repair_parts_ticket_id_idx ON public.repair_parts USING btree (ticket_id);


--
-- Name: repair_services_ticket_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX repair_services_ticket_id_idx ON public.repair_services USING btree (ticket_id);


--
-- Name: repair_ticket_status_history_ticket_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX repair_ticket_status_history_ticket_id_idx ON public.repair_ticket_status_history USING btree (ticket_id);


--
-- Name: repair_tickets_assignee_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX repair_tickets_assignee_id_idx ON public.repair_tickets USING btree (assignee_id);


--
-- Name: repair_tickets_customer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX repair_tickets_customer_id_idx ON public.repair_tickets USING btree (customer_id);


--
-- Name: repair_tickets_device_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX repair_tickets_device_id_idx ON public.repair_tickets USING btree (device_id);


--
-- Name: repair_tickets_public_access_token_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX repair_tickets_public_access_token_idx ON public.repair_tickets USING btree (public_access_token);


--
-- Name: repair_tickets_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX repair_tickets_status_idx ON public.repair_tickets USING btree (status);


--
-- Name: repair_tickets_ticket_number_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX repair_tickets_ticket_number_idx ON public.repair_tickets USING btree (ticket_number);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_user_id_idx ON public.sessions USING btree (user_id);


--
-- Name: supplier_parts_part_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX supplier_parts_part_id_idx ON public.supplier_parts USING btree (part_id);


--
-- Name: supplier_parts_supplier_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX supplier_parts_supplier_id_idx ON public.supplier_parts USING btree (supplier_id);


--
-- Name: users_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_email_idx ON public.users USING btree (email);


--
-- Name: warranties_ticket_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX warranties_ticket_id_idx ON public.warranties USING btree (ticket_id);


--
-- Name: warranty_claims_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX warranty_claims_status_idx ON public.warranty_claims USING btree (status);


--
-- Name: warranty_claims_warranty_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX warranty_claims_warranty_id_idx ON public.warranty_claims USING btree (warranty_id);


--
-- Name: accounts accounts_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: activity_events activity_events_actor_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_events
    ADD CONSTRAINT activity_events_actor_id_users_id_fk FOREIGN KEY (actor_id) REFERENCES public.users(id);


--
-- Name: attachments attachments_created_by_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_created_by_id_users_id_fk FOREIGN KEY (created_by_id) REFERENCES public.users(id);


--
-- Name: audit_logs audit_logs_actor_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_id_users_id_fk FOREIGN KEY (actor_id) REFERENCES public.users(id);


--
-- Name: devices devices_customer_id_customers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_customer_id_customers_id_fk FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: diagnostic_results diagnostic_results_diagnostics_id_diagnostics_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_results
    ADD CONSTRAINT diagnostic_results_diagnostics_id_diagnostics_id_fk FOREIGN KEY (diagnostics_id) REFERENCES public.diagnostics(id) ON DELETE CASCADE;


--
-- Name: diagnostics diagnostics_technician_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostics
    ADD CONSTRAINT diagnostics_technician_id_users_id_fk FOREIGN KEY (technician_id) REFERENCES public.users(id);


--
-- Name: diagnostics diagnostics_ticket_id_repair_tickets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostics
    ADD CONSTRAINT diagnostics_ticket_id_repair_tickets_id_fk FOREIGN KEY (ticket_id) REFERENCES public.repair_tickets(id) ON DELETE CASCADE;


--
-- Name: flip_candidates flip_candidates_created_by_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flip_candidates
    ADD CONSTRAINT flip_candidates_created_by_id_users_id_fk FOREIGN KEY (created_by_id) REFERENCES public.users(id);


--
-- Name: inventory_transactions inventory_transactions_created_by_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_created_by_id_users_id_fk FOREIGN KEY (created_by_id) REFERENCES public.users(id);


--
-- Name: inventory_transactions inventory_transactions_part_id_parts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_part_id_parts_id_fk FOREIGN KEY (part_id) REFERENCES public.parts(id);


--
-- Name: inventory_transactions inventory_transactions_repair_ticket_id_repair_tickets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_repair_ticket_id_repair_tickets_id_fk FOREIGN KEY (repair_ticket_id) REFERENCES public.repair_tickets(id);


--
-- Name: part_model_compat part_model_compat_part_id_parts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.part_model_compat
    ADD CONSTRAINT part_model_compat_part_id_parts_id_fk FOREIGN KEY (part_id) REFERENCES public.parts(id) ON DELETE CASCADE;


--
-- Name: purchase_order_items purchase_order_items_part_id_parts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_part_id_parts_id_fk FOREIGN KEY (part_id) REFERENCES public.parts(id);


--
-- Name: purchase_order_items purchase_order_items_purchase_order_id_purchase_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_purchase_order_id_purchase_orders_id_fk FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: purchase_orders purchase_orders_created_by_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_created_by_id_users_id_fk FOREIGN KEY (created_by_id) REFERENCES public.users(id);


--
-- Name: purchase_orders purchase_orders_supplier_id_suppliers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_supplier_id_suppliers_id_fk FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: quote_items quote_items_quote_id_quotes_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_quote_id_quotes_id_fk FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;


--
-- Name: quote_items quote_items_service_id_services_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_service_id_services_id_fk FOREIGN KEY (service_id) REFERENCES public.services(id);


--
-- Name: quotes quotes_created_by_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_created_by_id_users_id_fk FOREIGN KEY (created_by_id) REFERENCES public.users(id);


--
-- Name: quotes quotes_customer_id_customers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_customer_id_customers_id_fk FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: quotes quotes_ticket_id_repair_tickets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_ticket_id_repair_tickets_id_fk FOREIGN KEY (ticket_id) REFERENCES public.repair_tickets(id) ON DELETE SET NULL;


--
-- Name: refurbishment_acquisitions refurbishment_acquisitions_refurbishment_id_refurbishments_id_f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refurbishment_acquisitions
    ADD CONSTRAINT refurbishment_acquisitions_refurbishment_id_refurbishments_id_f FOREIGN KEY (refurbishment_id) REFERENCES public.refurbishments(id) ON DELETE CASCADE;


--
-- Name: refurbishment_costs refurbishment_costs_part_id_parts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refurbishment_costs
    ADD CONSTRAINT refurbishment_costs_part_id_parts_id_fk FOREIGN KEY (part_id) REFERENCES public.parts(id);


--
-- Name: refurbishment_costs refurbishment_costs_refurbishment_id_refurbishments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refurbishment_costs
    ADD CONSTRAINT refurbishment_costs_refurbishment_id_refurbishments_id_fk FOREIGN KEY (refurbishment_id) REFERENCES public.refurbishments(id) ON DELETE CASCADE;


--
-- Name: refurbishments refurbishments_candidate_id_flip_candidates_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refurbishments
    ADD CONSTRAINT refurbishments_candidate_id_flip_candidates_id_fk FOREIGN KEY (candidate_id) REFERENCES public.flip_candidates(id);


--
-- Name: refurbishments refurbishments_created_by_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refurbishments
    ADD CONSTRAINT refurbishments_created_by_id_users_id_fk FOREIGN KEY (created_by_id) REFERENCES public.users(id);


--
-- Name: repair_intake_inspections repair_intake_inspections_inspected_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repair_intake_inspections
    ADD CONSTRAINT repair_intake_inspections_inspected_by_id_fkey FOREIGN KEY (inspected_by_id) REFERENCES public.users(id);


--
-- Name: repair_intake_inspections repair_intake_inspections_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repair_intake_inspections
    ADD CONSTRAINT repair_intake_inspections_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.repair_tickets(id) ON DELETE CASCADE;


--
-- Name: repair_notes repair_notes_author_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repair_notes
    ADD CONSTRAINT repair_notes_author_id_users_id_fk FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: repair_notes repair_notes_ticket_id_repair_tickets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repair_notes
    ADD CONSTRAINT repair_notes_ticket_id_repair_tickets_id_fk FOREIGN KEY (ticket_id) REFERENCES public.repair_tickets(id) ON DELETE CASCADE;


--
-- Name: repair_parts repair_parts_part_id_parts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repair_parts
    ADD CONSTRAINT repair_parts_part_id_parts_id_fk FOREIGN KEY (part_id) REFERENCES public.parts(id);


--
-- Name: repair_parts repair_parts_ticket_id_repair_tickets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repair_parts
    ADD CONSTRAINT repair_parts_ticket_id_repair_tickets_id_fk FOREIGN KEY (ticket_id) REFERENCES public.repair_tickets(id) ON DELETE CASCADE;


--
-- Name: repair_services repair_services_service_id_services_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repair_services
    ADD CONSTRAINT repair_services_service_id_services_id_fk FOREIGN KEY (service_id) REFERENCES public.services(id);


--
-- Name: repair_services repair_services_ticket_id_repair_tickets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repair_services
    ADD CONSTRAINT repair_services_ticket_id_repair_tickets_id_fk FOREIGN KEY (ticket_id) REFERENCES public.repair_tickets(id) ON DELETE CASCADE;


--
-- Name: repair_ticket_status_history repair_ticket_status_history_changed_by_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repair_ticket_status_history
    ADD CONSTRAINT repair_ticket_status_history_changed_by_id_users_id_fk FOREIGN KEY (changed_by_id) REFERENCES public.users(id);


--
-- Name: repair_ticket_status_history repair_ticket_status_history_ticket_id_repair_tickets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repair_ticket_status_history
    ADD CONSTRAINT repair_ticket_status_history_ticket_id_repair_tickets_id_fk FOREIGN KEY (ticket_id) REFERENCES public.repair_tickets(id) ON DELETE CASCADE;


--
-- Name: repair_tickets repair_tickets_assignee_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repair_tickets
    ADD CONSTRAINT repair_tickets_assignee_id_users_id_fk FOREIGN KEY (assignee_id) REFERENCES public.users(id);


--
-- Name: repair_tickets repair_tickets_customer_id_customers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repair_tickets
    ADD CONSTRAINT repair_tickets_customer_id_customers_id_fk FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: repair_tickets repair_tickets_device_id_devices_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repair_tickets
    ADD CONSTRAINT repair_tickets_device_id_devices_id_fk FOREIGN KEY (device_id) REFERENCES public.devices(id);


--
-- Name: resale_listings resale_listings_refurbishment_id_refurbishments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resale_listings
    ADD CONSTRAINT resale_listings_refurbishment_id_refurbishments_id_fk FOREIGN KEY (refurbishment_id) REFERENCES public.refurbishments(id) ON DELETE CASCADE;


--
-- Name: resales resales_listing_id_resale_listings_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resales
    ADD CONSTRAINT resales_listing_id_resale_listings_id_fk FOREIGN KEY (listing_id) REFERENCES public.resale_listings(id);


--
-- Name: resales resales_refurbishment_id_refurbishments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resales
    ADD CONSTRAINT resales_refurbishment_id_refurbishments_id_fk FOREIGN KEY (refurbishment_id) REFERENCES public.refurbishments(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: supplier_parts supplier_parts_part_id_parts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_parts
    ADD CONSTRAINT supplier_parts_part_id_parts_id_fk FOREIGN KEY (part_id) REFERENCES public.parts(id);


--
-- Name: supplier_parts supplier_parts_supplier_id_suppliers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_parts
    ADD CONSTRAINT supplier_parts_supplier_id_suppliers_id_fk FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: warranties warranties_ticket_id_repair_tickets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warranties
    ADD CONSTRAINT warranties_ticket_id_repair_tickets_id_fk FOREIGN KEY (ticket_id) REFERENCES public.repair_tickets(id) ON DELETE CASCADE;


--
-- Name: warranty_claims warranty_claims_created_by_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warranty_claims
    ADD CONSTRAINT warranty_claims_created_by_id_users_id_fk FOREIGN KEY (created_by_id) REFERENCES public.users(id);


--
-- Name: warranty_claims warranty_claims_ticket_id_repair_tickets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warranty_claims
    ADD CONSTRAINT warranty_claims_ticket_id_repair_tickets_id_fk FOREIGN KEY (ticket_id) REFERENCES public.repair_tickets(id);


--
-- Name: warranty_claims warranty_claims_warranty_id_warranties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warranty_claims
    ADD CONSTRAINT warranty_claims_warranty_id_warranties_id_fk FOREIGN KEY (warranty_id) REFERENCES public.warranties(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--


