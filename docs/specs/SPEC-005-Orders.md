# SPEC-005: Orders

**Feature Goal:** Implement complete order management for motorcycle sales across all three applications (E-commerce, Admin Dashboard, Desktop POS), with atomic motorcycle allocation, concurrent purchase protection, and full order lifecycle management.

**Priority:** P0 (Core MVP - Required for sales operations)

**Dependencies:** 
- SPEC-001 (Authentication, Users & Roles)
- SPEC-002 (Brands, Categories & Motorcycles)
- SPEC-004 (Customers)

---

## Scope

This specification covers:
- Order creation (e-commerce checkout and POS sales)
- Order lifecycle management (draft → confirmed → processing → awaiting_delivery → completed)
- Motorcycle inventory allocation with concurrency protection
- Order status transitions with inventory synchronization
- Order cancellation with inventory reversion
- Order search and filtering
- Order history (customer and admin views)
- Branch-scoped order management

This specification **does NOT** cover:
- Reservations with partial payments (SPEC-006)
- Payment processing/recording (SPEC-008)
- Invoices/receipts (SPEC-008)
- Installment plans (SPEC-009)
- Letters/delivery documents (SPEC-010)

These domains will reference orders but are implemented separately.

---

## User Roles

| Role | Permissions |
|------|-------------|
| `super_admin` | Full access to all orders across all branches |
| `branch_manager` | View/manage orders for own branch |
| `cashier` | Create/view orders for own branch (POS operations) |
| `accountant` | Read-only access to orders (for reports) |
| `inventory_clerk` | Read-only access to orders |
| `customer` | Create orders (e-commerce); view own orders only |

---

## Order Lifecycle

### State Diagram (from BUSINESS_RULES.md)

```
DRAFT ──► CONFIRMED ──► PROCESSING ──► AWAITING_DELIVERY ──► COMPLETED
              │              │
              ▼              ▼
          CANCELLED       REFUNDED
```

### State Definitions

| Status | Description | Motorcycle Status | Who Can Set | Customer Visible |
|--------|-------------|-------------------|-------------|------------------|
| `draft` | Order being prepared (POS only) | No change | Cashier | No |
| `confirmed` | Customer confirmed purchase intent | `sold` | Customer (web), Cashier (POS) | Yes |
| `processing` | Payment received/being processed | `sold` | System (on payment), Staff | Yes |
| `awaiting_delivery` | Fully paid, awaiting customer pickup | `sold` | Staff | Yes |
| `completed` | Customer received motorcycle | `sold` | Staff (on letter receipt) | Yes |
| `cancelled` | Order cancelled | `available` (revert) | Customer (before processing), Staff | Yes |
| `refunded` | Order refunded after payment | `available` (revert) | Staff | Yes |

### Transition Rules (from BUSINESS_RULES.md)

| From | To | Condition | Who | Inventory Effect |
|------|----|-----------|----|------------------|
| `draft` | `confirmed` | Items valid, customer confirmed | Cashier | Motorcycle → `sold` |
| `draft` | `cancelled` | Before confirmation | Cashier | No change (never allocated) |
| `confirmed` | `processing` | Payment received (full or partial) | System/Staff | Motorcycle stays `sold` |
| `confirmed` | `cancelled` | Before payment | Customer/Staff | Motorcycle → `available` |
| `processing` | `awaiting_delivery` | Full payment received | System/Staff | Motorcycle stays `sold` |
| `processing` | `completed` | Full payment + immediate delivery | Staff | Motorcycle stays `sold` |
| `processing` | `refunded` | Refund issued | Staff | Motorcycle → `available` |
| `awaiting_delivery` | `completed` | Customer received motorcycle (letter) | Staff | Motorcycle stays `sold` |

**CRITICAL:** All transitions that change motorcycle status use database transactions with row-level locking.

---

## Functional Requirements

### FR-O01: Order Creation (E-commerce)
- Customer selects available motorcycle
- System validates motorcycle availability
- Customer provides/confirms delivery address
- System creates order with status `confirmed`
- Motorcycle status → `sold` atomically
- Auto-generate sequential order number per branch

### FR-O02: Order Creation (POS - Direct Sale)
- Cashier selects customer (search or create)
- Cashier selects available motorcycle from own branch
- Cashier can apply discount (requires permission)
- Optional order notes
- Order created with status `confirmed` (skip draft)
- Motorcycle status → `sold` atomically
- Order number auto-generated

### FR-O03: Order Creation (POS - Draft Mode)
- Cashier can create draft order
- Draft allows item/customer changes before confirmation
- Draft does NOT allocate motorcycle
- On confirm: allocate motorcycle, status → `confirmed`

### FR-O04: Motorcycle Allocation with Concurrency Protection
- Use database transaction with row-level lock (`SELECT ... FOR UPDATE`)
- Check motorcycle status is `available`
- Update motorcycle status → `sold`
- Create order record
- Commit transaction
- If any step fails, rollback entire transaction
- Second concurrent attempt receives conflict error

### FR-O05: Order Status Transitions
- Validate transition is allowed (see transition table)
- Check user permission
- Update order status
- Sync motorcycle status if required
- Emit WebSocket event
- Audit log entry

### FR-O06: Order Cancellation
- Customers can cancel before `processing` status
- Staff can cancel any order before `completed`
- Cancellation validates no payments received (or refund required)
- Motorcycle reverts to `available`
- Order status → `cancelled`
- Transaction ensures atomicity

### FR-O07: Order Search & Filtering
- Search by: order number, customer name, customer phone, motorcycle VIN
- Filter by: status, branch, date range, customer
- Pagination with configurable page size
- Sort by: date, customer name, total amount, status

### FR-O08: Order History
- Customers view own order history (e-commerce)
- Staff view all orders (branch-scoped)
- Order detail shows: customer, motorcycle, pricing, status history

### FR-O09: Order Pricing Snapshot
- Store motorcycle price at time of order (snapshot)
- Order retains original pricing even if motorcycle price changes
- Discount recorded as absolute amount
- Calculate `totalAmount` (sum of item prices)
- Calculate `netAmount` (totalAmount - discount)

### FR-O10: Branch Scoping
- Orders associated with branch where sale occurred
- For e-commerce: motorcycle's current branch
- For POS: staff user's branch
- Branch-scoped staff see only own branch orders
- Super_admin sees all branches

---

## Business Rules

### BR-O01: Order Number Generation
- Format: `ORD-{branchCode}-{year}-{sequence}`
- Example: `ORD-RYD-2026-00001`
- Sequential per branch per year
- Thread-safe generation (Redis or DB sequence)

### BR-O02: Motorcycle Availability Validation
- Can only order motorcycle with status `available`
- Cannot order `reserved`, `sold`, `in_transfer`, `maintenance`, `in_transit`, `returned`
- Validation occurs within transaction holding lock

### BR-O03: Concurrent Purchase Prevention
- Two users attempt to buy same motorcycle simultaneously
- First to acquire row lock succeeds
- Second receives `MOTORCYCLE_ALREADY_ALLOCATED` error
- No double-booking possible

### BR-O04: Order-Motorcycle Relationship
- One order can contain multiple items (OrderItem)
- Each OrderItem references one motorcycle
- One motorcycle can appear in at most one active order
- Historical orders preserve motorcycle reference even if motorcycle deleted

### BR-O05: Order Immutability After Confirmation
- Cannot change customer after `confirmed`
- Cannot add/remove motorcycles after `confirmed`
- Cannot change prices after `confirmed`
- Can apply discount only in `draft` or at confirmation (requires permission)

### BR-O06: Cancellation Rules
- Customer can cancel: `confirmed` status only (before payment)
- Staff can cancel: `confirmed`, `processing`, `awaiting_delivery`
- Cannot cancel `completed` status
- `refunded` status used for post-payment cancellations

### BR-O07: Motorcycle Status Synchronization
- `draft → confirmed`: motorcycle → `sold`
- `cancelled`: motorcycle → `available`
- `refunded`: motorcycle → `available`
- All other transitions: motorcycle stays `sold`

### BR-O08: Order Total Calculation
- `totalAmount` = sum of all OrderItem `unitPrice`
- `discount` applied at order level (not per item, for simplicity)
- `netAmount` = `totalAmount` - `discount`
- `discount` cannot exceed `totalAmount`

### BR-O09: Branch Assignment
- E-commerce orders: assigned to motorcycle's current branch
- POS orders: assigned to staff user's branch
- Cannot change branch after order creation
- Motorcycle must belong to order's branch at creation time

### BR-O10: Order Deletion
- Orders are never hard-deleted (preserve history)
- Use `cancelled` status instead
- Audit trail preserved

---

## Data Requirements

### Order Entity (from DATABASE_DESIGN.md)

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| orderNumber | VARCHAR(30) | UNIQUE, NOT NULL |
| customerId | UUID | FK → Customer, NOT NULL |
| branchId | UUID | FK → Branch, NOT NULL |
| userId | UUID | FK → User, NOT NULL (staff who created) |
| status | VARCHAR(20) | NOT NULL, default 'draft' |
| totalAmount | DECIMAL(12,2) | NOT NULL |
| discount | DECIMAL(12,2) | default 0 |
| netAmount | DECIMAL(12,2) | NOT NULL |
| notes | TEXT | nullable |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

**Indexes:** `(orderNumber)`, `(customerId)`, `(branchId)`, `(status)`, `(createdAt)`

**Check Constraint:** `status IN ('draft','confirmed','processing','awaiting_delivery','completed','cancelled','refunded')`

---

### OrderItem Entity (from DATABASE_DESIGN.md)

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| orderId | UUID | FK → Order, NOT NULL |
| motorcycleId | UUID | FK → Motorcycle, NOT NULL |
| unitPrice | DECIMAL(12,2) | NOT NULL (snapshot at order time) |
| discount | DECIMAL(12,2) | default 0 (per-item discount, optional) |

**Unique Constraint:** `(orderId, motorcycleId)` — motorcycle can appear once per order

**Index:** `(orderId)`, `(motorcycleId)`

**Pricing Snapshot:** `unitPrice` stores motorcycle price at order creation time, independent of current motorcycle price

---

### Relationships
- `Order` → `Customer` (many-to-one)
- `Order` → `Branch` (many-to-one)
- `Order` → `User` (many-to-one, who created)
- `OrderItem` → `Order` (many-to-one)
- `OrderItem` → `Motorcycle` (many-to-one)
- `Payment` → `Order` (many-to-one, from future spec)
- `InstallmentPlan` → `Order` (one-to-one, from future spec)

---

## API Requirements

### POST `/api/v1/orders`
**Description:** Create new order (e-commerce or POS)

**Required Permission:** `order:create` (staff) or authenticated customer (e-commerce)

**Request Body:**
```typescript
{
  customerId: string;        // UUID (staff selects; e-commerce = current user)
  branchId?: string;         // UUID (staff selects; e-commerce = motorcycle's branch)
  motorcycleIds: string[];   // Array of UUIDs, min 1
  discount?: number;         // Decimal(12,2), default 0 (requires permission)
  notes?: string;            // Staff notes
  isDraft?: boolean;         // POS only, default false
}
```

**Response (201):**
```typescript
{
  success: true,
  data: {
    id: string;
    orderNumber: string;
    customer: {
      id: string;
      name: string;
      phone: string;
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
    status: string;          // 'confirmed' or 'draft'
    items: Array<{
      id: string;
      motorcycle: {
        id: string;
        vin: string;
        model: string;
        brand: { nameAr: string; nameEn: string; };
      };
      unitPrice: number;
      discount: number;
    }>;
    totalAmount: number;
    discount: number;
    netAmount: number;
    notes?: string;
    createdAt: string;
  }
}
```

**Errors:**
- 404: `CUSTOMER_NOT_FOUND`, `MOTORCYCLE_NOT_FOUND`, `BRANCH_NOT_FOUND`
- 403: `BRANCH_SCOPE_VIOLATION` (staff creating in another branch)
- 409: `MOTORCYCLE_NOT_AVAILABLE` (status not 'available')
- 409: `MOTORCYCLE_ALREADY_ALLOCATED` (concurrent purchase)
- 409: `MOTORCYCLE_WRONG_BRANCH` (motorcycle not in specified branch)
- 422: Validation failure (discount > total, empty items)

**Transaction Logic (for non-draft orders):**
```typescript
BEGIN TRANSACTION;
  FOR EACH motorcycleId:
    motorcycle = SELECT * FROM motorcycles WHERE id = ? FOR UPDATE;
    IF motorcycle.status != 'available':
      ROLLBACK;
      THROW MOTORCYCLE_NOT_AVAILABLE;
    IF motorcycle.branchId != order.branchId:
      ROLLBACK;
      THROW MOTORCYCLE_WRONG_BRANCH;
    UPDATE motorcycles SET status = 'sold' WHERE id = ?;
  INSERT INTO orders (...);
  INSERT INTO order_items (...);
COMMIT;
```

**Side Effects:**
- Generate order number
- Allocate motorcycles (status → `sold`) if not draft
- Emit WebSocket event: `order:created`
- Audit log entry

**Draft Mode:**
- If `isDraft = true`, do NOT allocate motorcycles
- Order status = `draft`
- Motorcycles remain `available`

---

### GET `/api/v1/orders`
**Description:** List orders (paginated, filtered)

**Required Permission:** `order:read` (staff) or authenticated customer (own orders only)

**Query Parameters:**
- `page` (number, default 1)
- `limit` (number, default 20, max 100)
- `search` (string) — searches order number, customer name, phone, motorcycle VIN
- `customerId` (UUID) — filter by customer
- `branchId` (UUID) — filter by branch
- `status` (string) — filter by status
- `startDate`, `endDate` (ISO 8601) — filter by creation date
- `sort` (string) — `createdAt`, `netAmount`, `orderNumber` (default: `createdAt`)
- `order` (string) — `asc`, `desc` (default: `desc`)

**Response (200):**
```typescript
{
  success: true,
  data: Array<{
    id: string;
    orderNumber: string;
    customer: {
      id: string;
      name: string;
      phone: string;
    };
    branch: {
      id: string;
      nameAr: string;
      nameEn: string;
    };
    status: string;
    itemCount: number;       // Number of motorcycles
    totalAmount: number;
    discount: number;
    netAmount: number;
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
- Branch-scoped staff see only own branch orders
- Customers see only own orders
- Super_admin sees all orders

---

### GET `/api/v1/orders/:id`
**Description:** Get single order with full details

**Required Permission:** `order:read` (staff) or own order (customer)

**Response (200):**
```typescript
{
  success: true,
  data: {
    id: string;
    orderNumber: string;
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
    items: Array<{
      id: string;
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
        currentStatus: string;   // Current motorcycle status (may differ from order time)
      };
      unitPrice: number;         // Price at order time (snapshot)
      discount: number;
    }>;
    totalAmount: number;
    discount: number;
    netAmount: number;
    notes?: string;
    statusHistory: Array<{       // From audit log
      status: string;
      changedAt: string;
      changedBy: {
        id: string;
        name: string;
      };
    }>;
    payments?: {                 // Future spec integration
      totalPaid: number;
      remainingBalance: number;
    };
    createdAt: string;
    updatedAt: string;
  }
}
```

**Errors:**
- 404: `ORDER_NOT_FOUND`
- 403: `BRANCH_SCOPE_VIOLATION` or customer accessing another customer's order

---

### PATCH `/api/v1/orders/:id`
**Description:** Update order (draft only)

**Required Permission:** `order:update`

**Request Body (all optional):**
```typescript
{
  customerId?: string;       // Can change only in draft
  motorcycleIds?: string[];  // Replaces all items (draft only)
  discount?: number;         // Can change only in draft
  notes?: string;            // Staff can always update
}
```

**Response (200):** Updated order object (same as GET)

**Errors:**
- 404: `ORDER_NOT_FOUND`
- 403: `BRANCH_SCOPE_VIOLATION`
- 409: `ORDER_NOT_DRAFT` (attempting to change items/customer in non-draft)
- 409: `MOTORCYCLE_NOT_AVAILABLE`

**Rules:**
- Can only change customer/items/discount if status = `draft`
- Can update notes at any time
- Cannot change branch

---

### POST `/api/v1/orders/:id/confirm`
**Description:** Confirm draft order (allocate motorcycles)

**Required Permission:** `order:update`

**Request Body:** None

**Response (200):**
```typescript
{
  success: true,
  data: {
    id: string;
    orderNumber: string;
    status: string;          // 'confirmed'
    netAmount: number;
    updatedAt: string;
  }
}
```

**Errors:**
- 404: `ORDER_NOT_FOUND`
- 409: `ORDER_NOT_DRAFT`
- 409: `MOTORCYCLE_NOT_AVAILABLE` (one or more motorcycles unavailable)
- 409: `MOTORCYCLE_ALREADY_ALLOCATED` (concurrent conflict)

**Transaction Logic:** Same as order creation (lock motorcycles, update status → `sold`)

**Side Effects:**
- Status → `confirmed`
- All motorcycles → `sold` (atomic)
- Emit WebSocket event: `order:confirmed`
- Audit log entry

---

### POST `/api/v1/orders/:id/status`
**Description:** Transition order status

**Required Permission:** `order:update`

**Request Body:**
```typescript
{
  status: string;            // New status (validated against transition rules)
  reason?: string;           // Optional reason for audit log
}
```

**Response (200):**
```typescript
{
  success: true,
  data: {
    id: string;
    orderNumber: string;
    status: string;
    previousStatus: string;
    updatedAt: string;
  }
}
```

**Errors:**
- 404: `ORDER_NOT_FOUND`
- 403: `BRANCH_SCOPE_VIOLATION`
- 409: `INVALID_STATUS_TRANSITION` (transition not allowed)
- 422: Invalid status value

**Validation:**
- Check transition is allowed (see transition table)
- Check user has permission to perform transition
- Sync motorcycle status if required

**Side Effects:**
- Update order status
- Update motorcycle status if transition requires (transaction)
- Emit WebSocket event: `order:status_changed`
- Audit log entry with before/after status and reason

---

### POST `/api/v1/orders/:id/cancel`
**Description:** Cancel order

**Required Permission:** `order:delete` (staff) or own order if `confirmed` (customer)

**Request Body:**
```typescript
{
  reason?: string;           // Cancellation reason
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
- 404: `ORDER_NOT_FOUND`
- 403: `FORBIDDEN` (customer attempting to cancel processing/completed order)
- 409: `ORDER_CANNOT_BE_CANCELLED` (already completed)
- 409: `PAYMENTS_EXIST` (must refund first)

**Transaction Logic:**
```typescript
BEGIN TRANSACTION;
  order = SELECT * FROM orders WHERE id = ? FOR UPDATE;
  IF order.status IN ('completed'):
    ROLLBACK;
    THROW ORDER_CANNOT_BE_CANCELLED;
  IF paymentsExist(order.id):
    ROLLBACK;
    THROW PAYMENTS_EXIST;
  UPDATE orders SET status = 'cancelled' WHERE id = ?;
  FOR EACH item IN order.items:
    UPDATE motorcycles SET status = 'available' WHERE id = item.motorcycleId;
COMMIT;
```

**Side Effects:**
- Order status → `cancelled`
- All motorcycles → `available` (atomic)
- Emit WebSocket event: `order:cancelled`
- Audit log entry with reason

**Permissions:**
- Customers can cancel only `confirmed` status (before payment)
- Staff can cancel `confirmed`, `processing`, `awaiting_delivery`

---

### GET `/api/v1/orders/:id/history`
**Description:** Get order status change history

**Required Permission:** `order:read`

**Response (200):**
```typescript
{
  success: true,
  data: Array<{
    id: string;
    action: string;          // "order:status_change", "order:created", etc.
    before: {
      status?: string;
    };
    after: {
      status: string;
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

### GET `/api/v1/customers/:customerId/orders`
**Description:** Get customer order history (convenience endpoint)

**Required Permission:** `order:read` (staff) or own customer ID (e-commerce)

**Query Parameters:** Same as GET `/api/v1/orders` (pagination, filters)

**Response (200):** Same as GET `/api/v1/orders`

**Branch Scoping:** Not applicable (customer data is global)

---

## Validation Rules

### Order
- `customerId`: Required UUID, must exist
- `branchId`: Required UUID, must exist
- `motorcycleIds`: Required array, min 1, max 50 items
- `discount`: Optional, decimal(12,2), >= 0, <= totalAmount
- `notes`: Optional, max 2000 chars
- `status`: Must be valid enum value

### Order Status Transition
- `status`: Required, must be valid enum value
- Transition must be allowed (see transition table)
- User must have permission to perform transition

### Order Cancellation
- Order must not be `completed`
- If payments exist, must use refund process instead

---

## Error Cases

| Scenario | HTTP Status | Error Code |
|----------|-------------|------------|
| Order not found | 404 | `ORDER_NOT_FOUND` |
| Customer not found | 404 | `CUSTOMER_NOT_FOUND` |
| Motorcycle not found | 404 | `MOTORCYCLE_NOT_FOUND` |
| Branch not found | 404 | `BRANCH_NOT_FOUND` |
| Motorcycle not available | 409 | `MOTORCYCLE_NOT_AVAILABLE` |
| Motorcycle already allocated | 409 | `MOTORCYCLE_ALREADY_ALLOCATED` |
| Motorcycle wrong branch | 409 | `MOTORCYCLE_WRONG_BRANCH` |
| Order not draft | 409 | `ORDER_NOT_DRAFT` |
| Invalid status transition | 409 | `INVALID_STATUS_TRANSITION` |
| Order cannot be cancelled | 409 | `ORDER_CANNOT_BE_CANCELLED` |
| Payments exist | 409 | `PAYMENTS_EXIST` |
| Discount exceeds total | 422 | `INVALID_DISCOUNT` |
| Empty order items | 422 | `EMPTY_ORDER_ITEMS` |
| Branch scope violation | 403 | `BRANCH_SCOPE_VIOLATION` |
| Forbidden | 403 | `FORBIDDEN` |

---

## Permission Requirements

### Order Management
- `order:create` — Create orders (staff and customers)
- `order:read` — View orders
- `order:update` — Update orders, change status
- `order:delete` — Cancel orders

### Default Role Permissions
- `super_admin`: All order permissions
- `branch_manager`: order:* (all, branch-scoped)
- `cashier`: order:create, order:read, order:update (branch-scoped)
- `accountant`: order:read
- `inventory_clerk`: order:read
- `customer`: order:create, order:read (own orders only, enforced by ID check)

---

## Concurrency & Transaction Safety

### Critical Section: Motorcycle Allocation

**Problem:** Two users attempt to purchase the same motorcycle simultaneously.

**Solution:** Database transaction with row-level locking (`SELECT ... FOR UPDATE`)

**Implementation:**
```typescript
// Pseudocode
async function createOrder(orderData) {
  return await db.transaction(async (tx) => {
    // 1. Lock all motorcycles
    for (const motorcycleId of orderData.motorcycleIds) {
      const motorcycle = await tx.motorcycles.findUnique({
        where: { id: motorcycleId },
        lock: 'FOR UPDATE'  // Row-level exclusive lock
      });
      
      // 2. Validate availability
      if (!motorcycle) {
        throw new MotorcycleNotFoundError();
      }
      if (motorcycle.status !== 'available') {
        throw new MotorcycleNotAvailableError(motorcycle.status);
      }
      if (motorcycle.branchId !== orderData.branchId) {
        throw new MotorcycleWrongBranchError();
      }
      
      // 3. Update motorcycle status
      await tx.motorcycles.update({
        where: { id: motorcycleId },
        data: { status: 'sold' }
      });
    }
    
    // 4. Create order
    const order = await tx.orders.create({ data: orderData });
    
    // 5. Create order items
    await tx.orderItems.createMany({ data: orderItems });
    
    return order;
  });
  // If any error occurs, entire transaction rolls back
  // Second concurrent request will wait for lock, then see status != 'available'
}
```

**Expected Behavior:**
- User A acquires locks on motorcycles → succeeds
- User B waits for locks
- User A commits transaction (motorcycles now `sold`)
- User B acquires locks, sees status = `sold`, throws `MOTORCYCLE_NOT_AVAILABLE`
- User B receives 409 error with clear message

**Performance:** Row-level locks (not table locks) ensure high concurrency for different motorcycles

---

## WebSocket Events

### Event: `order:created`
**Payload:**
```typescript
{
  orderId: string;
  orderNumber: string;
  customerId: string;
  branchId: string;
  status: string;
  netAmount: number;
  motorcycleIds: string[];
}
```
**Audience:** Staff in same branch, super_admin

---

### Event: `order:status_changed`
**Payload:**
```typescript
{
  orderId: string;
  orderNumber: string;
  previousStatus: string;
  newStatus: string;
  branchId: string;
}
```
**Audience:** Staff in same branch, super_admin, customer (if their order)

---

### Event: `order:cancelled`
**Payload:**
```typescript
{
  orderId: string;
  orderNumber: string;
  branchId: string;
  motorcycleIds: string[];  // Motorcycles freed
}
```
**Audience:** Staff in same branch, super_admin

---

## Edge Cases

### EC-O01: Concurrent Purchase of Same Motorcycle
- User A and User B click "Buy" on same motorcycle simultaneously
- Both requests reach API at nearly the same time
- Transaction A acquires lock, validates, updates status → `sold`, commits
- Transaction B waits for lock, acquires lock, sees status = `sold`, throws error
- User B receives 409: `MOTORCYCLE_ALREADY_ALLOCATED`

### EC-O02: Motorcycle Becomes Unavailable During Checkout
- Customer adds motorcycle to cart (status `available`)
- Before checkout, staff transfers motorcycle (status → `in_transfer`)
- Customer clicks "Checkout"
- Order creation fails with 409: `MOTORCYCLE_NOT_AVAILABLE`
- Frontend shows updated status

### EC-O03: Customer Cancelled During Order Creation
- Customer account deactivated while order being created
- Order creation validates customer `isActive = true`
- If inactive, reject with 403: `CUSTOMER_INACTIVE`

### EC-O04: Branch Transfer During Order Processing
- Order created for Branch A
- Order status = `processing`
- Admin tries to transfer motorcycle to Branch B
- Transfer validates motorcycle status (must be `available`)
- Transfer rejected: motorcycle status = `sold`
- Motorcycle remains at Branch A until order completed

### EC-O05: Order Cancellation with Partial Payment
- Order has one payment recorded (partial)
- Staff attempts to cancel
- System checks if payments exist
- Rejected with 409: `PAYMENTS_EXIST`
- Must use refund process instead (future spec)

### EC-O06: Draft Order with Motorcycle Sold by Another Order
- Cashier creates draft order with Motorcycle X (not allocated)
- Another cashier creates confirmed order with Motorcycle X (allocated, status → `sold`)
- First cashier confirms draft order
- Validation fails: Motorcycle X status = `sold`
- Draft confirmation rejected with 409: `MOTORCYCLE_NOT_AVAILABLE`

### EC-O07: Customer Viewing Completed Order with Deleted Motorcycle
- Order completed, motorcycle delivered
- Admin deletes motorcycle record (rare, but possible)
- Customer views order history
- Order shows motorcycle ID, but motorcycle no longer exists
- API returns order with `motorcycle: null` or shows cached snapshot
- No error thrown (historical data preserved)

### EC-O08: Discount Exceeds Total Amount
- Staff creates order with total = 5000
- Staff applies discount = 6000
- Validation rejects with 422: `INVALID_DISCOUNT`
- Frontend prevents this client-side as well

### EC-O09: Order Status Updated While Customer Viewing
- Customer views order (status = `confirmed`)
- Staff changes status → `processing`
- WebSocket event updates customer's view in real-time
- Customer sees updated status without refresh

### EC-O10: Branch-Scoped Cashier Accessing Another Branch's Order
- Cashier at Branch A tries GET `/orders/{id}` for Branch B order
- System validates order.branchId == user.branchId
- Rejected with 403: `BRANCH_SCOPE_VIOLATION`

---

## Acceptance Criteria

### AC-O01: Order Creation (E-commerce)
- [ ] Customer can create order with available motorcycle
- [ ] Order number auto-generated correctly
- [ ] Motorcycle status updates to `sold` atomically
- [ ] Order status = `confirmed`
- [ ] Customer can view order immediately after creation

### AC-O02: Order Creation (POS)
- [ ] Cashier can create order for customer in own branch
- [ ] Motorcycle allocated atomically
- [ ] Draft mode allows item changes before confirmation
- [ ] Confirming draft allocates motorcycles

### AC-O03: Concurrent Purchase Prevention
- [ ] Two simultaneous purchases of same motorcycle handled safely
- [ ] First succeeds, second receives 409 error
- [ ] No double-booking possible
- [ ] Tested with concurrent requests

### AC-O04: Order Status Transitions
- [ ] Valid transitions succeed
- [ ] Invalid transitions rejected with 409
- [ ] Motorcycle status synced when required
- [ ] Audit log records all transitions
- [ ] WebSocket events emitted

### AC-O05: Order Cancellation
- [ ] Customer can cancel `confirmed` order (before payment)
- [ ] Staff can cancel `confirmed`, `processing`, `awaiting_delivery`
- [ ] Cannot cancel `completed`
- [ ] Motorcycles revert to `available` atomically
- [ ] Audit log records cancellation reason

### AC-O06: Order Search & Filtering
- [ ] Search by order number works
- [ ] Search by customer name/phone works
- [ ] Search by motorcycle VIN works
- [ ] Filter by status works
- [ ] Filter by date range works
- [ ] Pagination works correctly

### AC-O07: Branch Scoping
- [ ] Branch-scoped staff see only own branch orders
- [ ] Cannot create order in another branch
- [ ] Cannot access another branch's order
- [ ] Super_admin sees all branches

### AC-O08: Customer Privacy
- [ ] Customers see only own orders
- [ ] Cannot access another customer's order (403)
- [ ] Order history preserves pricing snapshots

### AC-O09: Pricing Snapshot
- [ ] Order stores motorcycle price at creation time
- [ ] Changing motorcycle price doesn't affect existing order
- [ ] Order detail shows original pricing

### AC-O10: Order History (Audit Trail)
- [ ] All status changes logged
- [ ] Logs include user, timestamp, reason
- [ ] Order history endpoint returns complete timeline

---

## Test Requirements

### Unit Tests
- [ ] Order number generation logic (sequential, branch-specific)
- [ ] Status transition validation
- [ ] Total amount calculation (with/without discount)
- [ ] Net amount calculation
- [ ] Motorcycle availability validation

### Integration Tests
- [ ] POST `/orders` — e-commerce order creation
- [ ] POST `/orders` — POS order creation
- [ ] POST `/orders` — draft mode
- [ ] POST `/orders/:id/confirm` — draft confirmation
- [ ] POST `/orders` — motorcycle not available (409)
- [ ] POST `/orders` — motorcycle wrong branch (409)
- [ ] POST `/orders` — invalid discount (422)
- [ ] GET `/orders` — pagination and filters
- [ ] GET `/orders/:id` — order detail
- [ ] PATCH `/orders/:id` — update draft
- [ ] PATCH `/orders/:id` — cannot update confirmed (409)
- [ ] POST `/orders/:id/status` — valid transitions
- [ ] POST `/orders/:id/status` — invalid transitions (409)
- [ ] POST `/orders/:id/cancel` — cancel order
- [ ] POST `/orders/:id/cancel` — cannot cancel completed (409)
- [ ] GET `/orders/:id/history` — audit trail
- [ ] Branch scoping enforcement
- [ ] Customer accessing own order (success)
- [ ] Customer accessing another order (403)
- [ ] WebSocket events emitted correctly

### Concurrency Tests
- [ ] Two simultaneous purchases of same motorcycle (race condition)
- [ ] First succeeds, second gets 409
- [ ] No double-booking under high concurrency
- [ ] Test with 10+ concurrent requests

### Performance Tests
- [ ] Order creation <500ms
- [ ] Order list with 10,000+ orders (pagination)
- [ ] Search with 10,000+ orders (<200ms)

### E2E Tests (Later Phase)
- [ ] E-commerce: Browse → add to cart → checkout → order created
- [ ] POS: Search customer → select motorcycle → create order → view order
- [ ] Admin: View orders → change status → view history

---

## Implementation Tasks

### TASK-001-DB: Database Schema
**Owner:** Backend Engineer  
**Estimated Effort:** 0.5 day  
**Description:**
1. Order and OrderItem tables already exist in schema (DATABASE_DESIGN.md)
2. Add index on `Order.createdAt` for date range queries
3. Add check constraint on `Order.status` enum
4. Update seed script with sample orders (at least 30 orders across multiple branches, various statuses)
5. Verify foreign key constraints to Customer, Motorcycle, Branch, User

**Files to Modify:**
- `prisma/schema.prisma`
- `prisma/seed.ts`

**Acceptance:**
- [ ] Migration runs successfully
- [ ] Seed creates sample orders with items
- [ ] Foreign keys work
- [ ] Indexes exist for performance

---

### TASK-002-SHARED: Shared Types
**Owner:** Backend Engineer  
**Estimated Effort:** 0.5 day  
**Description:**
1. Add `OrderStatus` enum (draft, confirmed, processing, awaiting_delivery, completed, cancelled, refunded)
2. Define interfaces: `Order`, `OrderItem`
3. Define DTOs: `CreateOrderDto`, `UpdateOrderDto`, `OrderStatusTransitionDto`, `CancelOrderDto`
4. Create Zod schemas for all DTOs
5. Export status transition validation utility
6. Export everything

**Files to Create:**
- `packages/shared-types/src/order.ts`

**Files to Modify:**
- `packages/shared-types/src/enums.ts`
- `packages/shared-types/src/index.ts`

**Acceptance:**
- [ ] All DTOs have Zod schemas
- [ ] OrderStatus enum matches BUSINESS_RULES.md
- [ ] Transition validation utility works

---

### TASK-003-API: Order Number Generation
**Owner:** Backend Engineer  
**Estimated Effort:** 0.5 day  
**Description:**
1. Create utility for order number generation
2. Format: `ORD-{branchCode}-{year}-{sequence}`
3. Use Redis or database sequence for atomic increments per branch per year
4. Handle year rollover
5. Thread-safe implementation

**Files to Create:**
- `apps/api/src/utils/orderNumberGenerator.ts`

**Acceptance:**
- [ ] Order numbers generated sequentially per branch
- [ ] No duplicates under concurrency
- [ ] Format matches specification
- [ ] Year rollover works

---

### TASK-004-API: Order Creation with Motorcycle Allocation
**Owner:** Backend Engineer  
**Estimated Effort:** 2.5 days  
**Description:**
1. Implement POST `/orders` endpoint
2. Create order service with atomic transaction logic:
   - Lock motorcycles (`SELECT ... FOR UPDATE`)
   - Validate availability, branch, customer
   - Update motorcycle status → `sold`
   - Create order with auto-generated number
   - Create order items with pricing snapshots
   - Calculate totals
3. Support draft mode (no allocation)
4. Implement POST `/orders/:id/confirm` for draft confirmation
5. Handle concurrency conflicts with clear errors
6. Emit WebSocket events
7. Log all operations

**Files to Create:**
- `apps/api/src/routes/orders.ts`
- `apps/api/src/controllers/orders.controller.ts`
- `apps/api/src/services/orders.service.ts`

**Acceptance:**
- [ ] Order creation works (e-commerce and POS)
- [ ] Motorcycles allocated atomically
- [ ] Concurrent purchase prevention works
- [ ] Draft mode works
- [ ] Draft confirmation allocates motorcycles
- [ ] Pricing snapshots stored correctly
- [ ] WebSocket events emitted

---

### TASK-005-API: Order Retrieval & Search
**Owner:** Backend Engineer  
**Estimated Effort:** 1.5 days  
**Description:**
1. Implement GET `/orders` with pagination, filters, search
2. Implement GET `/orders/:id` with full details
3. Implement GET `/customers/:customerId/orders`
4. Create search logic:
   - Order number (exact or partial)
   - Customer name/phone (fuzzy)
   - Motorcycle VIN
5. Apply branch scoping
6. Apply customer privacy (own orders only for e-commerce)
7. Include pricing snapshots, status history

**Files to Modify:**
- `apps/api/src/routes/orders.ts`
- `apps/api/src/controllers/orders.controller.ts`
- `apps/api/src/services/orders.service.ts`

**Acceptance:**
- [ ] Order list with pagination works
- [ ] Search by order number works
- [ ] Search by customer name/phone works
- [ ] Filter by status/branch/date works
- [ ] Branch scoping applied
- [ ] Customer privacy enforced
- [ ] Order detail includes all required data

---

### TASK-006-API: Order Status Transitions
**Owner:** Backend Engineer  
**Estimated Effort:** 1.5 days  
**Description:**
1. Implement POST `/orders/:id/status` endpoint
2. Create status transition validation (check allowed transitions)
3. Create motorcycle sync logic:
   - `cancelled` → motorcycle `available`
   - `refunded` → motorcycle `available`
   - Other transitions → motorcycle stays `sold`
4. Use transactions for status + motorcycle updates
5. Emit WebSocket events
6. Log transitions with before/after status

**Files to Modify:**
- `apps/api/src/routes/orders.ts`
- `apps/api/src/controllers/orders.controller.ts`
- `apps/api/src/services/orders.service.ts`
- `apps/api/src/utils/orderTransitions.ts` (create)

**Acceptance:**
- [ ] Valid transitions succeed
- [ ] Invalid transitions rejected with 409
- [ ] Motorcycle status synced correctly
- [ ] Transitions are atomic (transaction)
- [ ] WebSocket events emitted
- [ ] Audit log created

---

### TASK-007-API: Order Update & Cancellation
**Owner:** Backend Engineer  
**Estimated Effort:** 1 day  
**Description:**
1. Implement PATCH `/orders/:id` (draft only)
2. Implement POST `/orders/:id/cancel`
3. Cancellation logic:
   - Validate can cancel (status check)
   - Check no payments exist
   - Update order status → `cancelled`
   - Revert motorcycles → `available` (transaction)
4. Permission checks (customer can cancel only `confirmed`)
5. Emit events, log operations

**Files to Modify:**
- `apps/api/src/routes/orders.ts`
- `apps/api/src/controllers/orders.controller.ts`
- `apps/api/src/services/orders.service.ts`

**Acceptance:**
- [ ] Can update draft orders
- [ ] Cannot update confirmed orders (except notes)
- [ ] Cancellation works for allowed statuses
- [ ] Motorcycles revert to available atomically
- [ ] Cannot cancel if payments exist
- [ ] Customer cancellation permissions enforced

---

### TASK-008-API: Order History & Audit
**Owner:** Backend Engineer  
**Estimated Effort:** 0.5 day  
**Description:**
1. Implement GET `/orders/:id/history` endpoint
2. Query audit log for order-related events
3. Format status change history with user, timestamp, reason
4. Return chronological timeline

**Files to Modify:**
- `apps/api/src/routes/orders.ts`
- `apps/api/src/controllers/orders.controller.ts`
- `apps/api/src/services/orders.service.ts`

**Acceptance:**
- [ ] Order history returns all status changes
- [ ] Includes user who made change
- [ ] Includes reason if provided
- [ ] Chronological order

---

### TASK-009-API: Integration Tests
**Owner:** Backend Engineer  
**Estimated Effort:** 2.5 days  
**Description:**
1. Write integration tests for:
   - Order creation (e-commerce, POS, draft)
   - Motorcycle allocation (success + conflicts)
   - Concurrent purchase prevention (race condition)
   - Order retrieval and search
   - Status transitions (all valid transitions)
   - Invalid transitions (all invalid transitions)
   - Order cancellation (all scenarios)
   - Branch scoping enforcement
   - Customer privacy enforcement
   - Pricing snapshot preservation
   - WebSocket events
2. Concurrency test: 10 simultaneous attempts to buy same motorcycle
3. Achieve >85% coverage

**Files to Create:**
- `apps/api/tests/orders.test.ts`
- `apps/api/tests/order-concurrency.test.ts`

**Acceptance:**
- [ ] All tests pass
- [ ] Coverage >85%
- [ ] Concurrency test validates only 1 succeeds

---

### TASK-010-WEB: E-commerce Checkout & Orders
**Owner:** Frontend Engineer (Web)  
**Estimated Effort:** 2.5 days  
**Description:**
1. Create Next.js pages:
   - `/[locale]/checkout` (cart → order creation)
   - `/[locale]/account/orders` (order history)
   - `/[locale]/account/orders/[id]` (order detail)
2. Implement checkout flow:
   - Review selected motorcycle
   - Confirm customer info and address
   - Create order
   - Handle errors (motorcycle unavailable, etc.)
3. Display order status with color coding
4. Show status history timeline
5. Allow cancellation (if `confirmed` status)
6. Real-time updates via WebSocket

**Files to Create:**
- `apps/web/app/[locale]/checkout/page.tsx`
- `apps/web/app/[locale]/account/orders/page.tsx`
- `apps/web/app/[locale]/account/orders/[id]/page.tsx`
- `apps/web/components/OrderStatusBadge.tsx`
- `apps/web/components/OrderTimeline.tsx`

**Acceptance:**
- [ ] Customer can complete checkout
- [ ] Order created successfully
- [ ] Error handling works (motorcycle unavailable)
- [ ] Order history displays correctly
- [ ] Order detail shows all information
- [ ] Can cancel confirmed order
- [ ] Real-time status updates work

---

### TASK-011-ADMIN: Order Management Pages
**Owner:** Frontend Engineer (Admin)  
**Estimated Effort:** 2.5 days  
**Description:**
1. Create React pages:
   - Orders list (table with filters, search)
   - Order detail view (customer, motorcycles, status, history)
   - Order status management (buttons for transitions)
2. Implement search by order number, customer, VIN
3. Implement filters (status, branch, date range)
4. Display status transition buttons based on current status
5. Implement cancellation with confirmation dialog
6. Show status history timeline
7. Real-time updates via WebSocket

**Files to Create:**
- `apps/admin/src/pages/Orders.tsx`
- `apps/admin/src/pages/OrderDetail.tsx`
- `apps/admin/src/components/OrderStatusButtons.tsx`
- `apps/admin/src/components/OrderSearch.tsx`

**Acceptance:**
- [ ] Staff can view order list
- [ ] Search and filters work
- [ ] Order detail shows complete information
- [ ] Can change order status
- [ ] Can cancel orders
- [ ] Status history displayed
- [ ] Real-time updates work

---

### TASK-012-DESKTOP: POS Order Creation & Management
**Owner:** Frontend Engineer (Desktop)  
**Estimated Effort:** 2 days  
**Description:**
1. Create POS order flow:
   - Customer selection (from SPEC-004)
   - Motorcycle selection (from SPEC-002)
   - Review and confirm
   - Create order
2. Implement draft mode option
3. Display order confirmation
4. Create order search/list view
5. Display order detail
6. Show order history for selected customer

**Files to Create:**
- `apps/desktop/src/pages/CreateOrder.tsx`
- `apps/desktop/src/pages/OrdersPOS.tsx`
- `apps/desktop/src/pages/OrderDetailPOS.tsx`
- `apps/desktop/src/components/OrderReview.tsx`

**Acceptance:**
- [ ] Cashier can create order
- [ ] Draft mode works
- [ ] Order confirmation displayed
- [ ] Can search existing orders
- [ ] Order detail shows all info
- [ ] Customer order history displayed

---

## Dependencies

**Upstream:**
- SPEC-001 (Auth/Users/Roles) — Required for RBAC and user tracking
- SPEC-002 (Motorcycles) — Required for motorcycle allocation and status transitions
- SPEC-004 (Customers) — Required for customer association

**Downstream:**
- SPEC-006 (Reservations) — Reservations convert to orders
- SPEC-008 (Invoices/Payments) — Payments reference orders
- SPEC-009 (Installments) — Installment plans reference orders
- SPEC-010 (Letters) — Delivery letters reference orders
- SPEC-013 (Reports) — Sales reports aggregate order data

---

## Files/Modules Expected to Change

### Created
- `packages/shared-types/src/order.ts` — Order types + DTOs
- `apps/api/src/routes/orders.ts` — Order routes
- `apps/api/src/controllers/orders.controller.ts` — Order controller
- `apps/api/src/services/orders.service.ts` — Order service
- `apps/api/src/utils/orderNumberGenerator.ts` — Order number generation
- `apps/api/src/utils/orderTransitions.ts` — Status transition validation
- `apps/api/tests/orders.test.ts` — Order tests
- `apps/api/tests/order-concurrency.test.ts` — Concurrency tests
- `apps/web/app/[locale]/checkout/page.tsx` — E-commerce checkout
- `apps/web/app/[locale]/account/orders/` — Order history pages
- `apps/admin/src/pages/Orders.tsx` — Admin order management
- `apps/desktop/src/pages/CreateOrder.tsx` — POS order creation

### Modified
- `prisma/schema.prisma` — Add indexes
- `prisma/seed.ts` — Add sample orders
- `apps/api/src/socket/events.ts` — Add order events

---

## Next Implementation Task

**After this specification is approved:**

Implement **TASK-001-DB: Database Schema** (Backend Engineer)

**DO NOT implement any tasks without approval.**

---

**End of SPEC-005**
