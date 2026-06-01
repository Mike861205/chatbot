-- ============================================================
-- TENANT SCHEMA TEMPLATE
-- Applied per-tenant as: tenant_{slug}
-- ============================================================

-- Admin users of the tenant (restaurant owners/staff)
CREATE TABLE IF NOT EXISTS {SCHEMA}.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',             -- admin | manager | viewer
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Restaurant configuration
CREATE TABLE IF NOT EXISTS {SCHEMA}.restaurant_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  logo_url TEXT,
  welcome_message TEXT DEFAULT 'Bienvenido! ¿En qué te puedo ayudar?',
  goodbye_message TEXT DEFAULT 'Gracias por tu pedido. ¡Hasta pronto!',
  timezone VARCHAR(50) DEFAULT 'America/Mexico_City',
  currency VARCHAR(10) DEFAULT 'MXN',
  currency_symbol VARCHAR(5) DEFAULT '$',
  opening_hours JSONB DEFAULT '{}',             -- {"monday": {"open": "09:00", "close": "22:00"}, ...}
  is_accepting_orders BOOLEAN DEFAULT true,
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  max_delivery_distance_km INTEGER DEFAULT 10,
  chatbot_personality TEXT DEFAULT 'friendly',  -- friendly | professional | casual
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menu categories
CREATE TABLE IF NOT EXISTS {SCHEMA}.menu_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  emoji VARCHAR(10),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menu items
CREATE TABLE IF NOT EXISTS {SCHEMA}.menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES {SCHEMA}.menu_categories(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  preparation_time_min INTEGER DEFAULT 15,
  tags TEXT[] DEFAULT '{}',                     -- ['spicy','vegetarian','popular']
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Item modifier groups (e.g. "Size", "Extra toppings")
CREATE TABLE IF NOT EXISTS {SCHEMA}.modifier_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID REFERENCES {SCHEMA}.menu_items(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  is_required BOOLEAN DEFAULT false,
  min_selections INTEGER DEFAULT 0,
  max_selections INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0
);

-- Modifier options (e.g. "Small +$0", "Large +$20")
CREATE TABLE IF NOT EXISTS {SCHEMA}.modifier_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES {SCHEMA}.modifier_groups(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  price_delta DECIMAL(10,2) DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0
);

-- Customers (WhatsApp users)
CREATE TABLE IF NOT EXISTS {SCHEMA}.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  address TEXT,
  notes TEXT,
  order_count INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON {SCHEMA}.customers(phone);

-- Orders
CREATE TABLE IF NOT EXISTS {SCHEMA}.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number SERIAL,
  customer_id UUID REFERENCES {SCHEMA}.customers(id),
  status VARCHAR(50) DEFAULT 'pending',         -- pending|confirmed|preparing|ready|delivered|cancelled
  type VARCHAR(20) DEFAULT 'delivery',          -- delivery | pickup
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  delivery_address TEXT,
  notes TEXT,
  estimated_time_min INTEGER,
  confirmed_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON {SCHEMA}.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON {SCHEMA}.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON {SCHEMA}.orders(created_at DESC);

-- Order line items
CREATE TABLE IF NOT EXISTS {SCHEMA}.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES {SCHEMA}.orders(id) ON DELETE CASCADE,
  item_id UUID REFERENCES {SCHEMA}.menu_items(id),
  item_name VARCHAR(255) NOT NULL,              -- snapshot at time of order
  item_price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  modifiers JSONB DEFAULT '[]',                 -- [{"group": "Size", "option": "Large", "delta": 20}]
  line_total DECIMAL(10,2) NOT NULL,
  notes TEXT
);

-- Conversation state (WhatsApp session per customer)
CREATE TABLE IF NOT EXISTS {SCHEMA}.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_phone VARCHAR(20) UNIQUE NOT NULL,
  customer_id UUID REFERENCES {SCHEMA}.customers(id),
  state VARCHAR(50) DEFAULT 'greeting',
  context JSONB DEFAULT '{}',                   -- cart, current step data, etc.
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_phone ON {SCHEMA}.conversations(customer_phone);

-- Message log
CREATE TABLE IF NOT EXISTS {SCHEMA}.message_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_phone VARCHAR(20) NOT NULL,
  direction VARCHAR(10) NOT NULL,               -- inbound | outbound
  message_type VARCHAR(20) DEFAULT 'text',
  content TEXT,
  whatsapp_message_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_phone ON {SCHEMA}.message_log(customer_phone);
CREATE INDEX IF NOT EXISTS idx_messages_created ON {SCHEMA}.message_log(created_at DESC);
