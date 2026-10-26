-- ============================================================================
-- DutyLens BD — Standalone PostgreSQL / Supabase Cloud Schema
-- Compatible with Supabase Postgres 15+ and standard PostgreSQL 14+
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Curated Bangladesh Operative Tariff Schedule (BCT) Overrides
CREATE TABLE IF NOT EXISTS public.tariff_curated_bct (
  hs8 text PRIMARY KEY,
  hs6 text NOT NULL,
  commercial_name text NOT NULL,
  unit text NOT NULL DEFAULT 'kg',
  cd numeric(6,2) NOT NULL DEFAULT 0,
  rd numeric(6,2) NOT NULL DEFAULT 0,
  sd numeric(6,2) NOT NULL DEFAULT 0,
  vat numeric(6,2) NOT NULL DEFAULT 15,
  ait numeric(6,2) NOT NULL DEFAULT 5,
  at_rate numeric(6,2) NOT NULL DEFAULT 5,
  tti numeric(7,2) NOT NULL DEFAULT 0,
  sro_eligible_capital_machinery boolean NOT NULL DEFAULT false,
  ipo_status text NOT NULL DEFAULT 'Freely Importable',
  keywords text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Shareable Cloud Duty & VAT Costing Sheets (?share=dl-...)
CREATE TABLE IF NOT EXISTS public.shared_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  query text,
  hs8 text NOT NULL,
  commercial_name text NOT NULL,
  invoice_value numeric(16,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  exchange_rate_bdt numeric(10,4) NOT NULL DEFAULT 122,
  incoterm text NOT NULL DEFAULT 'CFR',
  valuation_mode text NOT NULL DEFAULT 'invoice_to_av',
  freight_percent numeric(6,2) NOT NULL DEFAULT 5,
  insurance_percent numeric(6,2) NOT NULL DEFAULT 1,
  quantity numeric(14,2) NOT NULL DEFAULT 1,
  regime text NOT NULL DEFAULT 'commercial',
  preferential_origin text NOT NULL DEFAULT 'none',
  domestic_vat_mode text NOT NULL DEFAULT 'standard_15',
  tti_percent numeric(7,2) NOT NULL,
  total_tax_bdt numeric(18,2) NOT NULL,
  total_landed_bdt numeric(18,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Anonymous / Aggregate Classification Telemetry Feed
CREATE TABLE IF NOT EXISTS public.classification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  hs8 text NOT NULL,
  commercial_name text NOT NULL,
  confidence integer NOT NULL DEFAULT 80,
  tti numeric(7,2) NOT NULL DEFAULT 0,
  regime text NOT NULL DEFAULT 'commercial',
  engine_used text NOT NULL DEFAULT 'builtin-hybrid',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Registered Trader / Importer / Exporter Accounts
CREATE TABLE IF NOT EXISTS public.app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  company_name text NOT NULL,
  business_role text NOT NULL DEFAULT 'importer' CHECK (business_role IN ('importer', 'exporter', 'both')),
  mobile_number text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. User Saved Classification & Costing Queries (Profile History)
CREATE TABLE IF NOT EXISTS public.user_saved_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  query text NOT NULL,
  hs8 text NOT NULL,
  formatted_hs8 text NOT NULL,
  commercial_name text NOT NULL,
  confidence integer NOT NULL DEFAULT 85,
  invoice_value numeric(16,2) NOT NULL DEFAULT 1000,
  currency text NOT NULL DEFAULT 'USD',
  exchange_rate_bdt numeric(10,4) NOT NULL DEFAULT 122,
  incoterm text NOT NULL DEFAULT 'CFR',
  quantity numeric(14,2) NOT NULL DEFAULT 1,
  regime text NOT NULL DEFAULT 'commercial',
  preferential_origin text NOT NULL DEFAULT 'none',
  domestic_vat_mode text NOT NULL DEFAULT 'standard_15',
  tti_percent numeric(7,2) NOT NULL DEFAULT 0,
  total_tax_bdt numeric(18,2) NOT NULL DEFAULT 0,
  total_landed_bdt numeric(18,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shared_assessments_slug ON public.shared_assessments(slug);
CREATE INDEX IF NOT EXISTS idx_classification_logs_created ON public.classification_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_users_email ON public.app_users(email);
CREATE INDEX IF NOT EXISTS idx_user_saved_queries_user_created ON public.user_saved_queries(user_id, created_at DESC);

-- Row Level Security (Supabase PostgREST hardening)
ALTER TABLE public.tariff_curated_bct ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_saved_queries ENABLE ROW LEVEL SECURITY;
