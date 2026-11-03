# AIShop frontend

A responsive React + Vite + JavaScript (JSX) storefront and admin workspace with Tailwind CSS, React Router, Axios, TanStack Query, Lucide icons and Zod runtime validation. Runs independently of Spring Boot and SQL Server.

```sh
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Open the URL printed by Vite (normally http://localhost:5173). For standalone development, select mock mode in `.env.local`. The checked-in default is API mode.

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

## Local integration

API mode is the checked-in default (`.env`): React calls the Spring Boot backend on port 8081 through the Vite proxy. Follow [../LOCAL_SETUP.md](../LOCAL_SETUP.md) for Java 25, SQL Server, Flyway categories/optional products, Ollama and MCP setup. Register real accounts in API mode; the mock credentials above do not exist in SQL Server.

To develop independently, put `VITE_DATA_SOURCE=mock` in `.env.local` and restart Vite. Mock mode needs no backend. API mode never falls back to mock data. API tokens are memory-only, so reload requires login. Chat history is separated by source/user.

See [BACKEND_INTEGRATION.md](BACKEND_INTEGRATION.md) for actual endpoint contracts, AI proposals and confirmation semantics. API checkout creates a real SQL order with POST /orders and explicitly omits shipping/payment. The AI assistant calls Spring Boot, which owns Ollama and MCP communication; the browser never calls them directly.

Frontend lint, tests and builds pass locally. Full live SQL Server/Ollama acceptance remains to be run on the teammate's laptop. Existing design, URL category IDs, animations and reduced-motion behavior remain in place.
