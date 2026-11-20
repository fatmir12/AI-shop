import test from 'node:test'
import assert from 'node:assert/strict'
import { total } from '../src/utils/shop.js'
import { mockService } from '../src/mocks/service.js'
import { withValidation, shippingSchema } from '../src/services/contracts.js'
import { initialCategories, mapCategory } from '../src/services/categories.js'
import { claimRequest } from '../src/utils/assistant.js'
const storage = new Map()
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }
const service = withValidation(mockService)
const address = { firstName: 'Test', lastName: 'Kupac', email: 'test@example.test', address: 'Testna ulica 12', city: 'Sarajevo', postalCode: '71000', phone: '+38761123456' }
test('totals and delivery validation', () => {
  assert.equal(total([{ unitPrice: 0.1, quantity: 3 }, { unitPrice: 0.2, quantity: 1 }]).totalPrice, 0.5)
  assert.equal(shippingSchema.safeParse({ ...address, postalCode: 'abc' }).success, false)
})
test('fixed taxonomy and backend-generated identifiers', () => {
  assert.deepEqual(initialCategories.map(c => c.name), ['Laptopi', 'Telefoni', 'Slušalice', 'Tastature', 'Miševi'])
  assert.deepEqual(mapCategory({ id: 987, name: 'Laptopi', description: '' }), { id: 987, name: 'Laptopi', description: '', slug: 'laptopi' })
})
test('incoming request is claimed once and busy requests stay pending', () => {
  const handled = new Set()
  const request = { id: 'one', prompt: 'Slušalice do 700 KM' }
  assert.equal(claimRequest(request, true, handled), false)
  assert.equal(claimRequest(request, false, handled), true)
  assert.equal(claimRequest(request, false, handled), false)
  assert.equal(claimRequest({ id: 'two', prompt: '  ' }, false, handled), false)
})
test('authentication, fixed categories, products, checkout and cancellation', async () => {
  storage.clear()
  await assert.rejects(() => service.login({ email: 'user@aishop.test', password: 'wrong' }), /Neispravna/)
  await service.addCart(1, 1)
  await service.login({ email: 'user@aishop.test', password: 'User123!' })
  assert.equal((await service.cart()).totalItems, 1)
  await assert.rejects(() => service.users(), /administratorski/)
  const stock = (await service.products()).find(p => p.id === 1).stock
  const order = await service.checkout(address)
  assert.equal(order.totalAmount, 649)
  assert.equal((await service.cart()).totalItems, 0)
  assert.equal((await service.products()).find(p => p.id === 1).stock, stock - 1)
  await service.logout()
  await service.login({ email: 'admin@aishop.test', password: 'Admin123!' })
  await assert.rejects(() => service.saveCategory({ name: 'Drugo', description: '' }), /pet definiranih/)
  await assert.rejects(() => service.deleteCategory(1), /pet definiranih/)
  await service.status(order.id, 'CANCELLED')
  assert.equal((await service.products()).find(p => p.id === 1).stock, stock)
  const product = await service.saveProduct({ categoryId: 4, name: 'Test tastatura', price: 99, stock: 4, description: '', imageUrl: '' })
  await service.saveProduct({ ...product, price: 89 }, product.id)
  assert.equal((await service.products()).find(p => p.id === product.id).price, 89)
  await service.deleteProduct(product.id)
  assert.ok((await service.products()).every(p => initialCategories.some(c => c.id === p.categoryId)))
  assert.ok(!storage.get('aishop.mock.v1').includes('Admin123!'))
})
test('Bosnian assistant uses correct category identifiers and budget', async () => {
  const a = await service.chat('Preporuči slušalice do 700 KM')
  const b = await service.chat('Preporuči slušalice do 700 KM')
  assert.deepEqual(a, b)
  assert.ok(a.products.length)
  assert.ok(a.products.every(p => p.categoryId === 3 && p.price <= 700 && p.stock > 0))
  assert.equal((await service.chat('Laptop do 1 KM')).products.length, 0)
})
