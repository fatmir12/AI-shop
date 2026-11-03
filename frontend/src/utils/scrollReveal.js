import { motion } from './motion.js'
export function createScrollReveal({ root, seen = new WeakSet(), duration = motion.scrollReveal, initialDuration = motion.productEntrance, distance = motion.distance } = {}) {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  const waiting = new Set()
  const running = new Map()
  let stopped = false
  let initialBatch = true
  const finish = element => {
    seen.add(element)
    waiting.delete(element)
    observer?.unobserve(element)
    running.get(element)?.cancel()
    running.delete(element)
  }
  const observer = !media.matches && window.IntersectionObserver ? new IntersectionObserver(entries => {
    let batchIndex = 0
    for (const entry of entries) {
      const element = entry.target
      if (!entry.isIntersecting || seen.has(element) || stopped) continue
      finish(element)
      if (!element.animate || element.contains(document.activeElement) || media.matches) continue
      try {
        const animation = element.animate([
          { opacity: 0, transform: `translateY(${distance}px)` },
          { opacity: 1, transform: 'translateY(0)' },
        ], {
          duration: initialBatch ? initialDuration : duration,
          delay: Math.min(batchIndex++ * motion.stagger, motion.maxStagger),
          easing: motion.entranceEasing,
          fill: 'backwards',
        })
        running.set(element, animation)
        animation.finished.catch(() => {}).finally(() => {
          if (running.get(element) === animation) running.delete(element)
        })
      } catch {
        finish(element)
      }
    }
    initialBatch = false
  }, { threshold: 0.12, rootMargin: '0px 0px 96px 0px' }) : null
  const focus = event => {
    for (const element of [...waiting, ...running.keys()]) {
      if (element.contains(event.target)) finish(element)
    }
  }
  const stop = (markSeen = false) => {
    stopped = true
    observer?.disconnect()
    if (markSeen) waiting.forEach(element => seen.add(element))
    waiting.clear()
    running.forEach(animation => animation.cancel())
    running.clear()
  }
  const preferenceChanged = () => { if (media.matches) stop(true) }
  root?.addEventListener('focusin', focus)
  media.addEventListener('change', preferenceChanged)
  return {
    observe(element) {
      if (seen.has(element)) return
      if (!observer || stopped || media.matches || element.contains(document.activeElement)) {
        seen.add(element)
        return
      }
      if (!waiting.has(element)) {
        waiting.add(element)
        observer.observe(element)
      }
    },
    disconnect() {
      stop()
      root?.removeEventListener('focusin', focus)
      media.removeEventListener('change', preferenceChanged)
    },
  }
}
