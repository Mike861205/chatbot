-- ============================================================
-- PUBLIC SCHEMA: Tenant registry and super admin
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Super admins (platform level)
CREATE TABLE IF NOT EXISTS public.super_admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenant registry
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,           -- used as schema name: tenant_{slug}
  whatsapp_phone_number VARCHAR(20),            -- the WA business number for this tenant
  whatsapp_access_token TEXT,                   -- per-tenant WA token
  whatsapp_phone_number_id VARCHAR(50),         -- Meta phone number ID
  is_active BOOLEAN DEFAULT true,
  plan VARCHAR(50) DEFAULT 'basic',             -- basic | pro | enterprise
  db_schema VARCHAR(100) NOT NULL,              -- actual schema name in postgres
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_phone ON public.tenants(whatsapp_phone_number);
CREATE INDEX IF NOT EXISTS idx_tenants_active ON public.tenants(is_active);
