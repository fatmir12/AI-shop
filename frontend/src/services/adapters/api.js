import axios from 'axios'
import { z } from 'zod'
import { mapCategory } from '../categories.js'
import { shippingSchema, authSchema, productSchema, categorySchema, cartSchema, orderSchema, userSchema, aiResponseSchema, confirmationSchema, validate } from '../contracts.js'
export class ApiError extends Error {
  constructor(message, status, uncertain = false) { super(message); this.name = 'ApiError'; this.status = status; this.uncertain = uncertain }
}
export function createApiService({ baseURL = '/api', adapter, now = () => Date.now(), sessionExpired = () => window.dispatchEvent(new Event('aishop:session-expired')) } = {}) {
  const http = axios.create({ baseURL, timeout: 15000, ...(adapter ? { adapter } : {}) })
  const authHttp = axios.create({ baseURL, timeout: 15000, ...(adapter ? { adapter } : {}) })
  let tokens = null
  let expiresAt = 0
  let refresh = null
  let generation = 0
  const clear = () => { tokens = null; expiresAt = 0; generation++ }
  const expire = () => { clear(); sessionExpired() }
  const setTokens = data => { tokens = validate(authSchema, data); expiresAt = now() + tokens.expiresIn * 1000 }
  http.interceptors.request.use(async config => {
    if (!config.url.startsWith('/auth/') && tokens) {
      const expected = generation
      if (now() >= expiresAt - 10000) {
        if (!refresh || refresh.generation !== expected) {
          const refreshToken = tokens.refreshToken
          const operation = authHttp.post('/auth/refresh', { refreshToken }).then(response => {
            if (generation !== expected) throw new ApiError('Sesija je promijenjena. Prijavite se ponovo.', 401)
            setTokens(response.data)
          }).catch(error => { if (generation === expected) expire(); throw error })
          refresh = { generation: expected, operation }
          operation.finally(() => { if (refresh?.operation === operation) refresh = null }).catch(() => {})
        }
        await refresh.operation
      }
      if (!tokens || generation !== expected) throw new ApiError('Sesija je promijenjena. Prijavite se ponovo.', 401)
      config.headers.Authorization = `Bearer ${tokens.accessToken}`
      config.sessionGeneration = expected
    }
    return config
  })
  http.interceptors.response.use(response => {
    if (response.config.sessionGeneration !== undefined && response.config.sessionGeneration !== generation) throw new ApiError('Sesija je promijenjena. Zahtjev nije primijenjen na novi račun.', 401)
    return response
  }, error => {
    if (error instanceof ApiError) return Promise.reject(error)
    const status = error.response?.status
    const config = error.config ?? {}
    const auth = config.url?.startsWith('/auth/')
    const login = config.url === '/auth/login' || config.url === '/auth/register'
    if (status === 401 && !auth && config.sessionGeneration === generation) expire()
    const ai = config.url?.startsWith('/ai/')
    const timeout = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
    const messages = { 400: 'Provjerite podatke, raspoloživu zalihu i dozvoljenu promjenu statusa.', 401: login ? 'Neispravna e-mail adresa ili lozinka.' : 'Sesija je istekla. Prijavite se ponovo.', 403: 'Nemate pravo pristupa ovoj radnji.', 404: 'Traženi proizvod, stavka ili prijedlog nije pronađen.', 409: 'Podaci su promijenjeni ili je radnja već obrađena. Osvježite prikaz.', 410: 'Vrijeme za potvrdu je isteklo. Zatražite novi prijedlog.' }
    const reason = error.response?.data?.detail ?? error.response?.data?.message ?? ''
    const stock = /insufficient.*stock/i.test(reason)
    const message = stock ? 'Tražena količina nije na stanju.' : messages[status] ?? (ai ? timeout ? 'AI odgovor traje predugo. Provjerite Ollama model i MCP vezu. Zahtjev nije automatski ponovljen.' : 'AI asistent trenutno nije dostupan. Provjerite Ollama i MCP vezu.' : status ? 'Server nije mogao obraditi zahtjev. Pokušajte ponovo.' : 'Server nije dostupan. Provjerite Spring Boot i SQL Server.')
    return Promise.reject(new ApiError(message, status, (!status || status >= 500) && config.method !== 'get'))
  })
  const mutationResult = (schema, response) => {
    try { return validate(schema, response.data) } catch { throw new ApiError('Server je odgovorio, ali rezultat nije moguće prikazati. Provjerite korpu ili narudžbe prije novog pokušaja.', response.status, true) }
  }
  const authenticated = () => { if (!tokens) throw new ApiError('Prijavite se za nastavak.', 401) }
  const authenticate = async (path, input) => {
    const expected = ++generation
    tokens = null
    const response = await http.post(path, input)
    if (generation !== expected) throw new ApiError('Prijava je otkazana.', 401)
    setTokens(response.data)
    try { return validate(userSchema, (await http.get('/users/me')).data) }
    catch (error) { if (generation === expected) clear(); throw error }
  }
  return {
    http,
    async initialize() { return tokens ? validate(userSchema, (await http.get('/users/me')).data) : null },
    login: input => authenticate('/auth/login', input),
    register: input => authenticate('/auth/register', input),
    async logout() { const refreshToken = tokens?.refreshToken; clear(); if (refreshToken) await http.post('/auth/logout', { refreshToken }) },
    async profile(input) { authenticated(); return validate(userSchema, (await http.put('/users/me', input)).data) },
    async products() { return validate(z.array(productSchema), (await http.get('/products')).data) },
    async categories() { return validate(z.array(categorySchema), (await http.get('/categories')).data).map(mapCategory) },
    async saveProduct(input, id) { authenticated(); return validate(productSchema, (id ? await http.put(`/products/${id}`, input) : await http.post('/products', input)).data) },
    async deleteProduct(id) { authenticated(); await http.delete(`/products/${id}`) },
    async saveCategory(input, id) { authenticated(); return validate(categorySchema, (id ? await http.put(`/categories/${id}`, input) : await http.post('/categories', input)).data) },
    async deleteCategory(id) { authenticated(); await http.delete(`/categories/${id}`) },
    async cart() { authenticated(); return validate(cartSchema, (await http.get('/cart')).data) },
    async addCart(productId, quantity) { authenticated(); return validate(cartSchema, (await http.post('/cart/items', { productId, quantity })).data) },
    async updateCart(id, quantity) { authenticated(); return validate(cartSchema, (await http.put(`/cart/items/${id}`, { quantity })).data) },
    async removeCart(id) { authenticated(); return validate(cartSchema, (await http.delete(`/cart/items/${id}`)).data) },
    async orders(all) { authenticated(); return validate(z.array(orderSchema), (await http.get(all ? '/orders' : '/orders/my')).data) },
    async checkout(shipping) { authenticated(); const data = validate(shippingSchema, shipping); return mutationResult(orderSchema, await http.post('/orders', data)) },
    async status(id, status) { authenticated(); return validate(orderSchema, (await http.put(`/orders/${id}/status`, { status })).data) },
    async users() { authenticated(); return validate(z.array(userSchema), (await http.get('/users')).data) },
    async conversations() { authenticated(); return (await http.get('/ai/conversations')).data },
    async createConversation() { authenticated(); return (await http.post('/ai/conversations')).data },
    async conversation(id) { authenticated(); return (await http.get(`/ai/conversations/${id}`)).data },
    async deleteConversation(id) { authenticated(); await http.delete(`/ai/conversations/${id}`) },
    async chat(message, options = {}) {
      authenticated()
      const history = (options.history ?? []).slice(-12).map(({ role, content }) => ({ role, content: content.slice(0, 6000) }))
      const response = validate(aiResponseSchema, (await http.post(options.conversationId ? `/ai/conversations/${options.conversationId}/chat` : '/ai/chat', { message, cartAction: options.cartAction ?? null, history }, { timeout: 180000, headers: options.requestId ? { 'X-Chat-Request-ID': options.requestId } : {} })).data)
      const actions = response.pendingActions?.length ? response.pendingActions : response.pendingAction ? [response.pendingAction] : []
      return { content: response.reply, pendingActions: [...new Map(actions.map(action => [action.actionId, action])).values()] }
    },
    async confirmCartAction(actionId) { authenticated(); return mutationResult(confirmationSchema, await http.post(`/ai/cart-actions/${encodeURIComponent(actionId)}/confirm`)) },
  }
}
const env = import.meta.env ?? {}
export const apiService = createApiService({ baseURL: env.VITE_API_BASE_URL || '/api' })
export const http = apiService.http
