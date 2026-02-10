--
-- PostgreSQL database dump
--

\restrict XyeJYg0yu6LtIwYlWhRXKhiovi94y3KpjICt045z64DZycnJ9pptwQppUgPe9bQ

-- Dumped from database version 17.7
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.cart_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    cart_id uuid,
    product_id uuid,
    quantity integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    CONSTRAINT cart_items_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE public.cart_items OWNER TO tech_user;

--
-- Name: carts; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.carts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    session_id text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    CONSTRAINT user_or_session_id CHECK ((((user_id IS NOT NULL) AND (session_id IS NULL)) OR ((user_id IS NULL) AND (session_id IS NOT NULL))))
);


ALTER TABLE public.carts OWNER TO tech_user;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    type character varying(50) NOT NULL,
    parent_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.categories OWNER TO tech_user;

--
-- Name: category_discounts; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.category_discounts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    category_id uuid NOT NULL,
    discount_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.category_discounts OWNER TO tech_user;

--
-- Name: delivery_services; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.delivery_services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    base_cost_cents bigint DEFAULT 0 NOT NULL,
    estimated_days integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.delivery_services OWNER TO tech_user;

--
-- Name: TABLE delivery_services; Type: COMMENT; Schema: public; Owner: tech_user
--

COMMENT ON TABLE public.delivery_services IS 'Stores available delivery service options.';


--
-- Name: COLUMN delivery_services.name; Type: COMMENT; Schema: public; Owner: tech_user
--

COMMENT ON COLUMN public.delivery_services.name IS 'Unique name identifying the delivery service.';


--
-- Name: COLUMN delivery_services.description; Type: COMMENT; Schema: public; Owner: tech_user
--

COMMENT ON COLUMN public.delivery_services.description IS 'Optional description of the delivery service.';


--
-- Name: COLUMN delivery_services.base_cost_cents; Type: COMMENT; Schema: public; Owner: tech_user
--

COMMENT ON COLUMN public.delivery_services.base_cost_cents IS 'Base cost of the delivery service in cents.';


--
-- Name: COLUMN delivery_services.estimated_days; Type: COMMENT; Schema: public; Owner: tech_user
--

COMMENT ON COLUMN public.delivery_services.estimated_days IS 'Estimated number of days for delivery.';


--
-- Name: COLUMN delivery_services.is_active; Type: COMMENT; Schema: public; Owner: tech_user
--

COMMENT ON COLUMN public.delivery_services.is_active IS 'Indicates if the delivery service is currently offered.';


--
-- Name: discounts; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.discounts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    description text,
    discount_type character varying(10) NOT NULL,
    discount_value bigint NOT NULL,
    min_order_value_cents bigint DEFAULT 0,
    max_uses integer,
    current_uses integer DEFAULT 0,
    valid_from timestamp with time zone NOT NULL,
    valid_until timestamp with time zone NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT discounts_discount_type_check CHECK (((discount_type)::text = ANY ((ARRAY['percentage'::character varying, 'fixed'::character varying])::text[]))),
    CONSTRAINT discounts_discount_value_check CHECK ((discount_value >= 0)),
    CONSTRAINT discounts_min_order_value_cents_check CHECK ((min_order_value_cents >= 0))
);


ALTER TABLE public.discounts OWNER TO tech_user;

--
-- Name: goose_db_version; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.goose_db_version (
    id integer NOT NULL,
    version_id bigint NOT NULL,
    is_applied boolean NOT NULL,
    tstamp timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.goose_db_version OWNER TO tech_user;

--
-- Name: goose_db_version_id_seq; Type: SEQUENCE; Schema: public; Owner: tech_user
--

ALTER TABLE public.goose_db_version ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.goose_db_version_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid NOT NULL,
    product_name character varying(255) NOT NULL,
    price_cents bigint NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    subtotal_cents bigint GENERATED ALWAYS AS ((price_cents * quantity)) STORED,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE public.order_items OWNER TO tech_user;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    user_full_name character varying(255) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    total_amount_cents bigint DEFAULT 0 NOT NULL,
    payment_method character varying(50) DEFAULT 'Cash on Delivery'::character varying NOT NULL,
    province character varying(255) NOT NULL,
    city character varying(255) NOT NULL,
    phone_number_1 character varying(255) NOT NULL,
    phone_number_2 character varying(255),
    notes text,
    delivery_service_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    CONSTRAINT orders_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'confirmed'::character varying, 'shipped'::character varying, 'delivered'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.orders OWNER TO tech_user;

--
-- Name: product_discounts; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.product_discounts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    product_id uuid NOT NULL,
    discount_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.product_discounts OWNER TO tech_user;

--
-- Name: products; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.products (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    category_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    description text,
    short_description character varying(255),
    price_cents bigint NOT NULL,
    stock_quantity integer DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    brand character varying(100) NOT NULL,
    avg_rating numeric(3,2) DEFAULT NULL::numeric,
    num_ratings integer DEFAULT 0,
    image_urls jsonb DEFAULT '[]'::jsonb NOT NULL,
    spec_highlights jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT products_price_cents_check CHECK ((price_cents >= 0)),
    CONSTRAINT products_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'active'::character varying, 'discontinued'::character varying])::text[]))),
    CONSTRAINT products_stock_quantity_check CHECK ((stock_quantity >= 0))
);


ALTER TABLE public.products OWNER TO tech_user;

--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.refresh_tokens (
    id integer NOT NULL,
    jti character varying(255) NOT NULL,
    user_id uuid NOT NULL,
    token_hash character(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.refresh_tokens OWNER TO tech_user;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: tech_user
--

CREATE SEQUENCE public.refresh_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.refresh_tokens_id_seq OWNER TO tech_user;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tech_user
--

ALTER SEQUENCE public.refresh_tokens_id_seq OWNED BY public.refresh_tokens.id;


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    product_id uuid NOT NULL,
    rating integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.reviews OWNER TO tech_user;

--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.schema_migrations (
    version bigint NOT NULL,
    is_applied boolean DEFAULT true NOT NULL,
    applied_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.schema_migrations OWNER TO tech_user;

--
-- Name: users; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash bytea,
    full_name character varying(255),
    is_admin boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.users OWNER TO tech_user;

--
-- Name: v_products_with_calculated_discounts; Type: VIEW; Schema: public; Owner: tech_user
--

CREATE VIEW public.v_products_with_calculated_discounts AS
 WITH discount_calculations AS (
         SELECT p.id,
            p.price_cents,
            COALESCE(sum(
                CASE
                    WHEN ((d.discount_type)::text = 'fixed'::text) THEN d.discount_value
                    ELSE (0)::bigint
                END) FILTER (WHERE (d.is_active AND ((now() >= d.valid_from) AND (now() <= d.valid_until)))), (0)::numeric) AS total_fixed_discount_cents,
            COALESCE(exp(sum(
                CASE
                    WHEN (((d.discount_type)::text = 'percentage'::text) AND (d.discount_value < 100)) THEN ln(((1)::numeric - ((d.discount_value)::numeric / 100.0)))
                    ELSE (0)::numeric
                END) FILTER (WHERE (d.is_active AND ((now() >= d.valid_from) AND (now() <= d.valid_until))))), 1.0) AS combined_percentage_factor
           FROM ((public.products p
             LEFT JOIN public.product_discounts pd ON ((p.id = pd.product_id)))
             LEFT JOIN public.discounts d ON ((pd.discount_id = d.id)))
          GROUP BY p.id, p.price_cents
        )
 SELECT id AS product_id,
    total_fixed_discount_cents,
    combined_percentage_factor,
    ((((price_cents)::numeric - total_fixed_discount_cents) * combined_percentage_factor))::bigint AS calculated_discounted_price_cents,
        CASE
            WHEN (((((price_cents)::numeric - total_fixed_discount_cents) * combined_percentage_factor))::bigint < price_cents) THEN true
            ELSE false
        END AS has_active_discount
   FROM discount_calculations dc;


ALTER VIEW public.v_products_with_calculated_discounts OWNER TO tech_user;

--
-- Name: v_products_with_current_discounts; Type: VIEW; Schema: public; Owner: tech_user
--

CREATE VIEW public.v_products_with_current_discounts AS
 SELECT p.id AS product_id,
    p.category_id,
    p.name AS product_name,
    p.slug AS product_slug,
    p.description AS product_description,
    p.short_description AS product_short_description,
    p.price_cents AS original_price_cents,
    p.stock_quantity AS product_stock_quantity,
    p.status AS product_status,
    p.brand AS product_brand,
    p.image_urls AS product_image_urls,
    p.spec_highlights AS product_spec_highlights,
    p.created_at AS product_created_at,
    p.updated_at AS product_updated_at,
    p.deleted_at AS product_deleted_at,
    p.avg_rating,
    p.num_ratings,
        CASE
            WHEN (pd.discount_id IS NOT NULL) THEN
            CASE
                WHEN ((d.discount_type)::text = 'percentage'::text) THEN ((p.price_cents * (100 - d.discount_value)) / 100)
                ELSE (p.price_cents - d.discount_value)
            END
            ELSE p.price_cents
        END AS discounted_price_cents,
    d.code AS active_discount_code,
    d.discount_type AS active_discount_type,
    d.discount_value AS active_discount_value,
    (pd.discount_id IS NOT NULL) AS has_active_discount
   FROM ((public.products p
     LEFT JOIN public.product_discounts pd ON ((p.id = pd.product_id)))
     LEFT JOIN public.discounts d ON (((pd.discount_id = d.id) AND (d.is_active = true) AND ((now() >= d.valid_from) AND (now() <= d.valid_until)))));


ALTER VIEW public.v_products_with_current_discounts OWNER TO tech_user;

--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('public.refresh_tokens_id_seq'::regclass);


--
-- Name: cart_items cart_items_cart_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_cart_id_product_id_key UNIQUE (cart_id, product_id);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- Name: carts carts_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_pkey PRIMARY KEY (id);


--
-- Name: carts carts_session_id_key; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_session_id_key UNIQUE (session_id);


--
-- Name: carts carts_user_id_key; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_user_id_key UNIQUE (user_id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: category_discounts category_discounts_category_id_discount_id_key; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.category_discounts
    ADD CONSTRAINT category_discounts_category_id_discount_id_key UNIQUE (category_id, discount_id);


--
-- Name: category_discounts category_discounts_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.category_discounts
    ADD CONSTRAINT category_discounts_pkey PRIMARY KEY (id);


--
-- Name: delivery_services delivery_services_name_key; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.delivery_services
    ADD CONSTRAINT delivery_services_name_key UNIQUE (name);


--
-- Name: delivery_services delivery_services_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.delivery_services
    ADD CONSTRAINT delivery_services_pkey PRIMARY KEY (id);


--
-- Name: discounts discounts_code_key; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.discounts
    ADD CONSTRAINT discounts_code_key UNIQUE (code);


--
-- Name: discounts discounts_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.discounts
    ADD CONSTRAINT discounts_pkey PRIMARY KEY (id);


--
-- Name: goose_db_version goose_db_version_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.goose_db_version
    ADD CONSTRAINT goose_db_version_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: product_discounts product_discounts_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.product_discounts
    ADD CONSTRAINT product_discounts_pkey PRIMARY KEY (id);


--
-- Name: product_discounts product_discounts_product_id_discount_id_key; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.product_discounts
    ADD CONSTRAINT product_discounts_product_id_discount_id_key UNIQUE (product_id, discount_id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_slug_key; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_slug_key UNIQUE (slug);


--
-- Name: refresh_tokens refresh_tokens_jti_key; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_jti_key UNIQUE (jti);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_cart_items_cart_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_cart_items_cart_id ON public.cart_items USING btree (cart_id);


--
-- Name: idx_cart_items_product_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_cart_items_product_id ON public.cart_items USING btree (product_id);


--
-- Name: idx_carts_session_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_carts_session_id ON public.carts USING btree (session_id);


--
-- Name: idx_carts_user_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_carts_user_id ON public.carts USING btree (user_id);


--
-- Name: idx_categories_parent; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_categories_parent ON public.categories USING btree (parent_id);


--
-- Name: idx_categories_slug; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_categories_slug ON public.categories USING btree (slug);


--
-- Name: idx_category_discounts_category_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_category_discounts_category_id ON public.category_discounts USING btree (category_id);


--
-- Name: idx_category_discounts_discount_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_category_discounts_discount_id ON public.category_discounts USING btree (discount_id);


--
-- Name: idx_delivery_services_is_active; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_delivery_services_is_active ON public.delivery_services USING btree (is_active);


--
-- Name: idx_discounts_active_period; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_discounts_active_period ON public.discounts USING btree (is_active, valid_from, valid_until);


--
-- Name: idx_discounts_code; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_discounts_code ON public.discounts USING btree (code);


--
-- Name: idx_discounts_is_active; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_discounts_is_active ON public.discounts USING btree (is_active);


--
-- Name: idx_discounts_valid_from; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_discounts_valid_from ON public.discounts USING btree (valid_from);


--
-- Name: idx_discounts_valid_until; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_discounts_valid_until ON public.discounts USING btree (valid_until);


--
-- Name: idx_order_items_order_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);


--
-- Name: idx_order_items_product_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_order_items_product_id ON public.order_items USING btree (product_id);


--
-- Name: idx_orders_created_at; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at);


--
-- Name: idx_orders_delivery_service_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_orders_delivery_service_id ON public.orders USING btree (delivery_service_id);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- Name: idx_orders_user_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_orders_user_id ON public.orders USING btree (user_id);


--
-- Name: idx_product_discounts_discount_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_product_discounts_discount_id ON public.product_discounts USING btree (discount_id);


--
-- Name: idx_product_discounts_product_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_product_discounts_product_id ON public.product_discounts USING btree (product_id);


--
-- Name: idx_products_active; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_products_active ON public.products USING btree (id) WHERE (((status)::text = 'active'::text) AND (deleted_at IS NULL));


--
-- Name: idx_products_brand; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_products_brand ON public.products USING btree (brand);


--
-- Name: idx_products_category; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_products_category ON public.products USING btree (category_id);


--
-- Name: idx_products_category_created; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_products_category_created ON public.products USING btree (category_id, created_at);


--
-- Name: idx_products_price; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_products_price ON public.products USING btree (price_cents);


--
-- Name: idx_products_search; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_products_search ON public.products USING gin (to_tsvector('english'::regconfig, (((name)::text || ' '::text) || (COALESCE(short_description, ''::character varying))::text)));


--
-- Name: idx_products_slug; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_products_slug ON public.products USING btree (slug);


--
-- Name: idx_products_stock; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_products_stock ON public.products USING btree (stock_quantity);


--
-- Name: idx_refresh_tokens_active_lookup; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_refresh_tokens_active_lookup ON public.refresh_tokens USING btree (jti, expires_at, revoked_at);


--
-- Name: idx_refresh_tokens_expires_at; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_refresh_tokens_expires_at ON public.refresh_tokens USING btree (expires_at);


--
-- Name: idx_refresh_tokens_jti; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_refresh_tokens_jti ON public.refresh_tokens USING btree (jti);


--
-- Name: idx_refresh_tokens_revoked_at; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_refresh_tokens_revoked_at ON public.refresh_tokens USING btree (revoked_at);


--
-- Name: idx_refresh_tokens_user_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_refresh_tokens_user_id ON public.refresh_tokens USING btree (user_id);


--
-- Name: idx_reviews_created_at; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_reviews_created_at ON public.reviews USING btree (created_at);


--
-- Name: idx_reviews_product_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_reviews_product_id ON public.reviews USING btree (product_id);


--
-- Name: idx_reviews_rating; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_reviews_rating ON public.reviews USING btree (rating);


--
-- Name: idx_reviews_user_id; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_reviews_user_id ON public.reviews USING btree (user_id);


--
-- Name: idx_reviews_user_product_unique; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE UNIQUE INDEX idx_reviews_user_product_unique ON public.reviews USING btree (user_id, product_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_users_email ON public.users USING btree (email) WHERE (deleted_at IS NULL);


--
-- Name: cart_items cart_items_cart_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: carts carts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: category_discounts category_discounts_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.category_discounts
    ADD CONSTRAINT category_discounts_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: category_discounts category_discounts_discount_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.category_discounts
    ADD CONSTRAINT category_discounts_discount_id_fkey FOREIGN KEY (discount_id) REFERENCES public.discounts(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens fk_refresh_tokens_user; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: orders orders_delivery_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_delivery_service_id_fkey FOREIGN KEY (delivery_service_id) REFERENCES public.delivery_services(id);


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: product_discounts product_discounts_discount_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.product_discounts
    ADD CONSTRAINT product_discounts_discount_id_fkey FOREIGN KEY (discount_id) REFERENCES public.discounts(id) ON DELETE CASCADE;


--
-- Name: product_discounts product_discounts_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.product_discounts
    ADD CONSTRAINT product_discounts_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE RESTRICT;


--
-- Name: reviews reviews_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict XyeJYg0yu6LtIwYlWhRXKhiovi94y3KpjICt045z64DZycnJ9pptwQppUgPe9bQ

