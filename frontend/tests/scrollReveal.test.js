import test from 'node:test'
import assert from 'node:assert/strict'
import { createScrollReveal } from '../src/utils/scrollReveal.js'
function environment(reduced = false) {
  const observers = []
  const mediaListeners = new Set()
  const focusListeners = new Set()
  const media = { matches: reduced, addEventListener: (_, fn) => mediaListeners.add(fn), removeEventListener: (_, fn) => mediaListeners.delete(fn) }
  class Observer {
    targets = new Set()
    constructor(callback, options) { this.callback = callback; this.options = options; observers.push(this) }
    observe(element) { this.targets.add(element) }
    unobserve(element) { this.targets.delete(element) }
    disconnect() { this.targets.clear() }
    enter(...elements) { this.callback(elements.map(target => ({ target, isIntersecting: true }))) }
  }
  globalThis.window = { matchMedia: () => media, IntersectionObserver: Observer }
  globalThis.IntersectionObserver = Observer
  globalThis.document = { activeElement: null }
  const root = { addEventListener: (_, fn) => focusListeners.add(fn), removeEventListener: (_, fn) => focusListeners.delete(fn) }
  const card = () => ({
    animations: [],
    contains(element) { return element === this },
    animate(frames, options) {
      let finish
      const animation = { finished: new Promise(resolve => { finish = resolve }), cancelled: false, cancel() { this.cancelled = true; finish() } }
      this.animations.push({ frames, options, animation })
      return animation
    },
  })
  return { root, card, observers, media, mediaListeners, focusListeners }
}
test('cards reveal once, bounded stagger, and observer releases revealed cards', () => {
  const env = environment()
  const reveal = createScrollReveal({ root: env.root })
  const cards = Array.from({ length: 6 }, env.card)
  cards.forEach(card => reveal.observe(card))
  const observer = env.observers[0]
  assert.equal(observer.options.threshold, 0.12)
  observer.enter(...cards)
  assert.deepEqual(cards.map(card => card.animations[0].options.delay), [0, 75, 150, 210, 210, 210])
  assert.equal(observer.targets.size, 0)
  observer.enter(...cards)
  assert.ok(cards.every(card => card.animations.length === 1))
  reveal.disconnect()
  assert.ok(cards.every(card => card.animations[0].animation.cancelled))
  assert.equal(env.focusListeners.size, 0)
  assert.equal(env.mediaListeners.size, 0)
})
test('StrictMode cleanup does not mark waiting products as already revealed', () => {
  const env = environment()
  const seen = new WeakSet()
  const card = env.card()
  const first = createScrollReveal({ root: env.root, seen })
  first.observe(card)
  first.disconnect()
  assert.equal(seen.has(card), false)
  const second = createScrollReveal({ root: env.root, seen })
  second.observe(card)
  env.observers[1].enter(card)
  assert.equal(card.animations.length, 1)
  second.disconnect()
})
test('reduced motion reveals immediately and cancels running and waiting animation work', () => {
  const env = environment(true)
  const card = env.card()
  const reveal = createScrollReveal({ root: env.root })
  reveal.observe(card)
  assert.equal(card.animations.length, 0)
  assert.equal(env.observers.length, 0)
  reveal.disconnect()
  env.media.matches = false
  const active = createScrollReveal({ root: env.root })
  active.observe(card)
  env.observers[0].enter(card)
  env.media.matches = true
  env.mediaListeners.forEach(listener => listener())
  assert.equal(card.animations[0].animation.cancelled, true)
  assert.equal(env.observers[0].targets.size, 0)
  active.disconnect()
})
test('keyboard focus cancels motion and bypasses pending reveals', () => {
  const env = environment()
  const reveal = createScrollReveal({ root: env.root })
  const waiting = env.card()
  const running = env.card()
  reveal.observe(waiting)
  reveal.observe(running)
  env.observers[0].enter(running)
  env.focusListeners.forEach(listener => listener({ target: running }))
  env.focusListeners.forEach(listener => listener({ target: waiting }))
  env.observers[0].enter(waiting)
  assert.equal(running.animations[0].animation.cancelled, true)
  assert.equal(waiting.animations.length, 0)
  reveal.disconnect()
})
test('new category appearance may reveal again and initialization failure leaves no hidden styles', () => {
  const env = environment()
  const card = env.card()
  const first = createScrollReveal({ root: env.root })
  first.observe(card)
  env.observers[0].enter(card)
  first.disconnect()
  const next = createScrollReveal({ root: env.root })
  next.observe(card)
  env.observers[1].enter(card)
  assert.equal(card.animations.length, 2)
  const broken = { contains: () => false, animate() { throw new Error('unsupported animation') } }
  next.observe(broken)
  assert.doesNotThrow(() => env.observers[1].enter(broken))
  assert.equal(Object.hasOwn(broken, 'style'), false)
  assert.equal(env.observers[1].targets.has(broken), false)
  next.disconnect()
})
