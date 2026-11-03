# AIShop integration contracts

See [../LOCAL_SETUP.md](../LOCAL_SETUP.md) for the local Linux/IntelliJ runbook and live acceptance checklist. Java controllers/DTOs are authoritative. API mode is the checked-in default; mock mode remains independently selectable with `.env.local`. There is no API-to-mock fallback.

## Architecture and files

- `services/index.js`: selects the adapter once.
- `services/contracts.js`: Zod validation of requests/responses, including AI proposals and confirmation carts.
- `services/adapters/api.js`: Axios, memory tokens, single concurrent refresh operation, session-generation guards, localized errors and actual REST calls. `createApiService` allows contract tests with an injected transport.
- `app/Providers.jsx`: authenticated server cart query and serialized cart mutations, cancellation of stale reads, navbar count updates and auth reset.
- `features/auth.jsx` / `app/ResumeCartIntent.jsx`: role-based login destinations, preserved assistant request state and exactly-once resumed guest cart intent.
- `features/assistant.jsx`: existing chat UI, bounded history, actual backend reply and structured action proposals.
- `features/PendingCartAction.jsx`: explicit confirmation/cancellation, duplicate prevention and unknown-outcome handling.
- `features/CartActionComposer.jsx`: optional deterministic structured-action entry; natural-language chat still uses MCP tools.

## Endpoint map (all prefixed /api)

| Method | Path | Request | Response / authorization |
| --- | --- | --- | --- |
| GET | `/health` | none | `{status,message}`, public |
| POST | `/auth/register` | `{firstName,lastName,email,password}` | AuthResponse, public |
| POST | `/auth/login` | `{email,password}` | AuthResponse, public |
| POST | `/auth/refresh` | `{refreshToken}` | rotated AuthResponse, public |
| POST | `/auth/logout` | `{refreshToken}` | 204, public |
| GET | `/users/me` | bearer | UserResponse, authenticated |
| PUT | `/users/me` | `{firstName,lastName}` | UserResponse, authenticated ownership from JWT subject; added for this integration |
| GET | `/users` | bearer | UserResponse[], ADMIN only; added for this integration |
| GET | `/products`, `/products/{id}` | none | ProductResponse[] / ProductResponse, public |
| POST | `/products` | ProductRequest | ProductResponse, ADMIN |
| PUT | `/products/{id}` | ProductRequest | ProductResponse, ADMIN |
| DELETE | `/products/{id}` | none | 204, ADMIN; SQL relationships may prevent deletion |
| GET | `/categories`, `/categories/{id}` | none | Category[] / Category, public |
| POST, PUT, DELETE | `/categories`, `/categories/{id}` | CategoryRequest for writes | Existing ADMIN endpoints; UI taxonomy remains read-only |
| GET | `/cart` | none | ShoppingCartResponse, authenticated |
| POST | `/cart/items` | `{productId,quantity}` | ShoppingCartResponse, authenticated |
| PUT | `/cart/items/{itemId}` | `{quantity}` | ShoppingCartResponse, authenticated |
| DELETE | `/cart/items/{itemId}` | none | ShoppingCartResponse, authenticated |
| DELETE | `/cart` | none | ShoppingCartResponse, authenticated; endpoint available, no separate clear-all UI |
| POST | `/orders` | **no body** | OrderResponse, authenticated; actual SQL order from cart |
| GET | `/orders/my`, `/orders/my/{orderId}` | none | Own OrderResponse[] / OrderResponse |
| GET | `/orders` | none | OrderResponse[], ADMIN |
| PUT | `/orders/{orderId}/status` | `{status}` | OrderResponse, ADMIN |
| POST | `/ai/chat` | AiChatRequest below | AiChatResponse, authenticated |
| POST | `/ai/cart-actions/{actionId}/confirm` | no body | `{message,cart}`, authenticated owner |

Products and own-order details currently use their list results in the UI. No server REST pagination/search contract is assumed; catalog filters/sort apply to actual loaded products. Statistics derive from products/orders/users; unavailable values are not fabricated as revenue.

## Data shapes

- AuthResponse: `{accessToken,refreshToken,tokenType:"Bearer",expiresIn,userId,email,role}`; use the returned expiry, not a fixed frontend lifetime.
- UserResponse: `{id,firstName,lastName,email,role}`. No password hashes or refresh tokens in user endpoints.
- ProductRequest: `{categoryId,name,description,price,stock,imageUrl}`.
- ProductResponse: ProductRequest fields plus `{id,categoryName}`.
- Category: `{id,name,description}`. The frontend mapper adds a slug; no slug field is sent to Java.
- ShoppingCartResponse: `{cartId,items,totalPrice,totalItems}`.
- CartItemResponse: `{id,productId,productName,unitPrice,quantity,subtotal}`; updates/deletion use **id**, never productId.
- OrderResponse: `{id,userId,status,totalAmount,createdAt,items}`; order items carry the same item field shape. Shipping is absent in API mode.

Prices are JSON numbers representing Java BigDecimal. UI formatting uses bs-BA and KM. Order transitions remain PENDING → CONFIRMED/CANCELLED; CONFIRMED → SHIPPED/CANCELLED; SHIPPED → DELIVERED; terminal statuses cannot change. Cancellation restores stock.

## Categories and SQL setup

Exactly Laptopi, Telefoni, Slušalice, Tastature and Miševi are required. `services/categories.js` defines mock seed records and maps known names to stable navigation slugs. Actual API IDs always come from the database and are used for filtering, highlighting, product forms and relationships. Mock IDs 1–5 are not database assumptions.

New Flyway V7 inserts missing names without changing existing IDs/descriptions and stops on conflicting taxonomy without deleting data. See the runbook's conflict plan. Optional `bekend/dev/seed-products.sql` populates only a completely empty products table, joining actual category IDs. Existing backend ADMIN category mutation endpoints remain available but the UI offers no arbitrary taxonomy changes. Any intentional future taxonomy change requires coordination, not a frontend hardcoded ID update.

## AI / MCP contract

Ordinary request:

```json
{"message":"Koje laptope imate na stanju?","cartAction":null,"history":[]}
```

`message` max 2000 characters. Optional history has at most 12 `{role:"user"|"assistant",content}` turns, each max 6000 characters. These are conversation data; server system instructions remain authoritative. Omitting history still works.

Structured request:

```json
{"message":"Pripremi promjenu korpe","cartAction":{"type":"ADD","productId":41,"itemId":null,"quantity":1}}
```

REMOVE needs itemId; UPDATE needs itemId and the new total quantity. These are the pre-existing backend action types.

Response:

```json
{
  "reply":"Korpa još nije promijenjena. Potrebna je potvrda.",
  "pendingAction":{"actionId":"uuid","type":"ADD","productId":41,"itemId":null,"quantity":1,"expiresAt":"2026-11-03T12:10:00Z","status":"PENDING_CONFIRMATION"},
  "pendingActions":[]
}
```

`pendingAction` is nullable; `pendingActions` now exposes all proposals from that chat. For a real proposal list it contains the same first proposal plus any others. The adapter deduplicates by actionId and supports the singular field. It maps reply → UI content without inventing product recommendations.

The existing ChatClient → SyncMcpToolCallbackProvider → McpClientService → authenticated Streamable HTTP `/mcp` pipeline remains. Tools: searchProducts, getProductDetails, getCategories, getMyCart, getMyOrders, addToCart, removeFromCart, updateCartQuantity. Mutation tools prepare proposals only. A per-chat UUID is forwarded on the internal MCP connection and stored with prepared actions; the response selects actions by both user and request ID. No action IDs are extracted from model prose and no browser call reaches Ollama.

**Potvrdi** POSTs the actual actionId. The returned cart updates context/query/navbar. Confirmation atomically consumes an owner-bound, unexpired proposal before the transactional cart mutation; repeated calls cannot replay it. A stock failure also consumes the proposal, requiring a new proposal. UI prevents repeated confirmation and treats network ambiguity conservatively. **Odustani** is local dismissal, not a server-side revoke. Proposals expire after ten minutes and are not durable across restarts.

## Auth, transport and synchronization

Bearer JWT and rotating refresh tokens stay in memory. Page reload requires login. Refresh is shared across concurrent requests and cannot restore tokens after logout or a newer login. Unauthorized requests expire the current session; writes are never automatically replayed. No passwords/tokens are persisted in localStorage. Chat history is namespaced by data source and user ID, keeping mock/API identities separate.

API guests must sign in for cart/AI. Router state preserves assistant questions and intended product additions through login/register. Ref guards prevent StrictMode duplicate submissions. AI timeout is 180 seconds per chat request; ordinary requests retain 15 seconds. Query retries apply only to reads; mutations have no automatic retry. Cart mutations cancel stale cart reads, serialize writes, and update actual returned totals.

Vite `/api` proxy targets localhost:8081; MCP_BASE_URL defaults to http://localhost:8081 for backend self-calls. Existing stateless Spring Security and disabled CSRF remain. Same-origin local proxy avoids CORS; a future cross-origin deployment needs explicit backend CORS. No production session redesign is included.

## Checkout decision and genuine limits

API checkout uses POST /orders with no shipping body. The page explicitly omits address fields, shows the authenticated customer, and explains that it creates a real database order without delivery or payment handling. Mock mode retains shipping simulation. No schema change for shipping is needed. The real ID/total/status are shown, queries refresh, and uncertain submission results direct the user to history instead of encouraging duplicate submits. Backend checkout locks the cart when consuming it.

Remaining genuine gaps: password-reset email, shipping/payment persistence, role editing, durable pending-action storage, multiple product-image storage. No unsupported feature silently returns mock success.

## Validation

Frontend lint, contract/business-logic tests and API-mode build pass. Backend Java 25 compilation/package and six focused security/pending-action tests pass. Full context tests were attempted and fail because SQL Server is unavailable locally. Real DB migrations, seed, Ollama/MCP HTTP round trips, SQL locking and visual browser checks await the teammate's environment. See LOCAL_SETUP.md for the unchecked live acceptance list.
