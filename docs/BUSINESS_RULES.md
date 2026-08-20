# Business Rules

---

## 1. Canonical Status Enums

All status values are defined in `packages/shared-types`. No other values are permitted.

```typescript
enum MotorcycleStatus {
  IN_TRANSIT    = 'in_transit',
  AVAILABLE     = 'available',
  RESERVED      = 'reserved',
  SOLD          = 'sold',
  IN_TRANSFER   = 'in_transfer',
  MAINTENANCE   = 'maintenance',
  RETURNED      = 'returned'
}

enum OrderStatus {
  DRAFT              = 'draft',
  CONFIRMED          = 'confirmed',
  PROCESSING         = 'processing',
  AWAITING_DELIVERY  = 'awaiting_delivery',
  COMPLETED          = 'completed',
  CANCELLED          = 'cancelled',
  REFUNDED           = 'refunded'
}

enum ReservationStatus {
  ACTIVE     = 'active',
  CONVERTED  = 'converted',
  EXPIRED    = 'expired',
  CANCELLED  = 'cancelled'
}

enum InstallmentPlanStatus {
  ACTIVE     = 'active',
  COMPLETED  = 'completed',
  DEFAULTED  = 'defaulted',
  CANCELLED  = 'cancelled'
}

enum InstallmentStatus {
  UPCOMING = 'upcoming',
  DUE      = 'due',
  PAID     = 'paid',
  OVERDUE  = 'overdue'
}

enum LetterStatus {
  ISSUED       = 'issued',
  RECEIVED     = 'received',
  NOT_RECEIVED = 'not_received'
}

enum LetterType {
  RECEIPT  = 'receipt',
  DELIVERY = 'delivery'
}

enum PurchaseStatus {
  DRAFT                = 'draft',
  ORDERED              = 'ordered',
  PARTIALLY_RECEIVED   = 'partially_received',
  RECEIVED             = 'received',
  CANCELLED            = 'cancelled'
}

enum TransferStatus {
  INITIATED  = 'initiated',
  IN_TRANSIT = 'in_transit',
  RECEIVED   = 'received',
  CANCELLED  = 'cancelled'
}

enum PaymentMethod {
  CASH          = 'cash',
  CARD          = 'card',
  BANK_TRANSFER = 'bank_transfer',
  CHEQUE        = 'cheque'
}
```

---

## 2. Valid State Transitions

Only the transitions listed below are allowed. The API must reject any other transition.

### Motorcycle

```
in_transit    → available
available     → reserved, sold, in_transfer, maintenance
reserved      → available, sold
in_transfer   → available
maintenance   → available
sold          → returned
returned      → available
```

### Order

```
draft              → confirmed, cancelled
confirmed          → processing, cancelled
processing         → awaiting_delivery, completed, refunded
awaiting_delivery  → completed
```

### Reservation

```
active  → converted, expired, cancelled
expired → cancelled
```

### Installment Plan

```
active → completed, defaulted, cancelled
```

### Individual Installment

```
upcoming → due
due      → paid, overdue
overdue  → paid
```

### Letter

```
issued       → received, not_received
not_received → received
```

### Purchase

```
draft                → ordered, cancelled
ordered              → partially_received, received, cancelled
partially_received   → received
```

### Transfer

```
initiated  → in_transit, cancelled
in_transit → received
```

---

## 3. Motorcycle Inventory Lifecycle

```
Purchase received ──► IN_TRANSIT ──► AVAILABLE
                                        │
                      ┌─────────────────┼─────────────────┐
                      ▼                 ▼                 ▼
                  RESERVED         IN_TRANSFER       MAINTENANCE
                      │                 │                 │
                      ▼                 ▼                 ▼
                    SOLD           AVAILABLE          AVAILABLE
                      │            (at dest)
                      ▼
                  RETURNED ──► AVAILABLE
```

**Rules:**
- Status changes are **transactional** — DB transaction with row-level locking (`SELECT ... FOR UPDATE`).
- WebSocket broadcasts every status change to all connected clients.
- A motorcycle can only be in ONE status at any time.
- `branchId` updates atomically with transfer completion.

---

## 4. Order Lifecycle

```
DRAFT ──► CONFIRMED ──► PROCESSING ──► AWAITING_DELIVERY ──► COMPLETED
              │              │
              ▼              ▼
          CANCELLED       REFUNDED
```

**Rules:**
- `draft → confirmed`: Customer confirms intent (web) or cashier creates (POS).
- `confirmed → processing`: Payment received (full or partial, depending on business policy).
- `processing → awaiting_delivery`: Full payment received; motorcycle not yet handed to customer.
- `awaiting_delivery → completed`: Letter confirms receipt by customer.
- On `confirmed`: motorcycle status → `sold` (or `reserved` if partial payment policy).
- On `cancelled`: motorcycle reverts to `available`; refund policy applies.
- `orderNumber` auto-generated, sequential per branch.

---

## 5. Reservation Lifecycle

```
ACTIVE ──► CONVERTED (to order)
  │
  ├──► EXPIRED (reservation period ends)
  │         │
  │         ▼
  └──► CANCELLED
```

**Rules:**
- Creating a reservation sets motorcycle status → `reserved`.
- **Partial payment** is recorded against the reservation via `Payment` records.
- `paidAmount` and `remainingAmount` are tracked on the `Reservation` entity.
- On `converted`: accumulated payments transfer to the new `Order`; motorcycle → `sold`.
- On `cancelled` or `expired`: motorcycle → `available`; refund of partial payment per policy.
- `expiresAt` is set at creation; a background job or manual action triggers expiry.
- `reservationNumber` auto-generated, sequential per branch.

---

## 6. Installment Lifecycle

### Plan Level

```
ACTIVE ──► COMPLETED (all installments paid)
  │
  ├──► DEFAULTED (missed payments exceed threshold)
  │
  └──► CANCELLED (early settlement or cancellation)
```

### Individual Installment Level

```
UPCOMING ──► DUE (due date reached) ──► PAID
                                         │
                                    OVERDUE ──► PAID
```

**Rules:**
- Plan is linked to a `Customer` and an `Order`.
- Fields: `totalAmount`, `downPayment`, `numberOfInstallments`, `interestRate`, `startDate`.
- Each `Installment` has: `dueDate`, `amount`, `paidAmount`, `status`.
- **Remaining balance** = sum of unpaid installment amounts.
- **Payment history** = all `Payment` records linked to installments of this plan.
- A background job (or manual trigger) transitions `upcoming → due` and `due → overdue`.
- `defaulted` threshold is configurable in settings.

---

## 7. Purchase Lifecycle

```
DRAFT ──► ORDERED ──► PARTIALLY_RECEIVED ──► RECEIVED
              │
              ▼
          CANCELLED
```

**Rules:**
- Purchase is linked to a `Supplier` and a `Branch`.
- `PurchaseItem` specifies motorcycle details (model, VIN, unit cost).
- **On receive** (partial or full): new `Motorcycle` records are created with status `available`, linked to the purchase.
- `purchaseNumber` auto-generated.
- Total amount = sum of item costs.

---

## 8. Branch Transfer Lifecycle

```
INITIATED ──► IN_TRANSIT ──► RECEIVED
    │
    ▼
CANCELLED
```

**Rules:**
- `TransferItem` links to specific `Motorcycle` records.
- On `initiated`: each motorcycle → `in_transfer`; logically removed from source branch inventory counts.
- On `received`: each motorcycle's `branchId` → destination branch; status → `available`.
- On `cancelled` (only before `in_transit`): motorcycles revert to `available` at source.
- **Entire operation is a single DB transaction.**
- `transferNumber` auto-generated.

---

## 9. Letter Lifecycle

```
ISSUED ──► RECEIVED (customer confirms receipt)
  │
  └──► NOT_RECEIVED (employee records non-receipt)
              │
              └──► RECEIVED (issue resolved)
```

**Types:**
- `receipt` — customer receiving the motorcycle.
- `delivery` — motorcycle delivered to a location.

**Rules:**
- Letter is auto-created when an order reaches `awaiting_delivery`, or manually by cashier.
- Linked to: `Motorcycle`, `Customer`, and optionally `Order` or `Reservation`.
- **`not_received` is explicitly recordable** by cashier/employee.
- Letters are viewable from:
  1. The **Letters list page** (filterable by status, type, date, branch).
  2. The **Motorcycle detail page** (linked letters section).
- `letterNumber` auto-generated.

---

## 10. Payment Rules

- A `Payment` record is always linked to a `Customer` and the `User` who recorded it.
- A payment links to exactly ONE of: `orderId`, `reservationId`, or `installmentId`.
- `method`: cash, card, bank_transfer, cheque.
- `referenceNumber` required for non-cash methods.
- Refunds create a new `Payment` with negative amount, linked to the original context.
- All payments are immutable (no edits, only new corrective records).

---

## 11. Branch Scoping

- Non-admin users see only data from their assigned `branchId`.
- `super_admin` and users with explicit cross-branch permission see all branches.
- Every data-modifying operation records the `branchId` of the acting user.

---

## 12. Audit Trail

Every state-changing operation logs:
- `userId` — who performed the action.
- `action` — what was done (e.g., `order:create`, `motorcycle:status_change`).
- `entityType` + `entityId` — what was affected.
- `before` / `after` — JSON snapshots of changed fields.
- `timestamp` — when.
- `branchId` — where.
