import { createScrollReveal } from '../utils/scrollReveal.js';
import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
export default function MotionEffects() {
  const { pathname } = useLocation()
  const revealed = useRef(new WeakSet())
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (preference.matches || !window.IntersectionObserver || !Element.prototype.animate) return
    const animations = new Set()
    const animate = (element, distance, duration) => {
      const animation = element.animate([{ opacity: 0.35, transform: `translateY(${distance}px)` }, { opacity: 1, transform: 'translateY(0)' }], { duration, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' })
      animations.add(animation)
      animation.finished.catch(() => {}).finally(() => animations.delete(animation))
    }
    const root = document.getElementById('root')
    if (!root) return
    let transitioned = false
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        observer.unobserve(entry.target)
        if (revealed.current.has(entry.target)) continue
        revealed.current.add(entry.target)
        animate(entry.target, 7, 320)
      }
    }, { threshold: 0.12 })
    const products = createScrollReveal({ root, seen: revealed.current })
    const observed = new WeakSet()
    const observe = () => {
      const main = root.querySelector('main')
      if (!main) return
      if (!transitioned) { animate(main, 4, 240); transitioned = true }
      main.querySelectorAll('.home > .section, .stats-grid').forEach(section => {
        if (section.querySelector('.products')) return
        if (observed.has(section) || revealed.current.has(section)) return
        observed.add(section)
        observer.observe(section)
      })
      main.querySelectorAll('.home .products > .product-card, .related-products > .product-card').forEach(card => products.observe(card))
    }
    observe()
    const mutations = new MutationObserver(observe)
    mutations.observe(root, { childList: true, subtree: true })
    const cancel = () => {
      if (!preference.matches) return
      products.disconnect()
      observer.disconnect()
      mutations.disconnect()
      animations.forEach(animation => animation.cancel())
    }
    preference.addEventListener('change', cancel)
    return () => {
      products.disconnect()
      observer.disconnect()
      mutations.disconnect()
      preference.removeEventListener('change', cancel)
      animations.forEach(animation => animation.cancel())
    }
  }, [pathname])
  return null
}
