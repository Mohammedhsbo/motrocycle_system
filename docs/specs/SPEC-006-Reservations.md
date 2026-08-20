# SPEC-006: Reservations

**Feature Goal:** Implement comprehensive reservation management for motorcycle reservations with partial payments, expiration logic, atomic motorcycle allocation, and conversion to orders across all three applications.

**Priority:** P0 (Core MVP - Required for reservation-based sales)

**Dependencies:** 
- SPEC-001 (Authentication, Users & Roles)
- SPEC-002 (Brands, Categories & Motorcycles)  
- SPEC-004 (Customers)
- SPEC-005 (Orders)

---

## Scope

This specification covers:
- Reservation creation with motorcycle allocation
- Partial payment/deposit tracking
- Reservation expiration with automatic status transitions
- Reservation cancellation with inventory reversion
- Reservation-to-Order conversion with payment transfer
- Branch-scoped reservation management
- Customer reservation history

This specification **does NOT** cover:
- Payment processing (SPEC-008)
- Full payment/invoice generation (SPEC-008)
- Installment plans (SPEC-009)
- Letters/delivery documents (SPEC-010)
- Refund processing (SPEC-008)

These domains will reference reservations but are implemented separately.

---

## User Roles

| Role | Permissions |
|------|-------------|
| `super_admin` | Full access to all reservations across all branches |
| `branch_manager` | View/manage reservations for own branch |
| `cashier` | Create/view/manage reservations for own branch (POS operations) |
| `accountant` | Read-only access to reservations (for reports) |
| `inventory_clerk` | Read-only access to reservations |
| `customer` | Create reservations (e-commerce); view own reservations only |

---

## Reservation Lifecycle

### State Diagram (from BUSINESS_RULES.md)

```
ACTIVE ──► CONVERTED (to order)
  │
  ├──► EXPIRED (reservation period ends)
  │         │
  │         ▼
  └──► CANCELLED
```
### State Definitions

| Status | Description | Motorcycle Status | Who Can Set | Customer Visible |
|--------|-------------|-------------------|-------------|------------------|
| `active` | Reservation confirmed, motorcycle held | `reserved` | Customer (web), Cashier (POS) | Yes |
| `converted` | Reservation converted to order | `sold` | Staff (during conversion) | Yes |
| `expired` | Reservation period ended | `available` (revert) | System/Background job | Yes |
| `cancelled` | Reservation manually cancelled | `available` (revert) | Customer, Staff | Yes |

### Transition Rules (from BUSINESS_RULES.md)

| From | To | Condition | Who | Inventory Effect | Payment Effect |
|------|----|-----------|----|------------------|----------------|
| `active` | `converted` | Valid conversion request | Staff | Motorcycle → `sold` | Transfer to order |
| `active` | `expired` | Past expiration date | System/Job | Motorcycle → `available` | Deposit forfeit per policy |
| `active` | `cancelled` | Manual cancellation | Customer/Staff | Motorcycle → `available` | Refund per policy |
| `expired` | `cancelled` | Administrative cleanup | Staff | No change (already available) | No change |

**CRITICAL:** All transitions that change motorcycle status use database transactions with row-level locking.

---

## Functional Requirements

### FR-R01: Reservation Creation (E-commerce)
- Customer selects available motorcycle
- System validates motorcycle availability  
- Customer provides deposit amount (min/max rules)
- System creates reservation with status `active`
- Motorcycle status → `reserved` atomically
- Auto-generate sequential reservation number per branch
- Set expiration date based on business policy

### FR-R02: Reservation Creation (POS)
- Cashier selects customer (search or create)
- Cashier selects available motorcycle from own branch
- Cashier records deposit amount and payment method reference
- Optional reservation notes
- Reservation created with status `active`
- Motorcycle status → `reserved` atomically
- Reservation number auto-generated

### FR-R03: Motorcycle Allocation with Concurrency Protection
- Use database transaction with row-level lock (`SELECT ... FOR UPDATE`)
- Check motorcycle status is `available`
- Update motorcycle status → `reserved`
- Create reservation record
- Commit transaction
- If any step fails, rollback entire transaction
- Second concurrent attempt receives conflict error

### FR-R04: Partial Payment Tracking
- Track `totalPrice` (motorcycle price at reservation time - snapshot)
- Track `paidAmount` (sum of all payments against reservation)
- Calculate `remainingAmount` (totalPrice - paidAmount)
- Minimum deposit configurable per business policy
- Maximum deposit cannot exceed totalPrice
- Payment references stored (link to future Payment records)

### FR-R05: Reservation Expiration
- Set `expiresAt` timestamp at creation (configurable period, e.g., 7 days)
- Background job or manual process checks expired reservations
- On expiration: status → `expired`, motorcycle → `available`
- Expired reservations cannot be converted
- Deposit handling per business policy (forfeit or partial refund)
### FR-R06: Reservation Cancellation
- Customers can cancel `active` reservations
- Staff can cancel `active` reservations
- Cannot cancel `converted` or `expired` reservations
- On cancellation: status → `cancelled`, motorcycle → `available`
- Deposit refund per business policy
- Transaction ensures atomicity

### FR-R07: Reservation-to-Order Conversion
- Staff converts `active` reservation to order
- Validates motorcycle still `reserved`
- Creates new order with reservation's customer and motorcycle
- Transfers reservation payments to order
- Updates reservation: status → `converted`, set `convertedOrderId`
- Updates motorcycle: status → `sold`
- Entire operation is atomic

### FR-R08: Reservation Search & Filtering
- Search by: reservation number, customer name, customer phone, motorcycle VIN
- Filter by: status, branch, expiration date range, creation date range
- Pagination with configurable page size
- Sort by: date, customer name, total price, expiration date

### FR-R09: Reservation History
- Customers view own reservation history (e-commerce)
- Staff view all reservations (branch-scoped)
- Reservation detail shows: customer, motorcycle, pricing, payment history, status history

### FR-R10: Branch Scoping
- Reservations associated with branch where created
- For e-commerce: motorcycle's current branch
- For POS: staff user's branch
- Branch-scoped staff see only own branch reservations
- Super_admin sees all branches

---

## Business Rules

### BR-R01: Reservation Number Generation
- Format: `RES-{branchCode}-{year}-{sequence}`
- Example: `RES-RYD-2026-00001`
- Sequential per branch per year
- Thread-safe generation (Redis or DB sequence)

### BR-R02: Motorcycle Availability Validation
- Can only reserve motorcycle with status `available`
- Cannot reserve `reserved`, `sold`, `in_transfer`, `maintenance`, `in_transit`, `returned`
- Validation occurs within transaction holding lock

### BR-R03: Concurrent Reservation Prevention
- Two users attempt to reserve same motorcycle simultaneously
- First to acquire row lock succeeds
- Second receives `MOTORCYCLE_ALREADY_RESERVED` error
- No double-booking possible

### BR-R04: Reservation-Motorcycle Relationship
- One reservation references exactly one motorcycle
- One motorcycle can be referenced by at most one active reservation
- Historical reservations preserve motorcycle reference

### BR-R05: Deposit Rules
- Minimum deposit: configurable (e.g., 10% of motorcycle price or 1000 SAR)
- Maximum deposit: cannot exceed `totalPrice`
- Deposit must be > 0 for reservation creation
- Additional payments can be made against reservation
### BR-R06: Expiration Rules
- Default expiration period: configurable (e.g., 7 days from creation)
- Can be extended by staff before expiration
- Expired reservations automatically → `expired` by background job
- Cannot convert expired reservations
- Motorcycle becomes `available` on expiration

### BR-R07: Cancellation Rules
- Customer can cancel: `active` status only
- Staff can cancel: `active` status only  
- Cannot cancel `converted` (already an order)
- Cannot cancel `expired` (already expired)
- Refund policy configurable per business rules

### BR-R08: Conversion Rules
- Can only convert `active` reservations
- Cannot convert `expired`, `cancelled`, or already `converted`
- Motorcycle must still be `reserved`
- Creates 1:1 relationship with new order
- All reservation payments transfer to order
- Conversion is atomic transaction

### BR-R09: Pricing Snapshot
- `totalPrice` stores motorcycle price at reservation time
- Independent of current motorcycle price
- Remaining amount calculated from snapshot price
- Protects customer from price increases during reservation period

### BR-R10: Payment Integration Boundary
- Reservation tracks payment references (not full payment processing)
- `paidAmount` updated when payments recorded against reservation
- Integration with future Payment domain via payment references
- Refunds handled by future Payment domain

---

## Data Requirements

### Reservation Entity (from DATABASE_DESIGN.md)

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| reservationNumber | VARCHAR(30) | UNIQUE, NOT NULL |
| customerId | UUID | FK → Customer, NOT NULL |
| motorcycleId | UUID | FK → Motorcycle, NOT NULL |
| branchId | UUID | FK → Branch, NOT NULL |
| userId | UUID | FK → User, NOT NULL (staff who created) |
| status | VARCHAR(20) | NOT NULL, default 'active' |
| totalPrice | DECIMAL(12,2) | NOT NULL (price snapshot) |
| paidAmount | DECIMAL(12,2) | default 0 |
| remainingAmount | DECIMAL(12,2) | NOT NULL |
| expiresAt | TIMESTAMP | nullable |
| notes | TEXT | nullable |
| convertedOrderId | UUID | FK → Order, nullable |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

**Indexes:** `(reservationNumber)`, `(customerId)`, `(motorcycleId)`, `(status)`, `(expiresAt)`, `(branchId)`

**Check Constraint:** `status IN ('active','converted','expired','cancelled')`

**Check Constraint:** `paidAmount <= totalPrice`

**Check Constraint:** `remainingAmount = totalPrice - paidAmount`

---

### Relationships
- `Reservation` → `Customer` (many-to-one)
- `Reservation` → `Motorcycle` (many-to-one)
- `Reservation` → `Branch` (many-to-one)  
- `Reservation` → `User` (many-to-one, who created)
- `Reservation` → `Order` (one-to-one, nullable, when converted)
- `Payment` → `Reservation` (many-to-one, from future spec)
---

## API Requirements

### POST `/api/v1/reservations`
**Description:** Create new reservation (e-commerce or POS)

**Required Permission:** `reservation:create` (staff) or authenticated customer (e-commerce)

**Request Body:**
```typescript
{
  customerId: string;        // UUID (staff selects; e-commerce = current user)
  motorcycleId: string;      // UUID
  branchId?: string;         // UUID (staff selects; e-commerce = motorcycle's branch)
  paidAmount: number;        // Deposit amount, decimal(12,2)
  paymentReference?: string; // Reference to payment record (future integration)
  expirationDays?: number;   // Override default expiration (staff only)
  notes?: string;            // Staff notes
}
```

**Response (201):**
```typescript
{
  success: true,
  data: {
    id: string;
    reservationNumber: string;
    customer: {
      id: string;
      name: string;
      phone: string;
    };
    motorcycle: {
      id: string;
      vin: string;
      model: string;
      brand: { nameAr: string; nameEn: string; };
      currentStatus: string;   // 'reserved'
    };
    branch: {
      id: string;
      nameAr: string;
      nameEn: string;
    };
    user: {
      id: string;
      name: string;
    };
    status: string;            // 'active'
    totalPrice: number;        // Motorcycle price snapshot
    paidAmount: number;        // Deposit amount
    remainingAmount: number;   // totalPrice - paidAmount
    expiresAt: string;         // ISO 8601 timestamp
    notes?: string;
    createdAt: string;
  }
}
```

**Errors:**
- 404: `CUSTOMER_NOT_FOUND`, `MOTORCYCLE_NOT_FOUND`, `BRANCH_NOT_FOUND`
- 403: `BRANCH_SCOPE_VIOLATION` (staff creating in another branch)
- 409: `MOTORCYCLE_NOT_AVAILABLE` (status not 'available')
- 409: `MOTORCYCLE_ALREADY_RESERVED` (concurrent reservation)
- 422: `INVALID_DEPOSIT_AMOUNT` (below minimum or above maximum)

**Transaction Logic:**
```typescript
BEGIN TRANSACTION;
  motorcycle = SELECT * FROM motorcycles WHERE id = ? FOR UPDATE;
  IF motorcycle.status != 'available':
    ROLLBACK;
    THROW MOTORCYCLE_NOT_AVAILABLE;
  IF motorcycle.branchId != reservation.branchId:
    ROLLBACK;
    THROW MOTORCYCLE_WRONG_BRANCH;
  UPDATE motorcycles SET status = 'reserved' WHERE id = ?;
  INSERT INTO reservations (...);
COMMIT;
```

**Side Effects:**
- Generate reservation number
- Allocate motorcycle (status → `reserved`)
- Set expiration timestamp
- Emit WebSocket event: `reservation:created`
- Audit log entry
---

### GET `/api/v1/reservations`
**Description:** List reservations (paginated, filtered)

**Required Permission:** `reservation:read` (staff) or authenticated customer (own reservations only)

**Query Parameters:**
- `page` (number, default 1)
- `limit` (number, default 20, max 100)
- `search` (string) — searches reservation number, customer name, phone, motorcycle VIN
- `customerId` (UUID) — filter by customer
- `branchId` (UUID) — filter by branch
- `status` (string) — filter by status
- `startDate`, `endDate` (ISO 8601) — filter by creation date
- `expiringBefore` (ISO 8601) — filter by expiration date
- `sort` (string) — `createdAt`, `expiresAt`, `totalPrice`, `reservationNumber` (default: `createdAt`)
- `order` (string) — `asc`, `desc` (default: `desc`)

**Response (200):**
```typescript
{
  success: true,
  data: Array<{
    id: string;
    reservationNumber: string;
    customer: {
      id: string;
      name: string;
      phone: string;
    };
    motorcycle: {
      id: string;
      vin: string;
      model: string;
      brand: { nameAr: string; nameEn: string; };
    };
    branch: {
      id: string;
      nameAr: string;
      nameEn: string;
    };
    status: string;
    totalPrice: number;
    paidAmount: number;
    remainingAmount: number;
    expiresAt?: string;
    daysUntilExpiry?: number;   // Calculated field
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

**Branch Scoping:** 
- Branch-scoped staff see only own branch reservations
- Customers see only own reservations
- Super_admin sees all reservations

---

### GET `/api/v1/reservations/:id`
**Description:** Get single reservation with full details

**Required Permission:** `reservation:read` (staff) or own reservation (customer)

**Response (200):**
```typescript
{
  success: true,
  data: {
    id: string;
    reservationNumber: string;
    customer: {
      id: string;
      name: string;
      phone: string;
      email?: string;
      defaultAddress?: {
        addressLine: string;
        city?: string;
      };
    };
    motorcycle: {
      id: string;
      vin: string;
      model: string;
      year: number;
      color?: string;
      brand: {
        id: string;
        nameAr: string;
        nameEn: string;
      };
      currentStatus: string;     // Current motorcycle status
      currentPrice?: number;     // Current price (staff only, for comparison)
    };
    branch: {
      id: string;
      nameAr: string;
      nameEn: string;
    };
    user: {
      id: string;
      name: string;
    };
    status: string;
    totalPrice: number;          // Price at reservation time (snapshot)
    paidAmount: number;
    remainingAmount: number;
    expiresAt?: string;
    daysUntilExpiry?: number;
    notes?: string;
    convertedOrder?: {           // If converted
      id: string;
      orderNumber: string;
      status: string;
    };
    statusHistory: Array<{       // From audit log
      status: string;
      changedAt: string;
      changedBy: {
        id: string;
        name: string;
      };
      reason?: string;
    }>;
    paymentSummary?: {           // Future integration stub
      totalPaid: number;
      paymentCount: number;
      lastPaymentDate?: string;
    };
    createdAt: string;
    updatedAt: string;
  }
}
```

**Errors:**
- 404: `RESERVATION_NOT_FOUND`
- 403: `BRANCH_SCOPE_VIOLATION` or customer accessing another customer's reservation
---

### PATCH `/api/v1/reservations/:id`
**Description:** Update reservation (limited fields)

**Required Permission:** `reservation:update`

**Request Body (all optional):**
```typescript
{
  expiresAt?: string;          // Extend/change expiration (staff only)
  notes?: string;              // Staff can always update
}
```

**Response (200):** Updated reservation object (same as GET)

**Errors:**
- 404: `RESERVATION_NOT_FOUND`
- 403: `BRANCH_SCOPE_VIOLATION`
- 409: `RESERVATION_NOT_ACTIVE` (cannot update expired/cancelled/converted)

**Rules:**
- Can only update `active` reservations
- Cannot change customer, motorcycle, or amounts
- Can extend expiration (staff only)
- Can update notes at any time

---

### POST `/api/v1/reservations/:id/cancel`
**Description:** Cancel reservation

**Required Permission:** `reservation:delete` (staff) or own reservation (customer)

**Request Body:**
```typescript
{
  reason?: string;             // Cancellation reason
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
- 404: `RESERVATION_NOT_FOUND`
- 403: `FORBIDDEN` (customer accessing another reservation)
- 409: `RESERVATION_NOT_ACTIVE` (cannot cancel converted/expired)

**Transaction Logic:**
```typescript
BEGIN TRANSACTION;
  reservation = SELECT * FROM reservations WHERE id = ? FOR UPDATE;
  IF reservation.status != 'active':
    ROLLBACK;
    THROW RESERVATION_NOT_ACTIVE;
  UPDATE reservations SET status = 'cancelled' WHERE id = ?;
  UPDATE motorcycles SET status = 'available' WHERE id = reservation.motorcycleId;
COMMIT;
```

**Side Effects:**
- Reservation status → `cancelled`
- Motorcycle → `available` (atomic)
- Emit WebSocket event: `reservation:cancelled`
- Audit log entry with reason
- Trigger refund process (future integration)

---

### POST `/api/v1/reservations/:id/convert`
**Description:** Convert reservation to order

**Required Permission:** `reservation:update`

**Request Body:**
```typescript
{
  notes?: string;              // Optional conversion notes
}
```

**Response (200):**
```typescript
{
  success: true,
  data: {
    reservationId: string;
    orderId: string;
    orderNumber: string;
    transferredAmount: number;   // Amount transferred from reservation
    remainingAmount: number;     // Still owed on order
  }
}
```

**Errors:**
- 404: `RESERVATION_NOT_FOUND`
- 403: `BRANCH_SCOPE_VIOLATION`
- 409: `RESERVATION_NOT_ACTIVE` (expired/cancelled)
- 409: `RESERVATION_ALREADY_CONVERTED`
- 409: `MOTORCYCLE_STATUS_CHANGED` (no longer reserved)

**Transaction Logic:**
```typescript
BEGIN TRANSACTION;
  reservation = SELECT * FROM reservations WHERE id = ? FOR UPDATE;
  motorcycle = SELECT * FROM motorcycles WHERE id = reservation.motorcycleId FOR UPDATE;
  
  IF reservation.status != 'active':
    ROLLBACK;
    THROW RESERVATION_NOT_ACTIVE;
  IF reservation.convertedOrderId IS NOT NULL:
    ROLLBACK;
    THROW RESERVATION_ALREADY_CONVERTED;
  IF motorcycle.status != 'reserved':
    ROLLBACK;
    THROW MOTORCYCLE_STATUS_CHANGED;
    
  // Create order
  order = INSERT INTO orders (customerId, branchId, motorcycleId, totalAmount, ...);
  
  // Transfer payment amount
  IF reservation.paidAmount > 0:
    // Create payment record or reference (future integration)
    INSERT INTO payments (orderId, amount, ...);
  
  // Update reservation
  UPDATE reservations SET status = 'converted', convertedOrderId = order.id WHERE id = ?;
  
  // Update motorcycle
  UPDATE motorcycles SET status = 'sold' WHERE id = ?;
COMMIT;
```

**Side Effects:**
- Create new order with reservation details
- Transfer reservation payments to order
- Reservation status → `converted`, set `convertedOrderId`
- Motorcycle → `sold` (atomic)
- Emit WebSocket events: `reservation:converted`, `order:created`
- Audit log entries for both reservation and order
---

### POST `/api/v1/reservations/:id/extend`
**Description:** Extend reservation expiration (staff only)

**Required Permission:** `reservation:update`

**Request Body:**
```typescript
{
  expiresAt: string;           // New expiration date (ISO 8601)
  reason?: string;             // Extension reason
}
```

**Response (200):**
```typescript
{
  success: true,
  data: {
    id: string;
    reservationNumber: string;
    expiresAt: string;
    daysUntilExpiry: number;
  }
}
```

**Errors:**
- 404: `RESERVATION_NOT_FOUND`
- 409: `RESERVATION_NOT_ACTIVE`
- 422: `INVALID_EXPIRATION_DATE` (in past or too far future)

**Side Effects:**
- Update `expiresAt` timestamp
- Audit log entry with reason
- Emit WebSocket event: `reservation:extended`

---

### GET `/api/v1/reservations/:id/history`
**Description:** Get reservation status change history

**Required Permission:** `reservation:read`

**Response (200):**
```typescript
{
  success: true,
  data: Array<{
    id: string;
    action: string;            // "reservation:status_change", "reservation:created", etc.
    before: {
      status?: string;
      expiresAt?: string;
    };
    after: {
      status: string;
      expiresAt?: string;
    };
    user: {
      id: string;
      name: string;
    };
    reason?: string;
    createdAt: string;
  }>
}
```

---

### GET `/api/v1/customers/:customerId/reservations`
**Description:** Get customer reservation history (convenience endpoint)

**Required Permission:** `reservation:read` (staff) or own customer ID (e-commerce)

**Query Parameters:** Same as GET `/api/v1/reservations` (pagination, filters)

**Response (200):** Same as GET `/api/v1/reservations`

**Branch Scoping:** Not applicable (customer data is global)

---

### POST `/api/v1/reservations/expire`
**Description:** Process expired reservations (background job endpoint)

**Required Permission:** `system` (internal job only)

**Request Body:**
```typescript
{
  limit?: number;              // Max reservations to process (default 100)
}
```

**Response (200):**
```typescript
{
  success: true,
  data: {
    processedCount: number;
    expiredReservations: Array<{
      id: string;
      reservationNumber: string;
      customerId: string;
      motorcycleId: string;
    }>;
  }
}
```

**Logic:**
- Find active reservations with `expiresAt < NOW()`
- For each: status → `expired`, motorcycle → `available`
- Process in batches to avoid long transactions
- Emit events, log operations

---

## Validation Rules

### Reservation
- `customerId`: Required UUID, must exist
- `motorcycleId`: Required UUID, must exist, status must be 'available'
- `branchId`: Required UUID, must exist
- `paidAmount`: Required, decimal(12,2), >= minimum deposit, <= totalPrice
- `expirationDays`: Optional, integer, 1-90 days (configurable)
- `notes`: Optional, max 2000 chars
- `status`: Must be valid enum value

### Deposit Amount
- Must be > 0
- Must be >= minimum deposit (configurable, e.g., 10% of price or 1000 SAR)
- Cannot exceed motorcycle's current price
- Must be whole currency units (no fractional cents)

### Expiration Date
- Must be future date
- Cannot be more than configured maximum (e.g., 90 days)
- Must be business days only (optional rule)

---

## Error Cases

| Scenario | HTTP Status | Error Code |
|----------|-------------|------------|
| Reservation not found | 404 | `RESERVATION_NOT_FOUND` |
| Customer not found | 404 | `CUSTOMER_NOT_FOUND` |
| Motorcycle not found | 404 | `MOTORCYCLE_NOT_FOUND` |
| Branch not found | 404 | `BRANCH_NOT_FOUND` |
| Motorcycle not available | 409 | `MOTORCYCLE_NOT_AVAILABLE` |
| Motorcycle already reserved | 409 | `MOTORCYCLE_ALREADY_RESERVED` |
| Motorcycle wrong branch | 409 | `MOTORCYCLE_WRONG_BRANCH` |
| Reservation not active | 409 | `RESERVATION_NOT_ACTIVE` |
| Reservation already converted | 409 | `RESERVATION_ALREADY_CONVERTED` |
| Motorcycle status changed | 409 | `MOTORCYCLE_STATUS_CHANGED` |
| Invalid deposit amount | 422 | `INVALID_DEPOSIT_AMOUNT` |
| Invalid expiration date | 422 | `INVALID_EXPIRATION_DATE` |
| Branch scope violation | 403 | `BRANCH_SCOPE_VIOLATION` |
| Forbidden | 403 | `FORBIDDEN` |
---

## Permission Requirements

### Reservation Management
- `reservation:create` — Create reservations (staff and customers)
- `reservation:read` — View reservations
- `reservation:update` — Update reservations, extend expiration, convert to order
- `reservation:delete` — Cancel reservations

### Default Role Permissions
- `super_admin`: All reservation permissions
- `branch_manager`: reservation:* (all, branch-scoped)
- `cashier`: reservation:create, reservation:read, reservation:update (branch-scoped)
- `accountant`: reservation:read
- `inventory_clerk`: reservation:read
- `customer`: reservation:create, reservation:read (own reservations only, enforced by ID check)

---

## Concurrency & Transaction Safety

### Critical Section: Motorcycle Reservation

**Problem:** Two users attempt to reserve the same motorcycle simultaneously.

**Solution:** Database transaction with row-level locking (`SELECT ... FOR UPDATE`)

**Implementation:**
```typescript
async function createReservation(reservationData) {
  return await db.transaction(async (tx) => {
    // 1. Lock motorcycle
    const motorcycle = await tx.motorcycles.findUnique({
      where: { id: reservationData.motorcycleId },
      lock: 'FOR UPDATE'
    });
    
    // 2. Validate availability
    if (!motorcycle) {
      throw new MotorcycleNotFoundError();
    }
    if (motorcycle.status !== 'available') {
      throw new MotorcycleNotAvailableError(motorcycle.status);
    }
    if (motorcycle.branchId !== reservationData.branchId) {
      throw new MotorcycleWrongBranchError();
    }
    
    // 3. Update motorcycle status
    await tx.motorcycles.update({
      where: { id: reservationData.motorcycleId },
      data: { status: 'reserved' }
    });
    
    // 4. Create reservation
    const reservation = await tx.reservations.create({
      data: {
        ...reservationData,
        totalPrice: motorcycle.price,  // Snapshot
        remainingAmount: motorcycle.price - reservationData.paidAmount
      }
    });
    
    return reservation;
  });
}
```

**Expected Behavior:**
- User A acquires lock → succeeds
- User B waits for lock
- User A commits (motorcycle now `reserved`)
- User B acquires lock, sees status = `reserved`, throws `MOTORCYCLE_ALREADY_RESERVED`

---

## WebSocket Events

### Event: `reservation:created`
**Payload:**
```typescript
{
  reservationId: string;
  reservationNumber: string;
  customerId: string;
  motorcycleId: string;
  branchId: string;
  totalPrice: number;
  paidAmount: number;
  expiresAt?: string;
}
```
**Audience:** Staff in same branch, super_admin

### Event: `reservation:cancelled`
**Payload:**
```typescript
{
  reservationId: string;
  reservationNumber: string;
  branchId: string;
  motorcycleId: string;
  reason?: string;
}
```
**Audience:** Staff in same branch, super_admin, customer (if their reservation)

### Event: `reservation:converted`
**Payload:**
```typescript
{
  reservationId: string;
  reservationNumber: string;
  orderId: string;
  orderNumber: string;
  branchId: string;
  motorcycleId: string;
}
```
**Audience:** Staff in same branch, super_admin, customer

### Event: `reservation:expired`
**Payload:**
```typescript
{
  reservationId: string;
  reservationNumber: string;
  branchId: string;
  motorcycleId: string;
  customerId: string;
}
```
**Audience:** Staff in same branch, super_admin, customer

---

## Edge Cases

### EC-R01: Concurrent Reservation of Same Motorcycle
- Customer A and B select same motorcycle for reservation
- Both click "Reserve" simultaneously
- Transaction A acquires lock, validates, updates status → `reserved`, commits
- Transaction B waits, acquires lock, sees status = `reserved`, throws error
- Customer B receives 409: `MOTORCYCLE_ALREADY_RESERVED`

### EC-R02: Motorcycle Becomes Unavailable During Reservation
- Customer adds motorcycle to reservation (status `available`)
- Before completing reservation, staff sells motorcycle (status → `sold`)
- Customer submits reservation
- Fails with 409: `MOTORCYCLE_NOT_AVAILABLE`

### EC-R03: Reservation Expires During Conversion
- Staff attempts to convert reservation
- Background job expires reservation simultaneously
- Conversion process acquires lock, sees status = `expired`
- Conversion fails with 409: `RESERVATION_NOT_ACTIVE`

### EC-R04: Customer Cancelled During Reservation
- Customer account deactivated while reservation being created
- Reservation creation validates customer `isActive = true`
- If inactive, reject with 403: `CUSTOMER_INACTIVE`

### EC-R05: Motorcycle Transferred During Active Reservation
- Reservation exists for motorcycle at Branch A
- Admin tries to transfer motorcycle to Branch B
- Transfer validates motorcycle status (must be `available`)
- Transfer rejected: motorcycle status = `reserved`

### EC-R06: Double Conversion Attempt
- Staff converts reservation (status → `converted`)
- Another staff member attempts conversion of same reservation
- Second attempt validates status, finds `converted`
- Rejected with 409: `RESERVATION_ALREADY_CONVERTED`

### EC-R07: Payment After Expiration
- Reservation expires (status → `expired`, motorcycle → `available`)
- Customer attempts to make additional payment
- Payment system validates reservation status
- Rejected: cannot pay against expired reservation

### EC-R08: Reservation Extension Past Maximum Period
- Staff extends reservation expiration to 120 days
- System validates against maximum (e.g., 90 days)
- Rejected with 422: `INVALID_EXPIRATION_DATE`

### EC-R09: Customer Viewing Converted Reservation
- Customer views reservation that was converted to order
- Reservation shows `convertedOrderId` and link to order
- Customer can see both reservation history and current order status

### EC-R10: Deposit Exceeds Current Motorcycle Price
- Reservation created with deposit = 5000 when motorcycle price = 6000
- Motorcycle price drops to 4000
- Reservation retains originalPrice = 6000 (snapshot)
- No conflict: deposit was valid at reservation time
---

## Acceptance Criteria

### AC-R01: Reservation Creation (E-commerce)
- [ ] Customer can reserve available motorcycle with valid deposit
- [ ] Reservation number auto-generated correctly
- [ ] Motorcycle status updates to `reserved` atomically
- [ ] Expiration date set based on configuration
- [ ] Pricing snapshot stored correctly

### AC-R02: Reservation Creation (POS)
- [ ] Cashier can create reservation for customer in own branch
- [ ] Motorcycle allocated atomically
- [ ] Can set custom expiration period
- [ ] Payment reference recorded

### AC-R03: Concurrent Reservation Prevention
- [ ] Two simultaneous reservations of same motorcycle handled safely
- [ ] First succeeds, second receives 409 error
- [ ] No double-booking possible
- [ ] Tested with concurrent requests

### AC-R04: Deposit Validation
- [ ] Minimum deposit enforced
- [ ] Deposit cannot exceed motorcycle price
- [ ] Invalid deposits rejected with 422
- [ ] Remaining amount calculated correctly

### AC-R05: Reservation Expiration
- [ ] Background job processes expired reservations
- [ ] Expired reservations → `expired` status
- [ ] Motorcycles revert to `available` atomically
- [ ] Cannot convert expired reservations

### AC-R06: Reservation Cancellation
- [ ] Customer can cancel own `active` reservation
- [ ] Staff can cancel `active` reservations
- [ ] Cannot cancel `converted` or `expired`
- [ ] Motorcycle reverts to `available` atomically
- [ ] Refund process triggered (future integration)

### AC-R07: Reservation-to-Order Conversion
- [ ] Can convert `active` reservation to order
- [ ] Creates new order with reservation details
- [ ] Transfers payments to order
- [ ] Updates reservation status to `converted`
- [ ] Updates motorcycle status to `sold`
- [ ] Entire conversion is atomic

### AC-R08: Branch Scoping
- [ ] Branch-scoped staff see only own branch reservations
- [ ] Cannot create reservation in another branch
- [ ] Cannot access another branch's reservation
- [ ] Super_admin sees all branches

### AC-R09: Customer Privacy
- [ ] Customers see only own reservations
- [ ] Cannot access another customer's reservation (403)
- [ ] Reservation history preserves pricing snapshots

### AC-R10: Reservation Search & History
- [ ] Search by reservation number works
- [ ] Search by customer name/phone works  
- [ ] Search by motorcycle VIN works
- [ ] Filter by status/branch/expiration works
- [ ] Status change history tracked in audit log

---

## Test Requirements

### Unit Tests
- [ ] Reservation number generation logic (sequential, branch-specific)
- [ ] Deposit validation (minimum, maximum)
- [ ] Remaining amount calculation
- [ ] Expiration date calculation
- [ ] Status transition validation
- [ ] Conversion eligibility validation

### Integration Tests
- [ ] POST `/reservations` — e-commerce reservation creation
- [ ] POST `/reservations` — POS reservation creation
- [ ] POST `/reservations` — motorcycle not available (409)
- [ ] POST `/reservations` — invalid deposit (422)
- [ ] GET `/reservations` — pagination and filters
- [ ] GET `/reservations/:id` — reservation detail
- [ ] PATCH `/reservations/:id` — extend expiration
- [ ] POST `/reservations/:id/cancel` — cancel reservation
- [ ] POST `/reservations/:id/convert` — convert to order
- [ ] POST `/reservations/:id/convert` — double conversion (409)
- [ ] POST `/reservations/expire` — batch expiration
- [ ] GET `/reservations/:id/history` — audit trail
- [ ] Branch scoping enforcement
- [ ] Customer accessing own reservation (success)
- [ ] Customer accessing another reservation (403)
- [ ] WebSocket events emitted correctly

### Concurrency Tests
- [ ] Two simultaneous reservations of same motorcycle (race condition)
- [ ] First succeeds, second gets 409
- [ ] No double-booking under high concurrency
- [ ] Reservation conversion vs cancellation race condition

### Performance Tests
- [ ] Reservation creation <500ms
- [ ] Reservation list with 10,000+ reservations (pagination)
- [ ] Search with 10,000+ reservations (<200ms)
- [ ] Batch expiration of 1000+ reservations

### E2E Tests (Later Phase)
- [ ] E-commerce: Browse → reserve motorcycle → view reservation
- [ ] POS: Search customer → create reservation → convert to order
- [ ] Admin: View reservations → extend expiration → convert to order

---

## Implementation Tasks

### TASK-001-DB: Database Schema
**Owner:** Backend Engineer  
**Estimated Effort:** 0.5 day  
**Description:**
1. Reservation table already exists in schema (DATABASE_DESIGN.md)
2. Add indexes on `(expiresAt)`, `(branchId)`, `(status, expiresAt)` for expiration queries
3. Add check constraints on status enum and amount calculations  
4. Update seed script with sample reservations (at least 20 reservations across branches, various statuses including some near expiration)
5. Verify foreign key constraints to Customer, Motorcycle, Branch, User, Order

**Files to Modify:**
- `prisma/schema.prisma`
- `prisma/seed.ts`

**Acceptance:**
- [ ] Migration runs successfully
- [ ] Seed creates sample reservations
- [ ] Expiration index optimizes background job queries
- [ ] Check constraints prevent invalid data

---

### TASK-002-SHARED: Shared Types
**Owner:** Backend Engineer  
**Estimated Effort:** 0.5 day  
**Description:**
1. Add `ReservationStatus` enum (active, converted, expired, cancelled)
2. Define interfaces: `Reservation`
3. Define DTOs: `CreateReservationDto`, `UpdateReservationDto`, `CancelReservationDto`, `ConvertReservationDto`
4. Create Zod schemas for all DTOs including deposit validation
5. Export status transition validation utility
6. Export deposit calculation utilities

**Files to Create:**
- `packages/shared-types/src/reservation.ts`

**Files to Modify:**
- `packages/shared-types/src/enums.ts`
- `packages/shared-types/src/index.ts`

**Acceptance:**
- [ ] All DTOs have Zod schemas
- [ ] ReservationStatus enum matches BUSINESS_RULES.md
- [ ] Deposit validation rules implemented
---

### TASK-003-API: Reservation Number Generation
**Owner:** Backend Engineer  
**Estimated Effort:** 0.5 day  
**Description:**
1. Create utility for reservation number generation
2. Format: `RES-{branchCode}-{year}-{sequence}`
3. Use Redis or database sequence for atomic increments per branch per year
4. Handle year rollover
5. Thread-safe implementation

**Files to Create:**
- `apps/api/src/utils/reservationNumberGenerator.ts`

**Acceptance:**
- [ ] Reservation numbers generated sequentially per branch
- [ ] No duplicates under concurrency
- [ ] Format matches specification

---

### TASK-004-API: Reservation Creation with Motorcycle Allocation
**Owner:** Backend Engineer  
**Estimated Effort:** 2 days  
**Description:**
1. Implement POST `/reservations` endpoint
2. Create reservation service with atomic transaction logic:
   - Lock motorcycle (`SELECT ... FOR UPDATE`)
   - Validate availability, branch, customer
   - Validate deposit amount (min/max rules)
   - Update motorcycle status → `reserved`
   - Create reservation with auto-generated number and pricing snapshot
   - Calculate expiration date
3. Handle concurrency conflicts with clear errors
4. Emit WebSocket events
5. Log all operations

**Files to Create:**
- `apps/api/src/routes/reservations.ts`
- `apps/api/src/controllers/reservations.controller.ts`
- `apps/api/src/services/reservations.service.ts`

**Acceptance:**
- [ ] Reservation creation works (e-commerce and POS)
- [ ] Motorcycle allocated atomically
- [ ] Concurrent reservation prevention works
- [ ] Deposit validation enforced
- [ ] Pricing snapshots stored correctly
- [ ] Expiration date calculated correctly
- [ ] WebSocket events emitted

---

### TASK-005-API: Reservation Retrieval & Search
**Owner:** Backend Engineer  
**Estimated Effort:** 1.5 days  
**Description:**
1. Implement GET `/reservations` with pagination, filters, search
2. Implement GET `/reservations/:id` with full details
3. Implement GET `/customers/:customerId/reservations`
4. Create search logic:
   - Reservation number (exact or partial)
   - Customer name/phone (fuzzy)
   - Motorcycle VIN
5. Apply branch scoping
6. Apply customer privacy (own reservations only for e-commerce)
7. Include calculated fields (days until expiry, payment summary)

**Files to Modify:**
- `apps/api/src/routes/reservations.ts`
- `apps/api/src/controllers/reservations.controller.ts`
- `apps/api/src/services/reservations.service.ts`

**Acceptance:**
- [ ] Reservation list with pagination works
- [ ] Search by reservation number works
- [ ] Search by customer name/phone works
- [ ] Filter by status/branch/expiration works
- [ ] Branch scoping applied
- [ ] Customer privacy enforced
- [ ] Days until expiry calculated correctly

---

### TASK-006-API: Reservation Status Management
**Owner:** Backend Engineer  
**Estimated Effort:** 1 day  
**Description:**
1. Implement PATCH `/reservations/:id` for limited updates
2. Implement POST `/reservations/:id/extend` for expiration extension
3. Create status transition validation
4. Validate can only update active reservations
5. Emit WebSocket events
6. Log all changes

**Files to Modify:**
- `apps/api/src/routes/reservations.ts`
- `apps/api/src/controllers/reservations.controller.ts`
- `apps/api/src/services/reservations.service.ts`

**Acceptance:**
- [ ] Can extend expiration of active reservations
- [ ] Cannot update expired/converted/cancelled reservations
- [ ] Extension validation (future date, max period)
- [ ] WebSocket events emitted
- [ ] Audit log created

---

### TASK-007-API: Reservation Cancellation & Expiration
**Owner:** Backend Engineer  
**Estimated Effort:** 1.5 days  
**Description:**
1. Implement POST `/reservations/:id/cancel`
2. Implement POST `/reservations/expire` (background job endpoint)
3. Cancellation logic:
   - Validate can cancel (active only)
   - Update reservation status → `cancelled`
   - Revert motorcycle → `available` (transaction)
4. Expiration logic:
   - Find reservations with `expiresAt < NOW()`
   - Batch process: status → `expired`, motorcycle → `available`
5. Permission checks, emit events, log operations

**Files to Modify:**
- `apps/api/src/routes/reservations.ts`
- `apps/api/src/controllers/reservations.controller.ts`
- `apps/api/src/services/reservations.service.ts`

**Acceptance:**
- [ ] Cancellation works for active reservations
- [ ] Cannot cancel converted/expired reservations
- [ ] Motorcycle reverts to available atomically
- [ ] Batch expiration processes multiple reservations
- [ ] Customer/staff permission enforced

---

### TASK-008-API: Reservation-to-Order Conversion
**Owner:** Backend Engineer  
**Estimated Effort:** 2 days  
**Description:**
1. Implement POST `/reservations/:id/convert` endpoint
2. Create atomic conversion logic:
   - Validate reservation can be converted (active, not expired)
   - Validate motorcycle still reserved
   - Create new order with reservation details
   - Transfer payment references (future integration stub)
   - Update reservation: status → `converted`, set `convertedOrderId`
   - Update motorcycle: status → `sold`
3. Handle double conversion attempts
4. Integrate with Order creation from SPEC-005
5. Emit events for both reservation and order

**Files to Modify:**
- `apps/api/src/routes/reservations.ts`
- `apps/api/src/controllers/reservations.controller.ts`
- `apps/api/src/services/reservations.service.ts`

**Dependencies:** TASK-004-API from SPEC-005 (Order creation service)

**Acceptance:**
- [ ] Conversion creates new order
- [ ] Payment amounts transfer to order
- [ ] Reservation marked as converted
- [ ] Motorcycle status updated to sold
- [ ] Cannot convert same reservation twice
- [ ] Cannot convert expired/cancelled reservations

---

### TASK-009-API: Reservation History & Audit
**Owner:** Backend Engineer  
**Estimated Effort:** 0.5 day  
**Description:**
1. Implement GET `/reservations/:id/history` endpoint
2. Query audit log for reservation-related events
3. Format status change history with user, timestamp, reason
4. Return chronological timeline

**Files to Modify:**
- `apps/api/src/routes/reservations.ts`
- `apps/api/src/controllers/reservations.controller.ts`
- `apps/api/src/services/reservations.service.ts`

**Acceptance:**
- [ ] Reservation history returns all status changes
- [ ] Includes user who made change
- [ ] Includes reason if provided
- [ ] Chronological order

---

### TASK-010-API: Integration Tests
**Owner:** Backend Engineer  
**Estimated Effort:** 2.5 days  
**Description:**
1. Write integration tests for:
   - Reservation creation (e-commerce, POS)
   - Motorcycle allocation (success + conflicts)
   - Concurrent reservation prevention (race condition)
   - Deposit validation (min/max amounts)
   - Reservation retrieval and search
   - Expiration extension
   - Reservation cancellation
   - Reservation conversion (success + edge cases)
   - Batch expiration processing
   - Branch scoping enforcement
   - Customer privacy enforcement
   - WebSocket events
2. Concurrency test: 10 simultaneous attempts to reserve same motorcycle
3. Achieve >85% coverage

**Files to Create:**
- `apps/api/tests/reservations.test.ts`
- `apps/api/tests/reservation-concurrency.test.ts`
- `apps/api/tests/reservation-expiration.test.ts`

**Acceptance:**
- [ ] All tests pass
- [ ] Coverage >85%
- [ ] Concurrency test validates only 1 succeeds

---

### TASK-011-WEB: E-commerce Reservation Flow
**Owner:** Frontend Engineer (Web)  
**Estimated Effort:** 2.5 days  
**Description:**
1. Create Next.js pages:
   - `/[locale]/reserve/[motorcycleId]` (reservation form)
   - `/[locale]/account/reservations` (reservation history)
   - `/[locale]/account/reservations/[id]` (reservation detail)
2. Implement reservation form:
   - Show motorcycle details and price
   - Deposit amount input with validation
   - Terms and expiration notice
3. Display reservation status with color coding
4. Show expiration countdown
5. Allow cancellation (if active)
6. Real-time updates via WebSocket

**Files to Create:**
- `apps/web/app/[locale]/reserve/[motorcycleId]/page.tsx`
- `apps/web/app/[locale]/account/reservations/page.tsx`
- `apps/web/app/[locale]/account/reservations/[id]/page.tsx`
- `apps/web/components/ReservationForm.tsx`
- `apps/web/components/ReservationStatusBadge.tsx`
- `apps/web/components/ExpirationCountdown.tsx`

**Acceptance:**
- [ ] Customer can create reservation with valid deposit
- [ ] Error handling works (motorcycle unavailable, invalid deposit)
- [ ] Reservation history displays correctly
- [ ] Reservation detail shows all information
- [ ] Can cancel active reservation
- [ ] Expiration countdown updates in real-time

---

### TASK-012-ADMIN: Admin Reservation Management
**Owner:** Frontend Engineer (Admin)  
**Estimated Effort:** 2.5 days  
**Description:**
1. Create React pages:
   - Reservations list (table with filters, search, expiration alerts)
   - Reservation detail view (customer, motorcycle, payment info, actions)
   - Reservation management actions (extend, convert, cancel)
2. Implement search by reservation number, customer, VIN
3. Implement filters (status, branch, expiration date)
4. Display expiration alerts (reservations expiring soon)
5. Implement conversion to order workflow
6. Show reservation timeline/history
7. Real-time updates via WebSocket

**Files to Create:**
- `apps/admin/src/pages/Reservations.tsx`
- `apps/admin/src/pages/ReservationDetail.tsx`
- `apps/admin/src/components/ReservationActions.tsx`
- `apps/admin/src/components/ReservationSearch.tsx`
- `apps/admin/src/components/ExpirationAlerts.tsx`

**Acceptance:**
- [ ] Staff can view reservation list with filters
- [ ] Search and filters work correctly
- [ ] Reservation detail shows complete information
- [ ] Can extend reservation expiration
- [ ] Can convert reservation to order
- [ ] Can cancel reservations
- [ ] Expiration alerts displayed
- [ ] Real-time updates work

---

### TASK-013-DESKTOP: POS Reservation Management
**Owner:** Frontend Engineer (Desktop)  
**Estimated Effort:** 2 days  
**Description:**
1. Create POS reservation flow:
   - Customer selection (from SPEC-004)
   - Motorcycle selection (from SPEC-002)
   - Deposit amount entry
   - Review and confirm
2. Display reservation confirmation
3. Create reservation search/list view
4. Implement conversion to order/sale
5. Show customer reservation history

**Files to Create:**
- `apps/desktop/src/pages/CreateReservation.tsx`
- `apps/desktop/src/pages/ReservationsPOS.tsx`
- `apps/desktop/src/pages/ReservationDetailPOS.tsx`
- `apps/desktop/src/components/ReservationReview.tsx`
- `apps/desktop/src/components/ConvertToOrder.tsx`

**Acceptance:**
- [ ] Cashier can create reservation
- [ ] Deposit validation works
- [ ] Reservation confirmation displayed
- [ ] Can search existing reservations
- [ ] Can convert reservation to order
- [ ] Customer reservation history displayed

---

## Dependencies

**Upstream:**
- SPEC-001 (Auth/Users/Roles) — Required for RBAC and user tracking
- SPEC-002 (Motorcycles) — Required for motorcycle allocation and status transitions
- SPEC-004 (Customers) — Required for customer association
- SPEC-005 (Orders) — Required for reservation-to-order conversion

**Downstream:**
- SPEC-008 (Invoices/Payments) — Payments reference reservations, refund processing
- SPEC-010 (Letters) — Delivery letters may reference reservations
- SPEC-013 (Reports) — Reservation reports aggregate reservation data

---

## Files/Modules Expected to Change

### Created
- `packages/shared-types/src/reservation.ts` — Reservation types + DTOs
- `apps/api/src/routes/reservations.ts` — Reservation routes
- `apps/api/src/controllers/reservations.controller.ts` — Reservation controller
- `apps/api/src/services/reservations.service.ts` — Reservation service
- `apps/api/src/utils/reservationNumberGenerator.ts` — Reservation number generation
- `apps/api/tests/reservations.test.ts` — Reservation tests
- `apps/api/tests/reservation-concurrency.test.ts` — Concurrency tests
- `apps/web/app/[locale]/reserve/[motorcycleId]/page.tsx` — E-commerce reservation
- `apps/web/app/[locale]/account/reservations/` — Reservation history pages
- `apps/admin/src/pages/Reservations.tsx` — Admin reservation management
- `apps/desktop/src/pages/CreateReservation.tsx` — POS reservation creation

### Modified
- `prisma/schema.prisma` — Add indexes for expiration queries
- `prisma/seed.ts` — Add sample reservations
- `apps/api/src/socket/events.ts` — Add reservation events

---

## Next Implementation Task

**After this specification is approved:**

Implement **TASK-001-DB: Database Schema** (Backend Engineer)

**DO NOT implement any tasks without approval.**

---

**End of SPEC-006**