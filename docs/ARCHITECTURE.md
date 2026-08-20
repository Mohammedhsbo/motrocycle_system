# System Architecture

---

## 1. High-Level Overview

```
┌─────────────────────────────────────────────────────────┐
│                        Clients                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  E-commerce   │  │    Admin     │  │   Desktop    │  │
│  │  (Next.js)    │  │ (React+Vite) │  │  (Electron)  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
└─────────┼─────────────────┼─────────────────┼───────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────┐
│                    REST API (Express)                    │
│              + WebSocket (Socket.io)                    │
│              + Auth (JWT + RBAC)                        │
└──────────┬──────────────┬───────────────┬───────────────┘
           ▼              ▼               ▼
     ┌──────────┐  ┌───────────┐  ┌──────────────┐
     │PostgreSQL│  │   Redis   │  │Object Storage│
     │          │  │(cache/pub)│  │  (images/PDF) │
     └──────────┘  └───────────┘  └──────────────┘
```

---

## 2. Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Language | TypeScript (strict) | Single-language stack, shared types |
| Backend | Node.js + Express | Ecosystem, team familiarity |
| Database | PostgreSQL | ACID, relational integrity, JSON support |
| ORM | Prisma | Type-safe queries, migrations |
| Cache / Pub-Sub | Redis | Sessions, inventory invalidation, real-time |
| Real-time | Socket.io | Inventory sync across all 3 apps |
| E-commerce | Next.js (App Router) | SSR/SSG for SEO, React ecosystem |
| Admin Dashboard | React + Vite | SPA, fast dev, no SSR needed |
| Desktop | Electron + React | Native OS access (printing, offline) |
| Monorepo | Turborepo + pnpm | Shared packages, parallel builds |
| Object Storage | S3-compatible (MinIO or AWS S3) | Images, generated PDFs |

---

## 3. Monorepo Structure

```
motorcycle-system/
├── apps/
│   ├── api/            # Express backend
│   ├── web/            # Next.js e-commerce
│   ├── admin/          # React + Vite dashboard
│   └── desktop/        # Electron + React POS
├── packages/
│   ├── shared-types/   # Enums, interfaces, DTOs
│   ├── shared-ui/      # Reusable React components (admin + desktop)
│   ├── shared-utils/   # Validators, formatters, constants
│   └── i18n/           # Translation files + utilities
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

**Rules:**
- `shared-types` is the **single source of truth** for all enums, status values, and DTO shapes.
- `shared-ui` is consumed by `admin` and `desktop` only (not `web`, which has its own design).
- `prisma/` lives at root — one schema, one migration history.

---

## 4. Application Boundaries

| App | Audience | Rendering | Auth Scope |
|-----|----------|-----------|------------|
| **E-commerce** | Customers | SSR + Client | `customer` role only |
| **Admin Dashboard** | Staff / Managers | SPA | Staff roles (`admin`, `manager`, `accountant`…) |
| **Desktop POS** | Branch employees | Electron SPA | Staff roles (`cashier`, `branch_manager`…) |

**Absolute rule:** All three apps consume the **same REST API**. No app has its own backend.

---

## 5. API Design

### Base URL
```
/api/v1/
```

### Route Map

```
/api/v1/
├── auth/           # login, refresh, logout, me
├── customers/      # CRUD + search
├── motorcycles/    # CRUD + search + status transitions
├── orders/         # CRUD + lifecycle transitions
├── reservations/   # CRUD + lifecycle transitions
├── payments/       # create, list, refund
├── installments/   # plans CRUD, installment payments
├── letters/        # CRUD + status transitions
├── suppliers/      # CRUD
├── purchases/      # CRUD + receive items
├── transfers/      # CRUD + lifecycle transitions
├── branches/       # CRUD
├── users/          # CRUD (admin)
├── roles/          # CRUD + permission assignment
├── inventory/      # read-only aggregate views
├── reports/        # predefined report endpoints
├── settings/       # key-value config
├── web-content/    # CMS pages, banners, FAQ
├── brands/         # CRUD
├── categories/     # CRUD (tree)
└── upload/         # image/file upload
```

### Request/Response Conventions

| Convention | Standard |
|------------|----------|
| Pagination | `?page=1&limit=20` |
| Filtering | `?status=available&branchId=1` |
| Sorting | `?sort=createdAt&order=desc` |
| Search | `?search=honda` |
| Locale | `Accept-Language: ar` header |
| Success | `{ success: true, data: T, meta?: { total, page, limit, totalPages } }` |
| Error | `{ success: false, error: { code: string, message: string, details?: unknown } }` |

---

## 6. Frontend Architecture

### E-commerce (Next.js)

```
apps/web/
├── app/
│   └── [locale]/           # ar | en
│       ├── layout.tsx
│       ├── page.tsx         # Home
│       ├── motorcycles/     # Catalog (SSR)
│       ├── cart/            # Client-side
│       ├── checkout/        # Client-side
│       └── account/         # Orders, reservations, installments
├── components/
├── hooks/
├── lib/
│   ├── api.ts               # API client
│   └── auth.ts
└── messages/                # ar.json, en.json
```

- **SSR/SSG** for catalog (SEO).
- **Client-side** for cart, checkout, account.
- **next-intl** for i18n with `[locale]` segment routing.

### Admin Dashboard (React + Vite)

```
apps/admin/
├── src/
│   ├── pages/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── layouts/
│   │   └── DashboardLayout.tsx
│   ├── contexts/
│   └── i18n/
└── vite.config.ts
```

- SPA with React Router.
- Server-side pagination on all data tables.
- React Query for data fetching and caching.

---

## 7. Desktop Architecture (Electron + React)

```
apps/desktop/
├── electron/
│   ├── main.ts              # Main process
│   ├── preload.ts           # Context bridge
│   └── services/
│       ├── printer.ts       # Receipt/letter printing
│       └── offline-queue.ts # Queue API calls when offline
├── src/                     # React renderer
│   ├── pages/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   └── i18n/
└── electron-builder.yml
```

**Key decisions:**
- Shares `shared-ui` and `shared-types` with admin.
- **Offline resilience:** POS operations queue locally (IndexedDB) when API is unreachable; sync on reconnect.
- **Printing:** Electron native printing API for receipts and letters.
- **Updates:** electron-updater for auto-deployments.

---

## 8. RBAC Strategy

### Predefined Roles

| Role | Scope |
|------|-------|
| `super_admin` | Full access, manage roles |
| `branch_manager` | Full access within own branch |
| `cashier` | POS, sales, reservations, payments, letters |
| `inventory_clerk` | Purchases, transfers, stock management |
| `accountant` | Payments, installments, reports (read-only stock) |
| `customer` | E-commerce only (own data) |

### Permission Model

```typescript
// Format: "resource:action"
// e.g. "order:create", "motorcycle:update", "report:read"

enum Resource {
  MOTORCYCLE, ORDER, RESERVATION, PAYMENT,
  INSTALLMENT, LETTER, CUSTOMER, SUPPLIER,
  PURCHASE, TRANSFER, BRANCH, USER,
  ROLE, REPORT, SETTING, WEB_CONTENT
}

enum Action { CREATE, READ, UPDATE, DELETE, EXPORT }
```

**Implementation:**
- `Role` → many `RolePermission` (resource + action pairs).
- Express middleware checks `user.role.permissions` on every route.
- Branch-scoped roles auto-filter queries by `user.branchId`.

---

## 9. Localization Strategy

| Concern | Approach |
|---------|----------|
| Translation files | `packages/i18n/locales/{ar,en}.json` — shared |
| App-specific keys | Each app extends with local `messages/` |
| RTL | CSS logical properties (`margin-inline-start`) + `dir="rtl"` on `<html>` |
| Date/number | `Intl.DateTimeFormat` / `Intl.NumberFormat` with locale |
| Currency | Configurable in settings (default: SAR) |
| DB content | Bilingual columns: `nameAr`, `nameEn` |
| API responses | Always return both `nameAr` and `nameEn`; client picks |

---

## 10. Error-Handling Strategy

### Backend

```typescript
class AppError extends Error {
  constructor(
    public code: string,        // "MOTORCYCLE_NOT_AVAILABLE"
    public statusCode: number,  // HTTP status
    public message: string,
    public details?: unknown
  ) { super(message); }
}
```

| Situation | HTTP Status |
|-----------|-------------|
| Validation failure | `422` with field-level details (Zod) |
| Business rule violation | `409` with descriptive code |
| Auth required | `401` |
| Forbidden | `403` |
| Not found | `404` |
| Uncaught | `500` generic message; full trace logged |

### Frontend

- API client maps `error.code` → i18n key for user-facing messages.
- Toast notifications for errors.
- Form validation: Zod schemas shared from `shared-types`.

---

## 11. Security

| Concern | Mitigation |
|---------|------------|
| Authentication | JWT access (15 min) + refresh (7 days); refresh in httpOnly cookie |
| Passwords | bcrypt, min 8 characters |
| Authorization | RBAC middleware on every route |
| Input validation | Zod on every endpoint |
| SQL injection | Prisma parameterized queries |
| XSS | React auto-escaping + CSP headers |
| CSRF | SameSite cookies + CSRF token for mutations |
| Rate limiting | express-rate-limit on auth + public endpoints |
| File uploads | Type/size validation, S3 pre-signed URLs |
| Audit log | Log all state-changing operations (who, what, when) |
| Branch isolation | Branch-scoped queries for non-admin roles |

---

## 12. Testing Strategy

| Layer | Tool | Scope |
|-------|------|-------|
| Unit | Vitest | Business logic, utils, validators |
| Integration | Vitest + Supertest | API routes with test DB |
| E2E | Playwright | Critical flows: checkout, POS sale, reservation |
| DB | Prisma test utils | Seed + teardown per test suite |

**Priority:** Integration (API) → Unit (logic) → E2E (critical paths).

---

## 13. Real-Time Sync

- **Socket.io** server runs alongside Express.
- **Events emitted on:**
  - Motorcycle status change
  - Order/reservation creation or status change
  - Inventory updates (purchase received, transfer completed)
- **Redis Pub/Sub** backs Socket.io for horizontal scaling.
- All connected clients (web, admin, desktop) receive inventory invalidation events and refetch affected data.
