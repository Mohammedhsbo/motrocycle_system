# Admin Frontend Conventions for Desktop Integration

**Scope:** exploration only, 2026-08-25. This is an implementation reference for `apps/desktop`; it documents current `apps/admin` behavior and known incompatibilities. No application code was changed.

## Application shape

`apps/admin` is a Vite React app. `src/api.ts` is the single HTTP client and also contains most domain interfaces and API objects. `App.tsx` owns providers, `BrowserRouter`, route declarations, login state, and the `QueryClient`; pages live directly under `src/pages`, reusable controls under `src/components`, and branch selection under `src/contexts/BranchContext.tsx`.

## API client

- Base URL is normalized from `VITE_API_URL`; default is `http://localhost:3000/api/v1`. A trailing `/api/v1` is not duplicated.
- The client uses native `fetch`, not Axios. JSON calls receive `Content-Type: application/json`; `FormData` calls omit that header. Every call uses `credentials: include`.
- The access token is held in a module variable initialized from `localStorage.admin_token`. `setToken` writes that key; `clearToken` removes it. The `Authorization: Bearer <token>` header is attached centrally.
- A 401 triggers one `POST /auth/refresh` attempt, using the HTTP-only `refreshToken` cookie, then retries the original request once. Failed refresh clears the admin token. Login and refresh are excluded from recursive refresh.
- Successful JSON is normalized as follows: `{ data: array, meta }` becomes `{ items: data, ...meta }`; `{ items: array, meta }` becomes `{ items, ...meta }`; `{ items, total }` remains unchanged; otherwise a `data` property is unwrapped, and then the whole JSON is returned. This hides backend envelope differences but makes exact route contracts important.
- Errors become `Error` objects with optional `code`, `status`, and `details`; pages normally render `error.message` inline. There is no shared toast/error boundary in the audited source.
- Current API interfaces are mostly declared in `apps/admin/src/api.ts`, not imported from `packages/shared-types`. Several are intentionally broad (`any`) or stale: reports use `any`, API key scope is `any`, and financial dates may be typed as `Date` although HTTP returns ISO strings. The letters client was corrected in this phase to use the controller's implemented routes (`confirm-receipt`, `record-non-receipt`, and `documents`). A desktop client should use shared backend schemas where available and contract-test every route.

## Data fetching and cache

- TanStack Query v5 is used for server state; local `useState`/`useEffect` owns forms, modal state, filters, language, and debounced search. No Redux, Zustand, Formik, or react-hook-form is established.
- `QueryClient` defaults are `retry: 1` and `staleTime: 30_000`.
- List query keys include the domain and every active filter, including branch ID. Typical examples are `['suppliers', debouncedSearch]` and longer financing/reservation keys containing status, dates, search, and branch.
- Mutations invalidate the relevant list key on success and usually close a modal or navigate. Detail pages should invalidate their detail key as well as the list after a mutation. There is no global cross-window cache or websocket cache reconciliation.
- Search inputs generally debounce for 300ms and only enable picker queries after at least two characters. `CustomerSearch` returns `{ id, name, phone }` through a controlled `onSelect` callback.

## Authentication and session behavior

- Admin login calls `POST /auth/admin-login` with `{ email, password }`. The response is unwrapped by `apiFetch`, so the page receives `{ accessToken, user }`; it stores the token with `setToken` and keeps user/login state in React state.
- The refresh token is not accessible to JavaScript. It is a cookie scoped to `/api/v1/auth`, and the client depends on `credentials: include`.
- The access token lasts 15 minutes; refresh lasts 7 days and rotates. Multiple refresh token IDs are supported server-side, so separate devices can coexist when they use separate cookies/storage.
- Admin logout calls `/auth/logout`, clears the local token, and returns to the login state. Expired/invalid access tokens are handled centrally by refresh; failed refresh clears only the browser's `admin_token`, while pages may retain stale in-memory user state until the app login effect reacts.
- A desktop app must not use `admin_token` or the same cookie jar if it can run on the same machine/profile. Use an OS-secure token store and a separate refresh-cookie jar or a dedicated desktop refresh mechanism. Use a dedicated staff account rather than sharing `admin@example.com` credentials.

## Routing and permission behavior

- Routes are declared directly in `App.tsx` with `BrowserRouter`, `Routes`, and `Route`. Unknown paths redirect to `/`. Sidebar navigation is a local array in `components/Sidebar.tsx`; dashboard quick links are a second local array in `App.tsx`.
- There is no frontend `RequirePermission` component, permission hook, route guard, or button-level `Resource`/`Action` checker in the audited admin app. The UI may hide navigation based on local app state, but backend `403` is the real authorization boundary.
- New desktop screens should still render a clear forbidden state and avoid showing actions that the signed-in role cannot use. Do not assume a role name alone implies a permission: the API checks the role's permission rows, except `super_admin`, which bypasses the permission guard.
- BranchContext stores the selected branch in `localStorage.admin_branch_id`, loads branches through `branches.list({ page: 1, limit: 100 })`, validates the selected ID against the response, and exposes `branchId`. `BranchGate` blocks the app while branches load and asks for a valid branch. The selected branch is a UI filter/default; server authorization still comes from JWT `branchId` and service checks.
- Pages such as Dashboard, Purchases, Invoices, Payments, FinancingContracts, Transfers, and Configuration pass the selected branch into API queries and include it in query keys. A desktop page should use the signed-in user's branch as the authoritative default and should not offer cross-branch selectors unless the role is explicitly permitted.

## Shared types and contract alignment

- The canonical shared package is `packages/shared-types/src`, exported from its index. It contains auth, motorcycle, reservation, financial, order, customer, and POS-related types/schemas. The API imports these types in many controllers/services.
- Admin duplicates many interfaces in `apps/admin/src/api.ts` (`Branch`, `Supplier`, motorcycle, payment, reservation, financing, letter, report, and configuration types). These can drift from Prisma/API behavior. Known examples: letters API method names do not match controllers; some financial dates may be typed as `Date` while HTTP JSON is ISO text; raw Prisma Decimal serialization is not uniform; and report/setting responses are broad or route-specific.
- Before implementing desktop, prefer importing/building from shared schemas and validate against actual controller/service output. The POS-specific shared type file is the most relevant contract and must be checked before transaction/offline work.

## Current consumers

- Admin calls nearly all protected management domains through `api.ts`, including branches, suppliers, purchases, motorcycles, customers, orders, reservations, invoices, payments, refunds, financing, installments, letters, reports, configuration, integrations, and API keys.
- Web uses the public catalog routes, customer login/register/profile/address routes, customer self-service financial routes, orders, reservations, and selected public/customer reads. It does not use the admin localStorage key.
- The API source explicitly describes three clients (Web, Admin, Desktop POS), but current authorization does not distinguish them with a client ID, audience, user-agent, or required header. `principal` is only `user` versus `customer`; role, permissions, and branch are the effective server-side distinctions.

## Concurrent-client and conflict audit

### Session and storage risks

- Two browser tabs using the same admin account share `localStorage.admin_token` and the refresh cookie. A desktop app using the same storage/cookie namespace could overwrite or clear the admin access token, or rotate a refresh cookie the admin tab then no longer has. Separate desktop storage and cookie jars avoid this.
- The backend stores refresh tokens per user and token ID rather than as one session, so separate tokens do not inherently log each other out. Logout invalidates only the presented token. Password reset/session invalidation behavior should still be verified before relying on coexistence.
- Admin's module-level token variable is not cross-tab synchronized. A token cleared in one tab can remain in another tab's memory until its next request; a desktop app should not copy this assumption.

### Authorization and UI-only assumptions

- Frontend permission gating is absent; hidden buttons are not a security boundary. The backend now gates `POST /reservations/expire` with `SCHEDULER:update`, notification create/bulk with `NOTIFICATION:create`, and the offline queue with `POS:create`. The first two remain outside POS role permissions.
- Some sensitive operations have additional service rules rather than controller-visible role requirements, such as user creation requiring `super_admin` and financing approval requiring `branch_admin` or `super_admin`. The desktop must handle `403` and should not infer capability from navigation.
- The `admin-login` endpoint's literal email restriction is not a desktop client distinction. A desktop account should use a deliberate staff login flow, not an admin credential workaround.

### Concurrency, retries, and rate limits

- Inventory reservation, POS conversion, purchase receiving, order/payment/invoice state transitions, and financial allocation are shared database operations. A desktop timeout followed by an unconditional retry can duplicate intent unless it uses the endpoint's idempotency key or a server-supported transaction identifier.
- Login and user creation are throttled. Login throttling uses Nest's default request tracker and is not per account, normally sharing a budget by remote IP. Admin and cashier users from one IP can affect one another. The distributed rate-limit helper uses Redis when available and an in-memory fallback otherwise; its counters are not client-specific either.
- There is no evidence of a per-client request budget or offline queue isolation. The POS offline queue is a shared API feature, and its generic queue body plus unusual `CUSTOMER:create` permission should be reviewed before production use.

### Realtime behavior

- Socket.IO authenticates user JWTs but the current middleware only resolves `User` principals, not customer principals. Motorcycle events are broadcast globally with `server.emit`; there are no branch rooms or client-type filters. A desktop connection therefore receives events from every branch and increases global event fan-out.
- The admin client does not appear to reconcile TanStack Query caches from socket events. A desktop mutation may leave admin data stale until refetch/invalidation; this is normal cache behavior, not data corruption, but operational screens should refetch after relevant writes.

## Desktop implementation boundary

Use the API's POS routes for the first desktop page, with the seeded `pos_cashier` or `pos_sales` role and least-privilege permissions. Reuse the request/response envelope rules and branch-derived context, but create a desktop API adapter with its own token/cookie storage rather than importing the admin singleton. The named authorization gaps are now closed; before production, confirm POS schemas and response shapes, add idempotency-aware retry behavior, and decide whether branch-scoped websocket rooms are required.
