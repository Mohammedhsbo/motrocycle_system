# SPEC-002: Brands, Categories & Motorcycles

**Feature Goal:** Implement motorcycle catalog management including brands, categories (hierarchical), and motorcycle inventory with status transitions, image management, and multi-branch support.

**Priority:** P0 (Core MVP - Required for inventory, sales, and e-commerce)

**Dependencies:** SPEC-001 (Authentication, Users & Roles)

---

## User Roles

| Role | Permissions |
|------|-------------|
| `super_admin` | Full access to all brands, categories, motorcycles across all branches |
| `branch_manager` | Manage motorcycles in own branch; read brands/categories |
| `inventory_clerk` | Manage motorcycles in own branch; read brands/categories |
| `cashier` | Read-only access to motorcycles in own branch |
| `accountant` | Read-only access to motorcycles (for reports) |
| `customer` | Read-only access to available motorcycles (e-commerce) |

---

## Functional Requirements

### FR-001: Brand Management
- CRUD operations for motorcycle brands
- Each brand has bilingual names (Arabic + English)
- Optional logo image (URL)
- Active/inactive status flag
- Manual sort ordering for display priority

### FR-002: Category Management
- CRUD operations for categories
- Hierarchical structure (parent-child relationships, unlimited depth)
- Each category has bilingual names (Arabic + English)
- Active/inactive status flag
- Manual sort ordering within same parent level

### FR-003: Motorcycle CRUD
- Create motorcycle with: VIN, model, year, color, engine size, bilingual descriptions, price, cost price, brand, category, branch
- VIN must be globally unique
- Multiple images per motorcycle (stored as JSON array of URLs)
- Images uploaded to S3-compatible storage
- Branch assignment on creation

### FR-004: Motorcycle Status Transitions
- Enforce valid-only state transitions (defined in BUSINESS_RULES.md §2)
- Use database transactions with row-level locking (`SELECT ... FOR UPDATE`)
- WebSocket broadcast on every status change
- Log all status changes in audit trail

### FR-005: Motorcycle Search & Filtering
- Search by: model name, VIN, brand, category, status, branch, year, price range
- Paginated results with configurable page size
- Sort by: price, year, created date, model name

### FR-006: Image Management
- Upload motorcycle images to object storage (S3-compatible)
- Support multiple images per motorcycle (stored as JSONB array)
- Generate thumbnails (optional, can be done client-side)
- Delete old images when motorcycle deleted

### FR-007: Motorcycle Availability Check
- Public endpoint for customers to check motorcycle availability
- Branch-level inventory counts
- Status-based filtering (show only 'available' to customers)

---

## Business Rules

### BR-001: Brand Rules
- Brand name (AR + EN) must be unique across both languages
- Inactive brands cannot be assigned to new motorcycles
- Cannot delete brand with associated motorcycles

### BR-002: Category Rules
- Category name must be unique within same parent level
- Cannot set category as its own parent (direct or indirect)
- Cannot delete category with associated motorcycles
- Cannot delete category with child categories
- Inactive categories not shown in public catalog

### BR-003: Motorcycle Status Transitions (from BUSINESS_RULES.md)
```
in_transit    → available
available     → reserved, sold, in_transfer, maintenance
reserved      → available, sold
in_transfer   → available
maintenance   → available
sold          → returned
returned      → available
```

### BR-004: Motorcycle Uniqueness
- VIN must be globally unique across all branches
- Same motorcycle model can exist multiple times (different VINs)

### BR-005: Motorcycle Pricing
- `price` (selling price) must be >= 0
- `costPrice` must be >= 0
- `price` typically > `costPrice` (system allows exceptions, no validation)

### BR-006: Branch Assignment
- Motorcycle must always belong to exactly one branch
- Branch changes only via Transfer process (not direct update)

### BR-007: Image Upload
- Max 10 images per motorcycle
- Supported formats: JPEG, PNG, WebP
- Max file size: 5MB per image
- Images stored with UUID filenames to prevent collisions

---

## Data Requirements

### Entities Used
- `Brand` (id, nameAr, nameEn, logo, isActive, sortOrder, createdAt, updatedAt)
- `Category` (id, nameAr, nameEn, parentId, isActive, sortOrder, createdAt, updatedAt)
- `Motorcycle` (id, vin, model, year, color, engineSize, descriptionAr, descriptionEn, price, costPrice, branchId, brandId, categoryId, status, images, createdAt, updatedAt)
- `AuditLog` (for status changes)

### Redis Events (WebSocket)
- `motorcycle:status_changed` — payload: `{ motorcycleId, oldStatus, newStatus, branchId }`
- `motorcycle:created` — payload: `{ motorcycleId, branchId, status }`
- `motorcycle:deleted` — payload: `{ motorcycleId, branchId }`

---

## API Requirements

### POST `/api/v1/brands`
**Description:** Create new brand

**Required Permission:** `motorcycle:create` (brand is considered part of motorcycle resource)

**Request Body:**
```typescript
{
  nameAr: string;        // max 200 chars
  nameEn: string;        // max 200 chars
  logo?: string;         // URL, max 500 chars
  sortOrder?: number;    // default 0
}
```

**Response (201):**
```typescript
{
  success: true,
  data: {
    id: string;
    nameAr: string;
    nameEn: string;
    logo?: string;
    isActive: boolean;
    sortOrder: number;
    createdAt: string;
  }
}
```

**Errors:**
- 409: Brand name already exists (AR or EN)
- 422: Validation failure

---

### GET `/api/v1/brands`
**Description:** List all brands

**Required Permission:** None (public for e-commerce)

**Query Parameters:**
- `isActive` (boolean, optional) — default: true for public, all for authenticated staff

**Response (200):**
```typescript
{
  success: true,
  data: Array<{
    id: string;
    nameAr: string;
    nameEn: string;
    logo?: string;
    isActive: boolean;
    sortOrder: number;
    _count?: {
      motorcycles: number;  // Only for staff
    };
  }>
}
```

---

### GET `/api/v1/brands/:id`
**Description:** Get single brand

**Required Permission:** None (public)

**Response (200):** Same as POST response + `_count.motorcycles`

**Errors:**
- 404: Brand not found

---

### PATCH `/api/v1/brands/:id`
**Description:** Update brand

**Required Permission:** `motorcycle:update`

**Request Body (all optional):**
```typescript
{
  nameAr?: string;
  nameEn?: string;
  logo?: string;
  isActive?: boolean;
  sortOrder?: number;
}
```

**Response (200):** Updated brand object

**Errors:**
- 404: Brand not found
- 409: Name conflict

---

### DELETE `/api/v1/brands/:id`
**Description:** Delete brand

**Required Permission:** `motorcycle:delete`

**Response (200):**
```typescript
{
  success: true,
  data: null
}
```

**Errors:**
- 404: Brand not found
- 409: Brand has associated motorcycles

---

### POST `/api/v1/categories`
**Description:** Create new category

**Required Permission:** `motorcycle:create`

**Request Body:**
```typescript
{
  nameAr: string;
  nameEn: string;
  parentId?: string;     // UUID, nullable
  sortOrder?: number;
}
```

**Response (201):**
```typescript
{
  success: true,
  data: {
    id: string;
    nameAr: string;
    nameEn: string;
    parentId?: string;
    isActive: boolean;
    sortOrder: number;
    createdAt: string;
  }
}
```

**Errors:**
- 409: Category name exists at same level
- 404: Parent category not found
- 422: Circular reference detected

---

### GET `/api/v1/categories`
**Description:** List all categories (tree structure)

**Required Permission:** None (public)

**Query Parameters:**
- `isActive` (boolean, optional)
- `flat` (boolean, optional) — if true, return flat array; if false (default), return tree

**Response (200) - Tree format:**
```typescript
{
  success: true,
  data: Array<{
    id: string;
    nameAr: string;
    nameEn: string;
    parentId?: string;
    isActive: boolean;
    sortOrder: number;
    children?: Array<Category>;  // Recursive
    _count?: {
      motorcycles: number;
    };
  }>
}
```

**Response (200) - Flat format:**
```typescript
{
  success: true,
  data: Array<{
    id: string;
    nameAr: string;
    nameEn: string;
    parentId?: string;
    isActive: boolean;
    sortOrder: number;
    depth: number;           // 0 for root, 1 for child, etc.
    path: string;            // "Parent > Child > Grandchild"
    _count?: {
      motorcycles: number;
    };
  }>
}
```

---

### GET `/api/v1/categories/:id`
**Description:** Get single category with parent/children

**Required Permission:** None (public)

**Response (200):**
```typescript
{
  success: true,
  data: {
    id: string;
    nameAr: string;
    nameEn: string;
    parentId?: string;
    parent?: {
      id: string;
      nameAr: string;
      nameEn: string;
    };
    isActive: boolean;
    sortOrder: number;
    children: Array<{
      id: string;
      nameAr: string;
      nameEn: string;
      sortOrder: number;
    }>;
    _count: {
      motorcycles: number;
    };
    createdAt: string;
  }
}
```

---

### PATCH `/api/v1/categories/:id`
**Description:** Update category

**Required Permission:** `motorcycle:update`

**Request Body (all optional):**
```typescript
{
  nameAr?: string;
  nameEn?: string;
  parentId?: string;      // Can change parent
  isActive?: boolean;
  sortOrder?: number;
}
```

**Response (200):** Updated category object

**Errors:**
- 404: Category not found
- 409: Name conflict at target level
- 422: Circular reference (trying to set child as parent)

---

### DELETE `/api/v1/categories/:id`
**Description:** Delete category

**Required Permission:** `motorcycle:delete`

**Response (200):**
```typescript
{
  success: true,
  data: null
}
```

**Errors:**
- 404: Category not found
- 409: Category has motorcycles or child categories

---

### POST `/api/v1/upload`
**Description:** Upload image to object storage

**Required Permission:** `motorcycle:create` or `motorcycle:update`

**Request:** `multipart/form-data` with `file` field

**Response (200):**
```typescript
{
  success: true,
  data: {
    url: string;           // Full URL to uploaded image
    filename: string;      // UUID-based filename
    size: number;          // Bytes
    mimeType: string;
  }
}
```

**Errors:**
- 422: Invalid file type (not JPEG/PNG/WebP)
- 422: File too large (>5MB)
- 500: Upload failed

---

### POST `/api/v1/motorcycles`
**Description:** Create new motorcycle

**Required Permission:** `motorcycle:create`

**Request Body:**
```typescript
{
  vin: string;                // max 50 chars, unique
  model: string;              // max 200 chars
  year: number;               // 1900-2100
  color?: string;             // max 50 chars
  engineSize?: string;        // e.g., "150cc"
  descriptionAr?: string;
  descriptionEn?: string;
  price: number;              // decimal(12,2)
  costPrice: number;          // decimal(12,2)
  brandId: string;            // UUID
  categoryId: string;         // UUID
  branchId: string;           // UUID
  images?: string[];          // Array of URLs (max 10)
  status?: string;            // default 'available'
}
```

**Response (201):**
```typescript
{
  success: true,
  data: {
    id: string;
    vin: string;
    model: string;
    year: number;
    color?: string;
    engineSize?: string;
    descriptionAr?: string;
    descriptionEn?: string;
    price: number;
    costPrice: number;
    brand: {
      id: string;
      nameAr: string;
      nameEn: string;
    };
    category: {
      id: string;
      nameAr: string;
      nameEn: string;
    };
    branch: {
      id: string;
      nameAr: string;
      nameEn: string;
    };
    status: string;
    images: string[];
    createdAt: string;
  }
}
```

**Errors:**
- 409: VIN already exists
- 404: Brand, category, or branch not found
- 403: Branch scope violation (trying to create in other branch)
- 422: Validation failure

**Side Effects:**
- WebSocket event: `motorcycle:created`
- Audit log entry

---

### GET `/api/v1/motorcycles`
**Description:** List motorcycles with search/filter (paginated)

**Required Permission:** `motorcycle:read` (staff) or none (customers see only available)

**Query Parameters:**
- `page` (number, default 1)
- `limit` (number, default 20, max 100)
- `search` (string) — searches model, VIN
- `brandId` (UUID)
- `categoryId` (UUID)
- `branchId` (UUID)
- `status` (string) — customers can only use 'available'
- `minPrice` (number)
- `maxPrice` (number)
- `minYear` (number)
- `maxYear` (number)
- `color` (string)
- `sort` (string) — `price`, `year`, `createdAt`, `model` (default: `createdAt`)
- `order` (string) — `asc`, `desc` (default: `desc`)

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
    engineSize?: string;
    price: number;
    brand: {
      id: string;
      nameAr: string;
      nameEn: string;
      logo?: string;
    };
    category: {
      id: string;
      nameAr: string;
      nameEn: string;
    };
    branch: {
      id: string;
      nameAr: string;
      nameEn: string;
    };
    status: string;
    images: string[];        // First image or all images
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

**Branch Scoping:** Non-admin staff see only own branch motorcycles

---

### GET `/api/v1/motorcycles/:id`
**Description:** Get single motorcycle with full details

**Required Permission:** `motorcycle:read` or none (public if available)

**Response (200):**
```typescript
{
  success: true,
  data: {
    id: string;
    vin: string;
    model: string;
    year: number;
    color?: string;
    engineSize?: string;
    descriptionAr?: string;
    descriptionEn?: string;
    price: number;
    costPrice?: number;      // Only for staff
    brand: {
      id: string;
      nameAr: string;
      nameEn: string;
      logo?: string;
    };
    category: {
      id: string;
      nameAr: string;
      nameEn: string;
    };
    branch: {
      id: string;
      nameAr: string;
      nameEn: string;
    };
    status: string;
    images: string[];
    createdAt: string;
    updatedAt: string;
  }
}
```

**Errors:**
- 404: Motorcycle not found
- 403: Branch scope violation (staff accessing other branch)

**Special Rule:** Customers can only view motorcycles with status 'available'

---

### PATCH `/api/v1/motorcycles/:id`
**Description:** Update motorcycle

**Required Permission:** `motorcycle:update`

**Request Body (all optional):**
```typescript
{
  model?: string;
  year?: number;
  color?: string;
  engineSize?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  price?: number;
  costPrice?: number;
  brandId?: string;
  categoryId?: string;
  images?: string[];        // Replaces all images
  // Note: VIN, branchId, status NOT updatable via this endpoint
}
```

**Response (200):** Updated motorcycle object

**Errors:**
- 404: Motorcycle not found
- 403: Branch scope violation
- 404: Brand or category not found

**Note:** Use separate endpoint for status transitions

---

### PATCH `/api/v1/motorcycles/:id/status`
**Description:** Transition motorcycle status

**Required Permission:** `motorcycle:update`

**Request Body:**
```typescript
{
  status: string;           // New status
  reason?: string;          // Optional reason for audit log
}
```

**Response (200):**
```typescript
{
  success: true,
  data: {
    id: string;
    vin: string;
    model: string;
    status: string;
    previousStatus: string;
    updatedAt: string;
  }
}
```

**Errors:**
- 404: Motorcycle not found
- 403: Branch scope violation
- 409: Invalid status transition (see BUSINESS_RULES.md §2)
- 422: Status value not in enum

**Side Effects:**
- Database transaction with `SELECT ... FOR UPDATE`
- WebSocket event: `motorcycle:status_changed`
- Audit log entry with before/after status

**Transaction Logic:**
```typescript
// Pseudocode
BEGIN TRANSACTION;
  motorcycle = SELECT * FROM motorcycles WHERE id = ? FOR UPDATE;
  if (!isValidTransition(motorcycle.status, newStatus)) {
    ROLLBACK;
    throw InvalidTransitionError;
  }
  UPDATE motorcycles SET status = newStatus WHERE id = ?;
COMMIT;
emit('motorcycle:status_changed', { motorcycleId, oldStatus, newStatus });
```

---

### DELETE `/api/v1/motorcycles/:id`
**Description:** Delete motorcycle

**Required Permission:** `motorcycle:delete`

**Response (200):**
```typescript
{
  success: true,
  data: null
}
```

**Errors:**
- 404: Motorcycle not found
- 403: Branch scope violation
- 409: Cannot delete motorcycle with status 'sold' or 'reserved'
- 409: Motorcycle has associated orders/reservations/letters

**Side Effects:**
- Delete associated images from object storage
- WebSocket event: `motorcycle:deleted`
- Audit log entry

---

### GET `/api/v1/motorcycles/:id/history`
**Description:** Get motorcycle status change history

**Required Permission:** `motorcycle:read`

**Response (200):**
```typescript
{
  success: true,
  data: Array<{
    id: string;
    action: string;          // "motorcycle:status_change"
    before: {
      status: string;
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

### GET `/api/v1/inventory/summary`
**Description:** Get inventory aggregate counts by branch and status

**Required Permission:** `motorcycle:read`

**Query Parameters:**
- `branchId` (UUID, optional) — filter by branch

**Response (200):**
```typescript
{
  success: true,
  data: Array<{
    branchId: string;
    branch: {
      nameAr: string;
      nameEn: string;
    };
    statusCounts: {
      in_transit: number;
      available: number;
      reserved: number;
      sold: number;
      in_transfer: number;
      maintenance: number;
      returned: number;
    };
    total: number;
  }>
}
```

**Branch Scoping:** Non-admin staff see only own branch

---

## Validation Rules

### Brand
- `nameAr`: Required, max 200 chars
- `nameEn`: Required, max 200 chars
- `logo`: Optional, max 500 chars, valid URL format
- `sortOrder`: Integer, default 0

### Category
- `nameAr`: Required, max 200 chars
- `nameEn`: Required, max 200 chars
- `parentId`: Optional UUID, must exist if provided
- `sortOrder`: Integer, default 0
- No circular references allowed

### Motorcycle
- `vin`: Required, max 50 chars, unique, alphanumeric + hyphens only
- `model`: Required, max 200 chars
- `year`: Required, integer, 1900-2100
- `color`: Optional, max 50 chars
- `engineSize`: Optional, max 20 chars
- `descriptionAr`: Optional, max 5000 chars
- `descriptionEn`: Optional, max 5000 chars
- `price`: Required, decimal(12,2), >= 0
- `costPrice`: Required, decimal(12,2), >= 0
- `brandId`: Required UUID, must exist
- `categoryId`: Required UUID, must exist
- `branchId`: Required UUID, must exist
- `status`: Must be valid enum value
- `images`: Array of URLs, max 10 items

### Image Upload
- File types: JPEG, PNG, WebP only
- Max file size: 5MB
- Max dimensions: no limit (client handles resizing)

---

## Error Cases

| Scenario | HTTP Status | Error Code |
|----------|-------------|------------|
| Brand name exists | 409 | `BRAND_NAME_EXISTS` |
| Brand has motorcycles | 409 | `BRAND_IN_USE` |
| Category name exists at level | 409 | `CATEGORY_NAME_EXISTS` |
| Circular category reference | 422 | `CIRCULAR_REFERENCE` |
| Category has motorcycles | 409 | `CATEGORY_IN_USE` |
| Category has children | 409 | `CATEGORY_HAS_CHILDREN` |
| VIN already exists | 409 | `VIN_EXISTS` |
| Invalid status transition | 409 | `INVALID_STATUS_TRANSITION` |
| Motorcycle not found | 404 | `MOTORCYCLE_NOT_FOUND` |
| Motorcycle has orders | 409 | `MOTORCYCLE_HAS_ORDERS` |
| Invalid file type | 422 | `INVALID_FILE_TYPE` |
| File too large | 422 | `FILE_TOO_LARGE` |
| Upload failed | 500 | `UPLOAD_FAILED` |
| Branch not found | 404 | `BRANCH_NOT_FOUND` |
| Brand not found | 404 | `BRAND_NOT_FOUND` |
| Category not found | 404 | `CATEGORY_NOT_FOUND` |
| Parent category not found | 404 | `PARENT_CATEGORY_NOT_FOUND` |

---

## Permission Requirements

### Brand & Category Management
- `motorcycle:create` — Create brands/categories
- `motorcycle:read` — View brands/categories (also public)
- `motorcycle:update` — Edit brands/categories
- `motorcycle:delete` — Delete brands/categories

### Motorcycle Management
- `motorcycle:create` — Create motorcycles
- `motorcycle:read` — View motorcycles
- `motorcycle:update` — Edit motorcycles + status transitions
- `motorcycle:delete` — Delete motorcycles

---

## Edge Cases

### EC-001: Concurrent Status Transition
- Two users try to change status simultaneously
- Row-level lock (`FOR UPDATE`) ensures serialization
- Second request sees updated status and may fail validation

### EC-002: Deleting Brand with Inactive Motorcycles
- Brand has motorcycles but all are 'sold' or 'returned'
- Still cannot delete — must be zero motorcycles

### EC-003: Category Reorganization
- Moving category with children to new parent
- Must validate no circular reference in entire subtree
- All children move with parent

### EC-004: Image Upload Failure
- Image uploaded but motorcycle creation fails
- Orphaned images remain in storage (acceptable)
- Optional: implement cleanup job for orphaned images

### EC-005: Branch Scope on Motorcycle Creation
- Branch-scoped user tries to create motorcycle in different branch
- Rejected with 403 even if they have `motorcycle:create`

### EC-006: Customer Viewing Sold Motorcycle
- Customer has direct link to sold motorcycle
- Returns 404 (not 403) to avoid revealing existence

### EC-007: Status Transition During Order Processing
- Motorcycle marked 'available', user adds to cart
- Before checkout completes, status changes to 'reserved' by another user
- Checkout fails with 409 error

### EC-008: Multiple Image Upload Race
- User uploads 10 images, one fails
- API returns error; client must retry failed image only
- Partial success allowed (client handles)

---

## Acceptance Criteria

### AC-001: Brand Management
- [ ] Super_admin can create/update/delete brands
- [ ] Brand list shows motorcycle count
- [ ] Cannot delete brand with motorcycles
- [ ] Public can view active brands

### AC-002: Category Management
- [ ] Categories displayed in tree structure
- [ ] Cannot create circular reference
- [ ] Cannot delete category with children or motorcycles
- [ ] Public can view active categories

### AC-003: Motorcycle Creation
- [ ] Motorcycle created with all required fields
- [ ] VIN uniqueness enforced
- [ ] Images stored in object storage
- [ ] Branch-scoped users create only in own branch

### AC-004: Motorcycle Listing & Search
- [ ] Pagination works correctly
- [ ] Search by model/VIN returns correct results
- [ ] Filters by brand/category/status work
- [ ] Branch-scoped users see only own branch
- [ ] Customers see only 'available' motorcycles

### AC-005: Status Transitions
- [ ] Valid transitions succeed with transaction + lock
- [ ] Invalid transitions rejected with 409
- [ ] WebSocket event emitted on status change
- [ ] Audit log records before/after status

### AC-006: Image Management
- [ ] Upload supports JPEG/PNG/WebP
- [ ] Max 5MB file size enforced
- [ ] Max 10 images per motorcycle enforced
- [ ] Images deleted when motorcycle deleted

### AC-007: Inventory Summary
- [ ] Summary shows counts by branch and status
- [ ] Branch-scoped users see only own branch
- [ ] Counts update in real-time (via WebSocket)

### AC-008: Concurrent Status Change
- [ ] Two simultaneous status changes handled safely
- [ ] Second request either succeeds (if valid transition from new state) or fails
- [ ] No lost updates due to race condition

### AC-009: Branch Scoping Enforcement
- [ ] Branch-scoped user cannot view other branch motorcycles
- [ ] Branch-scoped user cannot update other branch motorcycles
- [ ] Super_admin can access all branches

### AC-010: Public Catalog
- [ ] Unauthenticated users can list available motorcycles
- [ ] Unauthenticated users can view motorcycle details
- [ ] Unauthenticated users cannot see cost price

---

## Test Requirements

### Unit Tests
- [ ] Brand/category name uniqueness validation
- [ ] Circular reference detection in categories
- [ ] Status transition validation logic
- [ ] VIN format validation
- [ ] Image URL array validation
- [ ] Branch scoping filter logic

### Integration Tests
- [ ] CRUD `/brands` — all operations
- [ ] CRUD `/categories` — all operations + tree structure
- [ ] CRUD `/motorcycles` — all operations
- [ ] POST `/motorcycles/:id/status` — all valid transitions
- [ ] POST `/motorcycles/:id/status` — reject invalid transitions
- [ ] GET `/motorcycles` — search/filter/pagination
- [ ] GET `/inventory/summary` — counts accuracy
- [ ] Image upload to S3
- [ ] Branch scoping enforcement
- [ ] Concurrent status transitions (race condition test)
- [ ] WebSocket events emitted correctly

### E2E Tests (Later Phase)
- [ ] Staff creates motorcycle → appears in catalog
- [ ] Customer searches motorcycles → correct results
- [ ] Status change → WebSocket updates admin dashboard

---

## Implementation Tasks

### TASK-001-DB: Database Schema
**Owner:** Backend Engineer  
**Estimated Effort:** 0.5 day  
**Description:**
1. Add `Brand`, `Category`, `Motorcycle` models to `prisma/schema.prisma`
2. Create migration
3. Update seed script with sample brands, categories, motorcycles (at least 20 motorcycles across 2 branches)
4. Add indexes: `Motorcycle.vin`, `Motorcycle.status`, `Motorcycle.branchId`, `Motorcycle.brandId`, `Motorcycle.categoryId`

**Files to Modify:**
- `prisma/schema.prisma`
- `prisma/seed.ts`

**Acceptance:**
- [ ] Migration runs successfully
- [ ] Seed creates sample data
- [ ] All foreign keys work
- [ ] Indexes exist

---

### TASK-002-SHARED: Shared Types
**Owner:** Backend Engineer  
**Estimated Effort:** 0.5 day  
**Description:**
1. Add `MotorcycleStatus` enum to `packages/shared-types`
2. Define interfaces: `Brand`, `Category`, `Motorcycle`
3. Define DTOs: `CreateBrandDto`, `UpdateBrandDto`, `CreateCategoryDto`, `UpdateCategoryDto`, `CreateMotorcycleDto`, `UpdateMotorcycleDto`, `StatusTransitionDto`
4. Create Zod schemas for all DTOs
5. Export everything

**Files to Create:**
- `packages/shared-types/src/motorcycle.ts`
- `packages/shared-types/src/brand.ts`
- `packages/shared-types/src/category.ts`

**Files to Modify:**
- `packages/shared-types/src/enums.ts`
- `packages/shared-types/src/index.ts`

**Acceptance:**
- [ ] All DTOs have Zod schemas
- [ ] Enums match BUSINESS_RULES.md
- [ ] Package builds

---

### TASK-003-API: Brand Routes
**Owner:** Backend Engineer  
**Estimated Effort:** 0.5 day  
**Description:**
1. Implement brand routes: POST, GET (list), GET (single), PATCH, DELETE
2. Create brand service with uniqueness checks
3. Add motorcycle count in list response
4. Log all brand operations

**Files to Create:**
- `apps/api/src/routes/brands.ts`
- `apps/api/src/controllers/brands.controller.ts`
- `apps/api/src/services/brands.service.ts`

**Acceptance:**
- [ ] All CRUD operations work
- [ ] Cannot delete brand with motorcycles
- [ ] Duplicate name rejected
- [ ] Public access works (no auth required)

---

### TASK-004-API: Category Routes
**Owner:** Backend Engineer  
**Estimated Effort:** 1 day  
**Description:**
1. Implement category routes: POST, GET (list), GET (single), PATCH, DELETE
2. Create category service with:
   - Tree structure builder
   - Circular reference detection (recursive check)
   - Flat list generator with depth/path
3. Validate parent-child relationships
4. Log all category operations

**Files to Create:**
- `apps/api/src/routes/categories.ts`
- `apps/api/src/controllers/categories.controller.ts`
- `apps/api/src/services/categories.service.ts`

**Acceptance:**
- [ ] Tree structure returned correctly
- [ ] Flat list with depth works
- [ ] Circular reference rejected
- [ ] Cannot delete category with children or motorcycles

---

### TASK-005-API: Image Upload
**Owner:** Backend Engineer  
**Estimated Effort:** 1 day  
**Description:**
1. Install `multer` and S3 SDK (AWS SDK v3 or MinIO client)
2. Configure S3 bucket (local MinIO or AWS S3)
3. Create upload middleware: validate file type/size
4. Create upload route: POST `/upload`
5. Generate UUID filenames
6. Return full URL to uploaded file
7. Create utility to delete images from S3

**Files to Create:**
- `apps/api/src/middleware/upload.ts`
- `apps/api/src/routes/upload.ts`
- `apps/api/src/controllers/upload.controller.ts`
- `apps/api/src/services/storage.service.ts`
- `apps/api/src/config/storage.config.ts`

**Acceptance:**
- [ ] Image uploads to S3
- [ ] Invalid file type rejected
- [ ] File >5MB rejected
- [ ] Returns full URL
- [ ] Delete utility works

---

### TASK-006-API: Motorcycle Routes (Basic CRUD)
**Owner:** Backend Engineer  
**Estimated Effort:** 1.5 days  
**Description:**
1. Implement motorcycle routes: POST, GET (list), GET (single), PATCH, DELETE
2. Create motorcycle service with:
   - VIN uniqueness check
   - Branch scoping logic
   - Search/filter/pagination
   - Sort by multiple fields
3. Include brand/category/branch in responses (join)
4. Hide cost price from customers
5. Image deletion on motorcycle deletion
6. Log all motorcycle operations

**Files to Create:**
- `apps/api/src/routes/motorcycles.ts`
- `apps/api/src/controllers/motorcycles.controller.ts`
- `apps/api/src/services/motorcycles.service.ts`

**Acceptance:**
- [ ] CRUD operations work
- [ ] VIN uniqueness enforced
- [ ] Branch scoping applied
- [ ] Search/filter/pagination work
- [ ] Cannot delete motorcycle with orders

---

### TASK-007-API: Motorcycle Status Transitions
**Owner:** Backend Engineer  
**Estimated Effort:** 1 day  
**Description:**
1. Create status transition validation utility (checks valid transitions from BUSINESS_RULES.md)
2. Implement PATCH `/motorcycles/:id/status` route
3. Use database transaction with row-level lock:
   ```sql
   BEGIN;
   SELECT * FROM motorcycles WHERE id = ? FOR UPDATE;
   UPDATE motorcycles SET status = ? WHERE id = ?;
   COMMIT;
   ```
4. Emit WebSocket event on status change
5. Log status change with before/after in audit trail
6. Implement GET `/motorcycles/:id/history` route

**Files to Create:**
- `apps/api/src/utils/statusTransitions.ts`

**Files to Modify:**
- `apps/api/src/routes/motorcycles.ts`
- `apps/api/src/controllers/motorcycles.controller.ts`
- `apps/api/src/services/motorcycles.service.ts`

**Acceptance:**
- [ ] Valid transitions succeed
- [ ] Invalid transitions rejected with 409
- [ ] WebSocket event emitted
- [ ] Audit log created
- [ ] Concurrent requests handled safely

---

### TASK-008-API: WebSocket Setup
**Owner:** Backend Engineer  
**Estimated Effort:** 1 day  
**Description:**
1. Install `socket.io` and integrate with Express
2. Configure Redis adapter for horizontal scaling
3. Create event emitter utilities
4. Define events: `motorcycle:status_changed`, `motorcycle:created`, `motorcycle:deleted`
5. Emit events from motorcycle service
6. Add authentication middleware for WebSocket connections

**Files to Create:**
- `apps/api/src/socket/index.ts`
- `apps/api/src/socket/events.ts`
- `apps/api/src/socket/auth.ts`

**Files to Modify:**
- `apps/api/src/index.ts` (integrate Socket.io server)

**Acceptance:**
- [ ] Socket.io server runs alongside Express
- [ ] Events emitted on motorcycle changes
- [ ] Redis Pub/Sub configured
- [ ] Authenticated connections only

---

### TASK-009-API: Inventory Summary
**Owner:** Backend Engineer  
**Estimated Effort:** 0.5 day  
**Description:**
1. Implement GET `/inventory/summary` route
2. Aggregate motorcycle counts by branch + status
3. Apply branch scoping
4. Return structured counts

**Files to Create:**
- `apps/api/src/routes/inventory.ts`
- `apps/api/src/controllers/inventory.controller.ts`
- `apps/api/src/services/inventory.service.ts`

**Acceptance:**
- [ ] Counts accurate
- [ ] Branch scoping applied
- [ ] Response format matches spec

---

### TASK-010-API: Integration Tests
**Owner:** Backend Engineer  
**Estimated Effort:** 2 days  
**Description:**
1. Write integration tests for:
   - Brand CRUD (all endpoints)
   - Category CRUD (all endpoints + tree structure)
   - Motorcycle CRUD (all endpoints)
   - Status transitions (valid + invalid)
   - Image upload
   - Inventory summary
   - Search/filter/pagination
   - Branch scoping enforcement
   - Concurrent status transitions
2. Achieve >80% coverage on brand/category/motorcycle modules

**Files to Create:**
- `apps/api/tests/brands.test.ts`
- `apps/api/tests/categories.test.ts`
- `apps/api/tests/motorcycles.test.ts`
- `apps/api/tests/status-transitions.test.ts`
- `apps/api/tests/upload.test.ts`

**Acceptance:**
- [ ] All tests pass
- [ ] Coverage >80%
- [ ] Concurrent test for status transitions passes

---

### TASK-011-WEB: E-commerce Catalog Pages (Stub)
**Owner:** Frontend Engineer (Web)  
**Estimated Effort:** 1 day  
**Description:**
1. Create Next.js pages:
   - `/[locale]/motorcycles` (catalog list, SSR)
   - `/[locale]/motorcycles/[id]` (detail page, SSR)
2. Fetch motorcycles from API (only status 'available')
3. Implement search/filter UI (brand, category, price, year)
4. Display motorcycle images in gallery
5. Basic responsive layout (no styling yet)

**Files to Create:**
- `apps/web/app/[locale]/motorcycles/page.tsx`
- `apps/web/app/[locale]/motorcycles/[id]/page.tsx`
- `apps/web/lib/motorcycles.ts`

**Acceptance:**
- [ ] Catalog page renders via SSR
- [ ] Filters work
- [ ] Detail page shows motorcycle info
- [ ] Only 'available' motorcycles shown

---

### TASK-012-ADMIN: Motorcycle Management Pages (Stub)
**Owner:** Frontend Engineer (Admin)  
**Estimated Effort:** 1.5 days  
**Description:**
1. Create React pages:
   - Brands list + CRUD modal
   - Categories list + CRUD modal
   - Motorcycles list (table with search/filter)
   - Motorcycle create/edit form
   - Motorcycle detail view with status transition buttons
2. Implement image upload UI (drag-drop or file input)
3. Display inventory summary dashboard widget
4. Use React Query for data fetching

**Files to Create:**
- `apps/admin/src/pages/Brands.tsx`
- `apps/admin/src/pages/Categories.tsx`
- `apps/admin/src/pages/Motorcycles.tsx`
- `apps/admin/src/pages/MotorcycleForm.tsx`
- `apps/admin/src/pages/MotorcycleDetail.tsx`
- `apps/admin/src/components/ImageUpload.tsx`

**Acceptance:**
- [ ] All CRUD operations work
- [ ] Image upload works
- [ ] Status transition buttons work
- [ ] Inventory summary displays

---

### TASK-013-DESKTOP: POS Motorcycle Search (Stub)
**Owner:** Frontend Engineer (Desktop)  
**Estimated Effort:** 0.5 day  
**Description:**
1. Create motorcycle search component
2. Search by VIN or model name
3. Display search results with quick-add to sale
4. Show only 'available' motorcycles in own branch

**Files to Create:**
- `apps/desktop/src/components/MotorcycleSearch.tsx`

**Acceptance:**
- [ ] Search works
- [ ] Branch filtering applied
- [ ] Results displayed

---

## Dependencies

**Upstream:**
- SPEC-001 (Authentication, Users & Roles) — Required for RBAC and branch scoping

**Downstream:**
- SPEC-003 (Inventory) — Will use motorcycle status transitions
- SPEC-004 (Customers) — E-commerce uses motorcycle catalog
- SPEC-005 (Orders) — Orders reference motorcycles
- SPEC-006 (Reservations) — Reservations reference motorcycles

---

## Files/Modules Expected to Change

### Created
- `prisma/schema.prisma` — Add Brand, Category, Motorcycle models
- `packages/shared-types/src/motorcycle.ts` — Types + DTOs
- `packages/shared-types/src/brand.ts` — Types + DTOs
- `packages/shared-types/src/category.ts` — Types + DTOs
- `apps/api/src/routes/brands.ts` — Brand routes
- `apps/api/src/routes/categories.ts` — Category routes
- `apps/api/src/routes/motorcycles.ts` — Motorcycle routes
- `apps/api/src/routes/inventory.ts` — Inventory routes
- `apps/api/src/routes/upload.ts` — Upload route
- `apps/api/src/controllers/*.controller.ts` — Controllers
- `apps/api/src/services/*.service.ts` — Services
- `apps/api/src/middleware/upload.ts` — Upload middleware
- `apps/api/src/socket/index.ts` — WebSocket setup
- `apps/api/src/utils/statusTransitions.ts` — Transition validation
- `apps/api/tests/brands.test.ts` — Tests
- `apps/api/tests/categories.test.ts` — Tests
- `apps/api/tests/motorcycles.test.ts` — Tests
- `apps/web/app/[locale]/motorcycles/` — E-commerce pages
- `apps/admin/src/pages/Brands.tsx` — Admin pages
- `apps/admin/src/pages/Categories.tsx` — Admin pages
- `apps/admin/src/pages/Motorcycles.tsx` — Admin pages
- `apps/desktop/src/components/MotorcycleSearch.tsx` — Desktop component

### Modified
- `prisma/seed.ts` — Add sample data
- `apps/api/src/index.ts` — Integrate Socket.io

---

## Next Implementation Task

**After this specification is approved:**

Implement **TASK-001-DB: Database Schema** (Backend Engineer)

**DO NOT implement any tasks without approval.**

---

**End of SPEC-002**
