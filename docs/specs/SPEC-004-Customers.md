# SPEC-004: Customers

**Feature Goal:** Implement comprehensive customer management for all three applications (E-commerce, Admin Dashboard, Desktop POS), supporting customer registration, profile management, multi-address support, and fast lookup for point-of-sale operations.

**Priority:** P0 (Core MVP - Required for orders, reservations, and installments)

**Dependencies:** 
- SPEC-001 (Authentication, Users & Roles)

---

## Scope

This specification covers:
- Customer CRUD operations
- Customer authentication (e-commerce self-registration)
- Customer address management (multiple addresses per customer)
- Customer search and filtering (optimized for POS)
- Customer profile management
- Customer status management
- Duplicate detection and prevention

This specification **does NOT** cover:
- Orders (SPEC-005)
- Reservations (SPEC-006)
- Payments (SPEC-008)
- Installments (SPEC-009)

These domains will reference customers but are implemented separately.

---

## User Roles

| Role | Permissions |
|------|-------------|
| `super_admin` | Full access to all customers across all branches |
| `branch_manager` | View all customers; create/edit customers associated with own branch orders |
| `cashier` | Create/view/edit customers for POS operations in own branch |
| `inventory_clerk` | Read-only access to customer list |
| `accountant` | Read-only access to customer list (for payment reports) |
| `customer` | View and edit own profile only (e-commerce) |

---

## Functional Requirements

### FR-C01: Customer Registration (E-commerce)
- Customers can self-register via e-commerce website
- Required fields: name, phone, email, password
- Email and phone must be unique
- Password hashed with bcrypt (same as staff users)
- Auto-create default address if provided during registration

### FR-C02: Customer Registration (POS)
- Staff can create customers via POS or Admin Dashboard
- Required fields: name, phone
- Email optional (many walk-in customers may not have email)
- No password required for POS-created customers
- If customer later registers on e-commerce with same phone/email, accounts must be linked

### FR-C03: Customer Profile Management
- Customers can update: name, phone, email, national ID
- Phone/email uniqueness enforced on update
- Password change requires current password verification (e-commerce only)
- Staff can update customer details with audit log

### FR-C04: Customer Address Management
- Each customer can have multiple addresses
- Each address has: label, address line, city, region, postal code, country, notes
- One address marked as default
- If only one address exists, it's automatically default
- Can add/edit/delete addresses
- Cannot delete default address if other addresses exist (must set new default first)

### FR-C05: Customer Search (POS Optimized)
- Search by: phone (exact or partial), name (fuzzy), email, national ID
- Return results sorted by relevance
- Optimized for fast lookup during sales (<200ms response time)
- Support Arabic and English name search

### FR-C06: Customer Listing & Filtering
- Paginated customer list for Admin Dashboard
- Filter by: creation date range, has email, has national ID, branch association (via orders)
- Sort by: name, creation date, last order date
- Export customer list (CSV) with privacy controls

### FR-C07: Customer Status Management
- Status: `active` (default), `inactive`
- Inactive customers cannot place orders (e-commerce blocked, POS warned)
- Only admin/manager can deactivate customers
- Deactivation reason recorded in audit log

### FR-C08: Duplicate Detection
- Before creating customer, check for existing:
  - Exact phone match
  - Exact email match
  - Exact national ID match
- If match found, return existing customer or show warning
- Staff can override warning and create anyway (edge case: family members sharing phone)

### FR-C09: Customer Deactivation (Soft Delete)
- Customers are never hard-deleted (preserve history)
- Set `isActive = false` instead
- Inactive customers hidden from search by default
- Can be reactivated by admin

### FR-C10: Customer Privacy
- National ID, email, phone are PII (personally identifiable information)
- Access logged in audit trail
- Customer data export requires `customer:export` permission
- Customers can view own data only (e-commerce)

---

## Data Requirements

### Customer Entity
From DATABASE_DESIGN.md (approved schema):

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| name | VARCHAR(200) | NOT NULL |
| phone | VARCHAR(20) | NOT NULL |
| email | VARCHAR(255) | UNIQUE (nullable) |
| passwordHash | VARCHAR(255) | nullable (set if customer uses web) |
| nationalId | VARCHAR(20) | UNIQUE (nullable) |
| address | TEXT | nullable (legacy field, use Address table) |
| notes | TEXT | nullable |
| isActive | BOOLEAN | default true |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

**Indexes:** `(phone)`, `(nationalId)`, `(email)`

**New Index:** Composite index on `(name, phone)` for search performance

---

### Address Entity (NEW)

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| customerId | UUID | FK → Customer, NOT NULL |
| label | VARCHAR(100) | default 'Home' |
| addressLine | TEXT | NOT NULL |
| city | VARCHAR(100) | |
| region | VARCHAR(100) | |
| postalCode | VARCHAR(20) | |
| country | VARCHAR(100) | default 'Saudi Arabia' |
| isDefault | BOOLEAN | default false |
| notes | TEXT | |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

**Index:** `(customerId)`, `(customerId, isDefault)`

**Constraint:** At most one `isDefault = true` per customerId

---

### Customer-Branch Relationship
- Customers are **global** (not branch-specific)
- Branch association derived from orders/reservations
- A customer can interact with multiple branches
- No explicit `branchId` on Customer table

---

## Business Rules

### BR-001: Customer Uniqueness
- Phone is required and must be unique
- Email is optional but must be unique if provided
- National ID is optional but must be unique if provided
- Case-insensitive uniqueness for email

### BR-002: Phone Format
- Stored in normalized format (remove spaces, dashes)
- Validation: must start with + or be 9-15 digits
- Display format: configurable per locale

### BR-003: Customer Account Linking
- POS-created customer (no password) can later register on e-commerce
- Match by phone or email
- On registration, if match found:
  - Set passwordHash
  - Merge data (keep existing name, add email if missing)
  - Preserve order history

### BR-004: Default Address
- Each customer must have at most one default address
- If customer has addresses, at least one must be default
- Creating first address auto-sets as default
- Deleting default address auto-promotes another address (if any)

### BR-005: Customer Status
- `active`: Normal operations allowed
- `inactive`: E-commerce login blocked; POS shows warning but allows override
- Status transitions logged in audit trail

### BR-006: Customer Deactivation Rules
- Cannot deactivate if customer has:
  - Active reservations
  - Unpaid orders
  - Outstanding installments
- Can deactivate if all obligations settled
- Reactivation allowed anytime by admin

### BR-007: Customer Data Privacy
- Customer password never returned in API responses
- National ID masked in list views (show last 4 digits only)
- Full national ID visible only in detail view with permission
- Access to customer PII logged

### BR-008: Customer Notes
- Staff can add notes to customer records
- Notes visible to all staff (not to customers)
- Use cases: payment history, special instructions, preferences

---

## API Requirements

### POST `/api/v1/customers/register`
**Description:** Customer self-registration (e-commerce)

**Required Permission:** None (public endpoint)

**Request Body:**
```typescript
{
  name: string;              // max 200 chars
  phone: string;             // normalized format
  email: string;             // valid email
  password: string;          // min 8 chars
  nationalId?: string;       // optional
  address?: {                // Optional initial address
    label?: string;
    addressLine: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  };
}
```

**Response (201):**
```typescript
{
  success: true,
  data: {
    id: string;
    name: string;
    phone: string;
    email: string;
    nationalId?: string;
    isActive: boolean;
    createdAt: string;
  }
}
```

**Errors:**
- 409: `PHONE_EXISTS`, `EMAIL_EXISTS`, `NATIONAL_ID_EXISTS`
- 422: Validation failure

**Side Effects:**
- Create customer with hashed password
- Create default address if provided
- Audit log entry

---

### POST `/api/v1/customers`
**Description:** Create customer (staff only, POS/Admin)

**Required Permission:** `customer:create`

**Request Body:**
```typescript
{
  name: string;
  phone: string;
  email?: string;            // optional
  nationalId?: string;       // optional
  notes?: string;            // staff notes
  address?: {                // optional
    label?: string;
    addressLine: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  };
}
```

**Response (201):**
```typescript
{
  success: true,
  data: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    nationalId?: string;
    isActive: boolean;
    notes?: string;
    addresses: Array<{
      id: string;
      label: string;
      addressLine: string;
      city?: string;
      isDefault: boolean;
    }>;
    createdAt: string;
  }
}
```

**Errors:**
- 409: `PHONE_EXISTS`, `EMAIL_EXISTS`, `NATIONAL_ID_EXISTS`
- 422: Validation failure

**Duplicate Detection:**
- If phone/email/nationalId exists, return 409 with existing customer ID
- Staff can review and decide to use existing or override (separate endpoint)

---

### GET `/api/v1/customers`
**Description:** List customers (paginated)

**Required Permission:** `customer:read`

**Query Parameters:**
- `page` (number, default 1)
- `limit` (number, default 20, max 100)
- `search` (string) — searches name, phone, email
- `hasEmail` (boolean) — filter customers with/without email
- `hasNationalId` (boolean) — filter customers with/without national ID
- `isActive` (boolean, default true) — include inactive customers
- `startDate`, `endDate` (ISO 8601) — filter by creation date
- `sort` (string) — `name`, `createdAt` (default)
- `order` (string) — `asc`, `desc` (default: `desc`)

**Response (200):**
```typescript
{
  success: true,
  data: Array<{
    id: string;
    name: string;
    phone: string;
    email?: string;
    nationalId?: string;     // Masked: "******1234"
    isActive: boolean;
    orderCount?: number;     // Total orders (computed)
    lastOrderDate?: string;  // Last order date (computed)
    createdAt: string;
  }>,
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }
}
```

**Branch Scoping:** Not applicable (customers are global)

---

### GET `/api/v1/customers/search`
**Description:** Fast customer search (optimized for POS)

**Required Permission:** `customer:read`

**Query Parameters:**
- `q` (string, required) — search term (phone, name, email, nationalId)
- `limit` (number, default 10, max 20)

**Response (200):**
```typescript
{
  success: true,
  data: Array<{
    id: string;
    name: string;
    phone: string;
    email?: string;
    nationalId?: string;     // Masked
    defaultAddress?: {
      id: string;
      addressLine: string;
      city?: string;
    };
  }>
}
```

**Search Logic:**
- Exact phone match → highest priority
- Partial phone match → high priority
- Name contains search term (Arabic or English) → medium priority
- Email contains search term → low priority
- Use `ILIKE` for case-insensitive search
- Return max 20 results

**Performance:** Must return results in <200ms

---

### GET `/api/v1/customers/:id`
**Description:** Get single customer with full details

**Required Permission:** `customer:read` (staff) or own customer ID (e-commerce)

**Response (200):**
```typescript
{
  success: true,
  data: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    nationalId?: string;     // Full value (not masked) for authorized users
    notes?: string;          // Staff only
    isActive: boolean;
    addresses: Array<{
      id: string;
      label: string;
      addressLine: string;
      city?: string;
      region?: string;
      postalCode?: string;
      country?: string;
      isDefault: boolean;
      notes?: string;
      createdAt: string;
    }>;
    stats: {                 // Staff only
      totalOrders: number;
      totalSpent: number;
      lastOrderDate?: string;
      activeReservations: number;
      activeInstallmentPlans: number;
    };
    createdAt: string;
    updatedAt: string;
  }
}
```

**Errors:**
- 404: `CUSTOMER_NOT_FOUND`
- 403: Forbidden (customer accessing another customer's data)

**Privacy:**
- Customers (e-commerce) cannot see notes or stats
- Customers see only own data

---

### PATCH `/api/v1/customers/:id`
**Description:** Update customer

**Required Permission:** `customer:update` (staff) or own customer ID (e-commerce)

**Request Body (all optional):**
```typescript
{
  name?: string;
  phone?: string;            // Uniqueness validated
  email?: string;            // Uniqueness validated
  nationalId?: string;       // Uniqueness validated
  notes?: string;            // Staff only
  isActive?: boolean;        // Staff only
}
```

**Response (200):** Updated customer object (same as GET)

**Errors:**
- 404: `CUSTOMER_NOT_FOUND`
- 403: Forbidden
- 409: `PHONE_EXISTS`, `EMAIL_EXISTS`, `NATIONAL_ID_EXISTS`
- 422: Validation failure

**Restrictions:**
- Customers cannot update `isActive` or `notes`
- Phone/email changes validated for uniqueness

---

### POST `/api/v1/customers/:id/change-password`
**Description:** Customer changes own password (e-commerce)

**Required Permission:** Own customer ID only

**Request Body:**
```typescript
{
  currentPassword: string;
  newPassword: string;       // min 8 chars
}
```

**Response (200):**
```typescript
{
  success: true,
  data: null
}
```

**Errors:**
- 401: `INCORRECT_PASSWORD`
- 422: `PASSWORD_TOO_SHORT`

**Side Effects:**
- Hash and update password
- Audit log entry

---

### POST `/api/v1/customers/:id/deactivate`
**Description:** Deactivate customer (soft delete)

**Required Permission:** `customer:delete`

**Request Body:**
```typescript
{
  reason: string;            // Required reason for audit
}
```

**Response (200):**
```typescript
{
  success: true,
  data: null
}
```

**Errors:**
- 404: `CUSTOMER_NOT_FOUND`
- 409: `CUSTOMER_HAS_ACTIVE_OBLIGATIONS` (active reservations, unpaid orders, outstanding installments)

**Side Effects:**
- Set `isActive = false`
- Audit log with reason

---

### POST `/api/v1/customers/:id/reactivate`
**Description:** Reactivate customer

**Required Permission:** `customer:update`

**Response (200):**
```typescript
{
  success: true,
  data: null
}
```

**Side Effects:**
- Set `isActive = true`
- Audit log entry

---

### POST `/api/v1/customers/:id/addresses`
**Description:** Add address to customer

**Required Permission:** `customer:update` (staff) or own customer ID (e-commerce)

**Request Body:**
```typescript
{
  label?: string;            // default 'Home'
  addressLine: string;       // required
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;          // default 'Saudi Arabia'
  isDefault?: boolean;       // default false
  notes?: string;
}
```

**Response (201):**
```typescript
{
  success: true,
  data: {
    id: string;
    customerId: string;
    label: string;
    addressLine: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
    isDefault: boolean;
    notes?: string;
    createdAt: string;
  }
}
```

**Side Effects:**
- If `isDefault = true`, unset other addresses' default flag
- If first address, auto-set as default

---

### GET `/api/v1/customers/:id/addresses`
**Description:** List customer addresses

**Required Permission:** `customer:read` (staff) or own customer ID (e-commerce)

**Response (200):**
```typescript
{
  success: true,
  data: Array<{
    id: string;
    label: string;
    addressLine: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
    isDefault: boolean;
    notes?: string;
    createdAt: string;
  }>
}
```

---

### PATCH `/api/v1/customers/:customerId/addresses/:id`
**Description:** Update address

**Required Permission:** `customer:update` (staff) or own customer ID (e-commerce)

**Request Body (all optional):**
```typescript
{
  label?: string;
  addressLine?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  isDefault?: boolean;
  notes?: string;
}
```

**Response (200):** Updated address object

**Side Effects:**
- If setting `isDefault = true`, unset other addresses

---

### DELETE `/api/v1/customers/:customerId/addresses/:id`
**Description:** Delete address

**Required Permission:** `customer:delete` (staff) or own customer ID (e-commerce)

**Response (200):**
```typescript
{
  success: true,
  data: null
}
```

**Errors:**
- 404: `ADDRESS_NOT_FOUND`
- 409: `CANNOT_DELETE_DEFAULT_ADDRESS` (if default and other addresses exist)

**Side Effects:**
- If deleting default address with other addresses, auto-promote first remaining address
- If deleting last address, allow deletion

---

### GET `/api/v1/customers/:id/summary`
**Description:** Get customer order/payment summary (staff only)

**Required Permission:** `customer:read`

**Response (200):**
```typescript
{
  success: true,
  data: {
    customerId: string;
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    totalSpent: number;        // Sum of completed order amounts
    totalPaid: number;         // Sum of all payments
    outstandingBalance: number; // totalSpent - totalPaid
    activeReservations: number;
    expiredReservations: number;
    activeInstallmentPlans: number;
    overdueInstallments: number;
    lastOrderDate?: string;
    lastPaymentDate?: string;
  }
}
```

**Note:** This endpoint aggregates data from Orders, Reservations, Payments, Installments (implemented in later specs)

---

## Validation Rules

### Customer
- `name`: Required, max 200 chars, min 2 chars
- `phone`: Required, max 20 chars, normalized format (remove spaces/dashes), must start with + or be 9-15 digits
- `email`: Optional, max 255 chars, valid email format, case-insensitive uniqueness
- `nationalId`: Optional, max 20 chars, alphanumeric only, unique
- `password`: (e-commerce only) min 8 chars, hashed with bcrypt
- `notes`: Optional, max 2000 chars

### Address
- `label`: Optional, max 100 chars, default 'Home'
- `addressLine`: Required, max 500 chars
- `city`: Optional, max 100 chars
- `region`: Optional, max 100 chars
- `postalCode`: Optional, max 20 chars
- `country`: Optional, max 100 chars, default 'Saudi Arabia'

---

## Error Cases

| Scenario | HTTP Status | Error Code |
|----------|-------------|------------|
| Phone already exists | 409 | `PHONE_EXISTS` |
| Email already exists | 409 | `EMAIL_EXISTS` |
| National ID already exists | 409 | `NATIONAL_ID_EXISTS` |
| Customer not found | 404 | `CUSTOMER_NOT_FOUND` |
| Address not found | 404 | `ADDRESS_NOT_FOUND` |
| Cannot delete default address | 409 | `CANNOT_DELETE_DEFAULT_ADDRESS` |
| Customer has active obligations | 409 | `CUSTOMER_HAS_ACTIVE_OBLIGATIONS` |
| Invalid phone format | 422 | `INVALID_PHONE_FORMAT` |
| Invalid email format | 422 | `INVALID_EMAIL_FORMAT` |
| Password too short | 422 | `PASSWORD_TOO_SHORT` |
| Incorrect password | 401 | `INCORRECT_PASSWORD` |
| Unauthorized access | 403 | `FORBIDDEN` |

---

## Permission Requirements

### Customer Management
- `customer:create` — Create customers (staff)
- `customer:read` — View customers
- `customer:update` — Edit customers
- `customer:delete` — Deactivate customers
- `customer:export` — Export customer data (privacy-sensitive)

### Default Role Permissions
- `super_admin`: All customer permissions
- `branch_manager`: customer:* (all)
- `cashier`: customer:create, customer:read, customer:update
- `inventory_clerk`: customer:read
- `accountant`: customer:read
- `customer`: Can view/update own profile only (enforced by ID check, not permission)

---

## Edge Cases

### EC-001: Duplicate Phone Detection
- Staff creates customer with phone that exists
- System returns 409 with existing customer ID
- Staff can review existing customer and use that instead
- Override mechanism: add `?force=true` query param (requires explicit confirmation)

### EC-002: E-commerce Registration with Existing Phone (POS-created)
- POS created customer with phone 555-1234 (no password)
- Customer tries to register on e-commerce with same phone
- System detects existing customer, sets password, returns success
- Preserves existing order/payment history

### EC-003: Updating Phone to Existing Phone
- Customer A tries to change phone to Customer B's phone
- Rejected with 409
- No override mechanism (would create duplicate)

### EC-004: Deleting Last Address
- Customer has one address (default)
- Delete request allowed
- Customer now has zero addresses (valid state)

### EC-005: Setting Non-Default Address as Default
- Customer has 3 addresses, #2 is default
- Update address #1 to `isDefault = true`
- System unsets address #2's default flag, sets address #1

### EC-006: Customer Deactivation with Active Reservation
- Customer has active reservation (not expired/converted)
- Deactivation rejected with 409
- Must cancel reservation first

### EC-007: Customer Search with Arabic Name
- Customer name stored as "محمد علي"
- Search query "محمد" (partial Arabic)
- Must return correct result (Arabic text search)

### EC-008: Customer Accessing Another Customer's Data
- Customer A (ID: 123) tries GET `/customers/456`
- Rejected with 403
- Audit log records attempt

### EC-009: National ID Masked in List View
- Staff views customer list
- National ID shows "******1234" (last 4 digits)
- Full ID visible only in detail view

### EC-010: Customer with No Email Trying to Login (E-commerce)
- POS created customer (no email, no password)
- Customer tries to login on e-commerce
- Login fails (no email)
- Must register with email to access e-commerce

---

## Acceptance Criteria

### AC-001: Customer Self-Registration (E-commerce)
- [ ] Customer can register with name, phone, email, password
- [ ] Email and phone uniqueness enforced
- [ ] Password hashed with bcrypt
- [ ] Initial address created if provided
- [ ] Can login immediately after registration

### AC-002: Staff Customer Creation (POS)
- [ ] Staff can create customer with name and phone (email optional)
- [ ] No password required
- [ ] Duplicate phone detected and prevented
- [ ] Created customer searchable immediately

### AC-003: Customer Search (POS Optimized)
- [ ] Search by phone returns results in <200ms
- [ ] Partial phone match works (e.g., "555" matches "555-1234")
- [ ] Name search works for Arabic and English
- [ ] Results sorted by relevance

### AC-004: Customer Profile Update
- [ ] Customer can update name, phone, email
- [ ] Phone/email uniqueness validated
- [ ] Staff can update customer notes
- [ ] Audit log records changes

### AC-005: Customer Address Management
- [ ] Customer can add multiple addresses
- [ ] First address auto-set as default
- [ ] Can change default address
- [ ] Cannot delete default if other addresses exist
- [ ] Can delete last address

### AC-006: Customer Deactivation
- [ ] Staff can deactivate customer with reason
- [ ] Cannot deactivate if active obligations exist
- [ ] Inactive customer blocked from e-commerce login
- [ ] Inactive customer shows warning in POS
- [ ] Can reactivate customer

### AC-007: Customer Privacy
- [ ] Password never returned in API responses
- [ ] National ID masked in list views
- [ ] Customer can only access own data (e-commerce)
- [ ] PII access logged in audit trail

### AC-008: Duplicate Detection
- [ ] Creating customer with existing phone returns 409
- [ ] Error response includes existing customer ID
- [ ] Staff can override with confirmation

### AC-009: Account Linking
- [ ] POS-created customer can register on e-commerce
- [ ] Matching by phone/email works
- [ ] Password set on e-commerce registration
- [ ] Order history preserved

### AC-010: Customer Summary
- [ ] Staff can view customer order/payment summary
- [ ] Summary aggregates data from orders, payments, installments
- [ ] Totals calculated correctly

---

## Test Requirements

### Unit Tests
- [ ] Phone normalization function (remove spaces, dashes)
- [ ] Email validation and case-insensitive comparison
- [ ] National ID validation (alphanumeric)
- [ ] Default address logic
- [ ] Password hashing and verification
- [ ] Duplicate detection logic

### Integration Tests
- [ ] POST `/customers/register` — e-commerce registration
- [ ] POST `/customers/register` — duplicate phone (409)
- [ ] POST `/customers` — staff creation
- [ ] POST `/customers` — duplicate detection
- [ ] GET `/customers` — pagination and filters
- [ ] GET `/customers/search` — POS search (performance test <200ms)
- [ ] GET `/customers/:id` — customer detail
- [ ] PATCH `/customers/:id` — update customer
- [ ] PATCH `/customers/:id` — phone/email conflict (409)
- [ ] POST `/customers/:id/deactivate` — with/without obligations
- [ ] POST `/customers/:id/reactivate` — success
- [ ] CRUD `/customers/:id/addresses` — all operations
- [ ] Address default flag logic (setting/unsetting)
- [ ] Customer accessing another customer's data (403)
- [ ] Staff accessing customer data (success)
- [ ] GET `/customers/:id/summary` — aggregated stats

### Performance Tests
- [ ] Customer search returns results in <200ms (indexed queries)
- [ ] Customer list pagination with 10,000+ records

### E2E Tests (Later Phase)
- [ ] E-commerce: Register → login → view profile → update address
- [ ] POS: Search customer → create order → view customer history
- [ ] Admin: View customer list → filter → export

---

## Implementation Tasks

### TASK-001-DB: Database Schema
**Owner:** Backend Engineer  
**Estimated Effort:** 0.5 day  
**Description:**
1. Customer table already exists in schema (DATABASE_DESIGN.md) — add `isActive` column
2. Create `Address` table with foreign key to Customer
3. Add composite index on `(customerId, isDefault)` for Address
4. Add composite index on `(name, phone)` for Customer (search performance)
5. Update seed script with sample customers and addresses (at least 50 customers, mix of with/without email)

**Files to Modify:**
- `prisma/schema.prisma`
- `prisma/seed.ts`

**Acceptance:**
- [ ] Migration runs successfully
- [ ] Seed creates sample customers and addresses
- [ ] Uniqueness constraints work (phone, email, nationalId)
- [ ] Default address constraint enforced

---

### TASK-002-SHARED: Shared Types
**Owner:** Backend Engineer  
**Estimated Effort:** 0.5 day  
**Description:**
1. Define interfaces: `Customer`, `Address`
2. Define DTOs: `RegisterCustomerDto`, `CreateCustomerDto`, `UpdateCustomerDto`, `CreateAddressDto`, `UpdateAddressDto`, `CustomerSearchDto`
3. Create Zod schemas for all DTOs
4. Export phone normalization utility
5. Export everything

**Files to Create:**
- `packages/shared-types/src/customer.ts`
- `packages/shared-types/src/address.ts`

**Files to Modify:**
- `packages/shared-types/src/index.ts`

**Acceptance:**
- [ ] All DTOs have Zod schemas
- [ ] Phone normalization utility works
- [ ] Package builds

---

### TASK-003-API: Customer CRUD Routes
**Owner:** Backend Engineer  
**Estimated Effort:** 2 days  
**Description:**
1. Implement customer routes:
   - POST `/customers/register` (public)
   - POST `/customers` (staff)
   - GET `/customers` (paginated, filtered)
   - GET `/customers/:id` (with addresses and stats)
   - PATCH `/customers/:id`
   - POST `/customers/:id/change-password`
   - POST `/customers/:id/deactivate`
   - POST `/customers/:id/reactivate`
2. Create customer service with:
   - Phone/email/nationalId uniqueness checks
   - Duplicate detection logic
   - Password hashing (reuse from auth)
   - National ID masking in list views
   - Deactivation validation (check active obligations)
3. Implement privacy controls:
   - Customers can only access own data
   - Staff can access all customers
4. Log all customer operations

**Files to Create:**
- `apps/api/src/routes/customers.ts`
- `apps/api/src/controllers/customers.controller.ts`
- `apps/api/src/services/customers.service.ts`
- `apps/api/src/utils/phoneNormalizer.ts`

**Acceptance:**
- [ ] All CRUD operations work
- [ ] Duplicate phone/email/nationalId rejected with 409
- [ ] National ID masked in list, full in detail
- [ ] Customer privacy enforced (e-commerce)
- [ ] Deactivation validates obligations

---

### TASK-004-API: Customer Search (POS Optimized)
**Owner:** Backend Engineer  
**Estimated Effort:** 1 day  
**Description:**
1. Implement GET `/customers/search` endpoint
2. Create optimized search query:
   - Exact phone match (highest priority)
   - Partial phone match (high priority)
   - Name ILIKE (Arabic + English)
   - Email contains
3. Use indexed columns for performance
4. Return max 20 results
5. Test performance with 10,000+ customers (<200ms)

**Files to Modify:**
- `apps/api/src/routes/customers.ts`
- `apps/api/src/controllers/customers.controller.ts`
- `apps/api/src/services/customers.service.ts`

**Acceptance:**
- [ ] Search returns results in <200ms
- [ ] Exact phone match returns immediately
- [ ] Partial phone match works
- [ ] Arabic name search works
- [ ] English name search works

---

### TASK-005-API: Address Management Routes
**Owner:** Backend Engineer  
**Estimated Effort:** 1 day  
**Description:**
1. Implement address routes:
   - POST `/customers/:id/addresses`
   - GET `/customers/:id/addresses`
   - PATCH `/customers/:customerId/addresses/:id`
   - DELETE `/customers/:customerId/addresses/:id`
2. Create address service with:
   - Default address logic (auto-set first, unset others when setting new default)
   - Cannot delete default if others exist
   - Auto-promote on default deletion
3. Validate customer ownership (e-commerce users can only manage own addresses)

**Files to Create:**
- `apps/api/src/routes/addresses.ts` (or include in customers.ts)
- `apps/api/src/controllers/addresses.controller.ts`
- `apps/api/src/services/addresses.service.ts`

**Acceptance:**
- [ ] Can add multiple addresses
- [ ] First address auto-set as default
- [ ] Setting new default unsets old default
- [ ] Cannot delete default if others exist
- [ ] Auto-promote on default deletion

---

### TASK-006-API: Customer Summary (Stub)
**Owner:** Backend Engineer  
**Estimated Effort:** 0.5 day  
**Description:**
1. Implement GET `/customers/:id/summary` endpoint (stub)
2. Return structure with zero values (orders/payments not yet implemented)
3. Document aggregation logic for later implementation
4. Add TODO comments for integration with Orders, Payments, Installments

**Files to Modify:**
- `apps/api/src/routes/customers.ts`
- `apps/api/src/controllers/customers.controller.ts`
- `apps/api/src/services/customers.service.ts`

**Acceptance:**
- [ ] Endpoint returns correct structure
- [ ] Returns zero values (no orders/payments yet)
- [ ] Ready for integration with future specs

---

### TASK-007-API: Integration Tests
**Owner:** Backend Engineer  
**Estimated Effort:** 1.5 days  
**Description:**
1. Write integration tests for:
   - Customer registration (e-commerce)
   - Customer creation (staff)
   - Duplicate detection (phone, email, nationalId)
   - Customer list with pagination and filters
   - Customer search (exact phone, partial phone, name)
   - Customer update (success + uniqueness conflicts)
   - Customer deactivation/reactivation
   - Address CRUD (all operations)
   - Default address logic (setting, unsetting, deletion)
   - Customer privacy (accessing another customer's data)
   - National ID masking
2. Performance test: customer search with 10,000+ records (<200ms)
3. Achieve >80% coverage

**Files to Create:**
- `apps/api/tests/customers.test.ts`
- `apps/api/tests/addresses.test.ts`
- `apps/api/tests/customer-search.test.ts`

**Acceptance:**
- [ ] All tests pass
- [ ] Coverage >80%
- [ ] Performance test validates <200ms search

---

### TASK-008-WEB: E-commerce Customer Pages
**Owner:** Frontend Engineer (Web)  
**Estimated Effort:** 2 days  
**Description:**
1. Create Next.js pages:
   - `/[locale]/register` (customer registration)
   - `/[locale]/account/profile` (view/edit profile)
   - `/[locale]/account/addresses` (manage addresses)
   - `/[locale]/account/change-password`
2. Implement registration form with validation
3. Implement profile edit form
4. Implement address management UI (add, edit, delete, set default)
5. Use React Hook Form + Zod for validation
6. Store customer auth state in context (from SPEC-001)

**Files to Create:**
- `apps/web/app/[locale]/register/page.tsx`
- `apps/web/app/[locale]/account/profile/page.tsx`
- `apps/web/app/[locale]/account/addresses/page.tsx`
- `apps/web/app/[locale]/account/change-password/page.tsx`
- `apps/web/components/AddressForm.tsx`

**Acceptance:**
- [ ] Customer can register
- [ ] Customer can view/edit profile
- [ ] Customer can manage addresses
- [ ] Customer can change password
- [ ] Validation works (client + server)

---

### TASK-009-ADMIN: Customer Management Pages
**Owner:** Frontend Engineer (Admin)  
**Estimated Effort:** 2 days  
**Description:**
1. Create React pages:
   - Customers list (table with pagination, search, filters)
   - Customer detail view (profile + addresses + summary)
   - Customer create/edit form
2. Implement customer search bar (optimized for fast results)
3. Display customer summary (orders, payments, installments) — stub with zero values
4. Implement deactivate/reactivate buttons with confirmation
5. Display national ID masked in list, full in detail
6. Use React Query for data management

**Files to Create:**
- `apps/admin/src/pages/Customers.tsx`
- `apps/admin/src/pages/CustomerDetail.tsx`
- `apps/admin/src/pages/CustomerForm.tsx`
- `apps/admin/src/components/CustomerSearch.tsx`
- `apps/admin/src/components/CustomerSummary.tsx`

**Acceptance:**
- [ ] Staff can view customer list
- [ ] Staff can search/filter customers
- [ ] Staff can create/edit customers
- [ ] Staff can view customer detail with addresses
- [ ] Staff can deactivate/reactivate customers
- [ ] National ID masked in list, full in detail

---

### TASK-010-DESKTOP: POS Customer Search & Create
**Owner:** Frontend Engineer (Desktop)  
**Estimated Effort:** 1 day  
**Description:**
1. Create customer search component (quick lookup)
2. Create customer create/edit form (minimal fields for POS)
3. Display customer info card (name, phone, default address)
4. Integrate with sale flow (select customer before sale)
5. Show duplicate warning when creating customer

**Files to Create:**
- `apps/desktop/src/components/CustomerSearchPOS.tsx`
- `apps/desktop/src/components/CustomerFormPOS.tsx`
- `apps/desktop/src/components/CustomerCard.tsx`

**Acceptance:**
- [ ] Cashier can search customers quickly
- [ ] Cashier can create customers from POS
- [ ] Duplicate detection works
- [ ] Customer info displayed for sale flow

---

## Dependencies

**Upstream:**
- SPEC-001 (Auth/Users/Roles) — Required for authentication and RBAC

**Downstream:**
- SPEC-005 (Orders) — Orders reference customers
- SPEC-006 (Reservations) — Reservations reference customers
- SPEC-008 (Invoices/Payments) — Payments reference customers
- SPEC-009 (Installments) — Installment plans reference customers

---

## Files/Modules Expected to Change

### Created
- `prisma/schema.prisma` — Add `Address` table, update `Customer` table (add `isActive`)
- `packages/shared-types/src/customer.ts` — Customer types + DTOs
- `packages/shared-types/src/address.ts` — Address types + DTOs
- `apps/api/src/routes/customers.ts` — Customer routes
- `apps/api/src/controllers/customers.controller.ts` — Customer controller
- `apps/api/src/services/customers.service.ts` — Customer service
- `apps/api/src/services/addresses.service.ts` — Address service
- `apps/api/src/utils/phoneNormalizer.ts` — Phone normalization
- `apps/api/tests/customers.test.ts` — Customer tests
- `apps/api/tests/addresses.test.ts` — Address tests
- `apps/web/app/[locale]/register/page.tsx` — E-commerce registration
- `apps/web/app/[locale]/account/` — Customer account pages
- `apps/admin/src/pages/Customers.tsx` — Admin customer management
- `apps/desktop/src/components/CustomerSearchPOS.tsx` — POS customer search

### Modified
- `prisma/seed.ts` — Add sample customers and addresses
- `packages/shared-types/src/index.ts` — Export customer types

---

## Next Implementation Task

**After this specification is approved:**

Implement **TASK-001-DB: Database Schema** (Backend Engineer)

**DO NOT implement any tasks without approval.**

---

**End of SPEC-004**
