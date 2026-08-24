# Admin API Surface

Read-only exploration of the Admin-facing API in `apps/api`. The API global prefix is `/api/v1` (see [main.ts](../apps/api/src/main.ts)). All routes below are therefore relative to `/api/v1`.

## Authorization conventions

- `JwtAuthGuard` requires a valid access token.
- `PermissionsGuard` reads `@RequirePermission(resource, action)`.
- `super_admin` is treated as unrestricted by the services; non-super-admin staff are branch-scoped where noted.
- Customer behavior is present in some shared controllers, but this document focuses on the Admin surface and calls out customer branches where they change the response or scope.
- Dates are returned as ISO strings by controller/service formatting unless the service returns a raw Prisma object.
- Prisma `Decimal` money values are converted to numbers in the motorcycle and financing services; raw purchase/payment responses can retain Prisma Decimal serialization behavior.

## Motorcycles

Source: [motorcycles.controller.ts](../apps/api/src/motorcycles/motorcycles.controller.ts), [motorcycles.service.ts](../apps/api/src/motorcycles/motorcycles.service.ts), [motorcycle.ts](../packages/shared-types/src/motorcycle.ts).

### Data shapes

```ts
interface MotorcycleInput {
  vin: string;                 // 1..50, uppercase VIN characters/hyphens
  model: string;               // 1..200
  year: number;                // integer 1900..2100
  color?: string;              // max 50
  engineSize?: string;         // max 20
  descriptionAr?: string;      // max 5000
  descriptionEn?: string;      // max 5000
  price: number;               // positive, 2 decimals
  costPrice: number;           // >= 0, 2 decimals
  brandId: string;             // UUID
  categoryId: string;          // UUID
  branchId: string;            // UUID
  images?: string[];            // URL strings, max 10; defaults []
  status?: MotorcycleStatus;
}
interface MotorcycleUpdate {
  model?: string; year?: number; color?: string; engineSize?: string;
  descriptionAr?: string; descriptionEn?: string; price?: number;
  costPrice?: number; brandId?: string; categoryId?: string; images?: string[];
  // At least one property is required. VIN, branchId and status are not updateable here.
}
interface MotorcycleListQuery {
  page?: number; limit?: number; search?: string; brandId?: string;
  categoryId?: string; branchId?: string; status?: MotorcycleStatus;
  minPrice?: number; maxPrice?: number; minYear?: number; maxYear?: number;
  color?: string; sort?: "price" | "year" | "createdAt" | "model";
  order?: "asc" | "desc";
}
interface MotorcycleResponse {
  id: string; vin: string; model: string; year: number;
  color: string | null; engineSize: string | null;
  descriptionAr: string | null; descriptionEn: string | null;
  price: number; costPrice: number; status: MotorcycleStatus;
  images: string[]; branchId: string; brandId: string; categoryId: string;
  createdAt: string; updatedAt: string;
  brand?: BrandSummary; category?: CategorySummary; branch?: BranchSummary;
}
```

### Endpoints

| Method + path | Permission / scope | Request | Response and side effects |
|---|---|---|---|
| `POST /motorcycles` | JWT + `MOTORCYCLE:create`; non-super-admin cannot use another branch | `MotorcycleInput` | `{ success: true, data: MotorcycleResponse }`. Validates brand/category/branch, inserts one `Motorcycle`, writes audit log, emits `motorcycle:created`. VIN is globally unique. |
| `GET /motorcycles` | Public controller route; optional `req.user` changes branch/status visibility | `MotorcycleListQuery`; defaults page 1, limit 20, sort `createdAt`, order `desc` | `{ success: true, data: MotorcycleListItem[], meta: { total, page, limit, totalPages } }`. Customer/anonymous requests are restricted to `available` and omit `costPrice`; staff may filter status and branch. |
| `GET /motorcycles/:id` | Public controller route; service applies optional user branch/customer rules | UUID path parameter | `{ success: true, data: MotorcycleDetails }`. Customer sees only `available` and does not receive `costPrice`; staff from another branch is rejected unless super-admin. |
| `PATCH /motorcycles/:id` | JWT + `MOTORCYCLE:update`; branch-scoped | `MotorcycleUpdate` | `{ success: true, data: MotorcycleResponse }`. Validates changed brand/category relations, updates the row, writes audit log. Does not change branch or status. |
| `PATCH /motorcycles/:id/status` | JWT + `MOTORCYCLE:update`; branch-scoped | `{ status: MotorcycleStatus, reason?: string }` | `{ success: true, data: { id, vin, model, status, previousStatus, updatedAt } }`. Enforces transitions (`in_transit -> available`, `available -> reserved/sold/in_transfer/maintenance`, etc.), audits, emits status event. |
| `DELETE /motorcycles/:id` | JWT + `MOTORCYCLE:delete`; branch-scoped | none | `{ success: true, data: null }`. Rejects `sold`/`reserved` and motorcycles with order items; deletes the row, audits, emits delete event. Image files are not deleted by this service. |

## Brands

Source: [brands.controller.ts](../apps/api/src/brands/brands.controller.ts), [brands.service.ts](../apps/api/src/brands/brands.service.ts), [brand.ts](../packages/shared-types/src/brand.ts).

```ts
interface BrandCreate {
  nameAr: string; nameEn: string; logo?: string; sortOrder?: number;
}
interface BrandUpdate {
  nameAr?: string; nameEn?: string; logo?: string;
  isActive?: boolean; sortOrder?: number;
  // At least one property is required.
}
interface BrandResponse {
  id: string; nameAr: string; nameEn: string; logo: string | null;
  isActive: boolean; sortOrder: number; createdAt: string; updatedAt: string;
  _count?: { motorcycles: number };
}
```

| Method + path | Permission / scope | Request | Response and side effects |
|---|---|---|---|
| `POST /brands` | JWT + `MOTORCYCLE:create` | `BrandCreate` | `{ success: true, data: BrandResponse }`. Rejects duplicate Arabic/English names, creates brand, audits. |
| `GET /brands` | Public; authenticated staff may see inactive brands | Query `{ isActive?: boolean }` (coerced boolean) | `{ success: true, data: BrandResponse[] }`. Anonymous access defaults to active only; authenticated results include `_count.motorcycles`. |
| `GET /brands/:id` | Public | UUID path parameter | `{ success: true, data: BrandResponse }`; includes motorcycle count only for authenticated actor. |
| `PATCH /brands/:id` | JWT + `MOTORCYCLE:update` | `BrandUpdate` | `{ success: true, data: BrandResponse }`. Checks name conflicts, updates and audits. |
| `DELETE /brands/:id` | JWT + `MOTORCYCLE:delete` | UUID path parameter | `{ success: true, data: null }`. Refuses deletion when motorcycles reference the brand, then deletes and audits. |

## Categories

Source: [categories.controller.ts](../apps/api/src/categories/categories.controller.ts), [categories.service.ts](../apps/api/src/categories/categories.service.ts), [category.ts](../packages/shared-types/src/category.ts).

```ts
interface CategoryCreate {
  nameAr: string; nameEn: string; parentId?: string; sortOrder?: number;
}
interface CategoryUpdate {
  nameAr?: string; nameEn?: string; parentId?: string;
  isActive?: boolean; sortOrder?: number;
}
interface CategoryResponse {
  id: string; nameAr: string; nameEn: string; parentId: string | null;
  isActive: boolean; sortOrder: number; createdAt: string; updatedAt: string;
}
interface CategoryWithRelations extends CategoryResponse {
  parent: { id: string; nameAr: string; nameEn: string } | null;
  children: { id: string; nameAr: string; nameEn: string; sortOrder: number }[];
  _count: { motorcycles: number };
}
```

| Method + path | Permission / scope | Request | Response and side effects |
|---|---|---|---|
| `POST /categories` | JWT + `MOTORCYCLE:create` | `CategoryCreate` | `{ success: true, data: CategoryResponse }`. Parent must exist, names must be unique within parent level, audits create. |
| `GET /categories` | Public; authenticated staff may see inactive categories | Query `{ isActive?: boolean, flat?: boolean }` (both coerced; `flat` defaults false) | `{ success: true, data: CategoryTreeItem[] }` by default, or `CategoryFlatItem[]` when `flat=true`. Tree builds nested children; flat output adds `depth` and `path`. Each item can include `_count` for authenticated users. |
| `GET /categories/:id` | Public | UUID path parameter | `{ success: true, data: CategoryWithRelations }`. Includes parent, children and motorcycle count. |
| `PATCH /categories/:id` | JWT + `MOTORCYCLE:update` | `CategoryUpdate` | `{ success: true, data: CategoryResponse }`. Prevents self-parenting/circular references, validates parent and uniqueness, audits. |
| `DELETE /categories/:id` | JWT + `MOTORCYCLE:delete` | UUID path parameter | `{ success: true, data: null }`. Rejects categories with motorcycles or children, then deletes and audits. |

## Reservations

Source: [reservations.controller.ts](../apps/api/src/reservations/reservations.controller.ts), [reservations.service.ts](../apps/api/src/reservations/reservations.service.ts), [reservation.ts](../packages/shared-types/src/reservation.ts).

```ts
interface ReservationCreate {
  customerId: string; motorcycleId: string; branchId?: string;
  paidAmount: number; paymentReference?: string;
  expirationDays?: number; // integer 1..90; default 7
  notes?: string;           // max 2000
}
interface ReservationUpdate { expiresAt?: string | Date; notes?: string | null }
interface ReservationCancel { reason?: string } // max 1000
interface ReservationExtend { expiresAt: string | Date; reason?: string }
interface ReservationConvert { notes?: string }
interface ReservationResponse {
  id: string; reservationNumber: string;
  customer: { id: string; name: string; phone: string };
  motorcycle: { id: string; vin: string; model: string; brand: BrandSummary; currentStatus: string };
  branch: { id: string; nameAr: string; nameEn: string };
  user: { id: string; name: string };
  status: ReservationStatus; totalPrice: number; paidAmount: number;
  remainingAmount: number; expiresAt: string | null; notes: string | null; createdAt: string;
}
```

All routes are under class-level JWT + `PermissionsGuard`. Explicit permissions are listed below. Branch staff are branch-scoped; customer requests are customer-scoped where the service receives `isCustomer`.

| Method + path | Permission / body/query | Response and side effects |
|---|---|---|
| `POST /reservations` | `RESERVATION:create`; `ReservationCreate` | `{ success: true, data: ReservationResponse }`. Locks motorcycle, requires `available`, snapshots price, validates deposit (at least max of 10%/1000 and not above price), changes motorcycle to `reserved`, creates reservation, audits and emits `reservation:created`. |
| `GET /reservations` | `RESERVATION:read`; query: `page`, `limit`, `search`, `customerId`, `branchId`, `status`, `startDate`, `endDate`, `expiringBefore`, `sort`, `order` | `{ success: true, data: ReservationListItem[], meta: { total, page, limit, totalPages } }`. Filters by branch/customer scope; search covers reservation number, customer name/phone and motorcycle VIN. |
| `GET /reservations/:id` | `RESERVATION:read`; UUID path parameter | `{ success: true, data: reservation details }`. Service enforces branch/customer access and includes related customer, motorcycle, branch and status-related data. |
| `PATCH /reservations/:id` | `RESERVATION:update`; `ReservationUpdate` | `{ success: true, data: updated reservation }`. Updates expiration/notes subject to service validation and audit rules. |
| `POST /reservations/:id/extend` | `RESERVATION:update`; `ReservationExtend` | `{ success: true, data: result }`. Changes expiration after service checks branch/status/date rules and audits. |
| `POST /reservations/:id/cancel` | `RESERVATION:delete`; `ReservationCancel` | `{ success: true, data: null }`. Service cancels reservation, releases the motorcycle status as implemented there, audits/emits events. Controller intentionally discards the service result. |
| `POST /reservations/expire` | Class JWT + `PermissionsGuard`, but no explicit `@RequirePermission`; body `{ limit?: number }`, default 100 | `{ success: true, data: result }`. Calls background-style expiration processing. This is a permission metadata gap to account for in Admin clients. |
| `POST /reservations/:id/convert` | `RESERVATION:update`; `ReservationConvert` | `{ success: true, data: result }`. Converts reservation through `OrdersService`, linking the order and changing reservation/motorcycle/order state according to service logic. |
| `GET /reservations/:id/history` | `RESERVATION:read`; UUID path parameter | `{ success: true, data: history[] }`. Returns audit/history records after the same branch/customer access checks. |

## Installments

Source: [installments.controller.ts](../apps/api/src/installments/installments.controller.ts), [installments.service.ts](../apps/api/src/installments/installments.service.ts), [financial.ts](../packages/shared-types/src/financial.ts).

```ts
interface InstallmentPaymentBody {
  amount: number;
  method: "cash" | "card" | "bank_transfer" | "cheque";
  reference?: string;
  idempotencyKey: string;
  notes?: string;
}
interface Installment {
  id: string; contractId: string; installmentNumber: number;
  dueDate: Date; amount: number; paidAmount: number;
  status: "upcoming" | "due" | "paid" | "overdue";
  paidAt: Date | null; notes: string | null; createdAt: Date; updatedAt: Date;
}
```

All routes require JWT + `PermissionsGuard`; branch access is enforced by service and super-admin bypasses it.

| Method + path | Permission / body | Response and side effects |
|---|---|---|
| `POST /installments/:id/payments` | `PAYMENT:create`; `InstallmentPaymentBody` (controller has no validation pipe; service validates idempotency key, positive amount and balance) | Returns the existing payment for a repeated `idempotencyKey`, otherwise a payment with `customer`, `branch`, `user`, and `allocations`. Creates `Payment` and `PaymentAllocation`, updates installment paid amount/status, and marks the financing contract completed when all installments are paid. |
| `GET /installments/:id` | `FINANCING_CONTRACT:read`; UUID path parameter | Returns the installment including financing contract, customer, branch and order relations. |
| `GET /installments/contract/:contractId` | `FINANCING_CONTRACT:read`; UUID contract ID | Returns the contract's installments ordered by installment number. |
| `POST /installments/status-update` | `FINANCING_CONTRACT:update`; no body | Returns scheduler result, which updates installment statuses. Intended for an hourly external cron call. |

## Financing Contracts

Source: [financing-contracts.controller.ts](../apps/api/src/financing-contracts/financing-contracts.controller.ts), [financing-contracts.service.ts](../apps/api/src/financing-contracts/financing-contracts.service.ts), [financial.ts](../packages/shared-types/src/financial.ts). This module is directly linked to installments: create generates the installment schedule; payments can complete the contract.

```ts
interface FinancingContractCreate {
  orderId: string; customerId: string; branchId?: string;
  totalAmount: number; downPayment?: number;
  numberOfInstallments: number; // 1..120
  installmentFrequency?: "monthly" | "quarterly";
  interestRate?: number;         // 0..100
  startDate: string | Date;
  notes?: string;
}
interface FinancingContractUpdate { notes?: string | null; status?: FinancingContractStatus }
interface FinancingContractApprove { notes?: string }
interface FinancingContractResponse {
  id: string; contractNumber: string; customerId: string; orderId: string; branchId: string;
  createdBy: string; approvedBy: string | null; totalAmount: number; downPayment: number;
  financingAmount: number; numberOfInstallments: number;
  installmentFrequency: "monthly" | "quarterly"; interestRate: number;
  startDate: Date; status: FinancingContractStatus; approvedAt: Date | null;
  completedAt: Date | null; notes: string | null; createdAt: Date; updatedAt: Date;
  installments?: Installment[];
}
```

All routes require class JWT and method-level `PermissionsGuard` plus the listed permission. Staff are branch-scoped; customer listing/detail is filtered to the authenticated customer.

| Method + path | Permission / body/query | Response and side effects |
|---|---|---|
| `POST /financing-contracts` | `FINANCING_CONTRACT:create`; `FinancingContractCreate` | `{ success: true, data: FinancingContractResponse & { installments: Installment[] } }`. Requires confirmed/processing order, validates customer/branch and amounts, prevents another active contract for the order, creates contract plus calculated schedule atomically. |
| `GET /financing-contracts` | `FINANCING_CONTRACT:read`; query: `page`, `limit`, `search`, `status`, `customerId`, `branchId`, `contractNumber`, `startDateFrom`, `startDateTo` | `{ success: true, data: FinancingContractResponse[], meta: { total, page, limit, totalPages } }`. Includes customer/order/branch/creator summaries, installment count and ordered installments. Customer scope overrides arbitrary customer selection. |
| `GET /financing-contracts/:id` | `FINANCING_CONTRACT:read`; UUID path parameter | `{ success: true, data: FinancingContractResponse & { installments: Installment[] } }`. Includes full related customer/order/branch/creator/approver and enforces branch/customer ownership. |
| `PATCH /financing-contracts/:id/status` | `FINANCING_CONTRACT:update`; `FinancingContractUpdate` | `{ success: true, data: FinancingContractResponse }`. Validates status transition and updates status/notes. |
| `PATCH /financing-contracts/:id/approve` | `FINANCING_CONTRACT:approve`; `{ notes?: string }` | `{ success: true, data: FinancingContractResponse }`. Service additionally requires role `branch_admin` or `super_admin`, sets approver and approval timestamp, and rejects already-approved contracts. |
| `POST /financing-contracts/:id/settle` | `FINANCING_CONTRACT:update`; `{ paymentMethod: string; reference?: string; notes?: string }` | `{ success: true, data: result }`. Early-settlement service processes the remaining balance, updates remaining installments/payment state and completes the contract. `paymentMethod` is not validated by a controller DTO. |

## Upload / image handling

Source: [upload.controller.ts](../apps/api/src/upload/upload.controller.ts), [storage.service.ts](../apps/api/src/upload/storage.service.ts).

| Method + path | Permission / request | Response and side effects |
|---|---|---|
| `POST /upload` | JWT + `MOTORCYCLE:create`; multipart/form-data field `file` | `{ success: true, data: { url, filename, size, mimeType } }`. Accepts JPEG/JPG/PNG/WebP only, max 5 MiB, required file. Uploads through `StorageService`; it does not update a Motorcycle row. The returned URL must subsequently be supplied in `MotorcycleInput.images`. Invalid/missing files return `422`. |

## Purchases

Source: [purchases.controller.ts](../apps/api/src/purchases/purchases.controller.ts), [purchases.service.ts](../apps/api/src/purchases/purchases.service.ts), [purchase.ts](../packages/shared-types/src/purchase.ts).

```ts
interface PurchaseItemInput {
  model: string; vin?: string; quantity: number; unitCost: number;
}
interface PurchaseCreate {
  supplierId: string; branchId?: string; notes?: string; items: PurchaseItemInput[];
}
interface PurchaseUpdate {
  supplierId?: string; notes?: string; items?: PurchaseItemInput[];
}
interface ReceivePurchaseItem { purchaseItemId: string; vin: string }
interface ReceivePurchase { items: ReceivePurchaseItem[] }
interface PurchaseItem {
  id: string; purchaseId: string; motorcycleId: string | null;
  model: string; vin: string | null; quantity: number; unitCost: number; createdAt: Date;
}
interface PurchaseResponse {
  id: string; purchaseNumber: string; supplierId: string; branchId: string; userId: string;
  totalAmount: number; status: "draft" | "ordered" | "partially_received" | "received" | "cancelled";
  receivedAt: Date | null; notes: string | null; createdAt: Date; updatedAt: Date;
  items?: PurchaseItem[];
}
```

All routes require class-level JWT + `PermissionsGuard`; the permission and branch behavior are below.

| Method + path | Permission / body/query | Response and side effects |
|---|---|---|
| `POST /purchases` | `PURCHASE:create`; `PurchaseCreate` | `{ success: true, data: created purchase }`. Requires active supplier and valid branch, computes total, creates draft purchase and nested items, audits. No Motorcycle row is created. |
| `GET /purchases` | `PURCHASE:read`; query `page` default 1, `limit` default 20, `search`, `supplierId`, `branchId`, `status`, `startDate`, `endDate` | `{ success: true, data: items[], meta }`. Non-super-admin is restricted to own branch; each list item includes supplier/branch summaries, `itemCount`, and currently hard-coded `receivedCount: 0`. |
| `GET /purchases/:id` | `PURCHASE:read`; UUID/string ID | `{ success: true, data: purchase }`. Includes supplier, branch, user, items and each item's linked motorcycle `{ id, status }`; branch access is enforced. |
| `PATCH /purchases/:id` | `PURCHASE:update`; `PurchaseUpdate` | `{ success: true, data: updated purchase }`. Only draft purchases can change; replacing items deletes/recreates PurchaseItem rows. No Motorcycle row is created or updated. |
| `POST /purchases/:id/order` | `PURCHASE:update`; no body | HTTP 200, `{ success: true, data: updatedPurchase }`. Only draft purchases with at least one item can transition to `ordered`; audits status. Does not touch `Motorcycle`. |
| `POST /purchases/:id/receive` | `PURCHASE:update`; `ReceivePurchase` | HTTP 200, `{ success: true, data: { id, purchaseNumber, status, receivedAt, receivedMotorcycles[] } }`, where each received motorcycle item is `{ id, vin, model, status: "in_transit" }`. Requires purchase `ordered` or `partially_received`, prevents duplicate item/VIN receipt, creates one `Motorcycle` row per received PurchaseItem, links `PurchaseItem.motorcycleId`, sets motorcycle `status = in_transit`, `branchId = purchase.branchId`, `model = item.model`, `year = current year`, `price = unitCost`, `costPrice = unitCost`, and assigns the first available Brand and Category as placeholders. Purchase becomes `partially_received` until all items are linked, then `received` with `receivedAt`. Emits `inventory:purchase_received`. **This is the only purchase operation that creates Motorcycle rows.** It does not update an existing Motorcycle row; duplicate VIN is rejected. |
| `POST /purchases/:id/cancel` | `PURCHASE:delete`; no body | HTTP 200, `{ success: true, data: null }`. Only draft purchases can be cancelled; audits status. Does not touch `Motorcycle`. |
| `DELETE /purchases/:id` | `PURCHASE:delete`; no body | `{ success: true, data: null }`. Service prevents removal when received items are linked to motorcycles (see `remove()` implementation), otherwise removes the purchase according to its status rules. |

### Purchase receive lifecycle

1. `create` creates `Purchase(status=draft)` and `PurchaseItem(motorcycleId=null)`.
2. `order` changes only the purchase status to `ordered`.
3. `receive` creates new motorcycle inventory rows with `status=in_transit`, then links each item. Once all items are linked, purchase status becomes `received`; otherwise it becomes `partially_received`.
4. `cancel` changes a draft purchase to `cancelled` and never creates inventory.
5. Brand/category are not fields on `PurchaseItem`; receive therefore uses the first records ordered by `sortOrder` as placeholders. Admin must later update the motorcycle's brand/category through `PATCH /motorcycles/:id`.

## Prisma model reference

Source: [schema.prisma](../prisma/schema.prisma).

```ts
model Motorcycle {
  id: UUID @id; vin: string @unique; model: string; year: int;
  color?: string; engineSize?: string; descriptionAr?: text; descriptionEn?: text;
  price: Decimal(12,2); costPrice: Decimal(12,2); status: MotorcycleStatus;
  images?: Json; branchId: UUID; brandId: UUID; categoryId: UUID;
  branch: Branch; brand: Brand; category: Category;
  purchaseItem?: PurchaseItem; transferItems: TransferItem[];
  orderItems: OrderItem[]; reservations: Reservation[]; invoiceItems: InvoiceItem[]; letters: Letter[];
}
model Brand {
  id: UUID @id; nameAr: string @unique; nameEn: string @unique;
  logo?: string; isActive: boolean; sortOrder: int; motorcycles: Motorcycle[];
}
model Category {
  id: UUID @id; nameAr: string; nameEn: string; parentId?: UUID;
  isActive: boolean; sortOrder: int; parent?: Category; children: Category[]; motorcycles: Motorcycle[];
  @@unique([nameAr, parentId]); @@unique([nameEn, parentId]);
}
model Reservation {
  id: UUID @id; reservationNumber: string @unique; customerId: UUID; motorcycleId: UUID;
  branchId: UUID; userId?: UUID; status: ReservationStatus; totalPrice: Decimal;
  paidAmount: Decimal; remainingAmount: Decimal; expiresAt?: DateTime; notes?: text;
  convertedOrderId?: UUID @unique; customer: Customer; motorcycle: Motorcycle; branch: Branch;
  user?: User; convertedOrder?: Order; invoice?: Invoice; letters: Letter[];
}
model FinancingContract {
  id: UUID @id; contractNumber: string @unique; customerId: UUID; orderId: UUID; branchId: UUID;
  createdBy: UUID; approvedBy?: UUID; totalAmount: Decimal; downPayment: Decimal;
  financingAmount: Decimal; numberOfInstallments: int; installmentFrequency: InstallmentFrequency;
  interestRate: Decimal; startDate: Date; status: FinancingContractStatus;
  approvedAt?: DateTime; completedAt?: DateTime; notes?: text;
  customer: Customer; order: Order; branch: Branch; creator: User; approver?: User;
  installments: Installment[];
}
model Installment {
  id: UUID @id; contractId: UUID; installmentNumber: int; dueDate: Date;
  amount: Decimal; paidAmount: Decimal; status: InstallmentStatus; paidAt?: DateTime; notes?: text;
  contract: FinancingContract; paymentAllocations: PaymentAllocation[];
  @@unique([contractId, installmentNumber]);
}
model Purchase {
  id: UUID @id; purchaseNumber: string @unique; supplierId: UUID; branchId: UUID; userId: UUID;
  totalAmount: Decimal; status: PurchaseStatus; receivedAt?: DateTime; notes?: text;
  supplier: Supplier; branch: Branch; user: User; items: PurchaseItem[];
}
model PurchaseItem {
  id: UUID @id; purchaseId: UUID; motorcycleId?: UUID @unique; model: string;
  vin?: string; quantity: int; unitCost: Decimal; createdAt: DateTime;
  purchase: Purchase; motorcycle?: Motorcycle;
}
```
