import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { chatReturnRoute, isChatAuthRoute } from '../src/utils/chatNavigation.js'

test('minimize preserves known storefront destinations with filters and fragments', () => {
  for (const route of ['/', '/products', '/products?category=3&q=laptop', '/products/12#details', '/cart', '/checkout', '/account', '/account/orders/42']) assert.equal(chatReturnRoute(route), route)
})
test('minimize rejects external, assistant, admin and unknown destinations', () => {
  for (const route of [undefined, null, '', 'https://evil.test', '//evil.test', '/\\evil.test', '/assistant', '/assistant?x=1', '/admin', '/login', '/unknown', '/products/../assistant', '/%2f%2fevil.test', '/products\n']) assert.equal(chatReturnRoute(route), '/')
})
test('storefront hosts one persistent assistant outside the route outlet', async () => {
  const layout = await readFile(new URL('../src/components/Layout.jsx', import.meta.url), 'utf8')
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
  assert.equal((layout.match(/<Assistant\s*\/>/g) ?? []).length, 1)
  assert.match(layout, /<main(?:\s[^>]*)?><Assistant \/><Outlet \/><\/main>/)
  assert.doesNotMatch(layout, /AIAssistantBar/)
  assert.match(app, /path="assistant" element=\{null\}/)
  assert.doesNotMatch(app, /<Assistant|<ChatRoute/)
})
test('widget reuses a single send path and active conversation store', async () => {
  const source = await readFile(new URL('../src/features/assistant.jsx', import.meta.url), 'utf8')
  const shell = source.split('function ConversationChat')[0]
  assert.doesNotMatch(shell, /service\.chat|createConversation|setMessages|setActive/)
  assert.equal((source.match(/service\.chat\(/g) ?? []).length, 1)
  assert.equal((source.match(/client\.createConversation\(/g) ?? []).length, 1)
  assert.match(source, /hidden=\{!full && !open\}/)
  assert.match(source, /!full && <button ref=\{launcher\}/)
  assert.match(source, /navigate\('\/assistant'\)/)
  assert.match(source, /navigate\(chatReturnRoute\(target\)\)/)
  assert.match(source, /e.key === 'Escape'/)
  assert.match(source, /sending.current \|\| loading/)
  assert.match(source, /write\(`\$\{storage\}\.active`, id\)/)
})

test('auth pages suppress the widget, ordinary storefront and assistant routes do not', () => {
  for (const route of ['/login', '/register', '/forgot-password', '/login/', '/REGISTER']) assert.equal(isChatAuthRoute(route), true)
  for (const route of ['/', '/products', '/products/12', '/cart', '/checkout', '/account', '/assistant']) assert.equal(isChatAuthRoute(route), false)
})
test('auth entry resets transient UI and identity changes isolate conversation state', async () => {
  const source = await readFile(new URL('../src/features/assistant.jsx', import.meta.url), 'utf8')
  assert.match(source, /if \(initializing \|\| isChatAuthRoute\(pathname\)\) return null/)
  assert.match(source, /key=\{`\$\{isMock\}\.\$\{user\?\.id \?\? 'guest'\}`\}/)
  assert.match(source, /const \[open, setOpen\] = useState\(false\)/)
  assert.match(source, /<Link className="widget-login-link" to="\/login" onClick=\{close\}>Prijavite se za razgovor sa AIShop asistentom\.<\/Link>/)
  assert.match(source, /<strong>Niste prijavljeni\.<\/strong>/)
  assert.match(source, /else setOpen\(isMock \|\| !!user\)/)
  assert.match(source, /if \(full\) \{ setStarted\(true\); setOpen\(false\) \}/)
  assert.match(source, /return \(\) => \{ alive.current = false; viewGate.next\(\) \}/)
})
