import { motion } from './motion.js'
export const catalogMotion = {
  exit: motion.categoryExit,
  entrance: motion.categoryEntrance,
  stagger: motion.stagger,
  maxStagger: motion.maxStagger,
  distance: motion.distance,
  easing: motion.entranceEasing,
}
export function catalogResultKey(products, state) {
  return JSON.stringify([state, state === 'products' ? products.map(product => String(product.id)) : []])
}
export function catalogStagger(index) {
  return Math.min(index * catalogMotion.stagger, catalogMotion.maxStagger)
}
export function afterAnimation(animation, callback) {
  let cancelled = false
  animation.finished.then(() => { if (!cancelled) callback() }).catch(() => {})
  return () => { cancelled = true; animation.cancel() }
}
