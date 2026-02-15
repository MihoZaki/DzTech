--
-- PostgreSQL database dump
--

\restrict d1FcH2vB7aF86OA7Fkgn5tH8IcTvL9TpKxQuZ2MXKvBxlSUa0aROy5yuwPwV373

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
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: tech_user
--

CREATE TABLE public.password_reset_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token character varying(255) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.password_reset_tokens OWNER TO tech_user;

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
9cd15df3-04b6-492c-b5bb-8f2ad4332044	0c7cc4d7-7b66-416a-8dba-e6b7df752f5a	bf6f011b-db5c-4e64-82a7-e15e49b0ecdc	1	2026-02-15 20:28:40.801562+01	2026-02-15 20:28:40.801562+01	2026-02-15 20:29:10.520451+01
\.


--
-- Data for Name: carts; Type: TABLE DATA; Schema: public; Owner: tech_user
--

COPY public.carts (id, user_id, session_id, created_at, updated_at, deleted_at) FROM stdin;
c25fc9b7-4610-49fa-9753-839f519832ac	6410aff2-e22f-4b84-b180-ce10cfc3b53f	\N	2026-02-07 15:05:23.344633+01	2026-02-07 15:05:23.344633+01	\N
0845cba4-9037-486e-95e8-7488bb0be875	\N	305904ed-0e22-427b-a01e-5151fe7cc746	2026-02-09 09:54:37.686897+01	2026-02-09 09:54:37.686897+01	\N
b1c60cb1-b798-4f85-ab44-a493f617847a	3f4b1d1a-8eab-4fe3-aa4d-6ffaddec1563	\N	2026-02-09 12:06:35.868226+01	2026-02-09 12:06:35.868226+01	\N
617a994a-6b2c-4f8c-a6b1-bd8763150f66	20f171bc-56ee-4eaa-bb79-483d5a276893	\N	2026-02-15 17:54:19.644842+01	2026-02-15 17:54:19.644842+01	\N
60442dd6-769a-4654-bff0-951b9dd3ffb6	\N	3c4abe64-fec9-460c-8e1d-c5ac6139d4a3	2026-02-15 18:24:47.37595+01	2026-02-15 18:24:47.37595+01	\N
cab8b24d-c860-48e7-9ad8-267bd79349a7	\N	60442dd6-769a-4654-bff0-951b9dd3ffb6	2026-02-15 18:52:19.382173+01	2026-02-15 18:52:19.382173+01	\N
0c7cc4d7-7b66-416a-8dba-e6b7df752f5a	\N	3dc96d23-ae5b-49c9-a626-a81b693244cc	2026-02-15 20:28:40.800326+01	2026-02-15 20:28:40.800326+01	\N
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: tech_user
--

COPY public.categories (id, name, slug, type, parent_id, created_at) FROM stdin;
3f4108a6-d53b-42f9-9e0d-78322546e1fd	CPU	cpu	component	\N	2026-02-15 20:25:45.189303+01
836b2868-9117-4d0c-8648-95c64446c4c5	GPU	gpu	component	\N	2026-02-15 20:25:45.189303+01
95e41c1b-c1d9-4a3f-b596-ec1731e89857	Motherboard	motherboard	component	\N	2026-02-15 20:25:45.189303+01
4fddcd1c-268c-4df3-9d6f-35257245c91a	RAM	ram	component	\N	2026-02-15 20:25:45.189303+01
edadc626-3bf5-4a66-8279-673f190625c3	Storage	storage	component	\N	2026-02-15 20:25:45.189303+01
59e5942b-d2e8-427f-8da7-74fb39456546	Power Supply	psu	component	\N	2026-02-15 20:25:45.189303+01
1f24146e-f2dc-4e6a-b02e-1175a686e16a	Case	case	component	\N	2026-02-15 20:25:45.189303+01
b839d223-a97a-4a14-a7be-065c054abe98	Laptop	laptop	laptop	\N	2026-02-15 20:25:45.189303+01
2dbf293b-c2f4-4f0b-bb7f-78eb1c513b0e	Accessories	accessories	accessory	\N	2026-02-15 20:25:45.189303+01
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
0554d9b8-af10-4933-b6dd-44a809a79ecb	FLASH_SALE_5USD	\N	fixed	500	0	\N	0	2026-02-09 12:20:37.34722+01	2026-02-25 13:20:37.34722+01	t	2026-02-09 12:20:37.34722+01	2026-02-09 12:20:37.34722+01
0a1e464a-dcad-4504-879e-c10709cf0da8	SAVE10	10% discount on orders over $100	percentage	10	10000	100	0	2026-02-11 11:00:00+01	2026-02-25 13:20:37.34722+01	t	2026-02-11 10:23:17.280128+01	2026-02-11 10:23:17.280128+01
a34ef07f-5897-4970-89f8-9e48c12fd2bb	PROMO_20PCNT	\N	percentage	20	0	\N	0	2026-02-09 12:20:37.34722+01	2026-02-25 13:20:37.34722+01	t	2026-02-09 12:20:37.34722+01	2026-02-09 12:20:37.34722+01
\.


--
-- Data for Name: goose_db_version; Type: TABLE DATA; Schema: public; Owner: tech_user
--

COPY public.goose_db_version (id, version_id, is_applied, tstamp) FROM stdin;
1	0	t	2026-02-15 20:25:45.175855
2	1	t	2026-02-15 20:25:45.181873
3	2	t	2026-02-15 20:25:45.186123
4	3	t	2026-02-15 20:25:45.189303
5	4	t	2026-02-15 20:25:45.19886
6	5	t	2026-02-15 20:25:45.20478
7	6	t	2026-02-15 20:25:45.208678
8	7	t	2026-02-15 20:25:45.215701
9	8	t	2026-02-15 20:25:45.222721
10	9	t	2026-02-15 20:25:45.224272
11	10	t	2026-02-15 20:25:45.232041
12	11	t	2026-02-15 20:25:45.236132
13	12	t	2026-02-15 20:25:45.240332
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: tech_user
--

COPY public.order_items (id, order_id, product_id, product_name, price_cents, quantity, created_at, updated_at) FROM stdin;
b8b92d8b-06de-4541-9a72-948c0f212cb6	80c80a37-7087-4fee-9c2b-937e229ffac8	bf6f011b-db5c-4e64-82a7-e15e49b0ecdc	laptop for guest	99999	1	2026-02-15 20:29:10.516851+01	2026-02-15 20:29:10.516851+01
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: tech_user
--

COPY public.orders (id, user_id, user_full_name, status, total_amount_cents, payment_method, province, city, phone_number_1, phone_number_2, notes, delivery_service_id, created_at, updated_at, completed_at, cancelled_at) FROM stdin;
7c516487-fe7e-4954-b781-c1d40d88243d	6410aff2-e22f-4b84-b180-ce10cfc3b53f	John Doe	cancelled	201498	Cash on Delivery	Luzon	Manila	1234567890	\N	Please deliver after 5 PM.	2e37f410-4f52-4e62-9042-a685ea120dec	2026-02-08 14:15:54.680265+01	2026-02-13 22:54:51.034745+01	2026-02-13 22:54:51.034745+01	2026-02-13 22:54:51.034745+01
ae08f226-accc-4f9e-b156-ed82fd27890d	6410aff2-e22f-4b84-b180-ce10cfc3b53f	John Doe	delivered	201498	Cash on Delivery	Luzon	Manila	1234567890	\N	Please deliver after 5 PM.	2e37f410-4f52-4e62-9042-a685ea120dec	2026-02-08 14:29:47.660541+01	2026-02-13 22:56:12.822157+01	2026-02-13 22:56:12.822157+01	\N
4c92bd48-e649-40ab-9cc3-8083ebe5b1ad	6410aff2-e22f-4b84-b180-ce10cfc3b53f	John Doe	cancelled	2401500	Cash on Delivery	Luzon	Manila	1234567890	\N	Please deliver after 5 PM.	2e37f410-4f52-4e62-9042-a685ea120dec	2026-02-13 22:28:25.923434+01	2026-02-14 12:57:57.594909+01	2026-02-14 12:57:57.594909+01	2026-02-14 12:57:57.594909+01
a31b1fcc-3347-414e-893c-62ffe8dcabb3	6410aff2-e22f-4b84-b180-ce10cfc3b53f	John Doe	cancelled	201498	Cash on Delivery	Luzon	Manila	1234567890	\N	Please deliver after 5 PM.	2e37f410-4f52-4e62-9042-a685ea120dec	2026-02-08 14:05:52.707821+01	2026-02-14 13:00:47.296317+01	2026-02-14 13:00:47.296317+01	2026-02-14 13:00:47.296317+01
83ed2046-4954-454b-b6af-f8761d4afcb2	3f4b1d1a-8eab-4fe3-aa4d-6ffaddec1563	John Doe	pending	1201500	Cash on Delivery	Luzon	Manila	1234567890	\N	Please deliver after 5 PM.	2e37f410-4f52-4e62-9042-a685ea120dec	2026-02-14 14:13:46.968952+01	2026-02-14 14:13:46.968952+01	\N	\N
0b7a9c24-bb3f-4aca-8ab8-4151f77acf92	20f171bc-56ee-4eaa-bb79-483d5a276893	John Snow	pending	101500	Cash on Delivery	Luzon	Manila	1234567890	\N	Please deliver after 5 PM.	2e37f410-4f52-4e62-9042-a685ea120dec	2026-02-15 18:39:13.314599+01	2026-02-15 18:39:13.314599+01	\N	\N
3b7b9f37-de66-4764-8975-cf81c7f95e37	20f171bc-56ee-4eaa-bb79-483d5a276893	John Snow	pending	101500	Cash on Delivery	Luzon	Manila	1234567890	\N	Please deliver after 5 PM.	2e37f410-4f52-4e62-9042-a685ea120dec	2026-02-15 18:42:54.749512+01	2026-02-15 18:42:54.749512+01	\N	\N
80c80a37-7087-4fee-9c2b-937e229ffac8	3dc96d23-ae5b-49c9-a626-a81b693244cc	sessionID Buyer 2	pending	101500	Cash on Delivery	Luzon	Manila	1234567890	\N	Please deliver after 5 PM.	2e37f410-4f52-4e62-9042-a685ea120dec	2026-02-15 20:29:10.516851+01	2026-02-15 20:29:10.516851+01	\N	\N
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: tech_user
--

COPY public.password_reset_tokens (id, user_id, token, expires_at, created_at) FROM stdin;
a4f3dab5-110e-4c60-9913-4eed68d09de1	20f171bc-56ee-4eaa-bb79-483d5a276893	02928dc025fc2bf7fa8cc8b0507a8c4c5a172ec6ff7d9a34353894ab13b0ad49	2026-02-15 16:21:36.595513+01	2026-02-15 15:21:36.595767+01
1e9e2cd8-69ec-4ff4-9680-e884a6070ddb	20f171bc-56ee-4eaa-bb79-483d5a276893	5a2d204ff8a2cbaf8f60229f3fe9f16a6f791e4086b964f2d1426c195475342a	2026-02-15 16:33:08.613414+01	2026-02-15 15:33:08.613692+01
91ecf285-6f22-453d-8aff-4d3be927526b	20f171bc-56ee-4eaa-bb79-483d5a276893	490792cc47e9d5864b4ac0814428ce752043e0c285a462323d0592bc703c867c	2026-02-15 17:30:40.212856+01	2026-02-15 16:30:40.213035+01
e5669396-bbef-46b3-af1e-15aa29ce6853	20f171bc-56ee-4eaa-bb79-483d5a276893	df2dea5c0a17f0cd9d1567d52112fbfc3461bb0334fa8a2507f64101bebe24b8	2026-02-15 17:30:54.620517+01	2026-02-15 16:30:54.620754+01
\.


--
-- Data for Name: product_discounts; Type: TABLE DATA; Schema: public; Owner: tech_user
--

COPY public.product_discounts (id, product_id, discount_id, created_at) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: tech_user
--

COPY public.products (id, category_id, name, slug, description, short_description, price_cents, stock_quantity, status, brand, avg_rating, num_ratings, image_urls, spec_highlights, created_at, updated_at, deleted_at) FROM stdin;
bf6f011b-db5c-4e64-82a7-e15e49b0ecdc	3f4108a6-d53b-42f9-9e0d-78322546e1fd	laptop for guest	laptop-for-guest	\N	\N	99999	25	active	AMD	\N	0	["https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?q=80&w=1932&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"]	{"cores": 16, "base_clock_ghz": 4}	2026-02-15 20:28:02.123754+01	2026-02-15 20:28:02.123754+01	\N
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: tech_user
--

COPY public.refresh_tokens (id, jti, user_id, token_hash, expires_at, revoked_at, created_at, updated_at) FROM stdin;
1	f8e1a960-29e8-46bd-bd11-7b8d1d9e5be3	6410aff2-e22f-4b84-b180-ce10cfc3b53f	697e139dcb3f7e2b2752996d7c58968ea98a430d4fc44228b6d21601273a3daf	2026-02-12 20:58:42.973653+01	2026-02-06 16:36:28.807619+01	2026-02-05 20:58:42.973898+01	2026-02-06 16:36:28.807619+01
26	5a1cbc05-c2d2-4363-a7b8-f4449ae2b912	3f4b1d1a-8eab-4fe3-aa4d-6ffaddec1563	73d6ed8782c8d0a991a32e49ba4021b663202ae4c0fad4ac2d5e9bb4346fafef	2026-02-16 12:06:35.866212+01	2026-02-14 14:13:06.869324+01	2026-02-09 12:06:35.866321+01	2026-02-14 14:13:06.869324+01
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
25	46ae5ad7-2f95-4d02-beb3-08c9416e1230	799afb24-9daa-42e8-a0f0-6224e0849969	e10796a2bcdcc5a9f1d96ba24d1b9b3dca416f2c44430ab35ce9786b9adb33eb	2026-02-16 12:06:01.569355+01	\N	2026-02-09 12:06:01.569502+01	2026-02-09 12:06:01.569502+01
24	f30f69c2-d360-42f7-9804-8679fecb7b73	6410aff2-e22f-4b84-b180-ce10cfc3b53f	6965c4b9ae4a7fa7f7d5b5b010a087a3cb2cf29cf4008e811c1939a657702c5c	2026-02-16 12:04:24.753622+01	2026-02-10 20:25:31.980039+01	2026-02-09 12:04:24.753743+01	2026-02-10 20:25:31.980039+01
27	d55e395d-ca71-42a6-85df-0a547e593fd2	6410aff2-e22f-4b84-b180-ce10cfc3b53f	af80b9ceb914d6fa6c77faaca38e48b45fd3e758b7c501d59aae7c5793f26d18	2026-02-17 20:25:31.985538+01	2026-02-10 22:01:23.384523+01	2026-02-10 20:25:31.986933+01	2026-02-10 22:01:23.384523+01
28	d945623c-4f7c-4711-bf9d-d5636c64c1d9	6410aff2-e22f-4b84-b180-ce10cfc3b53f	ff69f6d86c4ab2aebdc12574f4460364271d33343cce0dac1df5f94b0d37aeb4	2026-02-17 22:01:23.390213+01	2026-02-10 22:47:56.745708+01	2026-02-10 22:01:23.392748+01	2026-02-10 22:47:56.745708+01
29	410dd939-4abc-4d11-8e42-d3e5cd29e685	6410aff2-e22f-4b84-b180-ce10cfc3b53f	c26506828f2671d99ead7081f9c7865de915802bd6375ab4ab6836ce4f52a696	2026-02-17 22:47:56.750454+01	2026-02-11 10:18:37.285269+01	2026-02-10 22:47:56.750895+01	2026-02-11 10:18:37.285269+01
30	7c354ee9-6859-420e-8c99-276801e020d2	6410aff2-e22f-4b84-b180-ce10cfc3b53f	06ce7c8208fa81789c004c7bc4011e151e86f38e2ad14793358884bfb4fcf349	2026-02-18 10:18:37.289553+01	2026-02-11 10:43:23.329004+01	2026-02-11 10:18:37.290275+01	2026-02-11 10:43:23.329004+01
31	a016ef3d-1c45-49f1-b6b4-4f71d3af69bd	6410aff2-e22f-4b84-b180-ce10cfc3b53f	2cc9a3cdd0248d3514b462175064425cb52d656987c7a4fbe63f1eff7fd9cfba	2026-02-18 10:43:23.332384+01	2026-02-11 10:59:29.315556+01	2026-02-11 10:43:23.332866+01	2026-02-11 10:59:29.315556+01
32	db160e2c-f844-426d-8068-51f35e500c7d	6410aff2-e22f-4b84-b180-ce10cfc3b53f	5ca810e03de31ca439bc1424413df249c763a4d81cde0496988bdb9a2c46ebcf	2026-02-18 10:59:29.318141+01	2026-02-11 12:18:52.850343+01	2026-02-11 10:59:29.318272+01	2026-02-11 12:18:52.850343+01
33	2085ff49-5a88-445f-90df-6a67e21c8ae3	6410aff2-e22f-4b84-b180-ce10cfc3b53f	cabc3e318c1092e6e77b24df74c612c54bb12d54bc9e66e43b3341e1ed6d4109	2026-02-18 12:18:52.853262+01	2026-02-11 12:37:27.034045+01	2026-02-11 12:18:52.85376+01	2026-02-11 12:37:27.034045+01
34	43187bf5-7920-42aa-bfc5-f2b0404781f6	6410aff2-e22f-4b84-b180-ce10cfc3b53f	59706a87fd0f926c1f21be8ccf95f85ca6a220763eca5dbdaacda1b9ef625960	2026-02-18 12:37:27.035945+01	2026-02-11 16:48:00.119419+01	2026-02-11 12:37:27.036401+01	2026-02-11 16:48:00.119419+01
35	100b24d8-da8a-4a28-a925-91b61b18a7e0	6410aff2-e22f-4b84-b180-ce10cfc3b53f	199d864e974f666ee84d2b61511dd265518d8e297e05d1eff340ab5a3e3d154e	2026-02-18 16:48:00.124439+01	2026-02-11 17:20:35.929555+01	2026-02-11 16:48:00.125762+01	2026-02-11 17:20:35.929555+01
36	b4389ef7-47bd-4c44-936e-b052ef6eb03b	6410aff2-e22f-4b84-b180-ce10cfc3b53f	819f0d2f8652ac7ccad71936744d43770853d01281022ddb271328e8505221c7	2026-02-18 17:20:35.933903+01	2026-02-11 17:57:38.276985+01	2026-02-11 17:20:35.934382+01	2026-02-11 17:57:38.276985+01
37	8cc1b7c7-cb84-4aec-9550-8927dbd922f9	6410aff2-e22f-4b84-b180-ce10cfc3b53f	456c50daab95f026addd0537f23c87486b6381c89008994fe5bdad11c1f9d9dc	2026-02-18 17:57:38.278589+01	2026-02-11 17:58:39.427896+01	2026-02-11 17:57:38.278686+01	2026-02-11 17:58:39.427896+01
38	7d1c039e-b3b9-4ee5-91f8-eb1ad2ceba8a	6410aff2-e22f-4b84-b180-ce10cfc3b53f	a149a6a8d07e310430513834dace9923a481ae60474ad2f71904ae4919291773	2026-02-18 17:58:39.429157+01	2026-02-11 18:11:47.135443+01	2026-02-11 17:58:39.429404+01	2026-02-11 18:11:47.135443+01
39	3493cfae-8f80-4544-b118-3aa451e6f213	6410aff2-e22f-4b84-b180-ce10cfc3b53f	e236002db975bfc38f454e6d0246b2a608c8d7cb5af09fab96a767948d795dc6	2026-02-18 18:11:47.137867+01	2026-02-11 18:16:27.765141+01	2026-02-11 18:11:47.138344+01	2026-02-11 18:16:27.765141+01
40	884f050b-bea8-4bf0-a3ce-1431f02c6e92	6410aff2-e22f-4b84-b180-ce10cfc3b53f	bc40ddc78b219f0bf19a599182855d2fe011565d0a8c9309f3a065f08dcd2f51	2026-02-18 18:16:27.766285+01	2026-02-11 18:34:11.39265+01	2026-02-11 18:16:27.766466+01	2026-02-11 18:34:11.39265+01
41	75e8502e-9ff4-4dca-9034-2141616ea59d	6410aff2-e22f-4b84-b180-ce10cfc3b53f	6f5056778c63610c3e7cbeddd7c283e6d3c16cc464613013a4be4bea5eb4bb9d	2026-02-18 18:34:11.394377+01	2026-02-11 18:55:18.736271+01	2026-02-11 18:34:11.394504+01	2026-02-11 18:55:18.736271+01
63	ab68dbab-23cd-4214-822d-39a6d4277465	6410aff2-e22f-4b84-b180-ce10cfc3b53f	653da0a907836de42661d07a754f28b6fa8726578f5e95a7a008c90bd2e1530a	2026-02-19 09:51:05.071939+01	2026-02-12 10:06:32.948675+01	2026-02-12 09:51:05.072035+01	2026-02-12 10:06:32.948675+01
42	3deef1c2-2cc2-4b50-a071-e3769d37b25e	6410aff2-e22f-4b84-b180-ce10cfc3b53f	b2cef5130dc52febd52ed28d78c13e5389df93bbdb5861ea263cdc35e42ada78	2026-02-18 18:55:18.740708+01	2026-02-11 19:17:17.293367+01	2026-02-11 18:55:18.741178+01	2026-02-11 19:17:17.293367+01
64	c0f729dd-fdef-461e-9058-3f3cde56a575	6410aff2-e22f-4b84-b180-ce10cfc3b53f	771b44abf2991367830e22319605aec6032003b90716b07c35b8e6319a4a2955	2026-02-19 10:06:32.950201+01	2026-02-12 10:22:40.955928+01	2026-02-12 10:06:32.95046+01	2026-02-12 10:22:40.955928+01
43	25ae5aa0-c451-461a-ace3-ef016bd6c811	6410aff2-e22f-4b84-b180-ce10cfc3b53f	f69f390e4b121ccca7c407b0fa8671ef18c4de38658805b64d8ac9bfc7069743	2026-02-18 19:17:17.303967+01	2026-02-11 19:19:28.328709+01	2026-02-11 19:17:17.305636+01	2026-02-11 19:19:28.328709+01
44	9ccd150e-e6ab-4227-a134-1b1c9e7f7a5b	6410aff2-e22f-4b84-b180-ce10cfc3b53f	495f890fc6d4ccc74a5356e214d2f5345b22ee872d19829e7e280edcc63015d2	2026-02-18 19:19:28.330019+01	2026-02-11 19:40:30.92657+01	2026-02-11 19:19:28.330228+01	2026-02-11 19:40:30.92657+01
65	5823aa1d-923d-425e-9356-823759470e53	6410aff2-e22f-4b84-b180-ce10cfc3b53f	34204e5f386f74083a82e1a4821c6218dd057e50ebf8eed9da6367f8dba554e6	2026-02-19 10:22:40.960673+01	2026-02-12 10:39:11.948742+01	2026-02-12 10:22:40.961106+01	2026-02-12 10:39:11.948742+01
45	3e852064-9b7f-4dd7-8bf6-39b1c13904ea	6410aff2-e22f-4b84-b180-ce10cfc3b53f	253b7662a89271ff1ba14f0ca6116c40e09c4dc61654bc0796ccd109a0175c80	2026-02-18 19:40:30.929394+01	2026-02-11 19:43:02.644513+01	2026-02-11 19:40:30.929504+01	2026-02-11 19:43:02.644513+01
46	eb98813c-67c5-4635-85d3-9332825e48e5	6410aff2-e22f-4b84-b180-ce10cfc3b53f	8fa8e4159b9a8c6fce35c863da80ffc10a42e757de293ebfc4083ee15c1bc380	2026-02-18 19:43:02.646037+01	2026-02-11 19:45:32.301814+01	2026-02-11 19:43:02.646206+01	2026-02-11 19:45:32.301814+01
66	a732791d-ef15-4a31-a22a-55ac1111f83b	6410aff2-e22f-4b84-b180-ce10cfc3b53f	4673eccaa259b3b6d9a74a3026d88b044e187216cb2d7055b3cc2de003008f63	2026-02-19 10:39:11.952985+01	2026-02-12 10:57:57.863043+01	2026-02-12 10:39:11.953159+01	2026-02-12 10:57:57.863043+01
47	ecfcc629-3f5b-4de1-90ac-8817a9bc3f86	6410aff2-e22f-4b84-b180-ce10cfc3b53f	66f8ac75d419b6590e3e1569fe3e8fefb6b45e34aba5de6aa03aa3cffb6f2646	2026-02-18 19:45:32.302806+01	2026-02-11 20:14:30.586187+01	2026-02-11 19:45:32.303071+01	2026-02-11 20:14:30.586187+01
67	ba2dd5a1-48d3-4da3-bdfc-341ead1dcb41	6410aff2-e22f-4b84-b180-ce10cfc3b53f	1a5da1365de4a4de67bb12ebd6972c538f053e16578c226fd86c97de7a01b67a	2026-02-19 10:57:57.864699+01	2026-02-12 11:09:19.221572+01	2026-02-12 10:57:57.865114+01	2026-02-12 11:09:19.221572+01
49	54f57243-6c3b-49e5-808b-60e896bd641a	6410aff2-e22f-4b84-b180-ce10cfc3b53f	808c1a57d5ec728be33b0f1a732a8ca285e6088b20625fd1eda111929afbd01c	2026-02-18 20:20:14.009146+01	2026-02-11 20:20:28.351402+01	2026-02-11 20:20:14.009476+01	2026-02-11 20:20:28.351402+01
68	3d55befc-96ed-4095-a549-7ce7b7a214f2	6410aff2-e22f-4b84-b180-ce10cfc3b53f	140f38b8319feeaaec2aca9706c8ef8820b60b8818b606f6a1bb4b9428a94323	2026-02-19 11:09:19.223593+01	2026-02-12 11:19:09.853243+01	2026-02-12 11:09:19.223767+01	2026-02-12 11:19:09.853243+01
48	7c44b3e8-1f31-44c9-9093-47dc3152017e	6410aff2-e22f-4b84-b180-ce10cfc3b53f	cd31bfc5016434852fb7862a0eb36250c5c00be3abd4b81835908d08fb22a0c1	2026-02-18 20:14:30.590539+01	2026-02-11 20:22:05.990866+01	2026-02-11 20:14:30.590715+01	2026-02-11 20:22:05.990866+01
50	93eea97d-6549-4566-84d1-071c1ca3d2e5	6410aff2-e22f-4b84-b180-ce10cfc3b53f	92409a0ff5eb2fa1621189402dbac24e24f695c0b1395aef6dd5c1ef61380d1c	2026-02-18 20:20:28.352501+01	2026-02-11 20:22:15.101833+01	2026-02-11 20:20:28.352588+01	2026-02-11 20:22:15.101833+01
51	04fc9077-715e-484d-895c-1fdeedfbdbaf	6410aff2-e22f-4b84-b180-ce10cfc3b53f	316e7dbc8fc347f5865806c782106b63b7bcd1c2c902d486d1f7080644f381c9	2026-02-18 20:22:15.105545+01	2026-02-11 20:37:19.464877+01	2026-02-11 20:22:15.105783+01	2026-02-11 20:37:19.464877+01
69	27d69d42-9dfc-408e-909d-392944048687	6410aff2-e22f-4b84-b180-ce10cfc3b53f	eb035936a8b654ccd8dbaf97babd5d6467ab4591193c530e5d0debb0a3805cb1	2026-02-19 11:19:09.854567+01	2026-02-12 11:22:48.251416+01	2026-02-12 11:19:09.85465+01	2026-02-12 11:22:48.251416+01
52	4b88d3c6-ba34-41bd-8935-ed752c4ee09c	6410aff2-e22f-4b84-b180-ce10cfc3b53f	0e67e961f690563758f29b40fa33f887c52d4d969c3bae24a41d4f1d6e3612c6	2026-02-18 20:37:19.471879+01	2026-02-11 20:40:20.12921+01	2026-02-11 20:37:19.472445+01	2026-02-11 20:40:20.12921+01
53	7a74cc76-e48d-422e-9a84-eb4c7ba9d449	6410aff2-e22f-4b84-b180-ce10cfc3b53f	13c676476776eaffc24ebc2a14c7801a4419cea499b0d5dcb0f17d598baf03d0	2026-02-18 20:40:33.205117+01	2026-02-11 21:01:54.737617+01	2026-02-11 20:40:33.205259+01	2026-02-11 21:01:54.737617+01
70	06824d55-5b2d-4407-a6b7-e67d8c82a046	6410aff2-e22f-4b84-b180-ce10cfc3b53f	85bc250d1a53ea8243fc9a2b5319c989e90b0e92d1faf590cc3993e91a576bb7	2026-02-19 11:22:48.253358+01	2026-02-12 11:23:13.985948+01	2026-02-12 11:22:48.253851+01	2026-02-12 11:23:13.985948+01
54	aac99bcf-64e2-440e-a84b-dde2206d4dab	6410aff2-e22f-4b84-b180-ce10cfc3b53f	f17a6a1608751365a29b9c53078b0fe423eba2ab3b5465b1da755e76275d4a62	2026-02-18 21:01:54.739872+01	2026-02-11 21:19:10.148781+01	2026-02-11 21:01:54.740004+01	2026-02-11 21:19:10.148781+01
55	60fa2b0b-74e9-4cc5-a015-cc2060ea28c2	6410aff2-e22f-4b84-b180-ce10cfc3b53f	ce8fcc7a1812d73e523ec09001a6d060ac3f34643a172b0de17bd3ee2890849e	2026-02-18 21:19:10.152709+01	2026-02-11 21:49:03.275943+01	2026-02-11 21:19:10.15286+01	2026-02-11 21:49:03.275943+01
71	817ee3e6-06e9-4bf5-823c-510b3b917989	6410aff2-e22f-4b84-b180-ce10cfc3b53f	d0bcaca42bedad82fa489be1f7d3e2fdc6b94dab521121a4d041b6c257b41696	2026-02-19 11:24:27.629418+01	2026-02-12 11:39:43.406267+01	2026-02-12 11:24:27.62953+01	2026-02-12 11:39:43.406267+01
56	62522845-8ce9-4ad9-9b3c-8ecf48465443	6410aff2-e22f-4b84-b180-ce10cfc3b53f	552a8a6c70c79967916646b1d9c67524b35098e2130431b184bd9bd72c277c07	2026-02-18 21:49:03.283749+01	2026-02-11 22:06:59.34928+01	2026-02-11 21:49:03.286048+01	2026-02-11 22:06:59.34928+01
57	b77cb01b-1198-4e7b-9950-ccafe12c48ac	6410aff2-e22f-4b84-b180-ce10cfc3b53f	1989700ac95e8b5ea6c99a0a5f59e3682acbab6c844cc43ca0f30acce601df62	2026-02-18 22:06:59.354582+01	2026-02-12 08:32:06.73989+01	2026-02-11 22:06:59.35481+01	2026-02-12 08:32:06.73989+01
72	a5b5a837-4474-4b6f-bf6b-ba72fbed21e4	6410aff2-e22f-4b84-b180-ce10cfc3b53f	206c8db5d7ebc2b6bb990d76047ca9a7eeb16f4273dff82c769db5036847c467	2026-02-19 11:39:43.408036+01	2026-02-12 11:55:12.920181+01	2026-02-12 11:39:43.40843+01	2026-02-12 11:55:12.920181+01
58	d5b3d0e3-a859-4655-a24c-bafd1f159a44	6410aff2-e22f-4b84-b180-ce10cfc3b53f	46ac82298859f1033bb9ed1cfe2087a2d1216e42c7212e5c18c8088eb6fa5cbc	2026-02-19 08:32:06.747967+01	2026-02-12 08:47:12.027093+01	2026-02-12 08:32:06.749408+01	2026-02-12 08:47:12.027093+01
59	7c718f4a-7121-4cb9-821c-f4f6e0360d60	6410aff2-e22f-4b84-b180-ce10cfc3b53f	1d76e7f78d04f0375bf7bd0f5d136eb29c7202009c18494141ddc015aea6dda6	2026-02-19 08:47:12.030332+01	2026-02-12 09:02:13.381084+01	2026-02-12 08:47:12.030616+01	2026-02-12 09:02:13.381084+01
73	a3c13fc4-a9e5-462f-ade4-bbad8e600eed	6410aff2-e22f-4b84-b180-ce10cfc3b53f	4e510083aed3faab5d4c7a5b5d10051b005fc8bddd4db4cba5d0414f6566312c	2026-02-19 11:55:12.923506+01	2026-02-12 12:17:44.769556+01	2026-02-12 11:55:12.923602+01	2026-02-12 12:17:44.769556+01
60	66d15222-cdaa-4b93-b202-1f22091f9352	6410aff2-e22f-4b84-b180-ce10cfc3b53f	946f0397b4cc9973642343e6bba71750f7465114a9828402cc98cd14146341f2	2026-02-19 09:02:13.385461+01	2026-02-12 09:18:47.578187+01	2026-02-12 09:02:13.385755+01	2026-02-12 09:18:47.578187+01
61	7126e1f9-968e-426c-b842-321009a95b64	6410aff2-e22f-4b84-b180-ce10cfc3b53f	e02253e8d3b578ba1447cde9ae433e1cc5de44784ce3e9af0142ee54ecb125fb	2026-02-19 09:18:47.583315+01	2026-02-12 09:34:21.807251+01	2026-02-12 09:18:47.583576+01	2026-02-12 09:34:21.807251+01
74	0a75e23a-e6c6-4e3e-9a69-a13e80f26cc7	6410aff2-e22f-4b84-b180-ce10cfc3b53f	5eb78490c43acc8f447013802c161e77acc9f9ecd9b607b84aa2e077a5a0cb88	2026-02-19 12:17:44.77408+01	2026-02-12 12:59:20.815654+01	2026-02-12 12:17:44.774185+01	2026-02-12 12:59:20.815654+01
62	f1251e2a-e63a-49b4-8b52-0d7bedda5a63	6410aff2-e22f-4b84-b180-ce10cfc3b53f	127d7a72aa6a8deea1ed6da399651172b8ede2b90bc741f5a5721750c643c939	2026-02-19 09:34:21.814131+01	2026-02-12 09:51:05.068254+01	2026-02-12 09:34:21.815848+01	2026-02-12 09:51:05.068254+01
75	5cbc3686-aa80-4376-b536-740bba27d0c9	6410aff2-e22f-4b84-b180-ce10cfc3b53f	545c55556a34785c374e27ea24f5c075d73cb78fe4d439425fa9725059add1c3	2026-02-19 12:59:20.821348+01	2026-02-12 13:26:20.894699+01	2026-02-12 12:59:20.821677+01	2026-02-12 13:26:20.894699+01
76	d147548d-8c75-4c5d-8ec2-fd1ab1def2cf	6410aff2-e22f-4b84-b180-ce10cfc3b53f	c49517878592a61ab73cf747b69df879b62ac2d8635508d4d9990abe4b82c51c	2026-02-19 13:26:20.897928+01	2026-02-12 13:43:10.00454+01	2026-02-12 13:26:20.898075+01	2026-02-12 13:43:10.00454+01
77	5654d3ee-a3f3-49e7-8d56-cb9a0d01b4f7	6410aff2-e22f-4b84-b180-ce10cfc3b53f	a859394d7a7991156835bbd7b0049353d35650bd81bb27695850b83b7bab7969	2026-02-19 13:43:10.006188+01	2026-02-12 14:07:45.058451+01	2026-02-12 13:43:10.006386+01	2026-02-12 14:07:45.058451+01
78	697490fe-3c13-4889-b9b8-5e42949bf3a2	6410aff2-e22f-4b84-b180-ce10cfc3b53f	32280e2bbd90df0cc9d5c41599bb711cd64377b2150c9e01a1737420b5df2d73	2026-02-19 14:07:45.06026+01	2026-02-12 14:15:54.979351+01	2026-02-12 14:07:45.060672+01	2026-02-12 14:15:54.979351+01
79	083dd42d-7bb4-430c-9001-d8b8340ca20f	6410aff2-e22f-4b84-b180-ce10cfc3b53f	0b37f396a1e1e63eabb44452e8d3d8a10d0d55aa82a2701ade032eb2cf3d646d	2026-02-19 14:17:13.317347+01	2026-02-12 14:32:24.288304+01	2026-02-12 14:17:13.317484+01	2026-02-12 14:32:24.288304+01
80	e58602d9-db35-4e4a-9652-27b1f3e208e8	6410aff2-e22f-4b84-b180-ce10cfc3b53f	6bfae64cbc335f852fb2eb50857442e4aaddcaac1550990e66ca2d9d079379e7	2026-02-19 14:32:54.326823+01	2026-02-12 14:35:16.813449+01	2026-02-12 14:32:54.327003+01	2026-02-12 14:35:16.813449+01
81	bbe96015-5451-4eae-bbb1-1ab7f8d58032	6410aff2-e22f-4b84-b180-ce10cfc3b53f	1bbc5ffe877486a6141267835eb52284cef03050d9d905fdadb51a31952bed8f	2026-02-19 14:35:16.81473+01	2026-02-12 14:52:26.331896+01	2026-02-12 14:35:16.814838+01	2026-02-12 14:52:26.331896+01
82	ed0e187e-430b-4e9b-ba80-b8bf24679063	6410aff2-e22f-4b84-b180-ce10cfc3b53f	91d9e4f65e3080e505fa34012101348ca9849a51f43e0078217f1f43d25fbc72	2026-02-19 14:52:26.334106+01	2026-02-12 15:07:52.992372+01	2026-02-12 14:52:26.334195+01	2026-02-12 15:07:52.992372+01
83	e18ed3b8-ee53-41a0-9af2-c07d667423d0	6410aff2-e22f-4b84-b180-ce10cfc3b53f	b0c67e2ad5027ee7d6725247e1a2e72942acacb8b3a435d79ad9c15e8dd46cf0	2026-02-19 15:07:52.995854+01	2026-02-12 15:24:19.494725+01	2026-02-12 15:07:52.996213+01	2026-02-12 15:24:19.494725+01
137	5948eb6b-2b80-4bd9-918e-0c3de879ec74	20f171bc-56ee-4eaa-bb79-483d5a276893	206db17839349fdfe7560408665f9fab71189f964047be7fc090636a4f480e5a	2026-02-22 15:16:31.17481+01	2026-02-15 15:21:01.872943+01	2026-02-15 15:16:31.175186+01	2026-02-15 15:21:01.872943+01
84	4b6c0c28-2b57-4184-a5aa-7223b7853eff	6410aff2-e22f-4b84-b180-ce10cfc3b53f	44c37f9f2b69b53e43dd73e31392c99e8267306adb351a5d2a2607a28ab08540	2026-02-19 15:24:19.497456+01	2026-02-13 11:55:30.265516+01	2026-02-12 15:24:19.497896+01	2026-02-13 11:55:30.265516+01
85	253d55a2-646a-4f95-9548-866edb48aa59	6410aff2-e22f-4b84-b180-ce10cfc3b53f	9205f4e281a181e3b9723dccf22624851adbfadf106fb9de37317c75075173a2	2026-02-20 11:55:30.273623+01	2026-02-13 12:11:03.92571+01	2026-02-13 11:55:30.274804+01	2026-02-13 12:11:03.92571+01
86	ae2d81fe-674a-4de6-b3a6-67d38ba5427e	6410aff2-e22f-4b84-b180-ce10cfc3b53f	7d54985deb5c7b1071873e34c8757819d16eb7512357cc5221db1999246a5397	2026-02-20 12:11:03.927218+01	2026-02-13 12:27:14.845592+01	2026-02-13 12:11:03.92761+01	2026-02-13 12:27:14.845592+01
87	d9f8e238-30d5-4e53-bb36-d27830744431	6410aff2-e22f-4b84-b180-ce10cfc3b53f	4b44f01689645f5fac639897e43af47afded69eee8af77f33bd38eb22b67ba21	2026-02-20 12:27:14.848885+01	2026-02-13 13:52:08.644812+01	2026-02-13 12:27:14.849412+01	2026-02-13 13:52:08.644812+01
88	7def49ea-873e-4738-b89f-81ccfded2e84	6410aff2-e22f-4b84-b180-ce10cfc3b53f	3da0836d068a3bf1c73afd60397b5f8ff0d2f8b18586db11772770738801da07	2026-02-20 13:52:08.647835+01	2026-02-13 14:12:05.169164+01	2026-02-13 13:52:08.648239+01	2026-02-13 14:12:05.169164+01
89	b8536a11-2b7d-4b46-9fa1-3a11013b2921	6410aff2-e22f-4b84-b180-ce10cfc3b53f	585486b18f611a81e480cb7ccd35309eb6e7905f02b9b814c7840cb47cd7fc19	2026-02-20 14:12:05.170732+01	2026-02-13 14:47:43.68828+01	2026-02-13 14:12:05.170878+01	2026-02-13 14:47:43.68828+01
90	8c4d2e19-dba5-4f81-bcda-0329c24804a9	6410aff2-e22f-4b84-b180-ce10cfc3b53f	581d9ca3fae9dedeb131dac588d4bae9cb91798202c0bc23a85554417fd75367	2026-02-20 14:47:43.69029+01	2026-02-13 15:10:53.765546+01	2026-02-13 14:47:43.690796+01	2026-02-13 15:10:53.765546+01
91	90e535d1-4e1b-415c-bbc1-b0d7a1eb16fd	6410aff2-e22f-4b84-b180-ce10cfc3b53f	e34942e39b8f0d17c3fe9c6160c46ca793fac8287e169c956a2664483ae274b6	2026-02-20 15:10:53.76973+01	2026-02-13 15:19:04.163876+01	2026-02-13 15:10:53.770212+01	2026-02-13 15:19:04.163876+01
92	969767bb-4cfa-43ac-947b-2ab12d264d1f	6410aff2-e22f-4b84-b180-ce10cfc3b53f	a58aa7964049ac12eed2882024dec52a1f6c8ab165afcef253f825a7905fc564	2026-02-20 15:19:04.165589+01	2026-02-13 15:26:48.87593+01	2026-02-13 15:19:04.165707+01	2026-02-13 15:26:48.87593+01
93	fbca2c4d-fa20-4f42-ad87-e51d514e1fef	6410aff2-e22f-4b84-b180-ce10cfc3b53f	74c7814b6d8b9da5e8345f27d9a8f6c8ef5d3e55b7dca0534c4be78549dbbbc8	2026-02-20 15:26:48.878435+01	2026-02-13 15:41:18.414048+01	2026-02-13 15:26:48.878918+01	2026-02-13 15:41:18.414048+01
94	225bf4e9-2582-4519-a1ea-e2e716b0e595	6410aff2-e22f-4b84-b180-ce10cfc3b53f	26f3ee47d98bbe0813e58209e2eff9a1687e095a0000232522e8649ea1861dc2	2026-02-20 15:41:18.417516+01	2026-02-13 15:44:02.895759+01	2026-02-13 15:41:18.417848+01	2026-02-13 15:44:02.895759+01
95	b7115f40-30b3-44be-8678-b0db48fead3a	6410aff2-e22f-4b84-b180-ce10cfc3b53f	d3eb874f4edebe44f3328b52d5eeec2dd8b83313d07a5eca7f61cbed5a43b49b	2026-02-20 15:44:02.896886+01	2026-02-13 16:00:10.94789+01	2026-02-13 15:44:02.89709+01	2026-02-13 16:00:10.94789+01
96	18c3f250-3089-4f88-86ff-c7df8aa91d23	6410aff2-e22f-4b84-b180-ce10cfc3b53f	af807aaa00eaad4dfa02eb76228787a417eda36bc7f83f66caea7ea0b59f63fd	2026-02-20 16:00:10.949276+01	2026-02-13 16:16:33.4956+01	2026-02-13 16:00:10.949458+01	2026-02-13 16:16:33.4956+01
97	68244077-1e7b-4883-bce0-3f833f95c6e7	6410aff2-e22f-4b84-b180-ce10cfc3b53f	63de71ff203b11f7ade818ca63ff59b20e34623edbb3bbcd28787fc732305b81	2026-02-20 16:16:33.498085+01	2026-02-13 16:31:45.445507+01	2026-02-13 16:16:33.49817+01	2026-02-13 16:31:45.445507+01
98	b38c72de-84de-47b6-a0d2-61c6c4b09ba0	6410aff2-e22f-4b84-b180-ce10cfc3b53f	cdd441a54be53110ea8ac090b83f677ddfbf6cd086aca62c581744d136a87fab	2026-02-20 16:31:45.449597+01	2026-02-13 16:47:52.733696+01	2026-02-13 16:31:45.449826+01	2026-02-13 16:47:52.733696+01
99	73df3124-e1c0-488c-af5b-b350663cfa74	6410aff2-e22f-4b84-b180-ce10cfc3b53f	b2a67edd1079f675211f1bf2438ac3fb3337cfa0680a154578599b769b69961f	2026-02-20 16:47:52.73875+01	2026-02-13 17:02:52.013259+01	2026-02-13 16:47:52.739087+01	2026-02-13 17:02:52.013259+01
100	76ff7f8a-4b83-47cd-bd99-3cd1bdd6b53e	6410aff2-e22f-4b84-b180-ce10cfc3b53f	2b5721e301e342794960dec15eaca480effa227e5f44b4786dd436e905cc696f	2026-02-20 17:02:52.017887+01	2026-02-13 17:23:25.560216+01	2026-02-13 17:02:52.018244+01	2026-02-13 17:23:25.560216+01
101	04e0214f-4167-47d6-9851-d7e9ac1441cd	6410aff2-e22f-4b84-b180-ce10cfc3b53f	8b5c1e7c0651df39cece01d5662ba597c79bd47a3ad488ed8566beae1a0f230e	2026-02-20 17:23:25.56297+01	2026-02-13 17:24:00.556926+01	2026-02-13 17:23:25.563057+01	2026-02-13 17:24:00.556926+01
102	5a24db22-42ea-406e-883b-36ed5a5510c5	6410aff2-e22f-4b84-b180-ce10cfc3b53f	a413076e258efcc6772d3ee83e9babed4c4a5e9b2f2b11d49f0176dc2e204ef6	2026-02-20 17:24:08.296893+01	2026-02-13 17:41:48.748099+01	2026-02-13 17:24:08.297006+01	2026-02-13 17:41:48.748099+01
103	200ce2aa-90fc-4068-9d50-2e7dda86bbeb	6410aff2-e22f-4b84-b180-ce10cfc3b53f	57254df80774b5bcf400af3dc5ef994cf71543e934cb373a7af4dd4411adf29f	2026-02-20 17:41:48.752308+01	2026-02-13 17:57:35.520737+01	2026-02-13 17:41:48.752631+01	2026-02-13 17:57:35.520737+01
104	bfeff814-33bf-4291-b334-0bc328b1a134	6410aff2-e22f-4b84-b180-ce10cfc3b53f	ea09b4ac4197e8bfd427dae6b8aba57659f25aa6e88d6a2dc7660f484b7a2095	2026-02-20 17:57:35.52409+01	2026-02-13 19:15:52.726097+01	2026-02-13 17:57:35.524213+01	2026-02-13 19:15:52.726097+01
105	7e01774c-cf4e-486e-b2d4-39a49c18712e	6410aff2-e22f-4b84-b180-ce10cfc3b53f	50f992c233928c7afb95e3bed329a55edd65bac2828c1f87fcd8ac8d2b1d6600	2026-02-20 19:15:52.730065+01	2026-02-13 19:47:35.865603+01	2026-02-13 19:15:52.730262+01	2026-02-13 19:47:35.865603+01
106	d1a14e0f-f9d2-4eb5-9c25-9f72e05fa5f7	6410aff2-e22f-4b84-b180-ce10cfc3b53f	39206ea3e636685d4c23488de8faa94363eb4e17596d614a43bd34d339187c4c	2026-02-20 19:47:35.868201+01	2026-02-13 20:11:03.524981+01	2026-02-13 19:47:35.868281+01	2026-02-13 20:11:03.524981+01
107	6c49c322-5399-4a18-bf41-30b821c51aa3	6410aff2-e22f-4b84-b180-ce10cfc3b53f	2d9e3697f8fa78b93345589c13caaf417aae8bf068d5d8e63c9cca13f7b1ce35	2026-02-20 20:11:03.528047+01	2026-02-13 20:26:24.765722+01	2026-02-13 20:11:03.528149+01	2026-02-13 20:26:24.765722+01
108	f99d9b49-26bb-4595-843c-3c7ed6a82879	6410aff2-e22f-4b84-b180-ce10cfc3b53f	e9156d29fd2be7df09455f2855af7cb90f3b0e35c1e1ab63483902f6d9222316	2026-02-20 20:26:24.76734+01	2026-02-13 20:56:05.765559+01	2026-02-13 20:26:24.767804+01	2026-02-13 20:56:05.765559+01
109	541c3a09-5196-48b1-8e39-34544870990c	6410aff2-e22f-4b84-b180-ce10cfc3b53f	0ebb7ca68e9b5ab11a352fa63752ae7ee01c3f01731351fc509c2f6132bdc943	2026-02-20 20:56:05.76847+01	2026-02-13 21:11:50.750597+01	2026-02-13 20:56:05.768549+01	2026-02-13 21:11:50.750597+01
110	b4f1991b-681d-440c-91b4-62f3308e26a2	6410aff2-e22f-4b84-b180-ce10cfc3b53f	88d9814eef0200a4c9f8bb42cc31fec08c577d0e8c2a4ace3c6284382c5d9ab0	2026-02-20 21:11:50.754725+01	2026-02-13 21:21:16.092179+01	2026-02-13 21:11:50.75482+01	2026-02-13 21:21:16.092179+01
111	d50a83ac-5667-4469-8b30-9dbbf38ec960	6410aff2-e22f-4b84-b180-ce10cfc3b53f	6fda8a78a92bfc22f38d5d65db76c3f57e1afe3f36ea0331c5c5d31f4d129b27	2026-02-20 21:21:50.984068+01	2026-02-13 21:22:13.487588+01	2026-02-13 21:21:50.984449+01	2026-02-13 21:22:13.487588+01
112	8578eb26-9b87-49ca-862d-66478aa93469	6410aff2-e22f-4b84-b180-ce10cfc3b53f	1b5c48a3cc3d2efc81234a47342604ead38ae74c98d25017846672f9ef7138c0	2026-02-20 21:22:30.412975+01	2026-02-13 21:22:33.961569+01	2026-02-13 21:22:30.413169+01	2026-02-13 21:22:33.961569+01
113	bce2f891-c3ae-4bed-9718-9881108347d1	6410aff2-e22f-4b84-b180-ce10cfc3b53f	5b91903bc61b653da838ba8058317d27eb9059e4c71c27ab3de3db6586981340	2026-02-20 21:22:42.276599+01	2026-02-13 21:29:03.007219+01	2026-02-13 21:22:42.276828+01	2026-02-13 21:29:03.007219+01
114	83d7b95d-2bda-4acd-9427-e8b64aa58e88	6410aff2-e22f-4b84-b180-ce10cfc3b53f	88d634fab58b69daf0349e2eecb39024672052d341207c569dceeb225d67179a	2026-02-20 22:26:41.132412+01	2026-02-13 22:50:16.490749+01	2026-02-13 22:26:41.132757+01	2026-02-13 22:50:16.490749+01
115	f7e62e0b-6d30-4eaa-b151-c349a74169bf	6410aff2-e22f-4b84-b180-ce10cfc3b53f	6a6efad6d2dde243b44d5e8418ac448acc3dbf9cea12c5b01956f4928b5aa983	2026-02-20 22:50:16.493013+01	2026-02-13 23:11:51.09722+01	2026-02-13 22:50:16.49357+01	2026-02-13 23:11:51.09722+01
116	1f7098c2-2dfd-4b3e-b5b1-6daa41f156c7	6410aff2-e22f-4b84-b180-ce10cfc3b53f	c1f07dfa39803008e12d3dd55f4095a0c27bb9083b7d3dc89114df368ae5d0c2	2026-02-20 23:11:51.100129+01	2026-02-14 09:33:42.421864+01	2026-02-13 23:11:51.1005+01	2026-02-14 09:33:42.421864+01
117	8dc17e2a-7167-4d31-991b-aa1f8aa22872	6410aff2-e22f-4b84-b180-ce10cfc3b53f	8613f0a71223cee298c077cf005a1ee1c1c00849da1e651a50b05be1450cff7d	2026-02-21 09:33:42.428466+01	2026-02-14 09:57:17.728251+01	2026-02-14 09:33:42.429553+01	2026-02-14 09:57:17.728251+01
118	fe3e636f-7ed8-45b3-ae22-7f1716538b17	6410aff2-e22f-4b84-b180-ce10cfc3b53f	ea72dc268388948f20f467ac10416e0cbc805f2412937604ae92bdec2404d633	2026-02-21 09:57:17.729709+01	2026-02-14 10:12:31.796796+01	2026-02-14 09:57:17.729829+01	2026-02-14 10:12:31.796796+01
119	2a145b1a-f1d2-4490-930c-7c69fed7be23	6410aff2-e22f-4b84-b180-ce10cfc3b53f	4948261f4d68d1a7767762adaa01b84eee74647c02cf8b33a880fe888658d7c5	2026-02-21 10:12:31.798688+01	2026-02-14 10:28:44.210524+01	2026-02-14 10:12:31.798804+01	2026-02-14 10:28:44.210524+01
120	a9b5fbcd-0f57-4479-92e7-23ddfc6c765f	6410aff2-e22f-4b84-b180-ce10cfc3b53f	92328fb9d35fd2a1beecaf4881e6a5479dd6150da9b7b45bac84d08ac18d4e3f	2026-02-21 10:28:44.227763+01	2026-02-14 10:38:01.180591+01	2026-02-14 10:28:44.227851+01	2026-02-14 10:38:01.180591+01
121	047799dc-0b52-4f55-bdb3-71f537a9b056	6410aff2-e22f-4b84-b180-ce10cfc3b53f	8d2387ccb6e123f061f6703de257a51e8b6939fe1af3e7ec1fb6ebc1b6410028	2026-02-21 10:38:01.184643+01	2026-02-14 10:55:13.792763+01	2026-02-14 10:38:01.185355+01	2026-02-14 10:55:13.792763+01
122	dd282db0-cb38-49b5-a8e6-8bec05b587fe	6410aff2-e22f-4b84-b180-ce10cfc3b53f	48adfbc5ca9e77d62e7615e4e39f45fd2c3d16c03a7c8ee320ef736e8ebb11b0	2026-02-21 10:55:13.796119+01	2026-02-14 11:10:22.123267+01	2026-02-14 10:55:13.796803+01	2026-02-14 11:10:22.123267+01
123	1d4f6ea1-bf90-45bf-9bea-2d92db1ba23a	6410aff2-e22f-4b84-b180-ce10cfc3b53f	9767516d44d541674db2781b43bdf48bb6de4665c5af96f412feb6df584257ef	2026-02-21 11:10:22.125085+01	2026-02-14 11:30:07.465518+01	2026-02-14 11:10:22.125595+01	2026-02-14 11:30:07.465518+01
124	db2b0937-a6b7-433a-bfea-9c92f520e9b0	6410aff2-e22f-4b84-b180-ce10cfc3b53f	98d7a109dfc71da16e2efb65b7fc0ff120d761438a3933a79f1a36740a13cf98	2026-02-21 11:30:07.467947+01	2026-02-14 11:39:08.255915+01	2026-02-14 11:30:07.468368+01	2026-02-14 11:39:08.255915+01
125	7bc4f29d-f809-4415-84ca-82c23174c5a1	6410aff2-e22f-4b84-b180-ce10cfc3b53f	21248dd09e89ddb203323817d8d3996aeb99d76d73d56a8438fe4ba050908be1	2026-02-21 11:39:08.258074+01	2026-02-14 11:55:23.723767+01	2026-02-14 11:39:08.258379+01	2026-02-14 11:55:23.723767+01
138	8d1fbdc5-9b3a-4750-83c4-4c793a43929f	20f171bc-56ee-4eaa-bb79-483d5a276893	4580306062cd34e97ee532b769be92d543198eb5935f4f3dd849e883d53d8628	2026-02-22 15:21:01.874866+01	2026-02-15 15:43:59.617783+01	2026-02-15 15:21:01.874961+01	2026-02-15 15:43:59.617783+01
126	51f1a931-54df-439f-b086-9fe7c05b09c7	6410aff2-e22f-4b84-b180-ce10cfc3b53f	d86cc686b9b6d0b437600851abfb4daa67ea3e2e2299942005aea9a1b8fafcfd	2026-02-21 11:55:23.728782+01	2026-02-14 12:17:28.758532+01	2026-02-14 11:55:23.72888+01	2026-02-14 12:17:28.758532+01
127	6d85bb2b-5284-4420-b764-17a4989ccd01	6410aff2-e22f-4b84-b180-ce10cfc3b53f	4b1c5126dcb9d664d69a3b4d2fd3cc0735a61f1be37381c8e8ec0a1e0b2ecc3a	2026-02-21 12:17:28.763261+01	2026-02-14 12:37:27.687296+01	2026-02-14 12:17:28.763418+01	2026-02-14 12:37:27.687296+01
136	21cf1504-dc6d-401d-8a9d-55aafa998d3e	6410aff2-e22f-4b84-b180-ce10cfc3b53f	2726283ed5e68abd2e0da6e47904e7fb960ed3367764f017d6eb8288d7d78956	2026-02-22 14:41:40.017947+01	2026-02-15 16:09:33.548231+01	2026-02-15 14:41:40.018556+01	2026-02-15 16:09:33.548231+01
128	1d9ff49f-6994-4a87-bc8a-3ee5a3052f01	6410aff2-e22f-4b84-b180-ce10cfc3b53f	3649236991523d8b20587604bad1e9c4a6a75c85d4a9b2fede8a9140e4adba70	2026-02-21 12:37:27.689629+01	2026-02-14 12:57:39.388592+01	2026-02-14 12:37:27.689698+01	2026-02-14 12:57:39.388592+01
129	3c3e7428-361f-4e5b-958f-ca8d9b820b4f	6410aff2-e22f-4b84-b180-ce10cfc3b53f	c0ac640e4a7f89c45445fd62c73832ab66bdf68a204389004f4a27dee31e2d04	2026-02-21 12:57:39.391921+01	2026-02-14 13:14:22.077373+01	2026-02-14 12:57:39.392243+01	2026-02-14 13:14:22.077373+01
140	acb0470f-8390-487d-a57e-dd35c275df3d	6410aff2-e22f-4b84-b180-ce10cfc3b53f	f0289a9768d264a201bbf3c3ab40f51a1da61c454de19b7916592b7deb6c1953	2026-02-22 16:09:33.551403+01	2026-02-15 17:53:15.789806+01	2026-02-15 16:09:33.551883+01	2026-02-15 17:53:15.789806+01
130	2b89c72e-27af-4770-91a5-be243359547b	6410aff2-e22f-4b84-b180-ce10cfc3b53f	fc04958e33d6422b89ed40a47500ebde0f5127ca3be82ba22c116af5484d9761	2026-02-21 13:14:22.08077+01	2026-02-14 13:27:15.644429+01	2026-02-14 13:14:22.080858+01	2026-02-14 13:27:15.644429+01
131	26ca20df-a5c8-4eec-8592-55d59605e8bc	6410aff2-e22f-4b84-b180-ce10cfc3b53f	a829214beb92eccbaad9f334210454fa3415e7e49b3683f45f46e25a0b5d1973	2026-02-21 13:27:15.647504+01	2026-02-14 13:29:47.82219+01	2026-02-14 13:27:15.647683+01	2026-02-14 13:29:47.82219+01
139	de9a6d8d-e915-4653-8157-aabc47a3a0d9	20f171bc-56ee-4eaa-bb79-483d5a276893	f431c596d88155ecae29816a8f9ff4d2142579707a5d8ac27a84d314b275b3d8	2026-02-22 15:43:59.620725+01	2026-02-15 17:53:43.098151+01	2026-02-15 15:43:59.621512+01	2026-02-15 17:53:43.098151+01
132	b48c8a4a-9f15-4997-a799-3eb22147a9f1	6410aff2-e22f-4b84-b180-ce10cfc3b53f	bfa2a4a1efd95731f489ab956feb4c51887bd153ef93bb2936e3172a34645a26	2026-02-21 13:29:47.823738+01	2026-02-14 13:53:00.405304+01	2026-02-14 13:29:47.823911+01	2026-02-14 13:53:00.405304+01
133	aab789fe-10c8-4989-a4bd-10b916a9ad04	6410aff2-e22f-4b84-b180-ce10cfc3b53f	771367ab529de6e10c7f14efa49a619e7426980f9625b468436c0bab31f0e67b	2026-02-21 13:53:00.407736+01	2026-02-14 14:08:47.178175+01	2026-02-14 13:53:00.408198+01	2026-02-14 14:08:47.178175+01
142	090571ee-dbc3-4a53-a9b5-a882b5a2ce58	20f171bc-56ee-4eaa-bb79-483d5a276893	6fa00db4b62ea14cc048cd8b93bcea9516d3fcc5dc7bbbfef64e8f3dc917a1a3	2026-02-22 17:53:43.099877+01	2026-02-15 18:19:15.88211+01	2026-02-15 17:53:43.09996+01	2026-02-15 18:19:15.88211+01
135	f58945f4-7006-4475-9644-599a77aeaf7e	3f4b1d1a-8eab-4fe3-aa4d-6ffaddec1563	d60174303ff801aa3fa8dc379ed095ceb0bad95ffff12a7096de74e847b8b521	2026-02-21 14:13:06.87217+01	\N	2026-02-14 14:13:06.872296+01	2026-02-14 14:13:06.872296+01
134	6aa3af40-b2de-4806-aa69-21d401add9fd	6410aff2-e22f-4b84-b180-ce10cfc3b53f	987f1325b123dbaf0997ccd2e15473c793719ed1aacffee0f2e58314305641bf	2026-02-21 14:08:47.180193+01	2026-02-15 14:41:40.012336+01	2026-02-14 14:08:47.18031+01	2026-02-15 14:41:40.012336+01
143	c606e30f-d24a-40f0-8d0f-7646440223a0	20f171bc-56ee-4eaa-bb79-483d5a276893	da76bb9306fff085165a15f38074c5035f2e6cf8b684b7fec53296e6055d183b	2026-02-22 18:19:15.884375+01	2026-02-15 18:36:15.107466+01	2026-02-15 18:19:15.884868+01	2026-02-15 18:36:15.107466+01
144	183e8d12-acf9-49b7-812a-662e066090d7	20f171bc-56ee-4eaa-bb79-483d5a276893	dfa687e9a1b991687984256d6d0eddc524d2a0adccd2dd6d6e8bf7287cb812d3	2026-02-22 18:36:15.109758+01	\N	2026-02-15 18:36:15.110125+01	2026-02-15 18:36:15.110125+01
141	120d8818-f8f9-45d6-895e-abdf7602d1e4	6410aff2-e22f-4b84-b180-ce10cfc3b53f	7a84c19a07f87e9ba869ffdad6559b5f38df0baa8a2645d880f6229f41025a4b	2026-02-22 17:53:15.791355+01	2026-02-15 20:27:18.116968+01	2026-02-15 17:53:15.791694+01	2026-02-15 20:27:18.116968+01
145	5bb5af15-a8c5-4cf5-8b95-74a1ddfbe836	6410aff2-e22f-4b84-b180-ce10cfc3b53f	d473a12ec4821973d4a4e421af84f9005abcae81207d2f97ba94419ead9441ab	2026-02-22 20:27:18.118599+01	2026-02-15 20:27:53.626988+01	2026-02-15 20:27:18.11907+01	2026-02-15 20:27:53.626988+01
146	3ada5218-c620-42c7-a5e8-86c98a0a4024	6410aff2-e22f-4b84-b180-ce10cfc3b53f	3e64876e6a042d3f9b4b7933748fd558e6464cdfaa9dd2e93a31b18d01e6b65e	2026-02-22 20:27:53.628285+01	2026-02-15 20:29:37.872065+01	2026-02-15 20:27:53.628558+01	2026-02-15 20:29:37.872065+01
147	a62f7488-36b3-48b1-96c7-42850860b291	6410aff2-e22f-4b84-b180-ce10cfc3b53f	e9b7e055789e9bd83abd1c50dd1d6b96431e15b04ecf9215814e6cdaf8a8619b	2026-02-22 20:29:37.873186+01	2026-02-15 20:30:06.702839+01	2026-02-15 20:29:37.873314+01	2026-02-15 20:30:06.702839+01
148	2d9482f3-f91c-442d-b6ff-be113475cbcb	6410aff2-e22f-4b84-b180-ce10cfc3b53f	676900cfe4ccb96fa6f53d387fbf458fca6e2c44d5d5ad6239aee607bc17ec72	2026-02-22 20:30:15.484014+01	\N	2026-02-15 20:30:15.484125+01	2026-02-15 20:30:15.484125+01
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: tech_user
--

COPY public.reviews (id, user_id, product_id, rating, created_at, updated_at, deleted_at) FROM stdin;
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
3f4b1d1a-8eab-4fe3-aa4d-6ffaddec1563	dzcarth@example.com	\\x24326124313024594b38754d4b704666686b2e49684d4c53594d37432e646142703244332e5a32644d5662677448437a3078636d4b346b6b526d796d	Test User cart sync	f	2026-02-09 12:06:35.864294+01	2026-02-09 12:06:35.864294+01	\N
799afb24-9daa-42e8-a0f0-6224e0849969	cartdzh@example.com	\\x2432612431302473307a725a6b6f583133363541505645664d6a6a56753169692e4e374459706c756c4a6a42495076633549444264702f6d61633836	Test User cart sync	f	2026-02-09 12:06:01.564392+01	2026-02-14 14:10:30.341085+01	\N
20f171bc-56ee-4eaa-bb79-483d5a276893	newemail@example.com	\\x2432612431302455324c30374369596d6835555337392e2e474d31776559624332305754722e7345505647446c46355031755050706e397532633475	Updated Name	f	2026-02-15 15:16:31.161889+01	2026-02-15 15:43:40.682726+01	\N
\.


--
-- Name: goose_db_version_id_seq; Type: SEQUENCE SET; Schema: public; Owner: tech_user
--

SELECT pg_catalog.setval('public.goose_db_version_id_seq', 18, true);


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: tech_user
--

SELECT pg_catalog.setval('public.refresh_tokens_id_seq', 148, true);


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
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key UNIQUE (token);


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
-- Name: idx_products_spec_highlights; Type: INDEX; Schema: public; Owner: tech_user
--

CREATE INDEX idx_products_spec_highlights ON public.products USING gin (spec_highlights);


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
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tech_user
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


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

\unrestrict d1FcH2vB7aF86OA7Fkgn5tH8IcTvL9TpKxQuZ2MXKvBxlSUa0aROy5yuwPwV373

