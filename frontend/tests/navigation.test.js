import test from 'node:test'
import assert from 'node:assert/strict'
import { categoryNavigation, allProductsNavigation } from '../src/utils/navigation.js'
test('active category follows URL and backend-generated identifiers', () => {
  for (const id of [1, 2, 3, 4, 5, 987]) {
    assert.equal(categoryNavigation('/products', `?category=${id}`, id), true)
    assert.equal(categoryNavigation('/products', `?category=${id}&q=test`, id), true)
    assert.equal(categoryNavigation('/products', `?category=${id}`, id + 1), false)
    assert.equal(allProductsNavigation('/products', `?category=${id}`), false)
  }
  assert.equal(categoryNavigation('/products/12', '?category=1', 1), false)
  assert.equal(categoryNavigation('/', '?category=1', 1), false)
  assert.equal(allProductsNavigation('/products', '?q=laptop'), true)
  assert.equal(allProductsNavigation('/products/', ''), true)
  assert.equal(allProductsNavigation('/', ''), false)
})
