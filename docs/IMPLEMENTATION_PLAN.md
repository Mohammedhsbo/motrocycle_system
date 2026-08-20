# Implementation Plan

---

## Phases Overview

| Phase | Name | Weeks | Depends On |
|-------|------|-------|------------|
| 1 | Foundation | 1–3 | — |
| 2 | Inventory & Supply Chain | 4–5 | Phase 1 |
| 3 | Sales & Payments | 6–8 | Phase 2 |
| 4 | Installments & Reports | 9–10 | Phase 3 |
| 5 | E-commerce Website | 11–14 | Phase 3 |
| 6 | Admin Dashboard | 15–17 | Phase 4 |
| 7 | Desktop POS App | 18–20 | Phase 4 |
| 8 | Polish & Launch | 21–22 | All |

---

## Phase 1 — Foundation (Weeks 1–3)

### Deliverables
- [ ] Monorepo scaffolding (Turborepo + pnpm workspace)
- [ ] `packages/shared-types` — all enums, interfaces, DTOs
- [ ] `packages/shared-utils` — validators (Zod schemas), formatters
- [ ] `packages/i18n` — translation structure, ar/en base files
- [ ] `prisma/schema.prisma` — full database schema
- [ ] `prisma/seed.ts` — seed script (branches, roles, admin user, sample data)
- [ ] `apps/api` — Express boilerplate
  - [ ] Middleware: error handler, auth (JWT), RBAC, validation, pagination
  - [ ] Auth routes: register, login, refresh, logout, me
  - [ ] CRUD routes: Branch, Brand, Category, User, Role, RolePermission
  - [ ] File upload to S3
- [ ] Docker Compose for local dev (PostgreSQL + Redis)
- [ ] Basic integration test setup (Vitest + Supertest)

### Exit Criteria
- Auth flow works end-to-end (login → JWT → protected route → RBAC check).
- CRUD operations on core entities pass integration tests.
- Database migrations run cleanly.

---

## Phase 2 — Inventory & Supply Chain (Weeks 4–5)

### Deliverables
- [ ] Motorcycle CRUD + status transition API (with transactional enforcement)
- [ ] Supplier CRUD
- [ ] Purchase lifecycle (create → order → receive)
  - [ ] On receive: auto-create Motorcycle records
- [ ] Branch Transfer lifecycle (initiate → ship → receive)
  - [ ] Transactional branchId swap
- [ ] WebSocket setup (Socket.io)
  - [ ] Emit on motorcycle status change
  - [ ] Emit on inventory changes (purchase received, transfer completed)
- [ ] Inventory aggregate endpoint (read-only counts by branch/status)

### Exit Criteria
- Motorcycle status transitions enforce valid-only transitions and use row locks.
- Purchase receive creates motorcycles correctly.
- Transfer updates branchId atomically.
- WebSocket events fire on status changes.

---

## Phase 3 — Sales & Payments (Weeks 6–8)

### Deliverables
- [ ] Customer CRUD (with optional web auth for e-commerce)
- [ ] Order lifecycle (draft → confirmed → processing → awaiting_delivery → completed)
  - [ ] Order number auto-generation
  - [ ] Motorcycle status sync on order state changes
- [ ] Payment recording (cash, card, transfer, cheque)
  - [ ] Polymorphic FK validation
  - [ ] Refund support (negative amount)
- [ ] Reservation lifecycle (active → converted / expired / cancelled)
  - [ ] Partial payment tracking
  - [ ] Convert to order (transfer payments)
- [ ] Letter lifecycle (issued → received / not_received)
  - [ ] Auto-create on order `awaiting_delivery`
  - [ ] Manual create by cashier
  - [ ] Link to motorcycle detail view

### Exit Criteria
- Full order flow from creation to completion with payment.
- Reservation with partial payment → conversion to order.
- Letter records `not_received` status correctly.
- All state transitions enforce valid-only rules.

---

## Phase 4 — Installments & Reports (Weeks 9–10)

### Deliverables
- [ ] InstallmentPlan CRUD
  - [ ] Auto-generate individual installments on plan creation
- [ ] Installment payment recording
- [ ] Status transition: upcoming → due → paid / overdue
- [ ] Background job or cron: update installment statuses based on due dates
- [ ] Report endpoints:
  - [ ] Sales report (by period, branch)
  - [ ] Inventory report (by branch, status)
  - [ ] Payment report (by method, period)
  - [ ] Overdue installments report
  - [ ] Revenue report

### Exit Criteria
- Installment plan creation generates correct schedule.
- Due/overdue transitions work automatically.
- Reports return accurate aggregated data.

---

## Phase 5 — E-commerce Website (Weeks 11–14)

### Deliverables
- [ ] Next.js app scaffolding with App Router
- [ ] `[locale]` routing (ar/en) with next-intl
- [ ] RTL support (CSS logical properties + direction toggle)
- [ ] Pages:
  - [ ] Home (featured motorcycles, banners)
  - [ ] Catalog (SSR, search, filter by brand/category/price/year)
  - [ ] Motorcycle detail (gallery, specs, availability)
  - [ ] Cart (client-side, localStorage persistence)
  - [ ] Checkout (customer auth, payment method selection)
  - [ ] Customer account (orders, reservations, installments, profile)
  - [ ] Auth (login, register)
- [ ] SEO: meta tags, structured data, sitemap
- [ ] Responsive design (mobile-first)

### Exit Criteria
- Catalog pages render via SSR with correct SEO metadata.
- Customer can browse, add to cart, checkout, and view order history.
- Arabic/English switch works with correct RTL layout.

---

## Phase 6 — Admin Dashboard (Weeks 15–17)

### Deliverables
- [ ] React + Vite app scaffolding
- [ ] Dashboard layout (sidebar nav, header, RTL-aware)
- [ ] React Query data layer
- [ ] Management pages (all with server-side pagination, search, filters):
  - [ ] Motorcycles, Brands, Categories
  - [ ] Orders, Reservations, Payments
  - [ ] Customers
  - [ ] Installment Plans
  - [ ] Letters
  - [ ] Suppliers, Purchases
  - [ ] Transfers
  - [ ] Branches
  - [ ] Users, Roles & Permissions
  - [ ] Settings
  - [ ] Web Content (CMS)
- [ ] Reports with charts
- [ ] Arabic/English toggle

### Exit Criteria
- All CRUD operations work through the dashboard.
- Role-based visibility hides unauthorized sections.
- Reports display accurate data with charts.

---

## Phase 7 — Desktop POS App (Weeks 18–20)

### Deliverables
- [ ] Electron shell + React renderer
- [ ] POS interface:
  - [ ] Quick motorcycle search/scan
  - [ ] Customer lookup/create
  - [ ] Sale flow (select → pay → complete)
  - [ ] Reservation flow (select → partial pay → confirm)
  - [ ] Installment creation flow
- [ ] Payment recording UI
- [ ] Letter management (issue, mark received/not-received)
- [ ] Receipt and letter printing (Electron native API)
- [ ] Offline queue (IndexedDB) for critical operations
  - [ ] Auto-sync on reconnect
- [ ] Auto-update via electron-updater
- [ ] Arabic/English + RTL

### Exit Criteria
- Cashier can complete a sale from motorcycle selection to printed receipt.
- Offline sale queues and syncs when connection restores.
- Letters print correctly.

---

## Phase 8 — Polish & Launch (Weeks 21–22)

### Deliverables
- [ ] E2E tests (Playwright) on critical flows:
  - [ ] Web checkout
  - [ ] POS sale
  - [ ] Reservation → conversion
  - [ ] Installment payment
  - [ ] Letter status update
- [ ] Performance optimization:
  - [ ] API response times < 200ms for list endpoints
  - [ ] Web LCP < 2.5s
  - [ ] DB query optimization (EXPLAIN ANALYZE on critical queries)
- [ ] Security audit:
  - [ ] Penetration testing on auth flows
  - [ ] Input validation coverage check
  - [ ] RBAC edge cases
- [ ] Deployment pipeline (CI/CD)
- [ ] Production environment setup
- [ ] Documentation finalization

### Exit Criteria
- All critical E2E tests pass.
- No high/critical security vulnerabilities.
- System deployed and accessible.

---

---

## SOURCE OF TRUTH

> **All implementing agents MUST follow these binding decisions. Do not deviate without explicit user approval.**

### Stack (Locked)

| Layer | Technology |
|-------|-----------|
| Language | TypeScript (strict mode) |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| ORM | Prisma |
| Cache | Redis |
| E-commerce | Next.js (App Router) |
| Admin | React + Vite |
| Desktop | Electron + React |
| Monorepo | Turborepo |
| Package manager | pnpm |
| Testing | Vitest + Supertest + Playwright |
| Validation | Zod |
| Auth | JWT (access 15min + refresh 7d) |

### Structural Rules (Locked)

1. **Single API** — all 3 apps consume `/api/v1/*`. No separate backends.
2. **Single database** — one PostgreSQL instance, one Prisma schema.
3. **Shared types** — all enums, DTOs, status constants in `packages/shared-types`. No duplication.
4. **Motorcycle status transitions are transactional** — DB transaction + row-level locking.
5. **Bilingual columns** — `nameAr` + `nameEn` on display entities. API returns both.
6. **RBAC at middleware** — permission format `resource:action`.
7. **Branch scoping** — non-admin users see only their branch's data.
8. **Payment immutability** — no edits; corrections via new records.
9. **Audit log** — all state-changing operations logged.

### API Response Format (Locked)

```typescript
// Success
{ success: true, data: T, meta?: { total, page, limit, totalPages } }

// Error
{ success: false, error: { code: string, message: string, details?: unknown } }
```

### Folder Structure (Locked)

```
motorcycle-system/
├── apps/
│   ├── api/
│   ├── web/
│   ├── admin/
│   └── desktop/
├── packages/
│   ├── shared-types/
│   ├── shared-ui/
│   ├── shared-utils/
│   └── i18n/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

### Canonical Enums (Locked)

Defined in `BUSINESS_RULES.md` §1. All implementing agents must use these exact values.

### Valid State Transitions (Locked)

Defined in `BUSINESS_RULES.md` §2. The API must reject any transition not listed.
