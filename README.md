# 🍽️ RestauBot — Sistema Multi-Tenant de Chatbot WhatsApp para Restaurantes

Sistema completo de chatbot para WhatsApp que permite a restaurantes tomar pedidos automáticamente usando IA (OpenAI), con panel de administración multi-tenant.

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    WHATSAPP CLOUD API                    │
│           (Meta Business Platform)                       │
└──────────────────────────┬──────────────────────────────┘
                           │ Webhooks
┌──────────────────────────▼──────────────────────────────┐
│                   BACKEND (Node.js + Express)            │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Auth Module │  │ Menu Module  │  │ Order Module  │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
│  ┌──────────────────────────────────────────────────┐   │
│  │            AI Chatbot Engine (OpenAI)            │   │
│  │   greeting → menu → ordering → checkout → done  │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│              PostgreSQL (Multi-Tenant)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   public    │  │ tenant_abc  │  │ tenant_xyz  │     │
│  │  (tenants)  │  │  (isolated) │  │  (isolated) │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│             FRONTEND ADMIN (React + Vite)               │
│  Dashboard │ Pedidos │ Menú │ Clientes │ Configuración  │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Inicio rápido

### Prerrequisitos

- Node.js 20+
- PostgreSQL 15+
- Cuenta OpenAI (API Key)
- Cuenta Meta Business con WhatsApp API

### 1. Configurar variables de entorno

```bash
cd backend
cp .env.example .env
# Edita .env con tus valores
```

Variables importantes:

```env
DB_HOST=localhost
DB_PASSWORD=tu_password
JWT_SECRET=secreto_muy_largo_minimo_64_caracteres
OPENAI_API_KEY=sk-tu-api-key
WHATSAPP_VERIFY_TOKEN=mi_token_verificacion
```

### 2. Instalar dependencias e iniciar

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (nueva terminal)
cd frontend
npm install
npm run dev
```

### 3. Acceder al panel

- **Admin**: http://localhost:5173
- **API**: http://localhost:3000

Login inicial (Super Admin):

- Email: `admin@chatbot.com`
- Password: `Admin123!`

---

## 📋 Flujo del Chatbot

```
Cliente escribe en WhatsApp
         ↓
   ¿Quién es el tenant?
   (por phone_number_id)
         ↓
   Cargar conversación
   (estado + carrito)
         ↓
   Extraer intención (OpenAI)
         ↓
   ┌─────────────────┐
   │  Estado actual  │
   └────────┬────────┘
            │
   greeting → Ver menú / saludar
   ordering → Agregar al carrito
   collect_info → Pedir datos de entrega
   confirm_order → Confirmar y crear pedido
         ↓
   Guardar estado
         ↓
   Enviar respuesta WhatsApp
```

---

## 🏢 Sistema Multi-Tenant

Cada restaurante tiene su **propio schema de PostgreSQL** (`tenant_{slug}`), completamente aislado:

```sql
-- Schema público: registro de tenants
public.tenants
public.super_admins

-- Por tenant (aislado):
tenant_mi_restaurante.users
tenant_mi_restaurante.restaurant_config
tenant_mi_restaurante.menu_categories
tenant_mi_restaurante.menu_items
tenant_mi_restaurante.customers
tenant_mi_restaurante.orders
tenant_mi_restaurante.conversations
tenant_mi_restaurante.message_log
```

---

## 📱 Configurar WhatsApp (Meta Cloud API)

1. Ve a [Meta for Developers](https://developers.facebook.com)
2. Crea una app de tipo **Business**
3. Agrega el producto **WhatsApp**
4. En **Configuración de Webhooks**:
   - URL: `https://tu-servidor.com/api/whatsapp/webhook`
   - Verify Token: el mismo que `WHATSAPP_VERIFY_TOKEN` en `.env`
   - Campos: `messages`
5. Copia el **Phone Number ID** y **Access Token** al panel de Settings

---

## 🐳 Docker (Producción)

```bash
# Copia y edita las variables
cp backend/.env.example .env

# Iniciar todo
docker-compose up -d

# Ver logs
docker-compose logs -f backend
```

---

## 📁 Estructura del proyecto

```
chatbot/
├── backend/
│   ├── src/
│   │   ├── config/env.ts          # Variables de entorno
│   │   ├── db/
│   │   │   ├── pool.ts            # Conexión PostgreSQL
│   │   │   ├── migrate.ts         # Migraciones
│   │   │   └── migrations/        # SQL templates
│   │   ├── middleware/
│   │   │   ├── auth.ts            # JWT middleware
│   │   │   └── tenant.ts          # Tenant resolution
│   │   ├── modules/
│   │   │   ├── auth/              # Login, tenants, users
│   │   │   ├── menu/              # Categorías, platillos
│   │   │   ├── orders/            # Pedidos
│   │   │   ├── customers/         # Clientes
│   │   │   ├── whatsapp/          # Webhook handler
│   │   │   └── chatbot/           # IA + state machine
│   │   └── utils/                 # Logger, JWT
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/                 # Login, Dashboard, Menu, etc.
│   │   ├── components/            # Layout, Sidebar
│   │   ├── services/api.ts        # Axios client
│   │   ├── store/authStore.ts     # Zustand auth state
│   │   └── types/                 # TypeScript types
│   └── Dockerfile
└── docker-compose.yml
```

---

## 🔐 Seguridad

- Contraseñas hasheadas con **bcrypt** (rounds=12)
- **JWT** firmados, expiración configurable
- **Rate limiting** en endpoints de autenticación
- Validación de schema names para prevenir **SQL Injection**
- Headers de seguridad con **Helmet**
- Validación de input con **Zod**
- CORS configurado por dominio en producción

---

## 📊 Panel de administración

| Página        | Descripción                                    |
| ------------- | ---------------------------------------------- |
| Dashboard     | Estadísticas en tiempo real, pedidos recientes |
| Pedidos       | Kanban de pedidos con actualización de estado  |
| Menú          | CRUD de categorías y platillos                 |
| Clientes      | Historial de clientes WhatsApp                 |
| Configuración | Config restaurante + WhatsApp API              |
| Super Admin   | Gestión de tenants (solo super admin)          |
