import test from 'node:test'
import assert from 'node:assert/strict'
import { AxiosError } from 'axios'
import { createApiService } from '../src/services/adapters/api.js'
import { authDestination, authReturnState } from '../src/utils/authNavigation.js'
const user = { id: 701, firstName: 'Test', lastName: 'Kupac', email: 'test@local.test', role: 'USER' }
const auth = { accessToken: 'test-access-token', refreshToken: 'test-refresh-token', tokenType: 'Bearer', expiresIn: 60, userId: user.id, email: user.email, role: user.role }
const cart = { cartId: 42, items: [{ id: 771, productId: 41, productName: 'Laptop', unitPrice: 100, quantity: 1, subtotal: 100 }], totalPrice: 100, totalItems: 1 }
const action = { actionId: '9d88ece4-6c59-4878-ac0f-bccbb53f8878', type: 'ADD', productId: 41, itemId: null, quantity: 1, expiresAt: '2027-01-01T12:00:00Z', status: 'PENDING_CONFIRMATION' }
const body = config => config.data ? JSON.parse(config.data) : undefined
const response = (config, data) => ({ config, data, status: 200, statusText: 'OK', headers: {} })
test('real contracts: database category IDs, cart item IDs, orders and AI actions', async () => {
  const calls = []
  const service = createApiService({ sessionExpired: () => {}, adapter: async config => {
    calls.push(config)
    if (config.url === '/auth/login') return response(config, auth)
    assert.equal(config.headers.Authorization, 'Bearer test-access-token')
    if (config.url === '/users/me') return response(config, user)
    if (config.url === '/categories') return response(config, [{ id: 94, name: 'Laptopi', description: null }])
    if (config.url === '/cart/items/771') { assert.deepEqual(body(config), { quantity: 2 }); return response(config, cart) }
    if (config.url === '/orders') { assert.equal(body(config), undefined); return response(config, { id: 301, userId: 701, status: 'PENDING', totalAmount: 100, createdAt: '2026-11-03T12:00:00', items: cart.items }) }
    if (config.url === '/ai/chat') { assert.equal(config.timeout, 180000); assert.equal(body(config).cartAction, null); assert.equal(body(config).history[0].content, 'Koji laptop?'); return response(config, { reply: 'Prijedlog čeka potvrdu.', pendingAction: action, pendingActions: [action] }) }
    if (config.url.endsWith('/confirm')) return response(config, { message: 'Potvrđeno', cart })
    throw new Error(`Unexpected request ${config.url}`)
  } })
  assert.equal((await service.login({ email: user.email, password: 'not-stored' })).id, 701)
  assert.equal((await service.categories())[0].id, 94)
  assert.equal((await service.categories())[0].slug, 'laptopi')
  await service.updateCart(771, 2)
  assert.equal((await service.checkout()).id, 301)
  const chat = await service.chat('Dodaj laptop', { history: [{ role: 'user', content: 'Koji laptop?' }] })
  assert.equal(chat.content, 'Prijedlog čeka potvrdu.')
  assert.equal(chat.pendingActions.length, 1)
  assert.equal(calls.filter(c => c.url.endsWith('/confirm')).length, 0)
  assert.equal((await service.confirmCartAction(action.actionId)).cart.items[0].id, 771)
})
test('concurrent authenticated requests share one refresh and use the rotated token', async () => {
  let time = 0
  let refreshes = 0
  const service = createApiService({ now: () => time, sessionExpired: () => {}, adapter: async config => {
    if (config.url === '/auth/login') return response(config, auth)
    if (config.url === '/auth/refresh') { refreshes++; assert.equal(body(config).refreshToken, auth.refreshToken); await new Promise(resolve => setTimeout(resolve, 5)); return response(config, { ...auth, accessToken: 'rotated', refreshToken: 'rotated-refresh' }) }
    if (config.url === '/users/me') return response(config, user)
    assert.equal(config.headers.Authorization, 'Bearer rotated')
    return response(config, config.url === '/cart' ? cart : [])
  } })
  await service.login({})
  time = 51000
  await Promise.all([service.cart(), service.orders(), service.cart()])
  assert.equal(refreshes, 1)
})
test('logout during refresh cannot restore a stale authenticated identity', async () => {
  let time = 0
  let release
  const service = createApiService({ now: () => time, sessionExpired: () => {}, adapter: async config => {
    if (config.url === '/auth/login') return response(config, auth)
    if (config.url === '/auth/refresh') { await new Promise(resolve => { release = resolve }); return response(config, auth) }
    if (config.url === '/users/me') return response(config, user)
    if (config.url === '/auth/logout') return response(config, null)
    throw new Error('Stale cart request must not reach transport')
  } })
  await service.login({})
  time = 51000
  const request = service.cart()
  await new Promise(resolve => setTimeout(resolve, 0))
  await service.logout()
  release()
  await assert.rejects(request, /Sesija/)
  assert.equal(await service.initialize(), null)
})
test('AI timeout is friendly, uncertain and never retried; ordinary requests retain short timeout', async () => {
  let aiCalls = 0
  const service = createApiService({ sessionExpired: () => {}, adapter: async config => {
    if (config.url === '/auth/login') return response(config, auth)
    if (config.url === '/users/me') { assert.equal(config.timeout, 15000); return response(config, user) }
    aiCalls++
    assert.equal(config.timeout, 180000)
    throw new AxiosError('timeout', 'ECONNABORTED', config)
  } })
  await service.login({})
  await assert.rejects(service.chat('Test'), error => error.uncertain && /Ollama/.test(error.message))
  assert.equal(aiCalls, 1)
})
test('guest actions and malformed backend data never fall back to mocks', async () => {
  const service = createApiService({ adapter: async config => response(config, [{ id: 4, name: 'Malformed' }]) })
  await assert.rejects(service.cart(), /Prijavite/)
  await assert.rejects(service.chat('Test'), /Prijavite/)
  await assert.rejects(service.products(), /Unos/)
})
test('login preserves assistant question and cart intent without allowing external redirects', () => {
  const request = { id: 'request', prompt: 'Koji laptop?' }
  const state = { from: '/assistant', returnState: { assistantRequest: request } }
  assert.equal(authDestination(state, 'USER'), '/assistant')
  assert.deepEqual(authReturnState(state), { assistantRequest: request })
  assert.equal(authDestination({ from: '//evil.test' }, 'USER'), '/account')
  assert.equal(authDestination({ from: '/admin' }, 'USER'), '/account')
  assert.equal(authDestination(null, 'ADMIN'), '/admin')
})
test('failed refresh clears the session exactly once and never replays a cart mutation', async () => {
  let time = 0
  let expired = 0
  let mutations = 0
  const service = createApiService({ now: () => time, sessionExpired: () => expired++, adapter: async config => {
    if (config.url === '/auth/login') return response(config, auth)
    if (config.url === '/users/me') return response(config, user)
    if (config.url === '/auth/refresh') throw new AxiosError('expired', 'ERR_BAD_REQUEST', config, null, { status: 401, data: {} })
    mutations++
    return response(config, cart)
  } })
  await service.login({})
  time = 51000
  await assert.rejects(service.addCart(41, 1))
  assert.equal(expired, 1)
  assert.equal(mutations, 0)
  assert.equal(await service.initialize(), null)
})
test('ambiguous order responses do not report success or invite blind retries', async () => {
  const service = createApiService({ sessionExpired: () => {}, adapter: async config => {
    if (config.url === '/auth/login') return response(config, auth)
    if (config.url === '/users/me') return response(config, user)
    return response(config, { id: 301 })
  } })
  await service.login({})
  await assert.rejects(service.checkout(), error => error.uncertain && /Provjerite korpu ili narudžbe/.test(error.message))
})
