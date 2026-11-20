// UI request guards and fallback titles do not authorize server operations.
export const conversationTitle = text => text.trim().replace(/\s+/g, ' ').slice(0, 80)
export const aiStatus = () => 'Pripremam odgovor...'
export function requestGate() {
  let version = 0
  return { next: () => ++version, current: value => value === version }
}
