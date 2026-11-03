export function claimRequest(request, busy, handled) {
  if (!request?.id || !request.prompt?.trim() || busy || handled.has(request.id)) return false
  handled.add(request.id)
  return true
}
