import test from 'node:test'
import assert from 'node:assert/strict'
import { catalogResultKey, catalogStagger, afterAnimation } from '../src/utils/catalogMotion.js'
const product = id => ({ id, price: 100, stock: 5 })
test('ordered visible IDs drive transitions, unrelated product updates do not', () => {
  const initial = [product(1), product(2)]
  assert.equal(catalogResultKey(initial, 'products'), catalogResultKey(initial.map(p => ({ ...p, price: 99, stock: 4 })), 'products'))
  assert.notEqual(catalogResultKey(initial, 'products'), catalogResultKey([...initial].reverse(), 'products'))
  assert.notEqual(catalogResultKey(initial, 'products'), catalogResultKey([product(3)], 'products'))
  assert.notEqual(catalogResultKey(initial, 'products'), catalogResultKey([...initial, product(3)], 'products'))
  assert.notEqual(catalogResultKey([], 'loading'), catalogResultKey([], 'empty'))
  assert.notEqual(catalogResultKey([], 'error'), catalogResultKey([], 'empty'))
})
test('stagger remains bounded even for long lists', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 100].map(catalogStagger), [0, 75, 150, 210, 210, 210, 210])
})
test('finishing an exit commits the latest selection rather than its initial selection', async () => {
  let finish
  let selection = 'laptopi'
  let displayed
  const animation = { finished: new Promise(resolve => { finish = resolve }), cancel() {} }
  afterAnimation(animation, () => { displayed = selection })
  selection = 'telefoni'
  selection = 'misevi'
  finish()
  await animation.finished
  assert.equal(displayed, 'misevi')
})
test('cancelled or unmounted transitions never commit obsolete content', async () => {
  let finish
  let commits = 0
  let cancellations = 0
  const animation = { finished: new Promise(resolve => { finish = resolve }), cancel() { cancellations++ } }
  const cleanup = afterAnimation(animation, () => { commits++ })
  cleanup()
  finish()
  await animation.finished
  assert.equal(commits, 0)
  assert.equal(cancellations, 1)
})
test('animation cancellation rejection is handled', async () => {
  const animation = { finished: Promise.reject(new Error('cancelled')), cancel() {} }
  afterAnimation(animation, () => assert.fail('must not commit'))
  await new Promise(resolve => setTimeout(resolve, 0))
})
