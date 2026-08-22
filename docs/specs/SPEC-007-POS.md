# SPEC-007: POS (Point of Sale)

**Feature Goal:** Implement a streamlined Point of Sale system for the Desktop App that orchestrates existing domains (Customers, Motorcycles, Orders, Reservations) into fast, branch-level sales workflows with proper concurrency protection and offline resilience.

**Priority:** P0 (Core MVP - Required for branch sales operations)

**Dependencies:** 
- SPEC-001 (Authentication, Users & Roles)
- SPEC-002 (Brands, Categories & Motorcycles)
- SPEC-004 (Customers)
- SPEC-005 (Orders)
- SPEC-006 (Reservations)

---

## Scope

This specification covers:
- POS workflow orchestration for sales transactions
- Fast customer and motorcycle lookup optimized for cashier operations
- Order creation workflow through existing Order API
- Reservation creation workflow through existing Reservation API
- Reservation-to-Order conversion workflow
- Discount authorization and application
- Transaction confirmation and receipt generation
- Offline operation resilience with sync capabilities
- Branch-scoped operations with role-based permissions

This specification **does NOT** cover:
- Payment processing (SPEC-008)
- Invoice generation (SPEC-008)
- Installment plans (SPEC-009)
- Letters/delivery documents (SPEC-010)
- Financial reporting (SPEC-013)

These domains will integrate with POS through clean boundaries defined in their respective specifications.

---

## User Roles

| Role | POS Permissions |
|------|-----------------|
| `super_admin` | Full POS access across all branches |
| `branch_manager` | Full POS operations for own branch, including discounts |
| `cashier` | Create orders/reservations, basic discounts (if authorized) |
| `inventory_clerk` | Read-only access to POS data |
| `accountant` | Read-only access to completed transactions |

---

## POS Sales Workflow

### Primary Workflow: Direct Sale

```
1. Login → Select Branch (if multiple access)
        ↓
2. Search/Select Customer
        ↓
3. Search/Select Available Motorcycle
        ↓
4. Validate Motorcycle Availability & Branch
        ↓
5. Review Transaction Details
        ↓
6. Apply Discount (if authorized)
        ↓
7. Confirm Order Creation
        ↓
8. Create Order via SPEC-005 API
        ↓
9. Display Transaction Confirmation
        ↓
10. Generate Receipt/Print (future integration)
```

### Alternative Workflow: Reservation Creation

```
Steps 1-4: Same as Direct Sale
        ↓
5. Select "Create Reservation"
        ↓
6. Enter Deposit Amount
        ↓
7. Set Expiration Period (default/custom)
        ↓
8. Create Reservation via SPEC-006 API
        ↓
9. Display Reservation Confirmation
```

### Workflow: Reservation Conversion

```
1. Search Existing Reservation
        ↓
2. Validate Reservation Status (active)
        ↓
3. Review Details & Remaining Balance
        ↓
4. Confirm Conversion
        ↓
5. Convert via SPEC-006 API (/reservations/:id/convert)
        ↓
6. Display Order Confirmation
```
---

## Functional Requirements

### FR-POS01: Customer Operations
- **Search Customer:** Fast lookup by phone, name, email, customer ID (<200ms)
- **Select Customer:** Choose from search results
- **Create Customer:** Quick customer creation form (name, phone required)
- **View Customer:** Display basic info, recent orders, active reservations
- **Duplicate Detection:** Warning if similar customer exists (same phone/name)

**Integration:** Uses SPEC-004 Customer APIs (GET /customers/search, POST /customers)

### FR-POS02: Motorcycle Operations  
- **Search Motorcycle:** Fast lookup by VIN, model, brand, category
- **Filter by Availability:** Show only `available` motorcycles in current branch
- **Validate Selection:** Check motorcycle status before transaction
- **Display Details:** Show VIN, model, brand, price, images

**Integration:** Uses SPEC-002 Motorcycle APIs (GET /motorcycles with branch filter)

### FR-POS03: Order Operations
- **Create Order:** Direct sale with full payment expectation
- **Price Display:** Show current motorcycle price
- **Discount Application:** Apply authorized discounts with validation
- **Total Calculation:** Real-time total with discount
- **Order Confirmation:** Display order number, details, total

**Integration:** Uses SPEC-005 Order API (POST /orders)

### FR-POS04: Reservation Operations
- **Create Reservation:** With customer deposit and expiration
- **Deposit Validation:** Enforce minimum/maximum deposit rules
- **Expiration Setting:** Default period with override capability
- **Search Reservations:** Find existing reservations by customer/VIN
- **Conversion to Order:** Convert active reservation to sale

**Integration:** Uses SPEC-006 Reservation APIs (POST /reservations, POST /reservations/:id/convert)

### FR-POS05: Discount Management
- **Authorization Check:** Validate user can apply discount amount/percentage
- **Discount Limits:** Enforce per-user maximum discount limits
- **Approval Workflow:** Request manager approval for large discounts (optional)
- **Audit Trail:** Log all discount applications with user and reason

### FR-POS06: Transaction Management
- **Idempotency:** Prevent duplicate submissions during slow responses
- **Concurrency Protection:** Prevent overselling through proper API usage
- **Error Recovery:** Handle API failures gracefully with clear error messages
- **Transaction History:** View recent transactions by current user/branch

### FR-POS07: Branch Scoping
- **Branch Selection:** Display current branch, allow switching (if authorized)
- **Inventory Filtering:** Show only current branch motorcycles
- **Transaction Recording:** All transactions tagged with current branch
- **Permission Enforcement:** Respect branch-based access controls

### FR-POS08: Offline Resilience
- **Connection Detection:** Monitor API connectivity status
- **Essential Data Caching:** Cache customer search results, motorcycle catalog
- **Queue Operations:** Queue critical operations when offline (with limits)
- **Sync on Reconnect:** Process queued operations when connection restored
- **Conflict Resolution:** Handle sync conflicts safely

**CRITICAL:** Motorcycle sales/reservations are NOT queued offline due to inventory conflicts. Only customer creation and data updates may be queued.

---

## Business Rules

### BR-POS01: Discount Authorization
- **Basic Discount:** Cashier can apply up to 5% or 2000 EGP (configurable)
- **Manager Discount:** Branch manager can apply up to 15% or 10000 EGP
- **Large Discount:** Requires super_admin approval (above manager limits)
- **Audit Requirement:** All discounts logged with reason

### BR-POS02: Branch Operations  
- **Current Branch:** All operations default to user's assigned branch
- **Branch Switching:** Only super_admin can operate across branches in single session
- **Inventory Scope:** Only show available motorcycles from current branch
- **Customer Scope:** Customers are global but transaction history filtered by branch

### BR-POS03: Transaction Validation
- **Motorcycle Status:** Must be `available` at transaction time
- **Customer Status:** Must be `active` customer
- **Concurrent Protection:** Use existing API concurrency protections
- **Duplicate Prevention:** 5-minute duplicate transaction window

### BR-POS04: Reservation Rules
- **Minimum Deposit:** Follow SPEC-006 minimum deposit rules
- **Expiration Default:** 7 days (configurable per branch)
- **Active Limit:** Customer can have max 3 active reservations (configurable)

### BR-POS05: Error Recovery
- **API Timeout:** 30-second timeout for critical operations
- **Retry Logic:** 3 retries for network errors, no retry for business logic errors
- **Failed Transactions:** Never show success for failed backend operations
- **Data Consistency:** Always validate current state before proceeding

### BR-POS06: Offline Operations
- **Read-Only Offline:** Can browse cached data, cannot create transactions
- **Queue Limits:** Max 10 queued operations per user
- **Sync Priority:** Customer updates > data refreshes > logs
- **Conflict Resolution:** Server state always wins, notify user of conflicts

---

## API Requirements

### GET `/api/v1/pos/dashboard`
**Description:** Get POS dashboard data for current user/branch

**Required Permission:** `pos:read`

**Response (200):**
```typescript
{
  success: true,
  data: {
    currentUser: {
      id: string;
      name: string;
      role: string;
      branch: {
        id: string;
        nameAr: string;
        nameEn: string;
      };
      permissions: {
        canApplyDiscount: boolean;
        maxDiscountPercent: number;
        maxDiscountAmount: number;
        canCreateCustomer: boolean;
        canSwitchBranch: boolean;
      };
    };
    todayStats: {
      ordersCreated: number;
      reservationsCreated: number;
      totalSales: number;
      availableMotorcycles: number;
    };
    recentTransactions: Array<{
      id: string;
      type: 'order' | 'reservation';
      number: string;
      customerName: string;
      motorcycleModel: string;
      amount: number;
      createdAt: string;
    }>;
  }
}
```

**Integration:** Aggregates data from existing APIs

---

### POST `/api/v1/pos/transactions`
**Description:** Create transaction (order or reservation) with validation

**Required Permission:** `pos:create`

**Request Body:**
```typescript
{
  type: 'order' | 'reservation';
  customerId: string;
  motorcycleId: string;
  discount?: {
    amount: number;           // Absolute discount amount
    reason?: string;          // Discount reason
  };
  reservationData?: {         // Only if type = 'reservation'
    depositAmount: number;
    expirationDays?: number;
  };
  idempotencyKey: string;     // Prevent duplicate submissions
  notes?: string;
}
```

**Response (201):**
```typescript
{
  success: true,
  data: {
    id: string;
    type: 'order' | 'reservation';
    number: string;           // Order/reservation number
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
    totalAmount: number;
    discount: number;
    netAmount: number;
    depositAmount?: number;   // For reservations
    remainingAmount?: number; // For reservations
    expiresAt?: string;       // For reservations
    createdAt: string;
  }
}
```

**Errors:**
- 409: `MOTORCYCLE_NOT_AVAILABLE`, `IDEMPOTENCY_CONFLICT`
- 403: `DISCOUNT_UNAUTHORIZED`
- 422: `INVALID_DEPOSIT_AMOUNT`

**Implementation:**
1. Validate idempotency key (prevent duplicates)
2. Validate user discount authorization
3. Call appropriate domain API (Order or Reservation)
4. Return unified response format
5. Log transaction details

---

### GET `/api/v1/pos/customers/search`
**Description:** Fast customer search optimized for POS

**Required Permission:** `pos:read`

**Query Parameters:**
- `q` (string, required) — search term
- `limit` (number, default 10)

**Response (200):**
```typescript
{
  success: true,
  data: Array<{
    id: string;
    name: string;
    phone: string;
    email?: string;
    recentOrderCount: number;
    activeReservationCount: number;
    lastTransactionDate?: string;
    defaultAddress?: {
      addressLine: string;
      city?: string;
    };
  }>
}
```

**Integration:** Uses SPEC-004 Customer search API with POS-specific aggregations

---

### GET `/api/v1/pos/motorcycles/search`
**Description:** Fast motorcycle search for POS with availability filtering

**Required Permission:** `pos:read`

**Query Parameters:**
- `q` (string, optional) — search term (VIN, model, brand)
- `branchId` (UUID, optional) — defaults to user's branch
- `limit` (number, default 20)

**Response (200):**
```typescript
{
  success: true,
  data: Array<{
    id: string;
    vin: string;
    model: string;
    year: number;
    color?: string;
    brand: {
      nameAr: string;
      nameEn: string;
      logo?: string;
    };
    category: {
      nameAr: string;
      nameEn: string;
    };
    price: number;
    status: string;           // Always 'available' due to filtering
    images: string[];
  }>
}
```

**Integration:** Uses SPEC-002 Motorcycle API with branch + availability filters
---

### POST `/api/v1/pos/validate-transaction`
**Description:** Pre-validate transaction before final submission

**Required Permission:** `pos:create`

**Request Body:**
```typescript
{
  customerId: string;
  motorcycleId: string;
  type: 'order' | 'reservation';
  discount?: number;
  depositAmount?: number;    // For reservations
}
```

**Response (200):**
```typescript
{
  success: true,
  data: {
    valid: boolean;
    customer: {
      id: string;
      name: string;
      isActive: boolean;
    };
    motorcycle: {
      id: string;
      vin: string;
      model: string;
      price: number;
      status: string;
      isAvailable: boolean;
    };
    calculations: {
      totalAmount: number;
      discountAmount: number;
      netAmount: number;
      depositAmount?: number;
      remainingAmount?: number;
    };
    discountAuthorization: {
      authorized: boolean;
      maxAllowed: number;
      requiresApproval: boolean;
    };
    warnings: string[];      // e.g., "Customer has 2 active reservations"
    errors: string[];        // Blocking errors
  }
}
```

**Purpose:** Allow POS to validate and show calculations before final submission

---

### GET `/api/v1/pos/reservations/active`
**Description:** Get active reservations for current branch with quick actions

**Required Permission:** `pos:read`

**Query Parameters:**
- `customerId` (UUID, optional) — filter by customer
- `expiringIn` (number, optional) — days until expiration (default 3)

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
    };
    totalPrice: number;
    paidAmount: number;
    remainingAmount: number;
    expiresAt: string;
    daysUntilExpiry: number;
    canConvert: boolean;      // Based on status and motorcycle availability
  }>
}
```

**Integration:** Uses SPEC-006 Reservation API with branch filtering

---

### POST `/api/v1/pos/reservations/:id/convert`
**Description:** Convert reservation to order through POS workflow

**Required Permission:** `pos:update`

**Request Body:**
```typescript
{
  idempotencyKey: string;
  notes?: string;
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
    transferredAmount: number;
    remainingAmount: number;
  }
}
```

**Integration:** Direct pass-through to SPEC-006 conversion API with POS logging

---

### GET `/api/v1/pos/offline/sync-status`
**Description:** Check sync status and queue information

**Required Permission:** `pos:read`

**Response (200):**
```typescript
{
  success: true,
  data: {
    isOnline: boolean;
    lastSyncAt?: string;
    queuedOperations: number;
    syncInProgress: boolean;
    conflicts: Array<{
      id: string;
      type: string;
      description: string;
      requiresResolution: boolean;
    }>;
  }
}
```

---

### POST `/api/v1/pos/offline/queue`
**Description:** Queue operation for offline processing

**Required Permission:** `pos:create`

**Request Body:**
```typescript
{
  operation: {
    type: 'customer_create' | 'customer_update';
    data: object;
    timestamp: string;
  };
  idempotencyKey: string;
}
```

**Response (202):**
```typescript
{
  success: true,
  data: {
    queueId: string;
    position: number;
    estimatedSyncTime?: string;
  }
}
```

---

## Validation Rules

### Transaction Validation
- **Customer ID:** Must exist and be active
- **Motorcycle ID:** Must exist, be available, and belong to current branch
- **Discount Amount:** Must be <= user's authorization limit
- **Deposit Amount:** Must meet SPEC-006 minimum/maximum rules (for reservations)
- **Idempotency Key:** Must be unique within 5-minute window

### Search Validation  
- **Search Terms:** Min 2 characters for name search, exact match for ID/VIN/phone
- **Pagination:** Max 50 results per search
- **Branch Filter:** User can only search own branch unless super_admin

### Offline Queue Validation
- **Operation Types:** Only allow customer operations, no motorcycle transactions
- **Queue Limit:** Max 10 operations per user
- **Data Size:** Max 10KB per queued operation
- **Expiration:** Queued operations expire after 24 hours

---

## Error Cases

| Scenario | HTTP Status | Error Code |
|----------|-------------|------------|
| Motorcycle not available | 409 | `MOTORCYCLE_NOT_AVAILABLE` |
| Duplicate transaction | 409 | `IDEMPOTENCY_CONFLICT` |
| Discount unauthorized | 403 | `DISCOUNT_UNAUTHORIZED` |
| Customer inactive | 409 | `CUSTOMER_INACTIVE` |
| Invalid deposit | 422 | `INVALID_DEPOSIT_AMOUNT` |
| Reservation not active | 409 | `RESERVATION_NOT_ACTIVE` |
| Branch scope violation | 403 | `BRANCH_SCOPE_VIOLATION` |
| Queue limit exceeded | 429 | `QUEUE_LIMIT_EXCEEDED` |
| Offline operation not allowed | 409 | `OFFLINE_OPERATION_DENIED` |
| Transaction timeout | 408 | `TRANSACTION_TIMEOUT` |

---

## Permission Requirements

### POS Operations
- `pos:read` — View POS dashboard, search customers/motorcycles
- `pos:create` — Create orders/reservations, apply basic discounts
- `pos:update` — Convert reservations, extend expiration
- `pos:manage` — Apply large discounts, cross-branch operations

### Default Role Permissions
- `super_admin`: All POS permissions across all branches
- `branch_manager`: pos:* (all, branch-scoped) + discount authorization
- `cashier`: pos:read, pos:create, pos:update (basic discounts only)
- `inventory_clerk`: pos:read
- `accountant`: pos:read

---

## Concurrency & Idempotency

### Transaction Idempotency
**Problem:** User clicks "Create Order" multiple times during slow response

**Solution:** Idempotency key validation
```typescript
// Frontend generates unique key per transaction attempt
const idempotencyKey = `${userId}-${timestamp}-${transactionHash}`;

// Backend checks for existing transaction with same key within 5 minutes
// If found, returns existing result instead of creating duplicate
```

### Concurrent Motorcycle Sales
**Problem:** Two cashiers try to sell same motorcycle simultaneously

**Solution:** Leverage existing SPEC-005 Order API concurrency protection
- POS validation endpoint checks availability
- Final order creation uses Order API row-level locking
- Second attempt receives clear conflict error

### Offline Sync Conflicts
**Problem:** Queued operation conflicts with server state when syncing

**Solution:** Conflict detection and resolution
```typescript
// Compare cached data timestamp with server timestamp
// If conflict detected:
//   - For customer updates: Server wins, notify user
//   - For customer creation: Check if duplicate exists
//   - For critical operations: Require manual resolution
```

---

## Offline Operation Strategy

### Connection Detection
- Monitor API endpoint availability (heartbeat every 30 seconds)
- Display connection status indicator
- Gracefully degrade functionality when offline

### Cacheable Data
- **Customer Search Results:** Cache last 100 searches for 1 hour
- **Motorcycle Catalog:** Cache current branch motorcycles for 30 minutes  
- **User Permissions:** Cache user role/permissions for session duration
- **Branch Data:** Cache current branch info for session

### Offline Capabilities
- **Browse:** View cached customers and motorcycles
- **Search:** Search cached customer data
- **Create Customer:** Queue new customer creation
- **Update Customer:** Queue customer information updates

### Offline Restrictions
- **No Transactions:** Cannot create orders or reservations (inventory conflict risk)
- **No Conversions:** Cannot convert reservations to orders
- **No Discounts:** Cannot apply or validate discounts
- **Read-Only:** All financial operations disabled

### Sync Process
1. **Reconnection Detected:** Show "Syncing..." status
2. **Upload Queue:** Process queued operations in chronological order
3. **Conflict Detection:** Check for server-side conflicts
4. **Resolution:** Handle conflicts with user notification
5. **Cache Refresh:** Update cached data with latest server state
6. **Status Update:** Show "Online" status and sync completion

---

## Desktop App Architecture

### Application Shell
- **Header:** Current user, branch, connection status, time
- **Navigation:** Quick tabs for Sale, Reservation, Search, History
- **Status Bar:** Last transaction, queue status, sync status

### Core Views

#### 1. Sale View (Main)
- Customer search/selection panel (left 30%)
- Motorcycle search/selection panel (right 30%)  
- Transaction details panel (center 40%)
  - Selected customer info
  - Selected motorcycle details
  - Price, discount, total calculation
  - Action buttons (Create Order, Create Reservation)

#### 2. Search View
- Unified search for customers, motorcycles, orders, reservations
- Quick filters by type, status, date
- Recent searches history

#### 3. History View
- Today's transactions by current user
- Filter by type (orders, reservations)
- Quick actions (print receipt, view details)

#### 4. Reservation Management View
- Active reservations (current branch)
- Expiring soon alerts
- Conversion workflow

### Keyboard Navigation
- **Tab:** Navigate between sections
- **Enter:** Confirm selections and submit forms
- **Escape:** Cancel current operation
- **F1-F4:** Quick access to main views
- **Ctrl+N:** New transaction
- **Ctrl+S:** Save/Submit current transaction

### Error States
- **Network Error:** Red connection indicator, offline mode available
- **Validation Error:** Inline field errors with clear messages
- **Transaction Error:** Modal with error details and suggested actions
- **Conflict Error:** Clear explanation with resolution options

---

## Receipt/Transaction Output

### Order Receipt Format
```
==================================
       [BRANCH NAME]
       [BRANCH ADDRESS]
==================================
ORDER: ORD-RYD-2026-00001
DATE: 2026-01-15 14:30
CASHIER: Ahmad Ali

CUSTOMER:
  Mohamed Hassan
  +966 50 123 4567
  Riyadh, King Fahd Road

MOTORCYCLE:
  VIN: 1HD1BWV17PC123456
  2026 Honda CBR600RR
  Red

PRICE:        45,000.00 EGP
DISCOUNT:      2,000.00 EGP
TOTAL:        43,000.00 EGP

STATUS: CONFIRMED
PAYMENT: Pending

==================================
Thank you for your business!
==================================
```

### Reservation Receipt Format  
```
==================================
       [BRANCH NAME]
==================================
RESERVATION: RES-RYD-2026-00001
DATE: 2026-01-15 14:30
EXPIRES: 2026-01-22 23:59

CUSTOMER: Mohamed Hassan
PHONE: +966 50 123 4567

MOTORCYCLE:
  2026 Honda CBR600RR - Red
  VIN: 1HD1BWV17PC123456

TOTAL PRICE:    45,000.00 EGP
DEPOSIT PAID:    5,000.00 EGP
REMAINING:      40,000.00 EGP

STATUS: ACTIVE

==================================
Please complete purchase before
expiration date to avoid deposit
forfeiture.
==================================
```
---

## Edge Cases

### EC-POS01: Duplicate Transaction Submission
- User clicks "Create Order" button rapidly during network lag
- First request succeeds, second request has same idempotency key
- System returns first transaction result, no duplicate created
- User sees single confirmation, no confusion

### EC-POS02: Motorcycle Sold During Transaction
- Cashier A selects motorcycle for customer
- Cashier B completes sale of same motorcycle
- Cashier A submits order creation
- System validates motorcycle availability, rejects with clear error
- Cashier A must select different motorcycle

### EC-POS03: Customer Deactivated During Transaction
- Customer selected and motorcycle chosen
- Admin deactivates customer account
- Order creation validates customer status
- Transaction rejected, cashier notified of customer status

### EC-POS04: Network Failure During Order Creation  
- Order creation request sent to server
- Network disconnects before response received
- POS shows "Processing..." state with timeout
- After timeout, shows "Network Error - Verify Transaction Status"
- Provides option to check order status or retry with new idempotency key

### EC-POS05: Large Discount Without Authorization
- Cashier attempts 20% discount (above 5% limit)
- System blocks discount entry
- Shows "Requires Manager Approval" message
- Provides workflow to request manager authentication

### EC-POS06: Reservation Expiring During Conversion
- Cashier selects reservation for conversion
- Reservation expires while conversion form is open
- Conversion attempt validates reservation status
- System rejects with "Reservation has expired" error

### EC-POS07: Offline Customer Creation Conflict
- Cashier creates customer offline (queued)
- Same customer created by another user online
- On sync, system detects duplicate phone number
- Shows conflict resolution: "Customer may already exist - Link to existing?"

### EC-POS08: Branch Switch During Transaction
- Transaction started in Branch A
- User switches to Branch B mid-transaction
- System validates branch consistency
- Transaction rejected or customer prompted to restart

### EC-POS09: Session Timeout During Transaction
- User leaves POS idle for extended period
- Session expires during transaction preparation
- System detects expired session on submission
- Prompts for re-authentication, preserves transaction draft

### EC-POS10: Concurrent Reservation of Same Motorcycle
- Two cashiers attempt to reserve same motorcycle
- Both pass validation checks simultaneously
- First reservation creation succeeds
- Second receives conflict error with clear message

---

## Acceptance Criteria

### AC-POS01: Customer Operations
- [ ] Cashier can search customers by phone/name in <200ms
- [ ] Can create new customer with required fields only
- [ ] Duplicate customer warning appears when similar exists
- [ ] Customer selection loads recent transaction history

### AC-POS02: Motorcycle Operations  
- [ ] Can search motorcycles by VIN, model, brand
- [ ] Only shows available motorcycles from current branch
- [ ] Motorcycle selection displays price and images
- [ ] Invalid motorcycle selection prevented with clear error

### AC-POS03: Order Creation
- [ ] Can create order with selected customer and motorcycle
- [ ] Authorized discounts apply correctly with validation
- [ ] Order total calculates correctly with discount
- [ ] Order number generated and displayed immediately
- [ ] Failed order creation never shows false success

### AC-POS04: Reservation Operations
- [ ] Can create reservation with valid deposit amount
- [ ] Deposit validation enforces min/max rules
- [ ] Expiration date set correctly (default + custom)
- [ ] Can search and convert active reservations
- [ ] Cannot convert expired/cancelled reservations

### AC-POS05: Concurrency Protection
- [ ] Duplicate transaction prevention with idempotency keys
- [ ] Concurrent motorcycle sales handled safely (one succeeds)
- [ ] Clear error messages for all conflict scenarios
- [ ] No overselling possible under normal operations

### AC-POS06: Offline Functionality
- [ ] Connection status displayed accurately
- [ ] Can browse cached customer/motorcycle data offline
- [ ] Customer creation queues when offline
- [ ] Motorcycle transactions disabled offline
- [ ] Sync process handles conflicts gracefully

### AC-POS07: Discount Authorization
- [ ] Basic discounts apply within user limits
- [ ] Large discounts require manager approval
- [ ] All discounts logged with user and reason
- [ ] Unauthorized discounts blocked server-side

### AC-POS08: Branch Scoping
- [ ] Only current branch motorcycles shown
- [ ] All transactions tagged with correct branch
- [ ] Branch switching requires appropriate permissions
- [ ] Cross-branch operations restricted properly

### AC-POS09: Error Handling
- [ ] Network errors show clear offline mode
- [ ] Validation errors display inline with corrections
- [ ] Business logic errors explain the problem clearly
- [ ] Recovery options provided for failed operations

### AC-POS10: Performance & UX
- [ ] Customer search <200ms response time
- [ ] Motorcycle search <300ms response time
- [ ] Transaction submission <2s completion time
- [ ] Keyboard navigation works throughout interface
- [ ] Arabic/English language switching works
- [ ] RTL layout correct for Arabic interface

---

## Test Requirements

### Unit Tests
- [ ] Idempotency key generation and validation
- [ ] Discount authorization logic
- [ ] Transaction validation rules
- [ ] Offline queue management
- [ ] Sync conflict detection and resolution

### Integration Tests
- [ ] POS dashboard data aggregation
- [ ] Transaction creation (orders and reservations)
- [ ] Customer and motorcycle search APIs
- [ ] Reservation conversion workflow
- [ ] Offline queue and sync operations
- [ ] Branch scoping enforcement
- [ ] Discount authorization validation
- [ ] Idempotency conflict prevention
- [ ] Error handling for all failure scenarios

### Concurrency Tests
- [ ] Duplicate transaction submission (same idempotency key)
- [ ] Concurrent motorcycle sales (different transactions)
- [ ] Concurrent reservation attempts (same motorcycle)
- [ ] Network failure during transaction processing

### Performance Tests  
- [ ] Customer search <200ms with 10,000+ customers
- [ ] Motorcycle search <300ms with 1,000+ motorcycles  
- [ ] Transaction creation <2s end-to-end
- [ ] Offline sync of 10+ queued operations

### E2E Tests (Desktop App)
- [ ] Complete sale workflow: customer → motorcycle → order → receipt
- [ ] Reservation workflow: customer → motorcycle → reservation → confirmation
- [ ] Reservation conversion: search → validate → convert → order
- [ ] Offline mode: network failure → queue operations → reconnect → sync
- [ ] Error recovery: failed transaction → retry → success

---

## Implementation Tasks

### TASK-001-SHARED: POS Types & Validation
**Owner:** Backend Engineer  
**Estimated Effort:** 0.5 day  
**Description:**
1. Create POS-specific TypeScript interfaces and DTOs
2. Define POS workflow enums (transaction types, states)
3. Create Zod validation schemas for POS requests
4. Define idempotency key format and validation
5. Export discount authorization utilities

**Files to Create:**
- `packages/shared-types/src/pos.ts`

**Files to Modify:**
- `packages/shared-types/src/index.ts`

**Acceptance:**
- [ ] All POS DTOs have proper validation
- [ ] Idempotency key validation works
- [ ] Discount authorization rules defined

---

### TASK-002-API: POS Dashboard & Search APIs
**Owner:** Backend Engineer  
**Estimated Effort:** 1.5 days  
**Description:**
1. Implement GET `/pos/dashboard` with user permissions and stats
2. Implement GET `/pos/customers/search` optimized for POS
3. Implement GET `/pos/motorcycles/search` with branch+availability filters
4. Create service to aggregate data from existing domain APIs
5. Apply proper branch scoping and performance optimization

**Files to Create:**
- `apps/api/src/routes/pos.ts`
- `apps/api/src/controllers/pos.controller.ts`  
- `apps/api/src/services/pos.service.ts`

**Acceptance:**
- [ ] Dashboard loads user-specific data and permissions
- [ ] Customer search optimized for <200ms performance
- [ ] Motorcycle search filters by branch and availability only
- [ ] All responses include required POS workflow data

---

### TASK-003-API: Transaction Validation & Creation
**Owner:** Backend Engineer  
**Estimated Effort:** 2 days  
**Description:**
1. Implement POST `/pos/validate-transaction` for pre-submission validation
2. Implement POST `/pos/transactions` with idempotency protection
3. Create transaction orchestration logic:
   - Validate user permissions (discount authorization)
   - Call appropriate domain API (Order/Reservation)
   - Handle idempotency conflicts
   - Return unified response format
4. Implement discount authorization validation
5. Add comprehensive error handling with POS-specific error codes

**Files to Modify:**
- `apps/api/src/routes/pos.ts`
- `apps/api/src/controllers/pos.controller.ts`
- `apps/api/src/services/pos.service.ts`

**Dependencies:** SPEC-005 Order API, SPEC-006 Reservation API

**Acceptance:**
- [ ] Transaction validation works without creating records
- [ ] Idempotency prevents duplicate submissions
- [ ] Discount authorization enforced server-side
- [ ] Clear error messages for all failure cases
- [ ] Integration with existing Order/Reservation domains works

---

### TASK-004-API: Reservation Management
**Owner:** Backend Engineer  
**Estimated Effort:** 1 day  
**Description:**
1. Implement GET `/pos/reservations/active` with branch filtering
2. Implement POST `/pos/reservations/:id/convert` with POS logging
3. Add expiration warnings and conversion eligibility checks
4. Create POS-specific reservation aggregation views

**Files to Modify:**
- `apps/api/src/routes/pos.ts`
- `apps/api/src/controllers/pos.controller.ts`
- `apps/api/src/services/pos.service.ts`

**Dependencies:** SPEC-006 Reservation API

**Acceptance:**
- [ ] Active reservations filtered by branch
- [ ] Expiration warnings calculated correctly  
- [ ] Conversion process integrates with existing API
- [ ] Conversion eligibility validated properly

---

### TASK-005-API: Offline Support & Sync
**Owner:** Backend Engineer  
**Estimated Effort:** 2 days  
**Description:**
1. Implement GET `/pos/offline/sync-status` for connection monitoring
2. Implement POST `/pos/offline/queue` for operation queuing
3. Create offline operation validation (only allow safe operations)
4. Implement sync conflict detection and resolution logic
5. Add queue management with limits and expiration

**Files to Modify:**
- `apps/api/src/routes/pos.ts`
- `apps/api/src/controllers/pos.controller.ts`
- `apps/api/src/services/pos.service.ts`
- `apps/api/src/services/offline.service.ts` (create)

**Acceptance:**
- [ ] Sync status accurately reflects connection state
- [ ] Only safe operations can be queued offline
- [ ] Conflict detection works on sync
- [ ] Queue limits enforced (max 10 operations per user)

---

### TASK-006-API: Integration Tests
**Owner:** Backend Engineer  
**Estimated Effort:** 2.5 days  
**Description:**
1. Write integration tests for all POS endpoints
2. Test transaction creation with various scenarios
3. Test idempotency and duplicate prevention
4. Test discount authorization enforcement  
5. Test branch scoping validation
6. Test offline queue and sync operations
7. Test error handling for all edge cases
8. Achieve >85% coverage on POS module

**Files to Create:**
- `apps/api/tests/pos.test.ts`
- `apps/api/tests/pos-concurrency.test.ts`
- `apps/api/tests/pos-offline.test.ts`

**Acceptance:**
- [ ] All POS endpoints tested
- [ ] Concurrency scenarios validated
- [ ] Error cases properly handled
- [ ] Coverage >85%

---

### TASK-007-DESKTOP: Application Shell & Navigation
**Owner:** Frontend Engineer (Desktop)  
**Estimated Effort:** 2 days  
**Description:**
1. Create main POS application layout with header, navigation, status bar
2. Implement connection status monitoring
3. Create keyboard navigation system (Tab, Enter, Escape, F-keys)
4. Implement branch display and switching (if authorized)
5. Add real-time status updates (sync, queue, connection)
6. Create Arabic/English language switching with RTL support

**Files to Create:**
- `apps/desktop/src/pages/POSMain.tsx`
- `apps/desktop/src/layouts/POSLayout.tsx`
- `apps/desktop/src/components/POSHeader.tsx`
- `apps/desktop/src/components/StatusBar.tsx`
- `apps/desktop/src/hooks/useConnectionStatus.ts`
- `apps/desktop/src/hooks/useKeyboardNav.ts`

**Acceptance:**
- [ ] Clean POS layout with all required sections
- [ ] Connection status displays accurately
- [ ] Keyboard navigation works throughout app
- [ ] Language switching works with RTL support
- [ ] Branch information displayed correctly

---

### TASK-008-DESKTOP: Customer Search & Selection
**Owner:** Frontend Engineer (Desktop)  
**Estimated Effort:** 1.5 days  
**Description:**
1. Create customer search interface with real-time search
2. Implement customer selection with details display
3. Create quick customer creation form
4. Add duplicate customer warnings
5. Show customer transaction history and active reservations
6. Optimize for fast keyboard-only operation

**Files to Create:**
- `apps/desktop/src/components/CustomerSearch.tsx`
- `apps/desktop/src/components/CustomerCreateQuick.tsx`
- `apps/desktop/src/components/CustomerCard.tsx`
- `apps/desktop/src/hooks/useCustomerSearch.ts`

**Acceptance:**
- [ ] Customer search responds in <200ms
- [ ] Customer selection shows relevant details
- [ ] Quick customer creation works
- [ ] Duplicate warnings appear when appropriate
- [ ] Keyboard navigation optimized for speed

---

### TASK-009-DESKTOP: Motorcycle Search & Selection  
**Owner:** Frontend Engineer (Desktop)  
**Estimated Effort:** 1.5 days  
**Description:**
1. Create motorcycle search interface with VIN/model/brand search
2. Display motorcycle grid with images, details, prices
3. Show only available motorcycles from current branch
4. Implement motorcycle selection with validation
5. Display motorcycle details panel with specs and images

**Files to Create:**
- `apps/desktop/src/components/MotorcycleSearch.tsx`
- `apps/desktop/src/components/MotorcycleGrid.tsx`
- `apps/desktop/src/components/MotorcycleCard.tsx`
- `apps/desktop/src/hooks/useMotorcycleSearch.ts`

**Acceptance:**
- [ ] Motorcycle search filters by branch and availability
- [ ] Search works by VIN, model, brand
- [ ] Selection shows detailed motorcycle information
- [ ] Only available motorcycles selectable

---

### TASK-010-DESKTOP: Transaction Creation (Orders)
**Owner:** Frontend Engineer (Desktop)  
**Estimated Effort:** 2 days  
**Description:**
1. Create order transaction form with customer + motorcycle
2. Implement discount application with authorization validation
3. Add real-time total calculation
4. Create transaction confirmation dialog
5. Implement idempotency protection (disable submit after first click)
6. Handle all error scenarios with clear messages
7. Show order confirmation with receipt preview

**Files to Create:**
- `apps/desktop/src/components/TransactionForm.tsx`
- `apps/desktop/src/components/DiscountInput.tsx`
- `apps/desktop/src/components/TransactionSummary.tsx`
- `apps/desktop/src/components/TransactionConfirmation.tsx`
- `apps/desktop/src/hooks/useTransaction.ts`

**Acceptance:**
- [ ] Order creation workflow smooth and fast
- [ ] Discount validation works with user authorization
- [ ] Total calculation updates in real-time
- [ ] Error handling clear and helpful
- [ ] Duplicate submission prevented
- [ ] Order confirmation displays all details

---

### TASK-011-DESKTOP: Reservation Creation & Management
**Owner:** Frontend Engineer (Desktop)  
**Estimated Effort:** 2 days  
**Description:**
1. Create reservation transaction form with deposit input
2. Implement deposit validation (min/max rules)
3. Add expiration date setting (default + custom)
4. Create reservation search and listing interface
5. Implement reservation-to-order conversion workflow
6. Show reservation status and expiration warnings

**Files to Create:**
- `apps/desktop/src/components/ReservationForm.tsx`
- `apps/desktop/src/components/DepositInput.tsx`
- `apps/desktop/src/components/ReservationList.tsx`
- `apps/desktop/src/components/ReservationConvert.tsx`
- `apps/desktop/src/hooks/useReservation.ts`

**Acceptance:**
- [ ] Reservation creation with proper deposit validation
- [ ] Expiration date setting works correctly
- [ ] Reservation search and listing functional
- [ ] Conversion workflow integrates smoothly
- [ ] Expiration warnings displayed appropriately

---

### TASK-012-DESKTOP: Receipt Generation & History
**Owner:** Frontend Engineer (Desktop)  
**Estimated Effort:** 1.5 days  
**Description:**
1. Create receipt display component with proper formatting
2. Implement transaction history view (today's transactions)
3. Add receipt printing preparation (for future printer integration)
4. Create transaction search and filtering
5. Show transaction status and details

**Files to Create:**
- `apps/desktop/src/components/ReceiptView.tsx`
- `apps/desktop/src/components/TransactionHistory.tsx`
- `apps/desktop/src/components/TransactionSearch.tsx`
- `apps/desktop/src/utils/receiptFormatter.ts`

**Acceptance:**
- [ ] Receipt formatting matches specification
- [ ] Transaction history shows today's work
- [ ] Receipt ready for future printer integration
- [ ] Transaction details accessible from history

---

### TASK-013-DESKTOP: Offline Support & Sync UI
**Owner:** Frontend Engineer (Desktop)  
**Estimated Effort:** 1.5 days  
**Description:**
1. Create offline mode indicators and messaging
2. Implement operation queuing UI for customer creation
3. Create sync progress and conflict resolution interfaces
4. Add graceful degradation for offline functionality
5. Show queue status and sync notifications

**Files to Create:**
- `apps/desktop/src/components/OfflineIndicator.tsx`
- `apps/desktop/src/components/SyncStatus.tsx`
- `apps/desktop/src/components/ConflictResolution.tsx`
- `apps/desktop/src/hooks/useOfflineSync.ts`

**Acceptance:**
- [ ] Offline status clearly communicated
- [ ] Queue operations show progress
- [ ] Sync conflicts allow user resolution
- [ ] Graceful degradation preserves usability
- [ ] Connection recovery automatic and smooth

---

## Dependencies

**Upstream:**
- SPEC-001 (Auth/Users/Roles) — User authentication and role-based permissions
- SPEC-002 (Motorcycles) — Motorcycle search and availability data
- SPEC-004 (Customers) — Customer search, creation, and management
- SPEC-005 (Orders) — Order creation and management APIs  
- SPEC-006 (Reservations) — Reservation creation, management, and conversion APIs

**Downstream:**
- SPEC-008 (Invoices/Payments) — Payment processing integration
- SPEC-009 (Installments) — Installment plan creation from POS
- SPEC-010 (Letters) — Receipt and letter printing integration
- SPEC-013 (Reports) — POS transaction reporting and analytics

---

## Files/Modules Expected to Change

### Created
- `packages/shared-types/src/pos.ts` — POS-specific types and DTOs
- `apps/api/src/routes/pos.ts` — POS orchestration API routes
- `apps/api/src/controllers/pos.controller.ts` — POS API controller
- `apps/api/src/services/pos.service.ts` — POS orchestration service
- `apps/api/src/services/offline.service.ts` — Offline queue and sync service
- `apps/api/tests/pos.test.ts` — POS API integration tests
- `apps/desktop/src/pages/POSMain.tsx` — Main POS interface
- `apps/desktop/src/layouts/POSLayout.tsx` — POS application layout
- `apps/desktop/src/components/CustomerSearch.tsx` — Customer search component
- `apps/desktop/src/components/MotorcycleSearch.tsx` — Motorcycle search component
- `apps/desktop/src/components/TransactionForm.tsx` — Transaction creation form
- `apps/desktop/src/components/ReservationForm.tsx` — Reservation creation form

### Modified
- `apps/desktop/src/main.tsx` — Add POS routing
- `apps/api/src/index.ts` — Add POS routes

---

## Next Implementation Task

**After this specification is approved:**

Implement **TASK-001-SHARED: POS Types & Validation** (Backend Engineer)

**DO NOT implement any tasks without approval.**

---

**End of SPEC-007**