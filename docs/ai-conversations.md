# AI conversations

The authenticated API adds GET/POST `/api/ai/conversations`, GET/DELETE
`/api/ai/conversations/{id}`, and POST `/api/ai/conversations/{id}/chat`.
The last endpoint accepts the existing AiChatRequest and an optional UUID
`X-Chat-Request-ID`. Reusing that UUID in the same conversation returns the
saved response without calling the assistant again. The original `/api/ai/chat`
remains available and unchanged for existing clients.

Flyway V8 creates SQL Server tables without changing existing migrations.
Conversation ownership is checked against the JWT subject on each operation.
Client history is ignored by the new endpoint: the last 24 stored messages are
passed to existing routing and product resolution. Ollama retains its smaller
existing prompt limit. Cart data, product IDs, stock and item IDs are still read
from authenticated MCP tools. Stored text never authorizes cart execution.

Send and delete acquire an UPDLOCK/HOLDLOCK on the owned conversation row in a
transaction. This prevents deleting a conversation while a response and its
pending action references are being saved. Deletion revokes those references
through the existing in-memory pending service, then cascades message deletion.
Confirmation and revocation are serialized: a confirmation already executing
can finish before deletion, but a revoked confirmation cannot execute later.

The API frontend uses SQL history, not localStorage messages. Mock mode keeps
its own per-user local conversations. Existing local transcripts are not deleted
or automatically imported into another account. The UI remembers only the active
conversation ID for API mode. No streaming was introduced: because there are no
backend activity events, the status honestly says “Pripremam odgovor...”.

## Validation

Run the service/security Maven tests (excluding BackendApplicationTests, which
requires application infrastructure) and `npm test`, `npm run lint`, `npm run
build` in frontend. JDBC and MCP are mocked in conversation unit tests; these do
not establish real SQL Server migration or Ollama integration compatibility.

Manual verification with SQL Server/Ollama available:

1. Start the backend and verify V8 is applied by Flyway. Use frontend API mode.
2. Log in, ask for ThinkPads, reload, reopen the conversation, then say “Dodaj taj
   laptop u korpu”. Verify a real product proposal and explicit confirmation.
3. Ask to increase cart quantity without a number. Reload and answer “na 3”,
   then test “za 2” in a fresh clarification. Verify totals and one-time confirm.
4. Switch conversations while generation runs. Verify no cross-conversation
   messages, then reopen the original conversation. Repeat with a network timeout
   and Retry; check exactly one pair of persisted messages for the request UUID.
5. Delete an active conversation with a pending proposal. Try confirming its old
   action ID: it must fail. Verify products, orders and the cart remain intact.
6. With another account, attempt GET, DELETE and POST chat using that ID and an
   existing conversation ID owned by the first account. Expect 404, no AI call.
7. At desktop and mobile widths, test sidebar collapse, drawer, Escape, Tab,
   dialog focus, independent scrolling, reduced motion and network/delete errors.
8. Log out while a request is running and log in as another user. Verify the
   previous user's messages and response never appear in the new session.

Limits: no pagination yet; context is bounded to 24 messages, so older references
may need clarification. A transaction holds a DB connection during generation.
Pending actions remain in memory as before (lost on restart; multi-instance
shared pending actions are outside this change). Existing saved proposals whose
actions expired or disappeared are shown without active confirmation controls.
