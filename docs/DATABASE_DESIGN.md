# Database Design

**Engine:** PostgreSQL  
**ORM:** Prisma  
**Schema location:** `prisma/schema.prisma`

---

## 1. ER Diagram

```
┌──────────┐       ┌──────────┐       ┌──────────┐
│  Branch   │───┐   │   Role   │       │ Supplier │
└──────────┘   │   └────┬─────┘       └────┬─────┘
               │        │                  │
               │   ┌────┴─────┐       ┌────┴──────┐
               ├──►│   User   │       │ Purchase  │
               │   └──────────┘       └────┬──────┘
               │                           │
               │   ┌──────────┐       ┌────┴──────┐
               ├──►│Motorcycle│◄──────│PurchaseItem│
               │   └────┬─────┘       └───────────┘
               │        │
               │   ┌────┼──────────────────┐
               │   │    │                  │
          ┌────┴───┴┐ ┌─┴──────────┐  ┌───┴───────┐
          │ Transfer │ │Reservation │  │   Order   │
          └────┬────┘ └─────┬──────┘  └─────┬─────┘
               │            │               │
          ┌────┴─────┐      │          ┌────┴──────┐
          │TransferItem│    │          │ OrderItem  │
          └──────────┘      │          └───────────┘
                            │
                       ┌────┴──────┐
                       │  Payment  │
                       └───────────┘

          ┌──────────┐  ┌──────────┐
          │  Letter  │  │Installment│
          └──────────┘  │   Plan   │
                        └────┬─────┘
                             │
                        ┌────┴──────┐
                        │Installment│
                        └───────────┘
```

---

## 2. Entity Definitions

### Branch

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, default uuid |
| nameAr | VARCHAR(200) | NOT NULL |
| nameEn | VARCHAR(200) | NOT NULL |
| address | TEXT | |
| phone | VARCHAR(20) | |
| isActive | BOOLEAN | default true |
| createdAt | TIMESTAMP | default now |
| updatedAt | TIMESTAMP | auto-update |

---

### Role

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| name | VARCHAR(100) | UNIQUE, NOT NULL |
| description | TEXT | |
| isSystem | BOOLEAN | default false (prevents deletion of built-in roles) |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

### RolePermission

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| roleId | UUID | FK → Role, NOT NULL |
| resource | VARCHAR(50) | NOT NULL |
| action | VARCHAR(20) | NOT NULL |

**Unique constraint:** `(roleId, resource, action)`

---

### User

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| name | VARCHAR(200) | NOT NULL |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| passwordHash | VARCHAR(255) | NOT NULL |
| phone | VARCHAR(20) | |
| branchId | UUID | FK → Branch |
| roleId | UUID | FK → Role, NOT NULL |
| lang | VARCHAR(2) | default 'ar' |
| isActive | BOOLEAN | default true |
| lastLoginAt | TIMESTAMP | |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

**Index:** `(email)`, `(branchId)`

---

### Customer

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| name | VARCHAR(200) | NOT NULL |
| phone | VARCHAR(20) | NOT NULL |
| email | VARCHAR(255) | UNIQUE (nullable) |
| passwordHash | VARCHAR(255) | nullable (set if customer uses web) |
| nationalId | VARCHAR(20) | UNIQUE (nullable) |
| address | TEXT | |
| notes | TEXT | |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

**Index:** `(phone)`, `(nationalId)`, `(email)`

---

### Brand

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| nameAr | VARCHAR(200) | NOT NULL |
| nameEn | VARCHAR(200) | NOT NULL |
| logo | VARCHAR(500) | URL |
| isActive | BOOLEAN | default true |
| sortOrder | INT | default 0 |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

---

### Category

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| nameAr | VARCHAR(200) | NOT NULL |
| nameEn | VARCHAR(200) | NOT NULL |
| parentId | UUID | FK → Category (self-ref), nullable |
| isActive | BOOLEAN | default true |
| sortOrder | INT | default 0 |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

**Index:** `(parentId)`

---

### Motorcycle

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| vin | VARCHAR(50) | UNIQUE, NOT NULL |
| model | VARCHAR(200) | NOT NULL |
| year | INT | NOT NULL |
| color | VARCHAR(50) | |
| engineSize | VARCHAR(20) | |
| descriptionAr | TEXT | |
| descriptionEn | TEXT | |
| price | DECIMAL(12,2) | NOT NULL |
| costPrice | DECIMAL(12,2) | NOT NULL |
| branchId | UUID | FK → Branch, NOT NULL |
| brandId | UUID | FK → Brand, NOT NULL |
| categoryId | UUID | FK → Category, NOT NULL |
| status | VARCHAR(20) | NOT NULL, default 'available' |
| images | JSONB | array of image URLs |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

**Index:** `(status)`, `(branchId)`, `(brandId)`, `(categoryId)`, `(vin)`  
**Check:** `status IN ('in_transit','available','reserved','sold','in_transfer','maintenance','returned')`

---

### Order

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| orderNumber | VARCHAR(30) | UNIQUE, NOT NULL |
| customerId | UUID | FK → Customer, NOT NULL |
| branchId | UUID | FK → Branch, NOT NULL |
| userId | UUID | FK → User, NOT NULL |
| status | VARCHAR(20) | NOT NULL, default 'draft' |
| totalAmount | DECIMAL(12,2) | NOT NULL |
| discount | DECIMAL(12,2) | default 0 |
| netAmount | DECIMAL(12,2) | NOT NULL |
| notes | TEXT | |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

**Index:** `(orderNumber)`, `(customerId)`, `(branchId)`, `(status)`

### OrderItem

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| orderId | UUID | FK → Order, NOT NULL |
| motorcycleId | UUID | FK → Motorcycle, NOT NULL |
| unitPrice | DECIMAL(12,2) | NOT NULL |
| discount | DECIMAL(12,2) | default 0 |

**Unique:** `(orderId, motorcycleId)`

---

### Payment

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| amount | DECIMAL(12,2) | NOT NULL (negative for refunds) |
| method | VARCHAR(20) | NOT NULL |
| referenceNumber | VARCHAR(100) | |
| paidAt | TIMESTAMP | NOT NULL |
| customerId | UUID | FK → Customer, NOT NULL |
| userId | UUID | FK → User, NOT NULL |
| orderId | UUID | FK → Order, nullable |
| reservationId | UUID | FK → Reservation, nullable |
| installmentId | UUID | FK → Installment, nullable |
| notes | TEXT | |
| createdAt | TIMESTAMP | |

**Check:** Exactly one of `orderId`, `reservationId`, `installmentId` must be non-null.  
**Index:** `(customerId)`, `(orderId)`, `(reservationId)`, `(installmentId)`

---

### Reservation

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| reservationNumber | VARCHAR(30) | UNIQUE, NOT NULL |
| customerId | UUID | FK → Customer, NOT NULL |
| motorcycleId | UUID | FK → Motorcycle, NOT NULL |
| branchId | UUID | FK → Branch, NOT NULL |
| userId | UUID | FK → User, NOT NULL |
| status | VARCHAR(20) | NOT NULL, default 'active' |
| totalPrice | DECIMAL(12,2) | NOT NULL |
| paidAmount | DECIMAL(12,2) | default 0 |
| remainingAmount | DECIMAL(12,2) | NOT NULL |
| expiresAt | TIMESTAMP | |
| notes | TEXT | |
| convertedOrderId | UUID | FK → Order, nullable |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

**Index:** `(reservationNumber)`, `(customerId)`, `(motorcycleId)`, `(status)`

---

### InstallmentPlan

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| customerId | UUID | FK → Customer, NOT NULL |
| orderId | UUID | FK → Order, NOT NULL |
| totalAmount | DECIMAL(12,2) | NOT NULL |
| downPayment | DECIMAL(12,2) | default 0 |
| numberOfInstallments | INT | NOT NULL |
| interestRate | DECIMAL(5,2) | default 0 |
| startDate | DATE | NOT NULL |
| status | VARCHAR(20) | NOT NULL, default 'active' |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

**Index:** `(customerId)`, `(orderId)`, `(status)`

### Installment

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| planId | UUID | FK → InstallmentPlan, NOT NULL |
| dueDate | DATE | NOT NULL |
| amount | DECIMAL(12,2) | NOT NULL |
| paidAmount | DECIMAL(12,2) | default 0 |
| status | VARCHAR(20) | NOT NULL, default 'upcoming' |
| paidAt | TIMESTAMP | nullable |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

**Index:** `(planId)`, `(status)`, `(dueDate)`

---

### Letter

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| letterNumber | VARCHAR(30) | UNIQUE, NOT NULL |
| customerId | UUID | FK → Customer, NOT NULL |
| motorcycleId | UUID | FK → Motorcycle, NOT NULL |
| orderId | UUID | FK → Order, nullable |
| reservationId | UUID | FK → Reservation, nullable |
| type | VARCHAR(20) | NOT NULL |
| status | VARCHAR(20) | NOT NULL, default 'issued' |
| issuedAt | TIMESTAMP | NOT NULL |
| confirmedAt | TIMESTAMP | nullable |
| userId | UUID | FK → User, NOT NULL |
| notes | TEXT | |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

**Index:** `(letterNumber)`, `(customerId)`, `(motorcycleId)`, `(status)`

---

### Supplier

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| name | VARCHAR(200) | NOT NULL |
| contactPerson | VARCHAR(200) | |
| phone | VARCHAR(20) | |
| email | VARCHAR(255) | |
| address | TEXT | |
| notes | TEXT | |
| isActive | BOOLEAN | default true |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

---

### Purchase

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| purchaseNumber | VARCHAR(30) | UNIQUE, NOT NULL |
| supplierId | UUID | FK → Supplier, NOT NULL |
| branchId | UUID | FK → Branch, NOT NULL |
| userId | UUID | FK → User, NOT NULL |
| totalAmount | DECIMAL(12,2) | NOT NULL |
| status | VARCHAR(20) | NOT NULL, default 'draft' |
| receivedAt | TIMESTAMP | nullable |
| notes | TEXT | |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

**Index:** `(purchaseNumber)`, `(supplierId)`, `(branchId)`, `(status)`

### PurchaseItem

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| purchaseId | UUID | FK → Purchase, NOT NULL |
| motorcycleId | UUID | FK → Motorcycle, nullable (set on receive) |
| model | VARCHAR(200) | NOT NULL |
| vin | VARCHAR(50) | nullable (may be assigned on receive) |
| quantity | INT | default 1 |
| unitCost | DECIMAL(12,2) | NOT NULL |
| createdAt | TIMESTAMP | |

---

### Transfer

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| transferNumber | VARCHAR(30) | UNIQUE, NOT NULL |
| fromBranchId | UUID | FK → Branch, NOT NULL |
| toBranchId | UUID | FK → Branch, NOT NULL |
| userId | UUID | FK → User, NOT NULL |
| status | VARCHAR(20) | NOT NULL, default 'initiated' |
| notes | TEXT | |
| createdAt | TIMESTAMP | |
| completedAt | TIMESTAMP | nullable |
| updatedAt | TIMESTAMP | |

**Check:** `fromBranchId != toBranchId`  
**Index:** `(fromBranchId)`, `(toBranchId)`, `(status)`

### TransferItem

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| transferId | UUID | FK → Transfer, NOT NULL |
| motorcycleId | UUID | FK → Motorcycle, NOT NULL |

**Unique:** `(transferId, motorcycleId)`

---

### Setting

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| key | VARCHAR(100) | UNIQUE, NOT NULL |
| value | TEXT | NOT NULL |
| group | VARCHAR(50) | default 'general' |
| updatedAt | TIMESTAMP | |

---

### WebContent

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| slug | VARCHAR(200) | UNIQUE, NOT NULL |
| titleAr | VARCHAR(500) | |
| titleEn | VARCHAR(500) | |
| bodyAr | TEXT | |
| bodyEn | TEXT | |
| type | VARCHAR(20) | NOT NULL (page, banner, faq) |
| isActive | BOOLEAN | default true |
| sortOrder | INT | default 0 |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

---

### AuditLog

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| userId | UUID | FK → User, NOT NULL |
| action | VARCHAR(50) | NOT NULL |
| entityType | VARCHAR(50) | NOT NULL |
| entityId | UUID | NOT NULL |
| branchId | UUID | FK → Branch, nullable |
| before | JSONB | nullable |
| after | JSONB | nullable |
| createdAt | TIMESTAMP | default now |

**Index:** `(entityType, entityId)`, `(userId)`, `(createdAt)`

---

## 3. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| UUIDs for all PKs | Safe for distributed ID generation, no sequential leaks |
| `DECIMAL(12,2)` for money | Exact arithmetic, no floating-point errors |
| `JSONB` for motorcycle images | Flexible array, avoids separate join table |
| Bilingual columns (`nameAr`/`nameEn`) | Simple, no join overhead for translations |
| Single `Payment` table with polymorphic FK | One payment can apply to order, reservation, or installment — enforced by check constraint |
| Soft delete not used | Hard delete with audit log preferred for simplicity; revisit if regulatory requirements demand soft delete |
| `createdAt`/`updatedAt` on all tables | Standard audit timestamps |

---

## 4. Indexing Strategy

**Primary queries to optimize:**
- Motorcycle listing with filters: `(status, branchId, brandId, categoryId)`
- Order lookup by customer: `(customerId, status)`
- Payment history by customer: `(customerId)`
- Installment due dates: `(status, dueDate)`
- Letter lookup by motorcycle: `(motorcycleId)`
- Audit trail by entity: `(entityType, entityId)`
- Full-text search on motorcycle model: consider `GIN` index on `model` column

All indexes are listed per-table above.
