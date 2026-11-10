# AIShop local demonstration (Linux / IntelliJ IDEA)

## What is implemented and what needs the teammate's environment

The checked-in frontend `.env` selects real API mode. React → Vite `/api` proxy → Spring Boot port 8081 → SQL Server AIShop and Ollama → authenticated MCP `/mcp` is implemented. No API request falls back to mock data. The backend compiles and packages on Java 25. Contract tests use transport/repository doubles; they do not prove a live SQL Server/Ollama demonstration. The existing full application context test requires SQL Server and currently fails on this machine because port 1433 is unavailable. The live acceptance checklist below must be completed on the teammate's laptop.

## 1. Prerequisites

- JDK **25**, matching `bekend/pom.xml` (not the shell's default Java 21).
- Node.js **24 LTS** and npm. Vite 8 requires a supported modern Node version; Node 24.19 was used for validation.
- IntelliJ IDEA with the project SDK and Maven runner JRE set to JDK 25.
- Existing Microsoft SQL Server installation listening on `localhost:1433`, with a SQL login able to use and migrate database `AIShop`.
- `sqlcmd` from the installed SQL Server command-line tools, and an installed Ollama model supporting tool calling.
- Free ports **5173**, **8081** and **11434**. Vite uses `strictPort` to avoid silently moving the demo to another port.

Open the repository in IntelliJ, import `bekend/pom.xml` as a Maven project, and use the built-in terminal for the commands below. Do not rename `bekend`.

```bash
java -version
node --version
npm --version
```

If necessary set your installed JDK path in the terminal (the exact directory varies by distribution):

```bash
export JAVA_HOME=/usr/lib/jvm/java-25
export PATH="$JAVA_HOME/bin:$PATH"
```

## 2. SQL Server and credentials

For an existing systemd SQL Server installation:

```bash
sudo systemctl start mssql-server
systemctl is-active mssql-server
ss -ltn 'sport = :1433'
```

If the teammate uses another existing installation method, start that instance instead; no new Docker setup is required. Add the installed `sqlcmd` directory to PATH if needed (commonly `/opt/mssql-tools18/bin`). Enter the login and password without committing them:

```bash
read -rp 'SQL login: ' DB_USERNAME
read -rsp 'SQL password: ' DB_PASSWORD
printf '\n'
export DB_USERNAME DB_PASSWORD
export SQLCMDPASSWORD="$DB_PASSWORD"
sqlcmd -S localhost,1433 -U "$DB_USERNAME" -C -b -Q 'SELECT @@VERSION;'
sqlcmd -S localhost,1433 -U "$DB_USERNAME" -C -b -Q "IF DB_ID(N'AIShop') IS NULL CREATE DATABASE [AIShop];"
sqlcmd -S localhost,1433 -U "$DB_USERNAME" -C -d AIShop -b -Q 'SELECT DB_NAME();'
```

Creating the database requires an appropriately privileged SQL login; if the demo login cannot create it, create `AIShop` once using the teammate's existing SQL administration account. Do not reset existing database data.

## 3. Backend environment

Required variables, with no hardcoded secret values:

| Variable | Meaning |
| --- | --- |
| `DB_USERNAME` | SQL login |
| `DB_PASSWORD` | SQL login password |
| `JWT_SECRET` | Base64-encoded random key, at least 32 decoded bytes |
| `OLLAMA_MODEL` | Exact name/tag from the teammate's `ollama list` |

Optional variables:

| Variable | Default |
| --- | --- |
| `DB_URL` | `jdbc:sqlserver://localhost:1433;databaseName=AIShop;encrypt=true;trustServerCertificate=true` |
| `OLLAMA_BASE_URL` | `http://localhost:11434` |
| `MCP_BASE_URL` | `http://localhost:8081` (the client appends `/mcp`; do not append it yourself) |

For a terminal run, set the required variables in the same terminal that runs Maven:

```bash
export JWT_SECRET="$(openssl rand -base64 32)"
ollama list
read -rp 'Installed Ollama model tag: ' OLLAMA_MODEL
export OLLAMA_MODEL
```

Keep the same JWT secret throughout a demo session. Changing it invalidates existing access tokens. Do not put secrets in React, Git, command output, chat messages or screenshots.

For an IntelliJ Spring Boot run configuration choose `com.aishop.backend.BackendApplication`, working directory `bekend`, JRE 25, and set the four required environment variables in the run configuration. Terminal exports are not automatically inherited by an already-running IDE. `bekend/.env.example` is a template; Spring Boot does **not** automatically load a `.env` file. A private `.env.local` can be sourced in a terminal using `set -a; source .env.local; set +a` if its values are correctly shell-quoted. It is ignored by Git.

## 4. Ollama

Start the teammate's existing Ollama service:

```bash
ollama serve
```

If already running, do not start a second instance. In another terminal:

```bash
curl --fail http://localhost:11434/api/tags
ollama list
ollama run "$OLLAMA_MODEL" 'Odgovori kratko na bosanskom: zdravo.'
```

The model must support tool calling for the MCP acceptance test. Pull a compatible model only if it is not already installed, using the teammate's chosen tag. Neither React nor the backend source fixes a model name.

## 5. Start backend and apply Flyway

```bash
cd bekend
./mvnw spring-boot:run
```

The Maven wrapper is executable in Git. If a copied archive loses permissions, run `chmod +x mvnw` once. Flyway automatically applies the existing V1–V6 migrations and the new **V7__required_catalog_categories.sql**. Hibernate validates the resulting schema. No previously applied migration has been modified.

V7 inserts only missing required categories, preserving existing IDs, descriptions and relationships. It first checks for names outside **Laptopi, Telefoni, Slušalice, Tastature, Miševi** (including spelling/case variants). On conflict it intentionally stops with a clear taxonomy error before changing data. It never deletes or reassigns data.

If that happens, inspect the current data using IntelliJ's SQL console or sqlcmd:

```sql
SELECT c.id, c.name, COUNT(p.id) AS product_count
FROM dbo.categories c LEFT JOIN dbo.products p ON p.category_id = c.id
GROUP BY c.id, c.name ORDER BY c.id;
SELECT id, category_id, name FROM dbo.products ORDER BY category_id, id;
```

Safe conflict plan: back up the database; agree which existing categories correspond to the five required names; review each affected product; perform explicitly reviewed renaming/reclassification or archival outside this automatic setup. If preservation of unrelated legacy categories is mandatory, use a separate demo database via `DB_URL` instead. Do not delete records or edit applied migrations to make validation pass. If an existing manually created schema has no Flyway history, coordinate its correct baseline with the backend developer instead of blindly enabling baseline or running V1 again.

After startup, the **first backend connectivity check** is:

```bash
curl --fail http://localhost:8081/api/health
curl --fail http://localhost:8081/api/categories
curl --fail http://localhost:8081/api/products
```

The five category IDs may be any database-generated values. The frontend uses returned IDs everywhere. No assumption about mock IDs 1–5 is made.

## 6. Optional demo products

Only if the products table is empty, run the optional checked-in SQL script from the repository root:

```bash
sqlcmd -S localhost,1433 -U "$DB_USERNAME" -C -d AIShop -f 65001 -b -i bekend/dev/seed-products.sql
```

It inserts one illustrative product per required category by joining the category **name to its actual ID**. It skips the entire seed if any products already exist, never updates products, and can be run repeatedly. Review the script first. Images are illustrative and have local UI fallbacks. An empty database is represented honestly as an empty catalog until this seed or admin product creation is used.

## 7. React

In a second terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open **http://localhost:5173**. Checked-in `.env` and `.env.example` contain:

```env
VITE_DATA_SOURCE=api
VITE_API_BASE_URL=/api
```

A pre-existing `.env.local` overrides `.env`; check it if mock products or demo account hints appear. Restart Vite after changing variables. Independent frontend development remains available by setting `VITE_DATA_SOURCE=mock` in `.env.local`. The known mock credentials apply only in mock mode and are never database accounts.

Vite proxies only `/api` to port 8081. Browser CORS configuration is unnecessary for this same-origin local setup. `/mcp` is called by the backend client, not by React. Spring Security remains stateless bearer authentication with CSRF disabled as before. Do not expose MCP without authentication.

## 8. USER and ADMIN accounts

Register a new USER through `/register` with a real local-demo email, names and your chosen password. Registration creates the database account and logs in. Login/register fetch `/api/users/me`; its role determines navigation. Access tokens stay in memory. A rotating refresh token is kept in sessionStorage for the current tab, so reloads and Stripe returns restore the login. Logout clears it. Passwords and tokens are not stored in localStorage. Stripe APP_FRONTEND_URL must match the frontend origin used to log in.

To prepare an ADMIN, register a second account normally, then manually run this narrowly scoped SQL in the local demo database after replacing the placeholder email with that account:

```sql
DECLARE @email NVARCHAR(255) = N'REPLACE_WITH_YOUR_REGISTERED_ADMIN_EMAIL';
IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE email = @email)
    THROW 51002, 'Register the intended admin account first.', 1;
UPDATE dbo.users SET role = 'ADMIN' WHERE email = @email;
SELECT id, email, role FROM dbo.users WHERE email = @email;
```

Log out and log in again so the JWT includes ADMIN. No password is seeded, and there is no public role-update endpoint. `/api/users` is ADMIN-only and returns `UserResponse` without hashes/tokens. `/api/users/me` PUT updates only the authenticated user's first/last name.

## 9. AI + MCP demonstration

Log in as USER, open the AI assistant (or type a question in the blue bar). Guest API users go through login; the question and intended destination survive and the question is submitted once. Guest cart additions are resumed once after login using real product IDs. Mock guest behavior remains separate.

Suggested sequence, choosing an actual product returned by the model:

1. “Koje laptope imate na stanju?” → Ollama calls `searchProducts`, using SQL Server data.
2. “Prikaži detalje proizvoda ID …” → `getProductDetails`.
3. “Dodaj taj proizvod u korpu, jedan komad.” → MCP `addToCart` prepares a proposal.
4. Confirm that the ordinary cart is still unchanged before clicking **Potvrdi**.
5. Click **Potvrdi** once → `/api/ai/cart-actions/{actionId}/confirm`; SQL cart and navbar count update.
6. “Šta se nalazi u mojoj korpi?” → `getMyCart`, returning the real item.
7. Try updating/removing that item via chat; the model must use `itemId` from `getMyCart`, not `productId`.

The backend system prompt requires MCP tools for store data. Local models may differ in tool-calling reliability; inspect backend logs for tool invocation and verify returned data against REST/database results. Do not interpret a fluent answer alone as proof that tools ran. Conversation history is sent as bounded user/assistant turns so references to previous products can be resolved; it is never promoted to a system message.

The backend internally tags each chat's MCP connection with a UUID. MCP cart proposals inherit this ID from the authenticated transport context. The normal text chat response returns structured `pendingActions` matching both the authenticated user and that exact request. No LLM text parsing is used. Multiple proposals are shown individually. `pendingAction` remains as a compatibility field for the first proposal.

An optional “Pripremi prijedlog promjene korpe” form in chat exercises the pre-existing **structured** `cartAction` path with actual product/cart IDs. This path does not itself prove natural-language MCP tool calling; use the sequence above for that acceptance test.

Pending actions live in backend memory for 10 minutes and disappear on backend restart. Confirmation checks ownership and expiry and atomically consumes the action before calling the transactional cart service. Concurrent confirmations execute at most once within the running process. Failed/uncertain confirmations are never retried automatically; check the cart and request a new proposal. **Odustani** dismisses that proposal in the UI; no nonexistent cancellation endpoint is called, and the server proposal expires naturally. Reloaded `CONFIRMING` actions stay disabled until the user checks the cart.

AI requests have a 180-second frontend timeout; other HTTP requests retain 15 seconds. Actual AI processing is not delayed by UI animation. Network errors/timeouts are displayed in Bosnian, with no automatic replay of AI or cart writes. A timeout does not guarantee that the server stopped processing, so inspect the cart/proposals before trying again.

## 10. Checkout and synchronization

API checkout uses the existing **POST /api/orders with no body**. It creates a real SQL order from the authenticated cart, snapshots actual prices, decreases stock and empties the cart. The API checkout page clearly omits shipping fields and says that shipping/payment are not part of the demo. No shipping data is silently discarded or falsely reported saved. Mock mode retains its local shipping simulation.

The confirmation shows the actual backend order ID, total and status. Cart, products and order queries are refreshed. The form guards duplicate submits; an uncertain network result disables resubmission and directs the user to order history. Backend checkout locks the user's cart while consuming it so concurrent duplicate checkouts do not create two orders from the same cart. This is a local demonstration, not payment processing or a durable idempotency protocol.

## 11. Checks and known limits

```bash
cd frontend
npm run lint
npm test
npm run build
```

```bash
cd bekend
./mvnw clean test
./mvnw package -DskipTests
```

Focused tests that do not require SQL Server or Ollama:

```bash
cd bekend
./mvnw -Dtest=PendingCartActionServiceTests,UserApiSecurityTests test
```

Validated here: frontend lint/tests/build, Java 25 compilation/package, six focused Java tests. Full `clean test` was attempted and fails in `BackendApplicationTests.contextLoads` because SQL Server is unavailable; do not mark it passed. SQL migrations, optional seed, actual Ollama responses/MCP HTTP transport, database locking, and visual browser behavior still require real-environment verification. No SQL data was changed on this machine. Existing dependency audit output reports six moderate npm advisories; dependencies were restored from the lockfile rather than force-upgraded during integration.

Remaining limitations: no password-reset email endpoint, no payment or shipping service, no role-edit UI, memory-only tokens and pending proposals, one product image URL. These do not block the local demonstration.

## 12. Acceptance record for the teammate

All items below are implemented in code but **await verification against the real local services**, except the unavailable password recovery feature.

- [ ] API mode loads database products and all five categories using actual IDs.
- [ ] Registration creates a real USER; login and refreshed JWT work.
- [ ] Backend role grants/denies admin access correctly.
- [ ] Add/update/remove use real cart item IDs and persist in SQL Server.
- [ ] Checkout creates one real order, updates stock, empties cart and appears in history.
- [ ] ADMIN can create/edit/delete allowed products and update permitted order statuses.
- [ ] ADMIN user directory excludes hashes/tokens; USER cannot list users.
- [ ] Profile update changes only the authenticated user's names.
- [ ] Ollama answers via `searchProducts`/`getProductDetails` MCP calls using SQL data.
- [ ] MCP `getMyCart` and `getMyOrders` return the authenticated user's data.
- [ ] Natural-language cart request returns a structured proposal without mutation.
- [ ] Confirmation executes once and updates the displayed cart/count.
- [ ] Expired/missing/already consumed proposals show errors without fake success.
- [ ] Reload restores the same-tab API session using a rotated refresh token and never imports mock identities or mock catalog data.
- [ ] Assistant bar question survives login and is submitted once.
- [ ] Desktop/mobile UI, category transitions and reduced-motion behavior remain correct.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Java release 25 unsupported | IntelliJ Maven runner JRE and terminal JAVA_HOME must both point to JDK 25. |
| Connection refused / Flyway login failure | SQL Server port 1433, DB_USERNAME/DB_PASSWORD, database AIShop, SQL login permissions. |
| Taxonomy migration error | Review conflicting categories/relationships; follow the safe conflict plan above. |
| Flyway checksum mismatch | Restore the applied migration from version control; do not repair blindly or rewrite it. |
| Empty product grid | Check GET /api/products. Run the optional seed only on an empty table, or add products as ADMIN. |
| Backend healthy, frontend cannot connect | Verify port 8081, Vite proxy, VITE_API_BASE_URL and stale .env.local; restart Vite. |
| UI still shows mock demo credentials | VITE_DATA_SOURCE must be api; .env.local wins over .env. |
| 401 after reload | Check refresh expiry/revocation and sessionStorage access; sign in again if the session expired. |
| ADMIN still has USER access | Sign out/in after the local database role change. |
| AI timeout / missing tool calls | Verify Ollama service, exact installed OLLAMA_MODEL, tool support, MCP_BASE_URL and backend tool logs. |
| MCP 401 | Use the JWT from the active API login; internal MCP calls forward it. Do not disable SecurityConfig. |
| Pending action missing after restart | Proposals are in memory; request a new proposal. |
| Confirmation network error | Check the real cart before requesting another action; do not blindly retry. |
| Port 5173 in use | Stop the other dev server or use a deliberate alternate setup; strictPort intentionally refuses to move silently. |
