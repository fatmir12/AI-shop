# AIShop frontend

A responsive React + Vite + JavaScript (JSX) storefront and admin workspace with Tailwind CSS, React Router, Axios, TanStack Query, Lucide icons and Zod runtime validation. Runs independently of Spring Boot and SQL Server.

```sh
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Open the URL printed by Vite (normally http://localhost:5173). No backend is needed in the default mock mode.

| Development-only account | Email | Password |
| --- | --- | --- |
| Customer | user@aishop.test | User123! |
| Administrator | admin@aishop.test | Admin123! |

Mock credentials are confined to the mock adapter. New registration creates a simulated USER and signs in; its password lasts only in memory, while non-sensitive mock account data and session ID persist. No real payments are taken.

## Features

- Storefront with hero, categories, featured products, search, category/price filters, sorting and load more.
- Product details with image crops, stock, quantity controls, related products and image fallbacks.
- Persistent cart, guest-cart merge, delivery form validation, simulated checkout with stock changes, and order confirmation.
- Protected USER account, editable mock profile, order history and details.
- Deterministic catalog-based shopping assistant, budgets, suggested prompts, recommendations and per-user local conversation history.
- Protected ADMIN workspace with metrics, recent orders, stock alerts, order pipeline, product/category CRUD with confirmation dialogs, order details and permitted status transitions, and a read-only mock user directory.
- Responsive desktop/mobile layouts, native modal focus management, keyboard focus indicators, loading skeletons, empty/error states and toasts.

## Structure

- `src/App.jsx`: application routing.
- `src/app/`: auth/cart providers and context.
- `src/components/`: shared controls, storefront and admin layouts.
- `src/features/`: storefront, cart, account, checkout, auth, assistant and administration.
- `src/services/`: data-source selection, runtime contracts and Axios API adapter.
- `src/mocks/`: realistic catalog and persistent development service.
- `src/utils/`: currency, integer-minor-unit totals, order transitions and storage.
- `tests/`: Node test-runner coverage for business logic and mock workflows.

```sh
npm run lint
npm test
npm run build
npm run preview
```

There are no application TypeScript files or TypeScript build/lint dependencies. Input and API response contracts use Zod. Build output is in `dist/`.

## Backend mode

Set `VITE_DATA_SOURCE=api` in `.env.local` and restart Vite. The existing `/api` proxy forwards to http://localhost:8081. Product/category CRUD, bearer authentication, server carts and order history/status adapters follow the actual Spring Boot contracts. Missing endpoints throw explicit errors; API mode never falls back to mocks.

See [BACKEND_INTEGRATION.md](BACKEND_INTEGRATION.md) for exact endpoints, schemas, security details and missing AI, shipping, profile, recovery and user-management contracts. API authentication is memory-only, so a page reload requires signing in again. API checkout is blocked until shipping persistence is agreed with the backend team.

For production hosting, configure an SPA index fallback and `/api` reverse proxy. External image URLs have a local fallback. Mock storage can be reset by removing only localStorage keys beginning with `aishop.`.

## Bosnian catalog redesign

The storefront and admin interface use centralized Bosnian translations in `src/i18n/bs.js`. The taxonomy is exactly Laptopi, Telefoni, Slušalice, Tastature and Miševi; mock category management is read-only. See `src/services/categories.js` for stable mock IDs and the database DTO mapping. The compact blue assistant bar forwards UUID-tagged requests to the existing chat through router state. No backend is needed for guest mock conversations.
