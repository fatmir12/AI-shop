import { createScrollReveal } from '../utils/scrollReveal.js';
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Empty, ErrorState, Loading } from '../components/ui'
import { t } from '../i18n/bs'
import { afterAnimation, catalogMotion, catalogResultKey } from '../utils/catalogMotion'
const mediaQuery = '(prefers-reduced-motion: reduce)'
const prefersReducedMotion = () => window.matchMedia(mediaQuery).matches
const serverSnapshot = () => true
function subscribeMotion(callback) {
  const media = window.matchMedia(mediaQuery)
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}
export default function ProductResults({ products, pending, error, retry, renderProduct }) {
  const reduced = useSyncExternalStore(subscribeMotion, prefersReducedMotion, serverSnapshot)
  const state = pending ? 'loading' : error ? 'error' : products.length ? 'products' : 'empty'
  const key = catalogResultKey(products, state)
  const incoming = { key, state, products, error }
  const [frame, setFrame] = useState(incoming)
  const container = useRef(null)
  const previousHeight = useRef(null)
  const appearance = useRef({ key: null, seen: new WeakSet() })
  const replacing = frame.key !== key
  const shown = reduced || !replacing ? incoming : frame
  const commitLatest = useEffectEvent(() => setFrame(incoming))
  useEffect(() => {
    if (!replacing) return
    const element = container.current
    if (reduced || !element?.animate) {
      let active = true
      queueMicrotask(() => { if (active) commitLatest() })
      return () => { active = false }
    }
    previousHeight.current = element.getBoundingClientRect().height
    const animation = element.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: catalogMotion.exit,
      easing: 'ease-out',
      fill: 'forwards',
    })
    return afterAnimation(animation, commitLatest)
  }, [replacing, reduced])
  useLayoutEffect(() => {
    const element = container.current
    if (!element) return
    if (appearance.current.key !== frame.key) appearance.current = { key: frame.key, seen: new WeakSet() }
    const cards = element.querySelectorAll('.catalog-result-item')
    if (reduced || !element.animate) {
      cards.forEach(card => appearance.current.seen.add(card))
      previousHeight.current = null
      return
    }
    const animations = []
    const reveal = createScrollReveal({ root: element, seen: appearance.current.seen, duration: 360, distance: catalogMotion.distance })
    cards.forEach(card => reveal.observe(card))
    if (!cards.length) {
      const body = element.querySelector('.catalog-result-body')
      if (body) reveal.observe(body)
    }
    const nextHeight = element.getBoundingClientRect().height
    const oldHeight = previousHeight.current
    if (oldHeight !== null && oldHeight !== nextHeight && Math.abs(oldHeight - nextHeight) <= window.innerHeight) {
      animations.push(element.animate([
        { height: `${oldHeight}px`, overflow: 'clip' },
        { height: `${nextHeight}px`, overflow: 'clip' },
      ], { duration: 220, easing: catalogMotion.easing }))
    }
    previousHeight.current = null
    return () => { reveal.disconnect(); animations.forEach(animation => animation.cancel()) }
  }, [frame.key, reduced])
  return <div className="catalog-results" ref={container} aria-busy={pending || (!reduced && replacing)}>
    <div className="sr-only" role="status" aria-live="polite">{shown.state === 'products' ? `${shown.products.length} ${t('products')}` : shown.state === 'loading' ? t('Loading products') : ''}</div>
    <div className="catalog-result-body" inert={!reduced && replacing ? true : undefined}>
      {shown.state === 'loading' ? <Loading /> : shown.state === 'error' ? <ErrorState error={shown.error} retry={retry} /> : shown.state === 'empty' ? <Empty /> : <div className="grid products catalog-products">{shown.products.map(product => <div className="catalog-result-item" key={product.id}>{renderProduct(product)}</div>)}</div>}
    </div>
  </div>
}
