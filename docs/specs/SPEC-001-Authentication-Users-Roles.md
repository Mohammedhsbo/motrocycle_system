# SPEC-001: Authentication, Users & Roles

**Feature Goal:** Implement secure authentication with JWT tokens and role-based access control (RBAC) for all three applications (E-commerce, Admin Dashboard, Desktop POS).

**Priority:** P0 (Foundation - Required for all other features)

**Dependencies:** None (This is the first feature)

---

## User Roles

| Role | Scope | Used By |
|------|-------|---------|
| `super_admin` | Full system access, manage roles | Admin Dashboard |
| `branch_manager` | Full access within own branch | Admin Dashboard, Desktop POS |
| `cashier` | POS operations, sales, reservations, payments, letters | Desktop POS |
| `inventory_clerk` | Purchases, transfers, stock management | Admin Dashboard, Desktop POS |
| `accountant` | Payments, installments, reports (read-only stock) | Admin Dashboard |
| `customer` | E-commerce access (own data only) | E-commerce Website |

---

## Functional Requirements

### FR-001: User Registration (Staff)
- Only `super_admin` can create staff users
- Required fields: name, email, password, roleId, branchId (optional for super_admin)
- Password must be at least 8 characters
- Email must be unique across all users
- Password is hashed with bcrypt before storage

### FR-002: User Login
- Users provide email + password
- System validates credentials
- On success: return access token (JWT, 15min expiry) + refresh token (7 days, httpOnly cookie)
- On failure: return generic error (do not reveal if email exists)

### FR-003: Customer Registration (E-commerce)
- Customers can self-register via e-commerce website
- Required fields: name, phone, email, password
- Creates user with `customer` role
- Email and phone must be unique

### FR-004: Token Refresh
- Client sends refresh token (from httpOnly cookie)
- System validates refresh token
- On success: return new access token + new refresh token
- On failure: require re-login

### FR-005: Logout
- Invalidate refresh token (add to Redis blacklist with TTL)
- Clear httpOnly cookie
- Client discards access token

### FR-006: Get Current User
- Endpoint returns authenticated user's profile
- Includes: id, name, email, role (with permissions), branchId, lang

### FR-007: Role Management
- `super_admin` can create/update/delete custom roles
- System roles (`super_admin`, `customer`) cannot be deleted (isSystem = true)
- Each role has a set of permissions

### FR-008: Permission Assignment
- Permissions use format: `resource:action`
- Resources: `motorcycle`, `order`, `reservation`, `payment`, `installment`, `letter`, `customer`, `supplier`, `purchase`, `transfer`, `branch`, `user`, `role`, `report`, `setting`, `web_content`
- Actions: `create`, `read`, `update`, `delete`, `export`
- Example: `order:create`, `motorcycle:update`, `report:read`

### FR-009: RBAC Middleware
- All protected routes check:
  1. Valid JWT access token
  2. User has required permission for the route
  3. Branch-scoped users can only access their branch's data
- Return 401 if token invalid/missing
- Return 403 if permission denied

### FR-010: Branch Scoping
- Users with `branchId` can only see/modify data from their branch
- `super_admin` (no branchId) sees all branches
- Branch scoping applied automatically in database queries

---

## Business Rules

### BR-001: Password Security
- Minimum 8 characters
- Hashed with bcrypt (10 rounds)
- Never returned in API responses

### BR-002: Token Expiry
- Access token: 15 minutes
- Refresh token: 7 days
- Refresh token stored in httpOnly cookie (SameSite=Strict, Secure in production)

### BR-003: Session Management
- Active refresh tokens stored in Redis with TTL
- On logout: token added to blacklist (TTL = remaining expiry)
- On password change: invalidate all user's refresh tokens

### BR-004: System Roles Protection
- Roles with `isSystem = true` cannot be deleted or renamed
- System roles: `super_admin`, `customer`

### BR-005: Permission Inheritance
- No permission inheritance (flat structure)
- Each role explicitly defines all permissions

### BR-006: Audit Trail
- Log all authentication events: login (success/failure), logout, token refresh
- Log all user/role CRUD operations

---

## Data Requirements

### Entities Used
- `User` (id, name, email, passwordHash, phone, branchId, roleId, lang, isActive, lastLoginAt, createdAt, updatedAt)
- `Role` (id, name, description, isSystem, createdAt, updatedAt)
- `RolePermission` (id, roleId, resource, action)
- `Branch` (id, nameAr, nameEn, address, phone, isActive)
- `AuditLog` (for auth events)

### Redis Keys
- `refresh_token:{userId}:{tokenId}` → TTL 7 days
- `blacklist:{tokenId}` → TTL = remaining token expiry

---

## API Requirements

### POST `/api/v1/auth/register`
**Description:** Register new customer (e-commerce only)

**Request Body:**
```typescript
{
  name: string;        // max 200 chars
  phone: string;       // max 20 chars
  email: string;       // valid email format
  password: string;    // min 8 chars
}
```

**Response (201):**
```typescript
{
  success: true,
  data: {
    id: string;
    name: string;
    email: string;
    phone: string;
  }
}
```

**Errors:**
- 422: Validation failure (e.g., weak password, invalid email)
- 409: Email or phone already exists

---

### POST `/api/v1/auth/login`
**Description:** Authenticate user and return tokens

**Request Body:**
```typescript
{
  email: string;
  password: string;
}
```

**Response (200):**
```typescript
{
  success: true,
  data: {
    accessToken: string;  // JWT, 15min expiry
    user: {
      id: string;
      name: string;
      email: string;
      role: {
        id: string;
        name: string;
        permissions: Array<{ resource: string; action: string }>;
      };
      branchId?: string;
      lang: string;
    }
  }
}
```
**Set-Cookie:** `refreshToken` (httpOnly, SameSite=Strict, Secure, 7d expiry)

**Errors:**
- 401: Invalid credentials
- 403: User account is inactive

---

### POST `/api/v1/auth/refresh`
**Description:** Refresh access token using refresh token from cookie

**Request:** None (refresh token in cookie)

**Response (200):**
```typescript
{
  success: true,
  data: {
    accessToken: string;  // New JWT
  }
}
```
**Set-Cookie:** New `refreshToken`

**Errors:**
- 401: Invalid/expired refresh token

---

### POST `/api/v1/auth/logout`
**Description:** Invalidate refresh token and clear cookie

**Headers:** `Authorization: Bearer {accessToken}`

**Response (200):**
```typescript
{
  success: true,
  data: null
}
```

**Set-Cookie:** Clear `refreshToken` (Max-Age=0)

---

### GET `/api/v1/auth/me`
**Description:** Get current authenticated user profile

**Headers:** `Authorization: Bearer {accessToken}`

**Response (200):**
```typescript
{
  success: true,
  data: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role: {
      id: string;
      name: string;
      permissions: Array<{ resource: string; action: string }>;
    };
    branchId?: string;
    branch?: {
      id: string;
      nameAr: string;
      nameEn: string;
    };
    lang: string;
    lastLoginAt?: string;  // ISO 8601
  }
}
```

**Errors:**
- 401: Token invalid/missing

---

### POST `/api/v1/users`
**Description:** Create new staff user (super_admin only)

**Headers:** `Authorization: Bearer {accessToken}`

**Required Permission:** `user:create`

**Request Body:**
```typescript
{
  name: string;
  email: string;
  password: string;      // min 8 chars
  phone?: string;
  roleId: string;        // UUID
  branchId?: string;     // Required unless role is super_admin
  lang?: string;         // 'ar' | 'en', default 'ar'
}
```

**Response (201):**
```typescript
{
  success: true,
  data: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    roleId: string;
    branchId?: string;
    lang: string;
    isActive: boolean;
    createdAt: string;
  }
}
```

**Errors:**
- 401: Not authenticated
- 403: Missing `user:create` permission
- 422: Validation failure
- 409: Email already exists

---

### GET `/api/v1/users`
**Description:** List all staff users (paginated)

**Headers:** `Authorization: Bearer {accessToken}`

**Required Permission:** `user:read`

**Query Parameters:**
- `page` (number, default 1)
- `limit` (number, default 20, max 100)
- `search` (string, optional) — searches name, email
- `roleId` (UUID, optional) — filter by role
- `branchId` (UUID, optional) — filter by branch
- `isActive` (boolean, optional) — filter by status

**Response (200):**
```typescript
{
  success: true,
  data: Array<{
    id: string;
    name: string;
    email: string;
    phone?: string;
    role: {
      id: string;
      name: string;
    };
    branch?: {
      id: string;
      nameAr: string;
      nameEn: string;
    };
    isActive: boolean;
    lastLoginAt?: string;
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

**Branch Scoping:** Non-admin users only see users from their own branch

---

### GET `/api/v1/users/:id`
**Description:** Get single user by ID

**Headers:** `Authorization: Bearer {accessToken}`

**Required Permission:** `user:read`

**Response (200):** Same as POST `/api/v1/users` response

**Errors:**
- 404: User not found
- 403: Branch scoping violation

---

### PATCH `/api/v1/users/:id`
**Description:** Update user

**Headers:** `Authorization: Bearer {accessToken}`

**Required Permission:** `user:update`

**Request Body (all fields optional):**
```typescript
{
  name?: string;
  email?: string;
  phone?: string;
  roleId?: string;
  branchId?: string;
  isActive?: boolean;
  lang?: string;
}
```

**Response (200):** Updated user object (same as GET)

**Errors:**
- 404: User not found
- 403: Branch scoping violation or cannot modify super_admin
- 409: Email already exists

**Special Rules:**
- Cannot change own role or deactivate own account
- Cannot deactivate last super_admin

---

### DELETE `/api/v1/users/:id`
**Description:** Delete user (hard delete)

**Headers:** `Authorization: Bearer {accessToken}`

**Required Permission:** `user:delete`

**Response (200):**
```typescript
{
  success: true,
  data: null
}
```

**Errors:**
- 404: User not found
- 403: Cannot delete super_admin or own account
- 409: User has associated records (orders, payments, etc.)

---

### POST `/api/v1/users/:id/reset-password`
**Description:** Admin resets user password

**Headers:** `Authorization: Bearer {accessToken}`

**Required Permission:** `user:update`

**Request Body:**
```typescript
{
  newPassword: string;  // min 8 chars
}
```

**Response (200):**
```typescript
{
  success: true,
  data: null
}
```

**Side Effect:** Invalidates all user's active refresh tokens

---

### POST `/api/v1/auth/change-password`
**Description:** User changes their own password

**Headers:** `Authorization: Bearer {accessToken}`

**Request Body:**
```typescript
{
  currentPassword: string;
  newPassword: string;
}
```

**Response (200):**
```typescript
{
  success: true,
  data: null
}
```

**Side Effect:** Invalidates all user's other refresh tokens (keeps current session)

**Errors:**
- 401: Current password incorrect

---

### POST `/api/v1/roles`
**Description:** Create new role (super_admin only)

**Headers:** `Authorization: Bearer {accessToken}`

**Required Permission:** `role:create`

**Request Body:**
```typescript
{
  name: string;          // max 100 chars, unique
  description?: string;
  permissions: Array<{
    resource: string;    // enum Resource
    action: string;      // enum Action
  }>;
}
```

**Response (201):**
```typescript
{
  success: true,
  data: {
    id: string;
    name: string;
    description?: string;
    isSystem: boolean;
    permissions: Array<{ resource: string; action: string }>;
    createdAt: string;
  }
}
```

**Errors:**
- 409: Role name already exists
- 422: Invalid permission format

---

### GET `/api/v1/roles`
**Description:** List all roles

**Headers:** `Authorization: Bearer {accessToken}`

**Required Permission:** `role:read`

**Response (200):**
```typescript
{
  success: true,
  data: Array<{
    id: string;
    name: string;
    description?: string;
    isSystem: boolean;
    _count: {
      users: number;      // Number of users with this role
      permissions: number;
    };
    createdAt: string;
  }>
}
```

---

### GET `/api/v1/roles/:id`
**Description:** Get single role with permissions

**Headers:** `Authorization: Bearer {accessToken}`

**Required Permission:** `role:read`

**Response (200):**
```typescript
{
  success: true,
  data: {
    id: string;
    name: string;
    description?: string;
    isSystem: boolean;
    permissions: Array<{
      id: string;
      resource: string;
      action: string;
    }>;
    createdAt: string;
    updatedAt: string;
  }
}
```

---

### PATCH `/api/v1/roles/:id`
**Description:** Update role

**Headers:** `Authorization: Bearer {accessToken}`

**Required Permission:** `role:update`

**Request Body (all optional):**
```typescript
{
  name?: string;
  description?: string;
  permissions?: Array<{
    resource: string;
    action: string;
  }>;
}
```

**Response (200):** Updated role object

**Errors:**
- 403: Cannot modify system roles
- 409: Role name already exists

**Special Rule:** Updating permissions replaces all existing permissions (not merge)

---

### DELETE `/api/v1/roles/:id`
**Description:** Delete role

**Headers:** `Authorization: Bearer {accessToken}`

**Required Permission:** `role:delete`

**Response (200):**
```typescript
{
  success: true,
  data: null
}
```

**Errors:**
- 403: Cannot delete system roles
- 409: Role has assigned users

---

## Validation Rules

### Email
- Valid email format (RFC 5322)
- Max 255 characters
- Case-insensitive uniqueness check

### Password
- Minimum 8 characters
- No maximum (allow passphrases)
- No complexity requirements (length is sufficient)

### Name
- Max 200 characters
- Cannot be empty string

### Phone
- Max 20 characters
- Optional validation pattern configurable in settings

### Role Name
- Max 100 characters
- Alphanumeric + spaces + underscores only
- Unique (case-insensitive)

### Permission Format
- `resource:action` where both are valid enum values
- No duplicates within a role

---

## Error Cases

| Scenario | HTTP Status | Error Code |
|----------|-------------|------------|
| Invalid email format | 422 | `INVALID_EMAIL` |
| Password too short | 422 | `PASSWORD_TOO_SHORT` |
| Email already exists | 409 | `EMAIL_EXISTS` |
| Phone already exists | 409 | `PHONE_EXISTS` |
| Invalid credentials | 401 | `INVALID_CREDENTIALS` |
| Account inactive | 403 | `ACCOUNT_INACTIVE` |
| Token expired | 401 | `TOKEN_EXPIRED` |
| Token invalid | 401 | `TOKEN_INVALID` |
| Insufficient permissions | 403 | `FORBIDDEN` |
| Branch scope violation | 403 | `BRANCH_SCOPE_VIOLATION` |
| Cannot delete system role | 403 | `SYSTEM_ROLE_PROTECTED` |
| Role has assigned users | 409 | `ROLE_IN_USE` |
| User has associated records | 409 | `USER_HAS_RECORDS` |
| Cannot modify own role | 403 | `CANNOT_MODIFY_OWN_ROLE` |
| Last super_admin | 403 | `LAST_SUPER_ADMIN` |
| Current password incorrect | 401 | `INCORRECT_PASSWORD` |

---

## Permission Requirements

### User Management
- `user:create` — Create staff users
- `user:read` — View users
- `user:update` — Edit users, reset passwords
- `user:delete` — Delete users

### Role Management
- `role:create` — Create roles
- `role:read` — View roles
- `role:update` — Edit roles and permissions
- `role:delete` — Delete roles

### Default Role Permissions

**super_admin:** ALL permissions

**branch_manager:**
- user:* (within own branch)
- motorcycle:*, order:*, reservation:*, payment:*, letter:*
- customer:*, purchase:*, transfer:*
- report:read, report:export

**cashier:**
- order:create, order:read, order:update
- reservation:*, payment:create, payment:read
- letter:*, customer:read, customer:create
- motorcycle:read

**inventory_clerk:**
- motorcycle:*, purchase:*, transfer:*
- supplier:*, report:read

**accountant:**
- payment:read, payment:export
- installment:*, order:read, reservation:read
- report:*, motorcycle:read (read-only)

**customer:**
- (No backend permissions — limited to own data in frontend)

---

## Edge Cases

### EC-001: Concurrent Login
- Multiple simultaneous logins allowed
- Each session gets unique refresh token
- All sessions remain valid until individual logout or token expiry

### EC-002: Token Refresh Race Condition
- If multiple refresh requests arrive simultaneously, all get new tokens
- Old refresh token remains valid until blacklisted or expired

### EC-003: Deleted User Session
- If user deleted while logged in, next API call fails with 401
- If user deactivated, fails with 403

### EC-004: Role Permission Change
- Permission changes take effect immediately
- Active sessions continue until next API call (no forced logout)
- Next request validates against updated permissions

### EC-005: Branch Reassignment
- If user's branch changed, they immediately lose access to old branch data
- No explicit notification (handled by next API call scope check)

### EC-006: Password Reset During Active Session
- Admin password reset invalidates all user sessions except admin's
- User must re-login

### EC-007: Self Password Change
- User's own password change invalidates other sessions
- Current session remains valid

### EC-008: Last Super Admin Protection
- System prevents deleting or deactivating the last super_admin
- Check counts active super_admin users before allowing operation

---

## Acceptance Criteria

### AC-001: Customer Registration & Login
- [ ] Customer can register via e-commerce website
- [ ] Customer receives access + refresh tokens on successful login
- [ ] Customer can access own profile via `/auth/me`
- [ ] Invalid email/phone rejected with 422
- [ ] Duplicate email/phone rejected with 409

### AC-002: Staff Login & RBAC
- [ ] Staff user logs in with email + password
- [ ] Response includes role with permissions array
- [ ] Protected routes check permission via middleware
- [ ] Request with missing permission returns 403
- [ ] Request with invalid token returns 401

### AC-003: Token Refresh Flow
- [ ] Client refreshes access token using refresh token cookie
- [ ] New access token + new refresh token returned
- [ ] Old refresh token becomes invalid after refresh
- [ ] Expired refresh token rejected with 401

### AC-004: Logout
- [ ] Logout invalidates refresh token (added to Redis blacklist)
- [ ] Cookie cleared with Max-Age=0
- [ ] Subsequent requests with that refresh token fail

### AC-005: Branch Scoping
- [ ] User with branchId only sees own branch data
- [ ] User without branchId (super_admin) sees all branches
- [ ] Request for other branch data returns 403 for scoped users

### AC-006: Role Management
- [ ] Super_admin creates custom role with permissions
- [ ] Custom role assigned to user
- [ ] User inherits role permissions
- [ ] System roles cannot be deleted
- [ ] Role with assigned users cannot be deleted

### AC-007: User Management
- [ ] Super_admin creates staff user with role + branch
- [ ] User appears in paginated list with role/branch names
- [ ] User search filters by name/email
- [ ] User update changes fields correctly
- [ ] User cannot modify own role or status

### AC-008: Password Management
- [ ] User changes own password with current password verification
- [ ] Admin resets user password
- [ ] Password reset invalidates user's sessions
- [ ] Self password change keeps current session valid

### AC-009: Audit Logging
- [ ] All login attempts logged (success + failure)
- [ ] All user CRUD operations logged
- [ ] All role CRUD operations logged
- [ ] Logs include userId, action, timestamp, IP

### AC-010: Security
- [ ] Passwords never returned in API responses
- [ ] Refresh token stored in httpOnly cookie
- [ ] CORS configured for allowed origins only
- [ ] Rate limiting applied to login endpoint
- [ ] Failed login doesn't reveal if email exists

---

## Test Requirements

### Unit Tests
- [ ] Password hashing with bcrypt
- [ ] JWT token generation and validation
- [ ] Permission check logic
- [ ] Branch scope filtering
- [ ] Zod validation schemas

### Integration Tests
- [ ] POST `/auth/register` — success + error cases
- [ ] POST `/auth/login` — success + error cases
- [ ] POST `/auth/refresh` — success + error cases
- [ ] POST `/auth/logout` — success
- [ ] GET `/auth/me` — success + 401
- [ ] CRUD `/users` — all operations with RBAC checks
- [ ] CRUD `/roles` — all operations with RBAC checks
- [ ] Branch scoping enforcement on user list
- [ ] Token blacklist via Redis

### E2E Tests (Later Phase)
- [ ] Full registration → login → access protected page flow
- [ ] Admin creates user → user logs in → performs allowed action
- [ ] User denied access to forbidden resource

---

## Implementation Tasks

### TASK-001-DB: Database Setup
**Owner:** Backend Engineer  
**Estimated Effort:** 1 day  
**Description:**
1. Install Prisma and initialize schema
2. Define `Branch`, `Role`, `RolePermission`, `User`, `AuditLog` models
3. Create initial migration
4. Write seed script with:
   - 1 default branch
   - System roles: `super_admin`, `customer`
   - 1 super_admin user (email: admin@example.com, password: admin123)
   - Default permissions for all roles
5. Set up test database utilities (seed/teardown)

**Files to Create/Modify:**
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `prisma/migrations/`

**Acceptance:**
- [ ] `npx prisma migrate dev` runs successfully
- [ ] `npx prisma db seed` creates default data
- [ ] All foreign key constraints work
- [ ] Indexes on `User.email`, `User.branchId`, `Role.name` exist

---

### TASK-002-SHARED: Shared Types & Validators
**Owner:** Backend Engineer  
**Estimated Effort:** 0.5 day  
**Description:**
1. Create `packages/shared-types` package
2. Define TypeScript interfaces for:
   - `User`, `Role`, `RolePermission`, `Branch`
   - Auth DTOs (LoginRequest, LoginResponse, RegisterRequest, etc.)
3. Define enums: `Resource`, `Action`
4. Create Zod schemas for all request bodies
5. Export everything from index

**Files to Create:**
- `packages/shared-types/src/auth.ts`
- `packages/shared-types/src/user.ts`
- `packages/shared-types/src/role.ts`
- `packages/shared-types/src/enums.ts`
- `packages/shared-types/src/index.ts`
- `packages/shared-types/package.json`

**Acceptance:**
- [ ] All DTOs have Zod schemas
- [ ] Package builds with `pnpm build`
- [ ] Types exported correctly

---

### TASK-003-API: Auth Routes & Middleware
**Owner:** Backend Engineer  
**Estimated Effort:** 2 days  
**Description:**
1. Set up Express app with middleware (cors, helmet, express-json)
2. Install dependencies: jsonwebtoken, bcrypt, cookie-parser, zod
3. Create JWT utilities: `generateAccessToken`, `generateRefreshToken`, `verifyToken`
4. Create Redis client and utilities: `saveRefreshToken`, `blacklistToken`, `checkBlacklist`
5. Create auth middleware: `authenticate` (validates JWT, attaches `req.user`)
6. Create RBAC middleware: `requirePermission(resource, action)`
7. Create validation middleware: `validateBody(schema)`
8. Implement auth routes:
   - POST `/auth/register`
   - POST `/auth/login`
   - POST `/auth/refresh`
   - POST `/auth/logout`
   - GET `/auth/me`
   - POST `/auth/change-password`
9. Create error handler middleware
10. Set up request logging

**Files to Create:**
- `apps/api/src/middleware/auth.ts`
- `apps/api/src/middleware/rbac.ts`
- `apps/api/src/middleware/validation.ts`
- `apps/api/src/middleware/errorHandler.ts`
- `apps/api/src/utils/jwt.ts`
- `apps/api/src/utils/redis.ts`
- `apps/api/src/utils/password.ts`
- `apps/api/src/routes/auth.ts`
- `apps/api/src/controllers/auth.controller.ts`
- `apps/api/src/services/auth.service.ts`
- `apps/api/src/index.ts`

**Acceptance:**
- [ ] All auth endpoints return correct responses
- [ ] JWT tokens validated correctly
- [ ] Refresh tokens stored in Redis with TTL
- [ ] Blacklist prevents reuse of logged-out tokens
- [ ] 401 returned for invalid tokens
- [ ] Cookie set with correct flags (httpOnly, SameSite, Secure)

---

### TASK-004-API: User Management Routes
**Owner:** Backend Engineer  
**Estimated Effort:** 1.5 days  
**Description:**
1. Implement user routes:
   - POST `/users`
   - GET `/users` (with pagination, search, filters)
   - GET `/users/:id`
   - PATCH `/users/:id`
   - DELETE `/users/:id`
   - POST `/users/:id/reset-password`
2. Create user service with:
   - Branch scoping logic
   - Last super_admin protection
   - Email uniqueness check
3. Create audit log service and log all user operations
4. Add rate limiting to user creation endpoint

**Files to Create:**
- `apps/api/src/routes/users.ts`
- `apps/api/src/controllers/users.controller.ts`
- `apps/api/src/services/users.service.ts`
- `apps/api/src/services/audit.service.ts`

**Acceptance:**
- [ ] All user endpoints work with pagination
- [ ] Search filters users by name/email
- [ ] Branch-scoped users only see own branch
- [ ] Cannot delete last super_admin
- [ ] Cannot modify own role
- [ ] Audit logs created for all operations

---

### TASK-005-API: Role Management Routes
**Owner:** Backend Engineer  
**Estimated Effort:** 1 day  
**Description:**
1. Implement role routes:
   - POST `/roles`
   - GET `/roles`
   - GET `/roles/:id`
   - PATCH `/roles/:id`
   - DELETE `/roles/:id`
2. Create role service with:
   - System role protection
   - Permission validation
   - Role-in-use check before deletion
3. Log all role operations

**Files to Create:**
- `apps/api/src/routes/roles.ts`
- `apps/api/src/controllers/roles.controller.ts`
- `apps/api/src/services/roles.service.ts`

**Acceptance:**
- [ ] All role endpoints work
- [ ] Cannot delete/modify system roles
- [ ] Cannot delete role with assigned users
- [ ] Permission update replaces all permissions atomically
- [ ] Audit logs created

---

### TASK-006-API: Integration Tests
**Owner:** Backend Engineer  
**Estimated Effort:** 1.5 days  
**Description:**
1. Set up Vitest + Supertest
2. Create test database setup/teardown utilities
3. Write integration tests for:
   - All auth endpoints (success + error cases)
   - User CRUD with RBAC checks
   - Role CRUD with RBAC checks
   - Branch scoping enforcement
   - Token refresh flow
   - Password change flows
   - Edge cases (last super_admin, concurrent requests, etc.)
4. Achieve >80% code coverage on auth/user/role modules

**Files to Create:**
- `apps/api/tests/setup.ts`
- `apps/api/tests/auth.test.ts`
- `apps/api/tests/users.test.ts`
- `apps/api/tests/roles.test.ts`
- `apps/api/vitest.config.ts`

**Acceptance:**
- [ ] All tests pass
- [ ] Coverage >80% on tested modules
- [ ] Tests run in isolated test DB
- [ ] Tests clean up after themselves

---

### TASK-007-WEB: E-commerce Auth UI (Stub)
**Owner:** Frontend Engineer (Web)  
**Estimated Effort:** 0.5 day  
**Description:**
1. Create basic Next.js pages:
   - `/[locale]/login`
   - `/[locale]/register`
2. Create API client utility with axios
3. Implement login/register forms (no styling yet)
4. Store access token in memory, refresh token in httpOnly cookie
5. Create auth context to manage user state

**Files to Create:**
- `apps/web/app/[locale]/login/page.tsx`
- `apps/web/app/[locale]/register/page.tsx`
- `apps/web/lib/api.ts`
- `apps/web/contexts/AuthContext.tsx`

**Acceptance:**
- [ ] Customer can register and login
- [ ] Access token stored in React context
- [ ] Refresh token handled automatically

---

### TASK-008-ADMIN: Admin Auth UI (Stub)
**Owner:** Frontend Engineer (Admin)  
**Estimated Effort:** 0.5 day  
**Description:**
1. Create React + Vite app scaffolding
2. Install React Router, React Query, axios
3. Create login page
4. Create API client with interceptor for token refresh
5. Create auth context
6. Create protected route wrapper

**Files to Create:**
- `apps/admin/src/pages/Login.tsx`
- `apps/admin/src/lib/api.ts`
- `apps/admin/src/contexts/AuthContext.tsx`
- `apps/admin/src/components/ProtectedRoute.tsx`
- `apps/admin/src/main.tsx`

**Acceptance:**
- [ ] Staff can login
- [ ] Protected routes redirect to login if not authenticated
- [ ] Token refresh handled automatically

---

### TASK-009-DESKTOP: Desktop Auth UI (Stub)
**Owner:** Frontend Engineer (Desktop)  
**Estimated Effort:** 0.5 day  
**Description:**
1. Create Electron + React app scaffolding
2. Copy admin auth implementation (same structure)
3. Add Electron-specific token storage (if needed)

**Files to Create:**
- `apps/desktop/src/pages/Login.tsx`
- `apps/desktop/src/lib/api.ts`
- `apps/desktop/src/contexts/AuthContext.tsx`
- `apps/desktop/electron/main.ts`
- `apps/desktop/electron/preload.ts`

**Acceptance:**
- [ ] Staff can login from desktop app
- [ ] Token refresh works
- [ ] Protected views enforced

---

## Dependencies

**Upstream:** None (This is the foundation)

**Downstream:** All other features depend on this

---

## Files/Modules Expected to Change

### Created
- `prisma/schema.prisma` — Branch, Role, RolePermission, User models
- `prisma/seed.ts` — Seed script
- `packages/shared-types/src/*` — All auth/user/role types
- `apps/api/src/middleware/*` — Auth, RBAC, validation middleware
- `apps/api/src/routes/auth.ts` — Auth routes
- `apps/api/src/routes/users.ts` — User routes
- `apps/api/src/routes/roles.ts` — Role routes
- `apps/api/src/controllers/*` — Controllers
- `apps/api/src/services/*` — Services
- `apps/api/tests/*` — Integration tests
- `apps/web/app/[locale]/login/page.tsx` — E-commerce login
- `apps/web/app/[locale]/register/page.tsx` — E-commerce register
- `apps/admin/src/pages/Login.tsx` — Admin login
- `apps/desktop/src/pages/Login.tsx` — Desktop login

### Modified
- `turbo.json` — Add build pipeline
- `pnpm-workspace.yaml` — Add package references
- Root `package.json` — Add scripts

---

## Next Implementation Task

**After this specification is approved:**

Implement **TASK-001-DB: Database Setup** (Backend Engineer)

**DO NOT implement any tasks without approval.**

---

**End of SPEC-001**
