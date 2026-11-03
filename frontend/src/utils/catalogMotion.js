export const catalogMotion = {
  exit: 120,
  entrance: 300,
  stagger: 40,
  maxStagger: 200,
  distance: 10,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
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
