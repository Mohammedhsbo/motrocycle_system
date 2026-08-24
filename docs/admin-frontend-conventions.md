# Admin Frontend Conventions

Read-only map of `apps/admin/src`, intended as the implementation reference for Brands, Categories, Motorcycles, Reservations, and Installments/Financing screens.

## 1. Project structure

The app is primarily type-based at the top level, with a page/component split rather than a strict feature-folder architecture:

```text
apps/admin/src/
  api.ts                 # HTTP client plus per-domain API objects and types
  App.tsx                # providers, router, route registration, dashboard
  main.tsx               # React/Vite entry point
  contexts/              # BranchContext
  components/            # reusable UI and workflow pieces
  pages/                 # route-level screens
  assets/
  index.css, App.css     # global styles
```

Existing domains are usually represented by pages in `pages/` and API objects in the single `api.ts`: `Suppliers.tsx`, `Purchases.tsx`, `Invoices.tsx`, `Letters.tsx`, `FinancingContracts.tsx`, etc. Detail/create screens are separate page files, for example `PurchaseForm.tsx`, `PurchaseDetail.tsx`, `LetterCreate.tsx`, and `FinancingContractDetail.tsx`. Reusable workflow elements live in `components/`, such as `CustomerSearch`, `ReceiveItems`, `ReservationActions`, `Sidebar`, `Badge`, and `Modal`-style markup.

New screens should follow this existing shape: add a page under `pages/`, add the domain API methods/types to `api.ts`, register routes in `App.tsx`, and add navigation in `components/Sidebar.tsx`.

## 2. API layer

The API layer is centralized in [api.ts](../apps/admin/src/api.ts). It uses native `fetch`, not Axios. The base URL is normalized from `VITE_API_URL`; the default is `http://localhost:3000/api/v1`. A value already ending in `/api/v1` is preserved, otherwise `/api/v1` is appended.

```ts
let authToken: string | null = localStorage.getItem('admin_token');

export function setToken(token: string) {
  authToken = token;
  localStorage.setItem('admin_token', token);
}

export function clearToken() {
  authToken = null;
  localStorage.removeItem('admin_token');
}
```

`admin_token` is the current single source of truth. The client does not read `accessToken`, `token`, or `userToken` in the current implementation.

`apiFetch()` sends `Content-Type: application/json`, includes `Authorization: Bearer <admin_token>` when present, and always sends `credentials: 'include'` for the refresh cookie. On a `401`, it calls `POST /auth/refresh` once, stores the returned `data.accessToken`, and retries. Failed refresh clears `admin_token`.

Response handling is centralized but supports several backend shapes:

```ts
if (Array.isArray(json.data) && json.meta) return { items: json.data, ...json.meta };
if (Array.isArray(json.items) && json.meta) return { items: json.items, ...json.meta };
return Object.prototype.hasOwnProperty.call(json, 'data') ? json.data : json;
```

Thus list methods normally receive `{ items, total, page, limit, totalPages }`, while ordinary `{ success, data }` responses are unwrapped to `data`. Errors become an `Error` with `message`, plus optional `code`, `status`, and `details`; screens usually put `error.message` into local inline error state. There is no shared toast system found in `src`; error UI is generally inline or an error/empty state with a retry button.

## 3. Existing CRUD pattern: Suppliers

The closest complete CRUD screen is [Suppliers.tsx](../apps/admin/src/pages/Suppliers.tsx). It uses TanStack Query v5 and local React state. Search is debounced for 300ms, and the query key includes the debounced value. Create, update, and delete are separate mutations; successful mutations invalidate `['suppliers']` and close the modal.

```ts
const { data, isLoading, isError, refetch } = useQuery({
  queryKey: ['suppliers', debouncedSearch],
  queryFn: () => suppliers.list({ search: debouncedSearch || undefined, limit: 50 }),
});

const createMut = useMutation({
  mutationFn: (d: SupplierInput) => suppliers.create(d),
  onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); closeModal(); },
  onError: (e: Error) => setFormError(e.message),
});
```

- List: local `search`, `debouncedSearch`, and query state; page screens that need pagination keep a local `page` and calculate total pages from the normalized response.
- Filters: local `useState`; include every filter in both the query key and API arguments. `Invoices`, `Payments`, `FinancingContracts`, and `Reservations` show the fuller filter pattern.
- Form: no `react-hook-form` or Formik is installed. Forms use controlled inputs with `useState`, `FormEvent`, and manual required-field checks. Shared Zod validation exists in the backend/shared-types, not as a frontend form resolver.
- Table: custom semantic markup (`table`, rows, buttons) styled with global CSS classes. No MUI, Ant, shadcn, or table library is used.
- Create/edit: Suppliers uses a modal on the list page, controlled by `modalMode: 'create' | 'edit' | 'delete' | null`; dedicated routes are used for more complex forms such as purchases, financing, letters, and customer editing.
- Delete: opening delete sets `selected`, switches `modalMode` to `delete`, and the modal asks for confirmation; the delete mutation reports errors in the same local form error area.

## 4. Search/select picker pattern

There is an important current distinction: [LetterCreate.tsx](../apps/admin/src/pages/LetterCreate.tsx) does **not** use a customer search picker. It currently renders plain required text inputs for `customerId` and `motorcycleId`.

The reusable customer picker is [CustomerSearch.tsx](../apps/admin/src/components/CustomerSearch.tsx), and it is used by other screens. Its pattern is:

```ts
const [isOpen, setIsOpen] = useState(false);
const [query, setQuery] = useState('');
const [debouncedQuery, setDebouncedQuery] = useState('');

useEffect(() => {
  const timeout = setTimeout(() => setDebouncedQuery(query), 300);
  return () => clearTimeout(timeout);
}, [query]);

const { data, isLoading } = useQuery({
  queryKey: ['customerSearch', debouncedQuery],
  queryFn: () => customers.search({ q: debouncedQuery, limit: 10 }),
  enabled: debouncedQuery.length >= 2,
});
```

The picker opens a modal, searches only after two characters, displays loading/no-result states, and calls `onSelect({ id, name, phone })`. On selection it closes and clears the query. The selected value is owned and displayed by the parent screen. Brand/category/motorcycle pickers should copy this controlled callback pattern and use stable query keys.

## 5. Image upload

There is no existing admin image/file upload UI in `apps/admin/src` to reuse. The current admin forms use URL/text fields where applicable. The backend has `POST /api/v1/upload`, but no frontend wrapper or file picker was found in the admin source. A future brand-logo or motorcycle-image UI will need a new small upload component plus an `api.ts` multipart method; it should not pass JSON `Content-Type` for `FormData`.

## 6. Routing and navigation

Routing uses `react-router-dom` `7.18.2`, with `BrowserRouter`, `Routes`, and `Route` declared directly in [App.tsx](../apps/admin/src/App.tsx). There is no separate router configuration file.

```tsx
<Route path="/suppliers" element={<Suppliers lang={lang} />} />
<Route path="/purchases/new" element={<PurchaseForm lang={lang} />} />
<Route path="/purchases/:id" element={<PurchaseDetail lang={lang} />} />
```

To add a screen, import it in `App.tsx` and add its list/create/detail routes there. Unknown routes redirect to `/`. The sidebar navigation is a local `nav` array in [Sidebar.tsx](../apps/admin/src/components/Sidebar.tsx), rendered with `NavLink`; add new menu entries to that array. Dashboard quick links are a separate local array in `App.tsx`, so add entries there if the new screen should appear on the dashboard as well.

## 7. Frontend permissions

No frontend permission hook, permission map, route guard, or button-level `Resource/Action` checker was found. Authentication is handled by the login state and `admin_token`; authorization is primarily delegated to the backend, which returns `403`. New screens should still surface API errors clearly, but should not invent a parallel permission system unless that becomes an explicit product requirement.

## 8. State management

The app uses TanStack Query (`@tanstack/react-query` `^5.101.4`) for server state and React `useState`/`useEffect` for local UI/form/filter state. There is no Zustand, Redux, or Formik/react-hook-form dependency. `App.tsx` creates one `QueryClient` with `retry: 1` and `staleTime: 30_000`.

```tsx
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});
```

Use `useQuery` for lists/details, `useMutation` for writes, and invalidate the relevant list/detail keys on success. Include branch and every filter in query keys; existing examples use keys such as `['financing-contracts', statusFilter, ..., branchId]`.

## 9. BranchContext

[BranchContext.tsx](../apps/admin/src/contexts/BranchContext.tsx) stores the selected branch in `localStorage` under `admin_branch_id`. It loads branches through the `branches.list({ page: 1, limit: 100 })` API method and exposes:

```ts
{
  branches: Branch[];
  branchId: string | null;
  setBranchId: (branchId: string) => void;
  isLoading: boolean;
  error: Error | null;
}
```

The selected ID is accepted only if it exists in the loaded branch list; otherwise it becomes `null`. `BranchGate` blocks the application until branches load and shows a branch selector when no valid branch is selected. `Sidebar` also provides branch switching.

The current branch is consumed by branch-scoped pages such as `Dashboard`, `Purchases`, `Invoices`, `Payments`, `FinancingContracts`, `Transfers`, `Configuration`, and `APIKeys`. New motorcycle, reservation, purchase-receive, installment, and financing list/detail screens should call `useBranch()`, pass `branchId ?? undefined` to APIs that accept a branch filter, and include `branchId` in query keys. Create/receive forms should use `branchId` as the default branch input where the backend permits it. Do not call `/branches` directly for this selector; use the centralized `branches.list` method, which is wired to the admin configuration endpoint in the current API layer.

## 10. Naming, style, and i18n

- Route/page components use PascalCase filenames: `Suppliers.tsx`, `PurchaseDetail.tsx`, `LetterCreate.tsx`.
- Shared components also use PascalCase: `CustomerSearch.tsx`, `Sidebar.tsx`, `ReceiveItems.tsx`.
- There are no feature directories for the existing domains; pages and components are grouped by type.
- Styling is custom CSS with global classes in `index.css` and `App.css`, plus occasional inline styles. Tailwind, MUI, Ant, and shadcn are not dependencies.
- `lucide-react` is the icon library. Existing buttons commonly use an icon plus text; icon-only buttons have a `title`.
- Layout uses classes such as `page-container`, `card`, `input`, `input-group`, `btn`, `btn-primary`, `btn-outline`, `modal-overlay`, and `modal-content`.
- Language is a local `lang: 'en' | 'ar'` state in `App.tsx`, passed as a prop to pages. Most pages define a local `t` object or inline English/Arabic labels and set `direction: 'rtl'` for Arabic. There is no `next-intl` dependency or shared i18n provider.
- Preserve the existing bilingual prop pattern and use `isRtl = lang === 'ar'`; avoid introducing a new translation framework for one screen.

## Copy-ready implementation checklist

1. Add API types and a domain object to `apps/admin/src/api.ts`.
2. Build the list with `useQuery`, a stable query key, local filters, and 300-500ms debounce where search exists.
3. Use controlled inputs and manual validation; no form library is established.
4. Use existing global CSS classes and lucide icons.
5. Use a modal for compact CRUD forms, or dedicated `/new` and `/:id` routes for complex workflows.
6. Invalidate list/detail query keys after mutations.
7. Consume `useBranch()` for all branch-scoped screens.
8. Add routes in `App.tsx`, sidebar navigation in `Sidebar.tsx`, and optional dashboard quick links in `App.tsx`.
9. Show `Error.message` inline and preserve English/Arabic labels through the existing `lang` prop.
