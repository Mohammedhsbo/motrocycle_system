# SPEC-003: Inventory, Suppliers, Purchases & Branch Transfers

**Feature Goal:** Implement supply chain management for motorcycle inventory: supplier management, purchase orders with receiving workflow, and branch-to-branch transfers with status transitions.

**Priority:** P0 (Core MVP - Required for inventory management and multi-branch operations)

**Dependencies:** 
- SPEC-001 (Authentication, Users & Roles)
- SPEC-002 (Brands, Categories & Motorcycles)

---

## User Roles

| Role | Permissions |
|------|-------------|
| `super_admin` | Full access to all suppliers, purchases, transfers across all branches |
| `branch_manager` | Manage purchases/transfers for own branch |
| `inventory_clerk` | Manage suppliers, purchases, transfers (within branch scope) |
| `cashier` | Read-only access to inventory |
| `accountant` | Read-only access to purchases (for cost reporting) |
| `customer` | No access |

---

## Functional Requirements

### A. Suppliers

#### FR-S01: Supplier Management
- CRUD operations for suppliers
- Track: name, contact person, phone, email, address, notes
- Active/inactive status flag
- Suppliers are not branch-specific (global)

#### FR-S02: Supplier Validation
- Name must be unique
- Cannot delete supplier with associated purchases
- Can deactivate supplier to prevent new purchases

---

### B. Purchases

#### FR-P01: Purchase Order Creation
- Create purchase order linked to supplier and branch
- Purchase contains multiple items (motorcycles to be ordered)
- Each item specifies: model, VIN (optional at creation), quantity, unit cost
- Auto-generate sequential `purchaseNumber` per branch
- Initial status: `draft`

#### FR-P02: Purchase Lifecycle
- **States:** `draft` → `ordered` → `partially_received` → `received` (or `cancelled`)
- `draft`: Purchase being prepared, can edit items
- `ordered`: Purchase confirmed with supplier, items locked
- `partially_received`: Some (not all) items received
- `received`: All items received
- `cancelled`: Purchase cancelled (only from `draft`)

#### FR-P03: Receiving Workflow
- When receiving items, specify which items and their VINs
- For each received item:
  1. Create new `Motorcycle` record with status `in_transit`
  2. Link motorcycle to `PurchaseItem`
  3. Copy details (model, VIN, cost price) from purchase item
- If all items received: purchase status → `received`
- If some items received: purchase status → `partially_received`
- Record `receivedAt` timestamp on completion

#### FR-P04: Purchase Editing
- Can edit items and amounts only in `draft` status
- Cannot edit after status is `ordered`
- Can cancel only from `draft` status

---

### C. Branch Transfers

#### FR-T01: Transfer Creation
- Create transfer from one branch to another
- Specify motorcycles to transfer (by ID)
- Cannot transfer motorcycle with status other than `available`
- Auto-generate sequential `transferNumber`
- Initial status: `initiated`

#### FR-T02: Transfer Lifecycle
- **States:** `initiated` → `in_transit` → `received` (or `cancelled`)
- `initiated`: Transfer created, motorcycles selected
- `in_transit`: Motorcycles shipped, physically moving
- `received`: Motorcycles received at destination branch
- `cancelled`: Transfer cancelled (only from `initiated`)

#### FR-T03: Transfer Status Sync
- On `initiated` → `in_transit`: each motorcycle status → `in_transfer`
- On `in_transit` → `received`:
  1. Each motorcycle's `branchId` → destination branch
  2. Each motorcycle's status → `available`
- On `cancelled`: motorcycles revert to `available` at source branch

#### FR-T04: Transfer Transaction Safety
- Entire transfer operation must be atomic (single DB transaction)
- Use row-level locks on motorcycles during transition
- If any motorcycle cannot be transitioned, entire transfer fails

#### FR-T05: Transfer Restrictions
- Cannot transfer to same branch (`fromBranchId != toBranchId`)
- Cannot add/remove motorcycles after `initiated` → `in_transit`
- Can cancel only from `initiated` status

---

### D. Inventory Tracking

#### FR-I01: Inventory Views
- View all motorcycles in branch with current status
- Filter by status, brand, category
- Show source information (which purchase or transfer)

#### FR-I02: Motorcycle Traceability
- Each motorcycle links back to originating purchase
- Transfer history tracked via audit log
- Full lifecycle visible: purchase → branch transfers → current location

---

## Business Rules

### BR-001: Supplier Rules
- Supplier name must be unique
- Cannot delete supplier with purchases (any status)
- Inactive suppliers cannot be selected for new purchases

### BR-002: Purchase Status Transitions (from BUSINESS_RULES.md)
```
draft → ordered, cancelled
ordered → partially_received, received, cancelled
partially_received → received
```

### BR-003: Purchase Receiving Rules
- Can only receive items from `ordered` or `partially_received` status
- Each item can be received once (no duplicate receiving)
- VIN must be provided during receiving (if not provided at creation)
- VIN must be unique across all motorcycles
- Received motorcycles created with status `in_transit`, then manually moved to `available`

### BR-004: Purchase Number Generation
- Format: `PO-{branchCode}-{year}-{sequence}`
- Example: `PO-RYD-2026-00001`
- Sequential per branch per year

### BR-005: Transfer Status Transitions (from BUSINESS_RULES.md)
```
initiated → in_transit, cancelled
in_transit → received
```

### BR-006: Transfer Motorcycle Requirements
- Only motorcycles with status `available` can be transferred
- Motorcycles must belong to source branch
- Cannot transfer same motorcycle in multiple active transfers

### BR-007: Transfer Number Generation
- Format: `TRF-{year}-{sequence}`
- Example: `TRF-2026-00001`
- Sequential globally (not per branch)

### BR-008: Inventory Atomicity
- Purchase receiving is atomic: all specified items received or none
- Transfer completion is atomic: all motorcycles moved or none
- Use database transactions with row locks

### BR-009: Branch Scoping
- Branch-scoped users can only create/view purchases for their branch
- Branch-scoped users can only initiate transfers from their branch
- Branch-scoped users can receive transfers to their branch
- Super_admin sees all purchases and transfers

---

## Data Requirements

### Entities Used
- `Supplier` (id, name, contactPerson, phone, email, address, notes, isActive, createdAt, updatedAt)
- `Purchase` (id, purchaseNumber, supplierId, branchId, userId, totalAmount, status, receivedAt, notes, createdAt, updatedAt)
- `PurchaseItem` (id, purchaseId, motorcycleId, model, vin, quantity, unitCost, createdAt)
- `Transfer` (id, transferNumber, fromBranchId, toBranchId, userId, status, notes, completedAt, createdAt, updatedAt)
- `TransferItem` (id, transferId, motorcycleId)
- `Motorcycle` (from SPEC-002 — status transitions)
- `AuditLog` (for all state changes)

### Relationships
- `Purchase` → `Supplier` (many-to-one)
- `Purchase` → `Branch` (many-to-one)
- `Purchase` → `User` (many-to-one, who created)
- `PurchaseItem` → `Purchase` (many-to-one)
- `PurchaseItem` → `Motorcycle` (one-to-one, nullable until received)
- `Transfer` → `Branch` (two many-to-one: from/to)
- `Transfer` → `User` (many-to-one, who created)
- `TransferItem` → `Transfer` (many-to-one)
- `TransferItem` → `Motorcycle` (many-to-one)

---

## API Requirements

### POST `/api/v1/suppliers`
**Description:** Create new supplier

**Required Permission:** `supplier:create`

**Request Body:**
```typescript
{
  name: string;              // max 200 chars, unique
  contactPerson?: string;    // max 200 chars
  phone?: string;            // max 20 chars
  email?: string;            // valid email
  address?: string;
  notes?: string;
}
```

**Response (201):**
```typescript
{
  success: true,
  data: {
    id: string;
    name: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
    isActive: boolean;
    createdAt: string;
  }
}
```

**Errors:**
- 409: `SUPPLIER_NAME_EXISTS`

---

### GET `/api/v1/suppliers`
**Description:** List all suppliers

**Required Permission:** `supplier:read`

**Query Parameters:**
- `page` (number, default 1)
- `limit` (number, default 20)
- `search` (string) — searches name, contact person
- `isActive` (boolean, optional)

**Response (200):**
```typescript
{
  success: true,
  data: Array<{
    id: string;
    name: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    isActive: boolean;
    _count: {
      purchases: number;
    };
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

---

### GET `/api/v1/suppliers/:id`
**Description:** Get single supplier

**Required Permission:** `supplier:read`

**Response (200):** Same as POST response + `_count.purchases`

**Errors:**
- 404: `SUPPLIER_NOT_FOUND`

---

### PATCH `/api/v1/suppliers/:id`
**Description:** Update supplier

**Required Permission:** `supplier:update`

**Request Body (all optional):**
```typescript
{
  name?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  isActive?: boolean;
}
```

**Response (200):** Updated supplier object

**Errors:**
- 404: `SUPPLIER_NOT_FOUND`
- 409: `SUPPLIER_NAME_EXISTS`

---

### DELETE `/api/v1/suppliers/:id`
**Description:** Delete supplier

**Required Permission:** `supplier:delete`

**Response (200):**
```typescript
{
  success: true,
  data: null
}
```

**Errors:**
- 404: `SUPPLIER_NOT_FOUND`
- 409: `SUPPLIER_HAS_PURCHASES`

---

### POST `/api/v1/purchases`
**Description:** Create new purchase order

**Required Permission:** `purchase:create`

**Request Body:**
```typescript
{
  supplierId: string;        // UUID
  branchId: string;          // UUID (defaults to user's branch if scoped)
  notes?: string;
  items: Array<{
    model: string;           // max 200 chars
    vin?: string;            // optional, can provide during receiving
    quantity: number;        // default 1
    unitCost: number;        // decimal(12,2)
  }>;                        // min 1 item
}
```

**Response (201):**
```typescript
{
  success: true,
  data: {
    id: string;
    purchaseNumber: string;
    supplier: {
      id: string;
      name: string;
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
    totalAmount: number;     // sum of (quantity * unitCost)
    status: string;          // 'draft'
    notes?: string;
    items: Array<{
      id: string;
      model: string;
      vin?: string;
      quantity: number;
      unitCost: number;
    }>;
    createdAt: string;
  }
}
```

**Errors:**
- 404: `SUPPLIER_NOT_FOUND`, `BRANCH_NOT_FOUND`
- 403: `BRANCH_SCOPE_VIOLATION`
- 422: Validation failure (empty items, invalid cost)

**Side Effects:**
- Auto-generate `purchaseNumber`
- Audit log entry

---

### GET `/api/v1/purchases`
**Description:** List purchase orders

**Required Permission:** `purchase:read`

**Query Parameters:**
- `page`, `limit`
- `search` — searches purchase number, supplier name
- `supplierId` (UUID)
- `branchId` (UUID)
- `status` (enum)
- `startDate`, `endDate` (ISO 8601)

**Response (200):**
```typescript
{
  success: true,
  data: Array<{
    id: string;
    purchaseNumber: string;
    supplier: {
      id: string;
      name: string;
    };
    branch: {
      id: string;
      nameAr: string;
      nameEn: string;
    };
    totalAmount: number;
    status: string;
    itemCount: number;       // Total items
    receivedCount: number;   // Items received
    createdAt: string;
    receivedAt?: string;
  }>,
  meta: { total, page, limit, totalPages }
}
```

**Branch Scoping:** Non-admin users see only own branch purchases

---

### GET `/api/v1/purchases/:id`
**Description:** Get single purchase with items

**Required Permission:** `purchase:read`

**Response (200):**
```typescript
{
  success: true,
  data: {
    id: string;
    purchaseNumber: string;
    supplier: {
      id: string;
      name: string;
      contactPerson?: string;
      phone?: string;
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
    totalAmount: number;
    status: string;
    notes?: string;
    items: Array<{
      id: string;
      model: string;
      vin?: string;
      quantity: number;
      unitCost: number;
      motorcycle?: {           // Present if received
        id: string;
        status: string;
      };
    }>;
    createdAt: string;
    receivedAt?: string;
    updatedAt: string;
  }
}
```

**Errors:**
- 404: `PURCHASE_NOT_FOUND`
- 403: `BRANCH_SCOPE_VIOLATION`

---

### PATCH `/api/v1/purchases/:id`
**Description:** Update purchase (draft only)

**Required Permission:** `purchase:update`

**Request Body (all optional):**
```typescript
{
  supplierId?: string;
  notes?: string;
  items?: Array<{          // Replaces all items
    model: string;
    vin?: string;
    quantity: number;
    unitCost: number;
  }>;
}
```

**Response (200):** Updated purchase object

**Errors:**
- 404: `PURCHASE_NOT_FOUND`
- 403: `BRANCH_SCOPE_VIOLATION`
- 409: `PURCHASE_NOT_DRAFT` (cannot edit non-draft)

---

### POST `/api/v1/purchases/:id/order`
**Description:** Transition purchase from draft to ordered

**Required Permission:** `purchase:update`

**Request Body:** None

**Response (200):**
```typescript
{
  success: true,
  data: {
    id: string;
    purchaseNumber: string;
    status: string;          // 'ordered'
    updatedAt: string;
  }
}
```

**Errors:**
- 404: `PURCHASE_NOT_FOUND`
- 409: `INVALID_STATUS_TRANSITION`
- 422: Items empty or incomplete

**Side Effects:**
- Status → `ordered`
- Items locked (no further edits)
- Audit log entry

---

### POST `/api/v1/purchases/:id/receive`
**Description:** Receive items from purchase

**Required Permission:** `purchase:update`

**Request Body:**
```typescript
{
  items: Array<{
    purchaseItemId: string;  // UUID
    vin: string;             // Required if not provided earlier
  }>;
}
```

**Response (200):**
```typescript
{
  success: true,
  data: {
    id: string;
    purchaseNumber: string;
    status: string;          // 'partially_received' or 'received'
    receivedMotorcycles: Array<{
      id: string;
      vin: string;
      model: string;
      status: string;        // 'in_transit'
    }>;
    receivedAt?: string;     // Set if all items received
  }
}
```

**Errors:**
- 404: `PURCHASE_NOT_FOUND`, `PURCHASE_ITEM_NOT_FOUND`
- 409: `PURCHASE_NOT_ORDERED` (must be ordered or partially_received)
- 409: `ITEM_ALREADY_RECEIVED`
- 409: `VIN_EXISTS`
- 422: Validation failure

**Side Effects (atomic transaction):**
1. For each item:
   - Create `Motorcycle` record with status `in_transit`
   - Set `motorcycleId` on `PurchaseItem`
   - Copy `model`, `vin`, `unitCost` (as costPrice) from purchase item
   - Use purchase's `branchId` for motorcycle
2. If all items received: status → `received`, set `receivedAt`
3. If some items received: status → `partially_received`
4. WebSocket event: `inventory:purchase_received`
5. Audit log entry

---

### POST `/api/v1/purchases/:id/cancel`
**Description:** Cancel purchase (draft only)

**Required Permission:** `purchase:delete`

**Response (200):**
```typescript
{
  success: true,
  data: null
}
```

**Errors:**
- 404: `PURCHASE_NOT_FOUND`
- 409: `PURCHASE_NOT_DRAFT`

---

### DELETE `/api/v1/purchases/:id`
**Description:** Delete purchase (draft only, no received items)

**Required Permission:** `purchase:delete`

**Response (200):**
```typescript
{
  success: true,
  data: null
}
```

**Errors:**
- 404: `PURCHASE_NOT_FOUND`
- 409: `PURCHASE_NOT_DRAFT` or `PURCHASE_HAS_RECEIVED_ITEMS`

---

### POST `/api/v1/transfers`
**Description:** Create new branch transfer

**Required Permission:** `transfer:create`

**Request Body:**
```typescript
{
  fromBranchId: string;      // UUID (defaults to user's branch if scoped)
  toBranchId: string;        // UUID
  motorcycleIds: string[];   // Array of UUIDs, min 1
  notes?: string;
}
```

**Response (201):**
```typescript
{
  success: true,
  data: {
    id: string;
    transferNumber: string;
    fromBranch: {
      id: string;
      nameAr: string;
      nameEn: string;
    };
    toBranch: {
      id: string;
      nameAr: string;
      nameEn: string;
    };
    user: {
      id: string;
      name: string;
    };
    status: string;          // 'initiated'
    motorcycles: Array<{
      id: string;
      vin: string;
      model: string;
      status: string;        // Still 'available' at this point
    }>;
    notes?: string;
    createdAt: string;
  }
}
```

**Errors:**
- 404: `BRANCH_NOT_FOUND`, `MOTORCYCLE_NOT_FOUND`
- 403: `BRANCH_SCOPE_VIOLATION`
- 422: `SAME_BRANCH_TRANSFER` (from === to)
- 409: `MOTORCYCLE_NOT_AVAILABLE` (status not 'available')
- 409: `MOTORCYCLE_WRONG_BRANCH` (motorcycle not in fromBranch)

**Validation:**
- All motorcycles must exist
- All motorcycles must have status `available`
- All motorcycles must belong to `fromBranchId`
- `fromBranchId != toBranchId`

---

### GET `/api/v1/transfers`
**Description:** List transfers

**Required Permission:** `transfer:read`

**Query Parameters:**
- `page`, `limit`
- `search` — searches transfer number
- `fromBranchId` (UUID)
- `toBranchId` (UUID)
- `status` (enum)
- `startDate`, `endDate`

**Response (200):**
```typescript
{
  success: true,
  data: Array<{
    id: string;
    transferNumber: string;
    fromBranch: {
      id: string;
      nameAr: string;
      nameEn: string;
    };
    toBranch: {
      id: string;
      nameAr: string;
      nameEn: string;
    };
    motorcycleCount: number;
    status: string;
    createdAt: string;
    completedAt?: string;
  }>,
  meta: { total, page, limit, totalPages }
}
```

**Branch Scoping:** Non-admin users see transfers where `fromBranchId` or `toBranchId` matches their branch

---

### GET `/api/v1/transfers/:id`
**Description:** Get single transfer with motorcycles

**Required Permission:** `transfer:read`

**Response (200):**
```typescript
{
  success: true,
  data: {
    id: string;
    transferNumber: string;
    fromBranch: {
      id: string;
      nameAr: string;
      nameEn: string;
    };
    toBranch: {
      id: string;
      nameAr: string;
      nameEn: string;
    };
    user: {
      id: string;
      name: string;
    };
    status: string;
    motorcycles: Array<{
      id: string;
      vin: string;
      model: string;
      brand: {
        nameAr: string;
        nameEn: string;
      };
      currentStatus: string;
      currentBranchId: string;
    }>;
    notes?: string;
    createdAt: string;
    completedAt?: string;
    updatedAt: string;
  }
}
```

**Errors:**
- 404: `TRANSFER_NOT_FOUND`
- 403: `BRANCH_SCOPE_VIOLATION`

---

### POST `/api/v1/transfers/:id/ship`
**Description:** Mark transfer as in transit

**Required Permission:** `transfer:update`

**Request Body:** None

**Response (200):**
```typescript
{
  success: true,
  data: {
    id: string;
    transferNumber: string;
    status: string;          // 'in_transit'
    updatedAt: string;
  }
}
```

**Errors:**
- 404: `TRANSFER_NOT_FOUND`
- 409: `INVALID_STATUS_TRANSITION`
- 409: `MOTORCYCLE_STATUS_CHANGED` (a motorcycle no longer available)

**Side Effects (atomic transaction with row locks):**
1. Lock all motorcycles: `SELECT ... FOR UPDATE`
2. Verify all still `available`
3. Update all motorcycle status → `in_transfer`
4. Update transfer status → `in_transit`
5. WebSocket event: `inventory:transfer_shipped`
6. Audit log entry

---

### POST `/api/v1/transfers/:id/receive`
**Description:** Complete transfer (receive at destination)

**Required Permission:** `transfer:update`

**Request Body:** None

**Response (200):**
```typescript
{
  success: true,
  data: {
    id: string;
    transferNumber: string;
    status: string;          // 'received'
    completedAt: string;
    motorcycles: Array<{
      id: string;
      vin: string;
      status: string;        // 'available'
      branchId: string;      // toBranchId
    }>;
  }
}
```

**Errors:**
- 404: `TRANSFER_NOT_FOUND`
- 409: `INVALID_STATUS_TRANSITION` (must be in_transit)

**Side Effects (atomic transaction with row locks):**
1. Lock all motorcycles: `SELECT ... FOR UPDATE`
2. Update all motorcycle `branchId` → `toBranchId`
3. Update all motorcycle status → `available`
4. Update transfer status → `received`, set `completedAt`
5. WebSocket event: `inventory:transfer_received`
6. Audit log entry

---

### POST `/api/v1/transfers/:id/cancel`
**Description:** Cancel transfer (initiated only)

**Required Permission:** `transfer:delete`

**Response (200):**
```typescript
{
  success: true,
  data: null
}
```

**Errors:**
- 404: `TRANSFER_NOT_FOUND`
- 409: `TRANSFER_NOT_INITIATED` (can only cancel from 'initiated')

**Side Effects:**
- Transfer status → `cancelled`
- Motorcycles remain `available` at source branch
- Audit log entry

---

### DELETE `/api/v1/transfers/:id`
**Description:** Delete transfer (initiated only, alternative to cancel)

**Required Permission:** `transfer:delete`

**Response (200):**
```typescript
{
  success: true,
  data: null
}
```

**Errors:**
- 404: `TRANSFER_NOT_FOUND`
- 409: `TRANSFER_NOT_INITIATED`

---

## Validation Rules

### Supplier
- `name`: Required, max 200 chars, unique
- `contactPerson`: Optional, max 200 chars
- `phone`: Optional, max 20 chars
- `email`: Optional, valid email format
- `address`: Optional, max 1000 chars

### Purchase
- `supplierId`: Required UUID, must exist
- `branchId`: Required UUID, must exist
- `items`: Required array, min 1 item, max 100 items
- Each item:
  - `model`: Required, max 200 chars
  - `vin`: Optional, max 50 chars, unique if provided
  - `quantity`: Integer, min 1, default 1
  - `unitCost`: Required, decimal(12,2), >= 0

### Purchase Receiving
- Must specify at least 1 item
- Each `purchaseItemId` must belong to the purchase
- Each `purchaseItemId` can be received only once
- `vin` required if not provided at purchase creation
- VIN uniqueness checked globally

### Transfer
- `fromBranchId`: Required UUID, must exist, must be user's branch (if scoped)
- `toBranchId`: Required UUID, must exist
- `fromBranchId != toBranchId`
- `motorcycleIds`: Required array, min 1, max 50
- Each motorcycle must:
  - Exist
  - Have status `available`
  - Belong to `fromBranchId`

---

## Error Cases

| Scenario | HTTP Status | Error Code |
|----------|-------------|------------|
| Supplier name exists | 409 | `SUPPLIER_NAME_EXISTS` |
| Supplier has purchases | 409 | `SUPPLIER_HAS_PURCHASES` |
| Purchase not found | 404 | `PURCHASE_NOT_FOUND` |
| Purchase item not found | 404 | `PURCHASE_ITEM_NOT_FOUND` |
| Purchase not draft | 409 | `PURCHASE_NOT_DRAFT` |
| Purchase not ordered | 409 | `PURCHASE_NOT_ORDERED` |
| Invalid purchase status transition | 409 | `INVALID_STATUS_TRANSITION` |
| Item already received | 409 | `ITEM_ALREADY_RECEIVED` |
| Transfer not found | 404 | `TRANSFER_NOT_FOUND` |
| Same branch transfer | 422 | `SAME_BRANCH_TRANSFER` |
| Motorcycle not available | 409 | `MOTORCYCLE_NOT_AVAILABLE` |
| Motorcycle wrong branch | 409 | `MOTORCYCLE_WRONG_BRANCH` |
| Motorcycle status changed | 409 | `MOTORCYCLE_STATUS_CHANGED` |
| Transfer not initiated | 409 | `TRANSFER_NOT_INITIATED` |
| Supplier not found | 404 | `SUPPLIER_NOT_FOUND` |
| VIN exists | 409 | `VIN_EXISTS` |

---

## Permission Requirements

### Supplier Management
- `supplier:create` — Create suppliers
- `supplier:read` — View suppliers
- `supplier:update` — Edit suppliers
- `supplier:delete` — Delete suppliers

### Purchase Management
- `purchase:create` — Create purchases
- `purchase:read` — View purchases
- `purchase:update` — Edit purchases, change status, receive items
- `purchase:delete` — Cancel/delete purchases

### Transfer Management
- `transfer:create` — Create transfers
- `transfer:read` — View transfers
- `transfer:update` — Ship/receive transfers
- `transfer:delete` — Cancel/delete transfers

---

## Edge Cases

### EC-001: Concurrent Purchase Receiving
- Two users try to receive same purchase simultaneously
- Database transaction ensures serialization
- First succeeds, second may see items already received

### EC-002: Motorcycle Status Changed During Transfer Creation
- User selects motorcycles for transfer (all available)
- Before submitting, another user changes one motorcycle status
- Transfer creation fails with `MOTORCYCLE_NOT_AVAILABLE`

### EC-003: Transfer in Transit When Motorcycle Manually Changed
- Transfer in `in_transit` status
- Admin tries to manually change motorcycle status
- Should fail (motorcycle in `in_transfer` has limited transitions)

### EC-004: Partial Purchase Receiving with VIN Conflict
- User receives 3 items, one VIN conflicts with existing
- Entire receive operation rolls back (all or nothing)
- User must provide different VIN

### EC-005: Branch-Scoped User Creating Transfer
- User belongs to Branch A
- Tries to create transfer from Branch B → Branch C
- Rejected with `BRANCH_SCOPE_VIOLATION`

### EC-006: Receiving User Different from Creator
- User A creates purchase in Branch X
- User B (same branch) receives the purchase
- Allowed — any authorized user in branch can receive

### EC-007: Transfer Cancelled After Shipping
- Transfer status is `in_transit`
- User tries to cancel
- Rejected — can only cancel from `initiated`

### EC-008: Purchase Items with Same Model Different VINs
- Purchase has 5 items, same model, different VINs
- All can be received in single request
- Each creates separate motorcycle record

---

## Acceptance Criteria

### AC-001: Supplier Management
- [ ] Super_admin can create/update/delete suppliers
- [ ] Cannot delete supplier with purchases
- [ ] Inactive suppliers not selectable for new purchases
- [ ] Supplier list paginated and searchable

### AC-002: Purchase Creation & Editing
- [ ] User creates purchase with multiple items
- [ ] Purchase number auto-generated with branch code
- [ ] Can edit items in `draft` status
- [ ] Cannot edit after `ordered`
- [ ] Total amount calculated correctly

### AC-003: Purchase Status Transitions
- [ ] `draft` → `ordered` succeeds
- [ ] Cannot transition from `ordered` → `draft`
- [ ] Can cancel only from `draft`

### AC-004: Purchase Receiving
- [ ] Receive items creates motorcycles with status `in_transit`
- [ ] VIN uniqueness enforced
- [ ] Partial receiving sets status to `partially_received`
- [ ] Full receiving sets status to `received` and `receivedAt`
- [ ] Transaction rolls back if any VIN conflict

### AC-005: Purchase Branch Scoping
- [ ] Branch-scoped user creates purchase in own branch
- [ ] Cannot create purchase in other branch
- [ ] Can only view own branch purchases

### AC-006: Transfer Creation
- [ ] Transfer created with motorcycles in `available` status
- [ ] Transfer number auto-generated
- [ ] Cannot transfer to same branch
- [ ] Cannot include non-available motorcycles

### AC-007: Transfer Shipping
- [ ] Ship transition updates all motorcycles → `in_transfer`
- [ ] Transfer status → `in_transit`
- [ ] Entire operation atomic (all or nothing)
- [ ] WebSocket event emitted

### AC-008: Transfer Receiving
- [ ] Receive transition updates all motorcycles `branchId` → destination
- [ ] All motorcycle statuses → `available`
- [ ] Transfer status → `received`, `completedAt` set
- [ ] Entire operation atomic
- [ ] WebSocket event emitted

### AC-009: Transfer Cancellation
- [ ] Can cancel from `initiated` status
- [ ] Cannot cancel from `in_transit` or `received`
- [ ] Motorcycles remain at source branch

### AC-010: Concurrent Operations
- [ ] Two simultaneous receives handled safely
- [ ] Two simultaneous transfers of same motorcycle handled safely
- [ ] Row locks prevent race conditions

### AC-011: Audit Trail
- [ ] All purchase status changes logged
- [ ] All transfer status changes logged
- [ ] All motorcycle receives logged
- [ ] All motorcycle transfers logged

---

## Test Requirements

### Unit Tests
- [ ] Purchase number generation logic
- [ ] Transfer number generation logic
- [ ] Purchase status transition validation
- [ ] Transfer status transition validation
- [ ] Total amount calculation
- [ ] Branch scope filtering

### Integration Tests
- [ ] CRUD `/suppliers` — all operations
- [ ] CRUD `/purchases` — all operations
- [ ] POST `/purchases/:id/receive` — full and partial
- [ ] POST `/purchases/:id/receive` — VIN conflict rollback
- [ ] POST `/purchases/:id/order` — status transition
- [ ] POST `/purchases/:id/cancel` — validation
- [ ] CRUD `/transfers` — all operations
- [ ] POST `/transfers/:id/ship` — atomic motorcycle updates
- [ ] POST `/transfers/:id/receive` — atomic branch transfer
- [ ] POST `/transfers/:id/cancel` — validation
- [ ] Concurrent purchase receiving (race condition)
- [ ] Concurrent transfer shipping (race condition)
- [ ] Branch scoping enforcement
- [ ] WebSocket events emitted correctly

### E2E Tests (Later Phase)
- [ ] Create purchase → order → receive → motorcycles appear in inventory
- [ ] Create transfer → ship → receive → motorcycles move branches
- [ ] Dashboard updates in real-time via WebSocket

---

## Implementation Tasks

### TASK-001-DB: Database Schema
**Owner:** Backend Engineer  
**Estimated Effort:** 0.5 day  
**Description:**
1. Add `Supplier`, `Purchase`, `PurchaseItem`, `Transfer`, `TransferItem` models to schema
2. Create migration
3. Update seed script with sample suppliers, purchases, transfers
4. Add indexes: `Purchase.purchaseNumber`, `Transfer.transferNumber`, `Purchase.branchId`, `Transfer.fromBranchId`, `Transfer.toBranchId`
5. Add foreign key constraints with proper cascades

**Files to Modify:**
- `prisma/schema.prisma`
- `prisma/seed.ts`

**Acceptance:**
- [ ] Migration runs successfully
- [ ] Seed creates sample data
- [ ] Foreign keys and constraints work

---

### TASK-002-SHARED: Shared Types
**Owner:** Backend Engineer  
**Estimated Effort:** 0.5 day  
**Description:**
1. Add enums: `PurchaseStatus`, `TransferStatus`
2. Define interfaces: `Supplier`, `Purchase`, `PurchaseItem`, `Transfer`, `TransferItem`
3. Define DTOs for all CRUD operations
4. Create Zod schemas for all request bodies
5. Export everything

**Files to Create:**
- `packages/shared-types/src/supplier.ts`
- `packages/shared-types/src/purchase.ts`
- `packages/shared-types/src/transfer.ts`

**Files to Modify:**
- `packages/shared-types/src/enums.ts`
- `packages/shared-types/src/index.ts`

**Acceptance:**
- [ ] All DTOs have Zod schemas
- [ ] Enums match BUSINESS_RULES.md

---

### TASK-003-API: Number Generation Utilities
**Owner:** Backend Engineer  
**Estimated Effort:** 0.5 day  
**Description:**
1. Create utility for purchase number generation (format: PO-{branchCode}-{year}-{seq})
2. Create utility for transfer number generation (format: TRF-{year}-{seq})
3. Use Redis or database sequence for atomic increments
4. Handle year rollover

**Files to Create:**
- `apps/api/src/utils/numberGenerator.ts`

**Acceptance:**
- [ ] Numbers generated sequentially
- [ ] Thread-safe (no duplicates)
- [ ] Format matches specification

---

### TASK-004-API: Supplier Routes
**Owner:** Backend Engineer  
**Estimated Effort:** 0.5 day  
**Description:**
1. Implement supplier CRUD routes
2. Create supplier service with name uniqueness check
3. Validate deletion (check for purchases)
4. Log all operations

**Files to Create:**
- `apps/api/src/routes/suppliers.ts`
- `apps/api/src/controllers/suppliers.controller.ts`
- `apps/api/src/services/suppliers.service.ts`

**Acceptance:**
- [ ] All CRUD operations work
- [ ] Cannot delete supplier with purchases
- [ ] Pagination and search work

---

### TASK-005-API: Purchase Routes (CRUD + Status)
**Owner:** Backend Engineer  
**Estimated Effort:** 2 days  
**Description:**
1. Implement purchase CRUD routes
2. Create purchase service with:
   - Auto-generate purchase number
   - Calculate total amount
   - Branch scoping
   - Status transition validation
3. Implement status transition endpoints: `POST /purchases/:id/order`, `POST /purchases/:id/cancel`
4. Validate items (at least 1, valid costs)
5. Log all operations

**Files to Create:**
- `apps/api/src/routes/purchases.ts`
- `apps/api/src/controllers/purchases.controller.ts`
- `apps/api/src/services/purchases.service.ts`

**Acceptance:**
- [ ] Purchase created with items
- [ ] Purchase number generated correctly
- [ ] Status transitions enforced
- [ ] Branch scoping applied
- [ ] Cannot edit non-draft purchases

---

### TASK-006-API: Purchase Receiving
**Owner:** Backend Engineer  
**Estimated Effort:** 1.5 days  
**Description:**
1. Implement `POST /purchases/:id/receive` endpoint
2. Create receiving logic with atomic transaction:
   - Validate purchase status (must be ordered or partially_received)
   - Validate items (not already received, VINs unique)
   - Create motorcycle records with status `in_transit`
   - Link motorcycles to purchase items
   - Update purchase status based on completion
   - Set `receivedAt` if fully received
3. Emit WebSocket event
4. Log operation

**Files to Modify:**
- `apps/api/src/routes/purchases.ts`
- `apps/api/src/controllers/purchases.controller.ts`
- `apps/api/src/services/purchases.service.ts`

**Acceptance:**
- [ ] Receiving creates motorcycles
- [ ] VIN conflict rolls back entire transaction
- [ ] Status updates correctly (partial/full)
- [ ] WebSocket event emitted

---

### TASK-007-API: Transfer Routes (CRUD)
**Owner:** Backend Engineer  
**Estimated Effort:** 1.5 days  
**Description:**
1. Implement transfer CRUD routes
2. Create transfer service with:
   - Auto-generate transfer number
   - Validate motorcycles (available, correct branch)
   - Branch scoping
   - Same branch check
3. Validate cannot edit after `initiated` → `in_transit`
4. Log all operations

**Files to Create:**
- `apps/api/src/routes/transfers.ts`
- `apps/api/src/controllers/transfers.controller.ts`
- `apps/api/src/services/transfers.service.ts`

**Acceptance:**
- [ ] Transfer created with motorcycles
- [ ] Transfer number generated correctly
- [ ] Cannot transfer to same branch
- [ ] Cannot include non-available motorcycles
- [ ] Branch scoping applied

---

### TASK-008-API: Transfer Status Transitions
**Owner:** Backend Engineer  
**Estimated Effort:** 1.5 days  
**Description:**
1. Implement `POST /transfers/:id/ship` endpoint with atomic transaction:
   - Lock all motorcycles (`SELECT ... FOR UPDATE`)
   - Verify all still available
   - Update all statuses → `in_transfer`
   - Update transfer status → `in_transit`
2. Implement `POST /transfers/:id/receive` endpoint with atomic transaction:
   - Lock all motorcycles
   - Update all `branchId` → destination
   - Update all statuses → `available`
   - Update transfer status → `received`, set `completedAt`
3. Implement `POST /transfers/:id/cancel`
4. Emit WebSocket events
5. Log all transitions

**Files to Modify:**
- `apps/api/src/routes/transfers.ts`
- `apps/api/src/controllers/transfers.controller.ts`
- `apps/api/src/services/transfers.service.ts`

**Acceptance:**
- [ ] Ship transition atomic
- [ ] Receive transition atomic
- [ ] Cancel only from initiated
- [ ] WebSocket events emitted
- [ ] All or nothing (rollback on failure)

---

### TASK-009-API: Integration Tests
**Owner:** Backend Engineer  
**Estimated Effort:** 2 days  
**Description:**
1. Write integration tests for:
   - Supplier CRUD
   - Purchase CRUD + status transitions
   - Purchase receiving (full, partial, VIN conflict)
   - Transfer CRUD + status transitions
   - Transfer ship/receive atomicity
   - Concurrent operations (purchase receive, transfer ship)
   - Branch scoping enforcement
   - WebSocket events
2. Achieve >80% coverage

**Files to Create:**
- `apps/api/tests/suppliers.test.ts`
- `apps/api/tests/purchases.test.ts`
- `apps/api/tests/transfers.test.ts`
- `apps/api/tests/inventory-concurrency.test.ts`

**Acceptance:**
- [ ] All tests pass
- [ ] Coverage >80%
- [ ] Concurrent tests verify transaction safety

---

### TASK-010-ADMIN: Supplier & Purchase Management UI
**Owner:** Frontend Engineer (Admin)  
**Estimated Effort:** 2 days  
**Description:**
1. Create React pages:
   - Suppliers list + CRUD modal
   - Purchases list (table with filters)
   - Purchase create/edit form
   - Purchase detail view with receiving interface
2. Implement receiving UI:
   - Checklist of items
   - VIN input per item
   - Receive button (partial or full)
3. Display purchase status with color coding
4. Use React Query for data management

**Files to Create:**
- `apps/admin/src/pages/Suppliers.tsx`
- `apps/admin/src/pages/Purchases.tsx`
- `apps/admin/src/pages/PurchaseForm.tsx`
- `apps/admin/src/pages/PurchaseDetail.tsx`
- `apps/admin/src/components/ReceiveItems.tsx`

**Acceptance:**
- [ ] Can create/edit suppliers
- [ ] Can create purchase with items
- [ ] Can receive items (full or partial)
- [ ] Purchase status displayed correctly

---

### TASK-011-ADMIN: Transfer Management UI
**Owner:** Frontend Engineer (Admin)  
**Estimated Effort:** 1.5 days  
**Description:**
1. Create React pages:
   - Transfers list (table with filters)
   - Transfer create form (select motorcycles)
   - Transfer detail view with ship/receive buttons
2. Implement motorcycle selection UI (searchable list)
3. Display transfer status with color coding
4. Show current location of motorcycles in transfer

**Files to Create:**
- `apps/admin/src/pages/Transfers.tsx`
- `apps/admin/src/pages/TransferForm.tsx`
- `apps/admin/src/pages/TransferDetail.tsx`
- `apps/admin/src/components/MotorcycleSelector.tsx`

**Acceptance:**
- [ ] Can create transfer with motorcycles
- [ ] Can ship transfer
- [ ] Can receive transfer
- [ ] Transfer status displayed correctly

---

### TASK-012-DESKTOP: Purchase Receiving (Stub)
**Owner:** Frontend Engineer (Desktop)  
**Estimated Effort:** 0.5 day  
**Description:**
1. Create purchase receiving interface for POS
2. Simple list of pending purchases
3. Click to receive with VIN scanning (input)

**Files to Create:**
- `apps/desktop/src/pages/ReceivePurchase.tsx`

**Acceptance:**
- [ ] Can view pending purchases
- [ ] Can receive items via POS

---

## Dependencies

**Upstream:**
- SPEC-001 (Auth/Users/Roles) — Required for RBAC and branch scoping
- SPEC-002 (Motorcycles) — Required for motorcycle status transitions

**Downstream:**
- SPEC-005 (Orders) — Orders reference motorcycles that came from purchases
- SPEC-009 (Invoices/Payments) — Purchase costs used in accounting
- SPEC-013 (Reports) — Inventory reports aggregate purchase/transfer data

---

## Files/Modules Expected to Change

### Created
- `prisma/schema.prisma` — Add Supplier, Purchase, PurchaseItem, Transfer, TransferItem models
- `packages/shared-types/src/supplier.ts`, `purchase.ts`, `transfer.ts`
- `apps/api/src/routes/suppliers.ts`, `purchases.ts`, `transfers.ts`
- `apps/api/src/controllers/*.controller.ts`
- `apps/api/src/services/*.service.ts`
- `apps/api/src/utils/numberGenerator.ts`
- `apps/api/tests/suppliers.test.ts`, `purchases.test.ts`, `transfers.test.ts`
- `apps/admin/src/pages/Suppliers.tsx`, `Purchases.tsx`, `Transfers.tsx`
- `apps/desktop/src/pages/ReceivePurchase.tsx`

### Modified
- `prisma/seed.ts` — Add sample data
- `apps/api/src/socket/events.ts` — Add inventory events

---

## Next Implementation Task

**After this specification is approved:**

Implement **TASK-001-DB: Database Schema** (Backend Engineer)

**DO NOT implement any tasks without approval.**

---

**End of SPEC-003**
