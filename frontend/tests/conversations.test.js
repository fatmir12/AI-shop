import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { requestGate, conversationTitle, aiStatus } from '../src/utils/conversations.js'
import { createApiService } from '../src/services/adapters/api.js'

test('neutral status never claims an unobserved MCP operation', () => {
  assert.equal(aiStatus(), 'Pripremam odgovor...')
})
test('title uses first message without a model request', () => {
  assert.equal(conversationTitle('  Koje   laptope imate? '), 'Koje laptope imate?')
  assert.equal(conversationTitle('a'.repeat(100)).length, 80)
})
test('rapid switching invalidates old loads including pending network failures', async () => {
  const gate = requestGate()
  const first = gate.next(), second = gate.next()
  await Promise.resolve()
  assert.equal(gate.current(first), false)
  assert.equal(gate.current(second), true)
  gate.next() // logout / unmount
  assert.equal(gate.current(second), false)
})
test('history API routes creation, load, deletion and idempotent continuation', async () => {
  const calls = []
  const user = { id: 7, firstName: 'Test', lastName: 'Kupac', email: 'test@local.test', role: 'USER' }
  const client = createApiService({ sessionExpired: () => {}, adapter: async config => {
    calls.push(config)
    const data = config.url === '/auth/login' ? { accessToken: 'a', refreshToken: 'r', tokenType: 'Bearer', expiresIn: 60, userId: 7, email: user.email, role: 'USER' }
      : config.url === '/users/me' ? user : config.url.endsWith('/chat') ? { reply: 'Odgovor', pendingActions: [] } : config.method === 'get' && config.url.endsWith('/10') ? { conversation: { id: 10 }, messages: [] } : [{ id: 10 }]
    return { config, data, status: 200, statusText: 'OK', headers: {} }
  } })
  await client.login({ email: user.email, password: 'password' })
  await client.conversations(); await client.createConversation(); await client.conversation(10)
  const requestId = '99d1f08d-be82-4d01-9ba1-7ef58d73d100'
  assert.equal((await client.chat('na 3', { conversationId: 10, requestId })).content, 'Odgovor')
  await client.deleteConversation(10)
  const send = calls.find(c => c.url === '/ai/conversations/10/chat')
  assert.equal(send.headers['X-Chat-Request-ID'], requestId)
  assert.equal(JSON.parse(send.data).message, 'na 3')
  assert.ok(calls.some(c => c.method === 'delete' && c.url === '/ai/conversations/10'))
  assert.ok(calls.some(c => c.method === 'post' && c.url === '/ai/conversations'))
})
test('sidebar, accessible dialogs and responsive reduced-motion dots are wired', async () => {
  const source = await readFile(new URL('../src/features/assistant.jsx', import.meta.url), 'utf8')
  const status = await readFile(new URL('../src/features/AiStatus.jsx', import.meta.url), 'utf8')
  const css = await readFile(new URL('../src/index.css', import.meta.url), 'utf8')
  assert.match(source, /aria-label="Historija razgovora"/)
  assert.match(source, /aria-current=/)
  assert.match(source, /client.deleteConversation\(deleting.id\)/)
  assert.match(source, /Želite li obrisati ovaj razgovor/)
  assert.match(source, /gate.current.current\(version\)/)
  assert.match(status, /role="status"/)
  assert.match(status, /aria-hidden="true"/)
  assert.match(css, /@keyframes ai-dot/)
  assert.match(css, /animation-delay:.16s/)
  assert.match(css, /prefers-reduced-motion:reduce/)
  assert.match(css, /@media\(max-width:760px\)/)
})
