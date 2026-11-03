# AIShop backend integration

Inspected the Java controllers, records, entities, services, JWT configuration and SecurityConfig in `bekend/src/main/java/com/aishop/backend`. The backend was neither started nor modified. API adapters are implemented from source contracts; live connectivity is unverified because SQL Server is unavailable.

## Modes and architecture

React + JavaScript ES modules and JSX, Vite and Tailwind CSS. Zod schemas in `src/services/contracts.js` validate mutation inputs and real API response shapes. `src/services/index.js` selects the adapter once. Pages use that service and TanStack Query, with auth/cart exposed through React Context. API mode never substitutes mock data.

Copy `.env.example` to `.env.local`. Set `VITE_DATA_SOURCE=mock` for the standalone demo or `VITE_DATA_SOURCE=api` for Spring Boot, and restart Vite. `VITE_API_BASE_URL=/api` is the default. The existing Vite proxy preserves `/api` and forwards requests to `http://localhost:8081`. Production hosting must provide an equivalent reverse proxy and an SPA fallback to index.html. Vite’s proxy is development-only. Invalid data-source values fail explicitly.

## Existing endpoint map

All paths below include `/api`. IDs are numeric. JSON prices are numbers (Java BigDecimal), not formatted currency strings. No server-side search, filters, sorting or pagination parameters exist; the current UI applies them to the complete product list.

| Method | Endpoint | Request | Response / access |
| --- | --- | --- | --- |
| GET | `/health` | none | `{status,message}`, public |
| POST | `/auth/register` | `{firstName,lastName,email,password}` | AuthResponse, 201, public |
| POST | `/auth/login` | `{email,password}` | AuthResponse, public |
| POST | `/auth/refresh` | `{refreshToken}` | AuthResponse with rotated refresh token, public |
| POST | `/auth/logout` | `{refreshToken}` | 204; revokes refresh token, public |
| GET | `/users/me` | bearer token | UserResponse, authenticated |
| GET | `/products` | none | ProductResponse[], public |
| GET | `/products/{id}` | none | ProductResponse, public |
| POST | `/products` | ProductRequest | ProductResponse, 201, ADMIN |
| PUT | `/products/{id}` | ProductRequest | ProductResponse, ADMIN |
| DELETE | `/products/{id}` | none | 204, ADMIN |
| GET | `/categories` | none | Category[], public |
| GET | `/categories/{id}` | none | Category, public |
| POST | `/categories` | `{name,description}` | Category, 201, ADMIN |
| PUT | `/categories/{id}` | `{name,description}` | Category, ADMIN |
| DELETE | `/categories/{id}` | none | 204, ADMIN |
| GET | `/cart` | bearer token | ShoppingCartResponse, authenticated |
| POST | `/cart/items` | `{productId,quantity}` | ShoppingCartResponse, authenticated |
| PUT | `/cart/items/{itemId}` | `{quantity}` | ShoppingCartResponse, authenticated |
| DELETE | `/cart/items/{itemId}` | none | ShoppingCartResponse, authenticated |
| DELETE | `/cart` | none | ShoppingCartResponse, authenticated |
| POST | `/orders` | no request body; consumes authenticated cart | OrderResponse, 201, authenticated |
| GET | `/orders/my` | none | OrderResponse[], authenticated |
| GET | `/orders/my/{orderId}` | none | Own OrderResponse, authenticated |
| GET | `/orders` | none | OrderResponse[], ADMIN |
| PUT | `/orders/{orderId}/status` | `{status}` | OrderResponse, ADMIN |

Product details and own-order details currently derive from their corresponding list endpoints. The backend also has dedicated detail endpoints as listed. Dashboard statistics derive from loaded products and orders; no analytics endpoint exists.

## Exact DTO fields

```json
{
  "AuthResponse": {"accessToken":"string","refreshToken":"string","tokenType":"Bearer","expiresIn":3600,"userId":1,"email":"email","role":"USER"},
  "UserResponse": {"id":1,"firstName":"Alex","lastName":"Morgan","email":"email","role":"USER"},
  "ProductRequest": {"categoryId":1,"name":"Name","description":"Description","price":199.99,"stock":10,"imageUrl":"https://example.com/image.jpg"},
  "ProductResponse": {"id":1,"categoryId":1,"categoryName":"Audio","name":"Name","description":"Description","price":199.99,"stock":10,"imageUrl":"https://example.com/image.jpg"},
  "Category": {"id":1,"name":"Audio","description":"Description"},
  "CartItemResponse": {"id":1,"productId":1,"productName":"Name","unitPrice":199.99,"quantity":2,"subtotal":399.98},
  "ShoppingCartResponse": {"cartId":1,"items":[],"totalPrice":0,"totalItems":0},
  "OrderResponse": {"id":1,"userId":1,"status":"PENDING","totalAmount":399.98,"createdAt":"2026-11-03T12:00:00","items":[]},
  "OrderItemResponse": {"id":1,"productId":1,"productName":"Name","quantity":2,"unitPrice":199.99,"subtotal":399.98}
}
```

`expiresIn` above is illustrative; the backend supplies the configured lifetime. Backend roles are exactly `USER` and `ADMIN`. Order statuses are `PENDING`, `CONFIRMED`, `SHIPPED`, `DELIVERED`, `CANCELLED`. Allowed transitions: PENDING → CONFIRMED/CANCELLED, CONFIRMED → SHIPPED/CANCELLED, SHIPPED → DELIVERED; terminal statuses cannot change. Cancellation restores stock. Mock services implement these same rules.

Product names max 150, descriptions max 1000, image URLs max 500. Prices > 0, at most 10 integer digits and 2 fractional digits. Stock nonnegative integer. Category names max 100 and descriptions max 500. Registration names max 100, email max 255, password 8–72 characters and at most 72 UTF-8 bytes. The mock checkout decrements stock, snapshots current prices and empties the cart. No real payment integration exists.

## Authentication and security

The backend is stateless, using HS256 JWT bearer access tokens. JWT subject is the numeric user ID; `role` supplies USER/ADMIN authorities. Include `Authorization: Bearer <accessToken>` on authenticated requests. These are not cookie sessions. Registration always creates USER accounts. Refresh tokens rotate and reuse revokes their family; never retry a refresh blindly.

Axios keeps both tokens in memory and refreshes once per concurrent group before access-token expiration. Login/register then fetch `/users/me`. Reloading API mode requires signing in again; no real tokens or passwords are stored in localStorage. A 401 clears frontend auth; logout clears local tokens even when revocation fails. A backend-side logout revokes refresh tokens but an already issued access token remains valid until expiration. Coordinate persistent sessions with the backend (prefer an agreed HttpOnly cookie design rather than putting tokens in browser storage). No real demo accounts are assumed to exist in the database.

Spring Security disables CSRF and has no explicit CORS configuration. The development same-origin proxy avoids browser CORS. For separate production origins, the backend developer must explicitly configure approved origins, methods, Authorization/Content-Type headers and OPTIONS preflight. If auth changes to cookies, revisit credentials, SameSite/Secure attributes, CORS and CSRF protection together. Frontend route checks are only UX; backend authorization remains essential.

## Missing contracts and blockers

- **AI:** no controller, service or AI DTO is present in this checkout. Ollama may be part of the planned backend, but there is no callable AI endpoint here. Agree on a Spring Boot chat request/response, history/session limits, product recommendation IDs, timeouts and error/streaming format. The browser never calls Ollama and does not specify a model.
- **Shipping:** existing POST `/orders` accepts no shipping or customer-information body. The API adapter exposes `createOrderFromCart()` for that exact contract, but full checkout is blocked in API mode to avoid silently discarding the entered address. Agree on shipping fields and persistence, then implement `checkout(shipping)` using the agreed endpoint. No endpoint has been invented.
- **Profile editing:** only GET `/users/me` exists. Agree on an update endpoint, mutable fields and validation. Mock profile editing persists locally.
- **Admin users and counts:** there is no list/detail/update endpoint. The directory and customer metric work in mock mode; API directory reports unsupported and dashboard displays unavailable. Roles are read-only in both modes.
- **Password recovery:** no forgot/reset endpoint exists. The UI explains that recovery is unavailable; it never claims to send email.
- **Images:** backend stores one image URL. Gallery uses crops of that image; multiple-image storage needs an agreed extension. Demo photos are illustrative Unsplash photos, not guaranteed exact SKU photographs. Local SVG fallbacks work if remote images fail.
- **Deletion and errors:** foreign-key-backed products/categories may reject deletion. Agree on a structured error response and any archive workflow; current Axios handles messages/status/network errors without fake success. Mock guards products linked to orders and nonempty categories.
- **Guest cart:** mock supports a guest bag and merges it on sign-in; the existing API cart requires authentication. No guest-to-server cart transfer is implemented in API mode.
- **Production quality gates:** live API integration, backend auth tests, persistent-session design, order ownership checks, deployment routing and browser/accessibility regression checks remain coordination tasks.

## Verification and development storage

Run `npm install`, `npm run lint`, `npm test`, `npm run build`, and `npm run dev` from `frontend/`. Mock data lives at `aishop.mock.v1`, session user ID at `aishop.session`, and assistant messages at `aishop.chat.<userId>` in localStorage. These are development simulations, not a security boundary. New mock user passwords live only in memory; after reload, the safe ID-only session remains until logout, but logging back into a newly registered account requires a new development session. Demo credentials remain usable. To reset the demo, clear only the `aishop.*` localStorage keys. Never enter real customer data into this local demo.
