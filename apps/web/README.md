# E-commerce Web Application

Customer-facing e-commerce website for motorcycle sales.

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (Strict)
- **Styling**: Tailwind CSS
- **Internationalization**: next-intl (Arabic/English with RTL support)
- **Forms**: React Hook Form + Zod
- **API**: REST API client connecting to apps/api

## Development

```bash
# Install dependencies (from monorepo root)
pnpm install

# Run development server
pnpm --filter web dev

# Build for production
pnpm --filter web build

# Type check
pnpm --filter web typecheck

# Lint
pnpm --filter web lint
```

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

- `NEXT_PUBLIC_API_URL`: Versioned backend API URL (default: http://localhost:3000/api/v1)
- `NEXT_PUBLIC_WS_URL`: Backend realtime URL (default: http://localhost:3000)
- `NEXT_PUBLIC_APP_URL`: Web app URL (default: http://localhost:3001)

## Project Structure

```
apps/web/
├── app/
│   └── [locale]/          # Locale-based routing
│       ├── layout.tsx     # Root layout with i18n
│       ├── page.tsx       # Home page
│       ├── login/         # Login page (to be implemented)
│       ├── register/      # Registration (to be implemented)
│       ├── account/       # Customer account (to be implemented)
│       └── motorcycles/   # Catalog (to be implemented)
├── components/            # Reusable UI components
├── contexts/              # React contexts (Auth, etc.)
├── lib/                   # Utilities and API client
├── i18n/                  # Internationalization config
│   ├── messages/          # Translation files (ar.json, en.json)
│   ├── routing.ts         # Routing configuration
│   └── request.ts         # i18n request config
└── public/                # Static assets
```

## Features

### Implemented (Foundation)
- ✅ Next.js App Router setup
- ✅ Arabic/English internationalization with RTL/LTR support
- ✅ API client with authentication
- ✅ Customer authentication context
- ✅ Basic UI components (Button, Input, Card)
- ✅ Layout with Header/Footer
- ✅ Responsive design foundation

### To Be Implemented (SPEC-004 TASK-008-WEB)
- Customer registration
- Customer login
- Customer profile management
- Customer address management
- Change password

### Future Features
- Motorcycle catalog
- Motorcycle details
- Reservations
- Orders
- Installment plans
- Customer financial information

## Authentication

Customer authentication is handled through:
- JWT tokens stored in localStorage
- Auth context provider (`contexts/AuthContext.tsx`)
- API client with automatic token injection
- Customer-only access (role validation)

## API Integration

The API client (`lib/api-client.ts`) connects to the backend at `apps/api`:
- Automatic JWT token handling
- Error handling with ApiError class
- Type-safe requests using shared-types package

## Internationalization

Supported locales:
- Arabic (ar) - RTL, default
- English (en) - LTR

Locale is part of the URL: `/ar/...` or `/en/...`

Add translations in `i18n/messages/[locale].json`
