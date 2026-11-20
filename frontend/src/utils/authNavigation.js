export function authDestination(state, role) {
  const from = state?.from
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') && !/^\/(login|register)/.test(from) && (role === 'ADMIN' || !from.startsWith('/admin')) ? from : role === 'ADMIN' ? '/admin' : '/account'
}
export function authReturnState(state) { return { ...state?.returnState, ...(state?.cartIntent ? { cartIntent: state.cartIntent } : {}) } }
