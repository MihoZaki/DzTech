--
-- PostgreSQL database dump
--

\restrict 30xu0dfJnWvLwv5sq4dh22gjMhem8kZsxgEa4drqM2nqWSkmGX9l6bjmHOJ284M

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
-- Data for Name: cart_items; Type: TABLE DATA; Schema: public; Owner: tech_user
--

COPY public.cart_items (id, cart_id, product_id, quantity, created_at, updated_at, deleted_at) FROM stdin;
1321e93a-983b-45d2-a7ab-5025c341099d	c25fc9b7-4610-49fa-9753-839f519832ac	45d8fc3a-5aae-42d7-b226-f35e72f0c196	8	2026-02-08 12:12:18.321415+01	2026-02-09 12:02:44.703927+01	\N
87b07e7c-51d4-4090-a418-28581c9427f3	c25fc9b7-4610-49fa-9753-839f519832ac	9ae3aa55-d0cf-4a27-9079-3b78c44cb78d	8	2026-02-09 12:00:45.502642+01	2026-02-09 12:04:24.755234+01	\N
4f60db7a-c3f9-4a62-ac71-a61105d904ee	b1c60cb1-b798-4f85-ab44-a493f617847a	9ae3aa55-d0cf-4a27-9079-3b78c44cb78d	6	2026-02-09 12:06:35.870618+01	2026-02-09 12:06:35.870618+01	\N
4b240d59-4b31-4452-bec6-872c30ce8516	0845cba4-9037-486e-95e8-7488bb0be875	45d8fc3a-5aae-42d7-b226-f35e72f0c196	6	2026-02-09 09:56:16.019216+01	2026-02-09 12:02:31.467589+01	2026-02-09 12:06:35.872165+01
9a47ad24-df8a-4eb5-87bf-241def31a6d7	0845cba4-9037-486e-95e8-7488bb0be875	9ae3aa55-d0cf-4a27-9079-3b78c44cb78d	6	2026-02-09 11:45:59.327222+01	2026-02-09 12:05:18.403387+01	2026-02-09 12:06:35.872165+01
\.


--
-- Data for Name: carts; Type: TABLE DATA; Schema: public; Owner: tech_user
--

COPY public.carts (id, user_id, session_id, created_at, updated_at, deleted_at) FROM stdin;
c25fc9b7-4610-49fa-9753-839f519832ac	6410aff2-e22f-4b84-b180-ce10cfc3b53f	\N	2026-02-07 15:05:23.344633+01	2026-02-07 15:05:23.344633+01	\N
0845cba4-9037-486e-95e8-7488bb0be875	\N	305904ed-0e22-427b-a01e-5151fe7cc746	2026-02-09 09:54:37.686897+01	2026-02-09 09:54:37.686897+01	\N
b1c60cb1-b798-4f85-ab44-a493f617847a	3f4b1d1a-8eab-4fe3-aa4d-6ffaddec1563	\N	2026-02-09 12:06:35.868226+01	2026-02-09 12:06:35.868226+01	\N
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: tech_user
--

COPY public.categories (id, name, slug, type, parent_id, created_at) FROM stdin;
b96767eb-0f87-4589-b105-fbe49f3a5e70	CPU	cpu	component	\N	2026-02-05 19:04:35.47935+01
697f0b46-e83c-4252-acef-22600245282d	GPU	gpu	component	\N	2026-02-05 19:04:35.47935+01
d4b24d9d-2eb9-4ff3-8d1d-6a887493b58a	Motherboard	motherboard	component	\N	2026-02-05 19:04:35.47935+01
834da835-1d86-4e12-9864-49ca6957b791	RAM	ram	component	\N	2026-02-05 19:04:35.47935+01
04d99e20-13df-4a8d-bb2f-1094a7857fd0	Storage	storage	component	\N	2026-02-05 19:04:35.47935+01
87a92ccc-026f-4a41-8cef-783e175442bc	Power Supply	psu	component	\N	2026-02-05 19:04:35.47935+01
1331d1e6-fcfb-4169-a7c9-c6aa1d00e6aa	Case	case	component	\N	2026-02-05 19:04:35.47935+01
4170de4a-88cd-454c-9f3a-90ee03715640	Laptop	laptop	laptop	\N	2026-02-05 19:04:35.47935+01
a9f76070-02da-4c50-85e1-57895589ce98	Accessories	accessories	accessory	\N	2026-02-05 19:04:35.47935+01
\.


--
-- Data for Name: category_discounts; Type: TABLE DATA; Schema: public; Owner: tech_user
--

COPY public.category_discounts (id, category_id, discount_id, created_at) FROM stdin;
\.


--
-- Data for Name: delivery_services; Type: TABLE DATA; Schema: public; Owner: tech_user
--

COPY public.delivery_services (id, name, description, base_cost_cents, estimated_days, is_active, created_at, updated_at) FROM stdin;
2e37f410-4f52-4e62-9042-a685ea120dec	Express Shipping	Fast delivery within 1-2 business days.	1500	2	t	2026-02-08 14:05:17.506308+01	2026-02-08 14:05:17.506308+01
b12a779c-7a43-450c-b809-9544454f236e	Standard Shipping	Regular delivery within 3-5 business days.	800	4	t	2026-02-08 14:05:17.506308+01	2026-02-08 14:05:17.506308+01
bd94a565-4cd4-4430-ba1b-75020b2a18b4	Economy Shipping	Low-cost option with longer delivery time.	400	7	t	2026-02-08 14:05:17.506308+01	2026-02-08 14:05:17.506308+01
0687ef94-8337-4fec-96e0-d1cf15fe52d6	Overnight Delivery	Next-day delivery by 10 AM.	2500	1	t	2026-02-08 14:05:17.506308+01	2026-02-08 14:05:17.506308+01
dea0f103-ca1d-4a27-8cba-7f263a149e33	Freight Service	For heavy or bulk items.	5000	5	t	2026-02-08 14:05:17.506308+01	2026-02-08 14:05:17.506308+01
\.


--
-- Data for Name: discounts; Type: TABLE DATA; Schema: public; Owner: tech_user
--

COPY public.discounts (id, code, description, discount_type, discount_value, min_order_value_cents, max_uses, current_uses, valid_from, valid_until, is_active, created_at, updated_at) FROM stdin;
3f643242-3f95-47ea-8d25-9d3ec4a2ec23	EARLY_BIRD_10	\N	percentage	10	0	\N	0	2026-02-09 12:20:37.34722+01	2026-02-10 12:20:37.34722+01	t	2026-02-09 12:20:37.34722+01	2026-02-09 12:20:37.34722+01
0554d9b8-af10-4933-b6dd-44a809a79ecb	FLASH_SALE_5USD	\N	fixed	500	0	\N	0	2026-02-09 12:20:37.34722+01	2026-02-10 12:20:37.34722+01	t	2026-02-09 12:20:37.34722+01	2026-02-09 12:20:37.34722+01
a34ef07f-5897-4970-89f8-9e48c12fd2bb	PROMO_20PCNT	\N	percentage	20	0	\N	0	2026-02-09 12:20:37.34722+01	2026-02-10 12:20:37.34722+01	t	2026-02-09 12:20:37.34722+01	2026-02-09 12:20:37.34722+01
\.


--
-- Data for Name: goose_db_version; Type: TABLE DATA; Schema: public; Owner: tech_user
--

COPY public.goose_db_version (id, version_id, is_applied, tstamp) FROM stdin;
1	0	t	2026-02-05 19:04:35.466164
2	1	t	2026-02-05 19:04:35.472436
3	2	t	2026-02-05 19:04:35.47616
4	3	t	2026-02-05 19:04:35.47935
5	4	t	2026-02-05 19:04:35.487892
6	5	t	2026-02-05 19:04:35.495606
7	6	t	2026-02-05 19:04:35.500223
8	7	t	2026-02-05 19:04:35.507203
9	8	t	2026-02-05 19:04:35.513908
10	9	t	2026-02-05 19:04:35.515078
11	10	t	2026-02-05 19:04:35.523237
15	11	t	2026-02-08 11:54:34.437912
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: tech_user
--

COPY public.order_items (id, order_id, product_id, product_name, price_cents, quantity, created_at, updated_at) FROM stdin;
195bf34a-5d57-404c-831c-e4641ca27d2a	a31b1fcc-3347-414e-893c-62ffe8dcabb3	45d8fc3a-5aae-42d7-b226-f35e72f0c196	laptop without slug	99999	2	2026-02-08 14:05:52.707821+01	2026-02-08 14:05:52.707821+01
4a07203c-a3dc-4c18-b0fc-c460913d06fa	7c516487-fe7e-4954-b781-c1d40d88243d	45d8fc3a-5aae-42d7-b226-f35e72f0c196	laptop without slug	99999	2	2026-02-08 14:15:54.680265+01	2026-02-08 14:15:54.680265+01
66042156-7142-4012-8d92-f77ec06cc96e	ae08f226-accc-4f9e-b156-ed82fd27890d	45d8fc3a-5aae-42d7-b226-f35e72f0c196	laptop without slug	99999	2	2026-02-08 14:29:47.660541+01	2026-02-08 14:29:47.660541+01
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: tech_user
--

COPY public.orders (id, user_id, user_full_name, status, total_amount_cents, payment_method, province, city, phone_number_1, phone_number_2, notes, delivery_service_id, created_at, updated_at, completed_at, cancelled_at) FROM stdin;
a31b1fcc-3347-414e-893c-62ffe8dcabb3	6410aff2-e22f-4b84-b180-ce10cfc3b53f	John Doe	pending	201498	Cash on Delivery	Luzon	Manila	1234567890	\N	Please deliver after 5 PM.	2e37f410-4f52-4e62-9042-a685ea120dec	2026-02-08 14:05:52.707821+01	2026-02-08 14:05:52.707821+01	\N	\N
7c516487-fe7e-4954-b781-c1d40d88243d	6410aff2-e22f-4b84-b180-ce10cfc3b53f	John Doe	pending	201498	Cash on Delivery	Luzon	Manila	1234567890	\N	Please deliver after 5 PM.	2e37f410-4f52-4e62-9042-a685ea120dec	2026-02-08 14:15:54.680265+01	2026-02-08 14:15:54.680265+01	\N	\N
ae08f226-accc-4f9e-b156-ed82fd27890d	6410aff2-e22f-4b84-b180-ce10cfc3b53f	John Doe	pending	201498	Cash on Delivery	Luzon	Manila	1234567890	\N	Please deliver after 5 PM.	2e37f410-4f52-4e62-9042-a685ea120dec	2026-02-08 14:29:47.660541+01	2026-02-08 14:29:47.660541+01	\N	\N
\.


--
-- Data for Name: product_discounts; Type: TABLE DATA; Schema: public; Owner: tech_user
--

COPY public.product_discounts (id, product_id, discount_id, created_at) FROM stdin;
8b932145-d1fc-42cc-bdcc-7674710d4794	6f6cff3c-6dc4-4f3b-bec6-b773b97af6b1	3f643242-3f95-47ea-8d25-9d3ec4a2ec23	2026-02-09 12:21:09.650294+01
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: tech_user
--

COPY public.products (id, category_id, name, slug, description, short_description, price_cents, stock_quantity, status, brand, avg_rating, num_ratings, image_urls, spec_highlights, created_at, updated_at, deleted_at) FROM stdin;
9f7904e8-492a-44b6-8e5e-925e28f156ab	b96767eb-0f87-4589-b105-fbe49f3a5e70	AMD Ryzen 9 7950X	amd-ryzen-9-7950x	\N	\N	69999	20	active	AMD	\N	0	["https://placehold.co/300x300?text=AMD+Ryzen+9+7950X"]	{"cores": 16, "base_clock_ghz": 4.5, "boost_clock_ghz": 5.7}	2026-02-05 20:59:14.573901+01	2026-02-05 20:59:14.573901+01	\N
9ae3aa55-d0cf-4a27-9079-3b78c44cb78d	697f0b46-e83c-4252-acef-22600245282d	NVIDIA RTX 4090	nvidia-rtx-4090	\N	\N	199999	8	active	NVIDIA	\N	0	["https://placehold.co/300x300?text=NVIDIA+RTX+4090"]	{"cores": 16384, "memory_gb": 24, "boost_clock_ghz": 2.5}	2026-02-05 20:59:14.573901+01	2026-02-05 20:59:14.573901+01	\N
34136c26-fcdb-4c79-bf77-d4b21fcb0333	d4b24d9d-2eb9-4ff3-8d1d-6a887493b58a	ASUS ROG Strix Z790-E	asus-rog-strix-z790-e	\N	\N	39999	12	active	ASUS	\N	0	["https://placehold.co/300x300?text=ASUS+ROG+Strix+Z790-E"]	{"form_factor": "ATX", "memory_slots": 4, "max_memory_gb": 128}	2026-02-05 20:59:14.573901+01	2026-02-05 20:59:14.573901+01	\N
9209ce07-f887-4cf5-b662-a35e77da88de	834da835-1d86-4e12-9864-49ca6957b791	Corsair Vengeance RGB 32GB	corsair-vengeance-rgb-32gb	\N	\N	14999	20	active	Corsair	\N	0	["https://placehold.co/300x300?text=Corsair+Vengeance+RGB+32GB"]	{"type": "DDR4", "speed_mhz": 3600, "capacity_gb": 32}	2026-02-05 20:59:14.573901+01	2026-02-05 20:59:14.573901+01	\N
5ebd3980-a02d-4949-8457-7174e1932f4b	04d99e20-13df-4a8d-bb2f-1094a7857fd0	Samsung 980 Pro 1TB	samsung-980-pro-1tb	\N	\N	12999	18	active	Samsung	\N	0	["https://placehold.co/300x300?text=Samsung+980+Pro+1TB"]	{"interface": "PCIe 4.0", "capacity_gb": 1000, "read_speed_mbps": 7000}	2026-02-05 20:59:14.573901+01	2026-02-05 20:59:14.573901+01	\N
35651ddd-4be2-4611-aeda-897c556e6675	87a92ccc-026f-4a41-8cef-783e175442bc	Corsair RM850x	corsair-rm850x	\N	\N	17999	10	active	Corsair	\N	0	["https://placehold.co/300x300?text=Corsair+RM850x"]	{"modular": "Fully", "wattage": 850, "efficiency": "80+ Gold"}	2026-02-05 20:59:14.573901+01	2026-02-05 20:59:14.573901+01	\N
f102008d-b368-470c-8789-945115b5a67d	1331d1e6-fcfb-4169-a7c9-c6aa1d00e6aa	NZXT H5 Flow	nzxt-h5-flow	\N	\N	9999	14	active	NZXT	\N	0	["https://placehold.co/300x300?text=NZXT+H5+Flow"]	{"material": "Steel/Tempered Glass", "form_factor": "ATX", "fans_included": 2}	2026-02-05 20:59:14.573901+01	2026-02-05 20:59:14.573901+01	\N
8d9aee78-06b0-458a-833a-2953fd80262e	4170de4a-88cd-454c-9f3a-90ee03715640	MacBook Pro 14-inch	macbook-pro-14-inch	\N	\N	249999	5	active	Apple	\N	0	["https://placehold.co/300x300?text=MacBook+Pro+14-inch"]	{"cpu": "M2 Pro", "ram_gb": 16, "display": "14.2-inch Liquid Retina XDR", "storage_gb": 512}	2026-02-05 20:59:14.573901+01	2026-02-05 20:59:14.573901+01	\N
aa882d7d-1b43-4d94-a2aa-3916eec70540	a9f76070-02da-4c50-85e1-57895589ce98	Logitech MX Master 3S	logitech-mx-master-3s	\N	\N	11999	22	active	Logitech	\N	0	["https://placehold.co/300x300?text=Logitech+MX+Master+3S"]	{"dpi": 8000, "type": "Wireless Mouse", "battery_life_days": 70}	2026-02-05 20:59:14.573901+01	2026-02-05 20:59:14.573901+01	\N
1b1c976e-a0a6-4556-990d-8e69c0c30a7f	b96767eb-0f87-4589-b105-fbe49f3a5e70	Intel Core i9-13900K	intel-core-i9-13900k	\N	\N	79999	15	active	Intel	5.00	1	["https://placehold.co/300x300?text=Intel+Core+i9-13900K"]	{"cores": 24, "base_clock_ghz": 3.0, "boost_clock_ghz": 5.8}	2026-02-05 20:59:14.573901+01	2026-02-05 20:59:14.573901+01	\N
70c42277-3ce1-4ba8-b4dc-59198a474f87	b96767eb-0f87-4589-b105-fbe49f3a5e70	laptop without slug	laptop-without-slug	\N	\N	99999	25	active	AMD	\N	0	["https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?q=80&w=1932&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"]	{"cores": 16, "base_clock_ghz": 4}	2026-02-07 12:21:08.954886+01	2026-02-07 12:21:08.954886+01	\N
45d8fc3a-5aae-42d7-b226-f35e72f0c196	b96767eb-0f87-4589-b105-fbe49f3a5e70	laptop without slug	laptop-without-slug-1	\N	\N	99999	25	active	AMD	\N	0	["https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?q=80&w=1932&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"]	{"cores": 16, "base_clock_ghz": 4}	2026-02-07 12:21:23.372657+01	2026-02-07 12:21:23.372657+01	\N
7cfa100b-898c-4a17-8bb5-ffdc2f951728	b96767eb-0f87-4589-b105-fbe49f3a5e70	Updated Multipart Product image	updated-multipart-product-image	A product created via multipart with an image4.	\N	12345	5	active	TestBrand2	\N	0	["/uploads/3ed7b91b-69b6-46dc-b734-bb01d0e5fee8.png"]	{}	2026-02-07 13:05:56.472018+01	2026-02-07 13:12:18.248475+01	2026-02-07 13:13:15.022636+01
6f6cff3c-6dc4-4f3b-bec6-b773b97af6b1	697f0b46-e83c-4252-acef-22600245282d	AMD Radeon RX 7900 XTX	amd-radeon-rx-7900-xtx	\N	\N	149999	12	active	AMD	5.00	1	["https://placehold.co/300x300?text=AMD+Radeon+RX+7900+XTX"]	{"cores": 6144, "memory_gb": 24, "boost_clock_ghz": 2.3}	2026-02-05 20:59:14.573901+01	2026-02-07 14:17:19.827946+01	\N
78897acb-bea7-4a35-b8a8-ed49bcf94b81	697f0b46-e83c-4252-acef-22600245282d	AMD Ryzen 9 7900X	amd-ryzen-9-7900x	High-performance desktop processor with 12 cores and 24 threads, ideal for gaming and content creation.	12-core, 24-thread desktop CPU	49999	50	active	AMD	\N	0	["https://example.com/images/ryzen-9-7900x.jpg"]	{"cores": 12, "socket": "AM5", "threads": 24, "tdp_watts": 170, "process_nm": 5, "l3_cache_mb": 64, "base_clock_ghz": 4.7, "boost_clock_ghz": 5.6}	2026-02-09 16:21:17.620806+01	2026-02-09 16:21:17.620806+01	\N
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: tech_user
--

COPY public.refresh_tokens (id, jti, user_id, token_hash, expires_at, revoked_at, created_at, updated_at) FROM stdin;
1	f8e1a960-29e8-46bd-bd11-7b8d1d9e5be3	6410aff2-e22f-4b84-b180-ce10cfc3b53f	697e139dcb3f7e2b2752996d7c58968ea98a430d4fc44228b6d21601273a3daf	2026-02-12 20:58:42.973653+01	2026-02-06 16:36:28.807619+01	2026-02-05 20:58:42.973898+01	2026-02-06 16:36:28.807619+01
2	4113c6ae-5564-4420-95d6-366f7c36272b	6410aff2-e22f-4b84-b180-ce10cfc3b53f	01a60c6bf87c6a431b5bac5ba0931528f6c1c64664bc3c5cb8abf5de350df0d5	2026-02-13 16:36:28.812068+01	2026-02-06 16:54:15.447295+01	2026-02-06 16:36:28.812941+01	2026-02-06 16:54:15.447295+01
3	6243a16d-0fe2-4438-b8d0-c591af1a88c0	6410aff2-e22f-4b84-b180-ce10cfc3b53f	e797179e1e11e6d477ccf7f21193bfe89281757a6683f81e9ac32de987558c09	2026-02-13 16:54:15.448754+01	2026-02-06 17:36:52.735463+01	2026-02-06 16:54:15.449109+01	2026-02-06 17:36:52.735463+01
4	ca99242e-cc0c-46cf-8514-dfbe0f478f1e	6410aff2-e22f-4b84-b180-ce10cfc3b53f	7d996ee86e90a8c10ace255f1b9dc37f77160c8ab0c105eb7a9650a247a3502c	2026-02-13 17:36:52.737079+01	2026-02-06 17:47:36.557984+01	2026-02-06 17:36:52.737651+01	2026-02-06 17:47:36.557984+01
5	e58feeb6-0532-4053-9402-aec684eb35d6	6410aff2-e22f-4b84-b180-ce10cfc3b53f	42717aa0e51f6993091f9b66cbd60814a54c55e11550790d31cbf8c0e249a40c	2026-02-13 17:47:36.559459+01	2026-02-07 12:16:47.070776+01	2026-02-06 17:47:36.559743+01	2026-02-07 12:16:47.070776+01
6	1de25da0-049a-4df7-96fe-e9e2412c7008	6410aff2-e22f-4b84-b180-ce10cfc3b53f	dc4fa0dc79812b30e29ea4f99c42035c059e06695f2f9ad41b146084cc774dd5	2026-02-14 12:16:47.075658+01	2026-02-07 12:19:58.329645+01	2026-02-07 12:16:47.076197+01	2026-02-07 12:19:58.329645+01
7	d099a93b-787e-420f-9bc2-1d8a4db7ea65	6410aff2-e22f-4b84-b180-ce10cfc3b53f	c6eeb3539cc3a939fac214061e7929eeec863579b3a9aa7969b4aad46ceacf2e	2026-02-14 12:19:58.331364+01	2026-02-07 13:01:55.340286+01	2026-02-07 12:19:58.331584+01	2026-02-07 13:01:55.340286+01
8	0b28e11b-81be-4d97-b5e1-5cc69cb4f41c	6410aff2-e22f-4b84-b180-ce10cfc3b53f	e6854c18c20e8e6303df2a8571af7f5e2592185daab841be7769fa4a9f3a0fa2	2026-02-14 13:01:55.342621+01	2026-02-07 14:11:27.496727+01	2026-02-07 13:01:55.343158+01	2026-02-07 14:11:27.496727+01
9	baed54e1-734e-4201-ab33-e7b4e17b9900	6410aff2-e22f-4b84-b180-ce10cfc3b53f	d34a51ebe82a9262c5e4e880b9276454ff9d0bfb486eb2dfe697b49cf70c0ba1	2026-02-14 14:11:27.498464+01	2026-02-07 14:32:11.360373+01	2026-02-07 14:11:27.499062+01	2026-02-07 14:32:11.360373+01
10	e70bbeec-b3bc-4149-ad97-0c774382b805	6410aff2-e22f-4b84-b180-ce10cfc3b53f	1916b927b7e0ef122129c22e72c2708c04556e4343e7c47a7ca0e58b7f014b2e	2026-02-14 14:32:11.362241+01	2026-02-07 15:05:08.604023+01	2026-02-07 14:32:11.362751+01	2026-02-07 15:05:08.604023+01
11	05537d01-8a3a-4e50-8358-4dd211c2b553	6410aff2-e22f-4b84-b180-ce10cfc3b53f	3c51682bb4c14db4a3ba55f7d0ff01b487f0c57913f61610a1357aac797e4f00	2026-02-14 15:05:08.605718+01	2026-02-07 15:34:55.052198+01	2026-02-07 15:05:08.606149+01	2026-02-07 15:34:55.052198+01
12	0a97c12c-90d4-41ed-9400-356ead14683b	6410aff2-e22f-4b84-b180-ce10cfc3b53f	b20c5993bfc67c39a2f979dcba4ac8a91e11963c70f0888201ac86693fb16dbf	2026-02-14 15:34:55.054108+01	2026-02-08 08:26:21.0366+01	2026-02-07 15:34:55.054496+01	2026-02-08 08:26:21.0366+01
13	9a5d3d6d-d6d6-4aa1-af21-ef195d14f27b	6410aff2-e22f-4b84-b180-ce10cfc3b53f	04b6761f1f95ad0ec81cf2f7198d548c14aee4031c0202dcb65c148fe69b9067	2026-02-15 08:26:21.041286+01	2026-02-08 12:10:28.774698+01	2026-02-08 08:26:21.042044+01	2026-02-08 12:10:28.774698+01
14	9a522d82-ce64-46be-83d2-487789af9b3c	6410aff2-e22f-4b84-b180-ce10cfc3b53f	8a14036816c209a2765d8b88be0473567a0aab1ce62265c175fcb690eb079e46	2026-02-15 12:10:28.776666+01	2026-02-08 13:06:04.331489+01	2026-02-08 12:10:28.77727+01	2026-02-08 13:06:04.331489+01
15	7d71a56b-3ce3-413a-bdba-278dcb34d4df	6410aff2-e22f-4b84-b180-ce10cfc3b53f	ded1341b34d1b81481b203739e7b5ac2146fde65214126769fb6133806ceaab3	2026-02-15 13:06:04.333266+01	2026-02-08 13:26:12.579152+01	2026-02-08 13:06:04.333909+01	2026-02-08 13:26:12.579152+01
16	e4a2c5ca-e70c-49c6-8bad-b8689b42e460	6410aff2-e22f-4b84-b180-ce10cfc3b53f	af423564e7a906898044ae1f868bf2c21044f53ba301dafb9bad8f5018ec8489	2026-02-15 13:26:12.580774+01	2026-02-08 14:01:53.867832+01	2026-02-08 13:26:12.581235+01	2026-02-08 14:01:53.867832+01
17	a69afce5-03ab-45ea-8412-f8e5ca44cfcd	6410aff2-e22f-4b84-b180-ce10cfc3b53f	3ba5b7a9416d281d58f30dd2857cad3aa1f296e5303c9993ca3c07dc86887015	2026-02-15 14:01:53.869535+01	2026-02-08 14:25:15.444278+01	2026-02-08 14:01:53.870218+01	2026-02-08 14:25:15.444278+01
18	605ebf0c-206a-4761-b8ff-cff1e274d17d	6410aff2-e22f-4b84-b180-ce10cfc3b53f	9c46f1531858e463bf77816feceddb9f05c83ecdb2b411f3247f2a2cc80d0b35	2026-02-15 14:25:15.445836+01	2026-02-09 09:56:40.0367+01	2026-02-08 14:25:15.446245+01	2026-02-09 09:56:40.0367+01
19	600c8684-3286-40bb-b713-b775104e930b	6410aff2-e22f-4b84-b180-ce10cfc3b53f	299da0cda886ca9685c556431eb557c00846dfe22a015feade03f96c49ff3400	2026-02-16 09:56:40.040941+01	2026-02-09 11:48:48.120175+01	2026-02-09 09:56:40.041676+01	2026-02-09 11:48:48.120175+01
20	642961de-27d0-4fef-b68e-b167ea03b38d	6410aff2-e22f-4b84-b180-ce10cfc3b53f	60e02ee9e70c2a8820bba4e57c7543f7b02d634a0f7c1b57572ea7e27d8b5782	2026-02-16 11:48:48.122148+01	2026-02-09 11:51:43.773162+01	2026-02-09 11:48:48.122822+01	2026-02-09 11:51:43.773162+01
21	9bdd1fa3-a0c8-4108-a2c9-df96b224d8c6	6410aff2-e22f-4b84-b180-ce10cfc3b53f	ac7b70d857ce94730cca9d8fdd2d14861777db547f9d8f3ff65bff41411fadaa	2026-02-16 11:51:43.774854+01	2026-02-09 12:00:45.49799+01	2026-02-09 11:51:43.775245+01	2026-02-09 12:00:45.49799+01
22	18fff26f-5737-478d-9f0a-867a4ca778f0	6410aff2-e22f-4b84-b180-ce10cfc3b53f	82036b6a8d47d2af90a74052a514c9ed6a99b3cf9f0ede7ebae3da25aef76b53	2026-02-16 12:00:45.499765+01	2026-02-09 12:02:44.699559+01	2026-02-09 12:00:45.500241+01	2026-02-09 12:02:44.699559+01
23	4145359c-1e03-40e6-9f09-24e1017225ed	6410aff2-e22f-4b84-b180-ce10cfc3b53f	64cd6e1aa09a716c78ad878064fd01a1929886775a46e9d5e49e4b83a80f1e1a	2026-02-16 12:02:44.701397+01	2026-02-09 12:04:24.750484+01	2026-02-09 12:02:44.701614+01	2026-02-09 12:04:24.750484+01
24	f30f69c2-d360-42f7-9804-8679fecb7b73	6410aff2-e22f-4b84-b180-ce10cfc3b53f	6965c4b9ae4a7fa7f7d5b5b010a087a3cb2cf29cf4008e811c1939a657702c5c	2026-02-16 12:04:24.753622+01	\N	2026-02-09 12:04:24.753743+01	2026-02-09 12:04:24.753743+01
25	46ae5ad7-2f95-4d02-beb3-08c9416e1230	799afb24-9daa-42e8-a0f0-6224e0849969	e10796a2bcdcc5a9f1d96ba24d1b9b3dca416f2c44430ab35ce9786b9adb33eb	2026-02-16 12:06:01.569355+01	\N	2026-02-09 12:06:01.569502+01	2026-02-09 12:06:01.569502+01
26	5a1cbc05-c2d2-4363-a7b8-f4449ae2b912	3f4b1d1a-8eab-4fe3-aa4d-6ffaddec1563	73d6ed8782c8d0a991a32e49ba4021b663202ae4c0fad4ac2d5e9bb4346fafef	2026-02-16 12:06:35.866212+01	\N	2026-02-09 12:06:35.866321+01	2026-02-09 12:06:35.866321+01
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: tech_user
--

COPY public.reviews (id, user_id, product_id, rating, created_at, updated_at, deleted_at) FROM stdin;
302b2084-5447-47e5-9ff0-51893df4dae7	6410aff2-e22f-4b84-b180-ce10cfc3b53f	1b1c976e-a0a6-4556-990d-8e69c0c30a7f	5	2026-02-05 21:00:54.991681+01	2026-02-05 21:00:54.991681+01	\N
5b0fdf94-baf1-4a22-b35d-05846f1a9bf8	6410aff2-e22f-4b84-b180-ce10cfc3b53f	6f6cff3c-6dc4-4f3b-bec6-b773b97af6b1	5	2026-02-07 14:17:19.827946+01	2026-02-07 14:17:19.827946+01	\N
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: public; Owner: tech_user
--

COPY public.schema_migrations (version, is_applied, applied_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: tech_user
--

COPY public.users (id, email, password_hash, full_name, is_admin, created_at, updated_at, deleted_at) FROM stdin;
6410aff2-e22f-4b84-b180-ce10cfc3b53f	dztech@example.com	\\x2432612431302445487932795052575461317748695a63514355523165416e4c5a714b7437375642694775307834446c5252565a6c5733656b2e3832	Test User	t	2026-02-05 20:58:42.969226+01	2026-02-05 20:58:42.969226+01	\N
799afb24-9daa-42e8-a0f0-6224e0849969	cartdzh@example.com	\\x2432612431302473307a725a6b6f583133363541505645664d6a6a56753169692e4e374459706c756c4a6a42495076633549444264702f6d61633836	Test User cart sync	f	2026-02-09 12:06:01.564392+01	2026-02-09 12:06:01.564392+01	\N
3f4b1d1a-8eab-4fe3-aa4d-6ffaddec1563	dzcarth@example.com	\\x24326124313024594b38754d4b704666686b2e49684d4c53594d37432e646142703244332e5a32644d5662677448437a3078636d4b346b6b526d796d	Test User cart sync	f	2026-02-09 12:06:35.864294+01	2026-02-09 12:06:35.864294+01	\N
\.


--
-- Name: goose_db_version_id_seq; Type: SEQUENCE SET; Schema: public; Owner: tech_user
--

SELECT pg_catalog.setval('public.goose_db_version_id_seq', 15, true);


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: tech_user
--

SELECT pg_catalog.setval('public.refresh_tokens_id_seq', 26, true);


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

\unrestrict 30xu0dfJnWvLwv5sq4dh22gjMhem8kZsxgEa4drqM2nqWSkmGX9l6bjmHOJ284M

