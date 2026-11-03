import axios from 'axios';
import { z } from 'zod';
import { authSchema, productSchema, categorySchema, cartSchema, orderSchema, userSchema, validate } from '../contracts.js';
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000
});
let tokens = null;
let expiresAt = 0;
let refresh = null;
http.interceptors.request.use(async config => {
  if (tokens && !config.url?.startsWith('/auth/')) {
    if (Date.now() >= expiresAt) {
      refresh ??= axios.post(`${http.defaults.baseURL}/auth/refresh`, {
        refreshToken: tokens.refreshToken
      }, {
        timeout: 15000
      }).then(r => {
        tokens = validate(authSchema, r.data);
        expiresAt = Date.now() + tokens.expiresIn * 1000;
      }).catch(error => {
        tokens = null;
        throw error;
      }).finally(() => {
        refresh = null;
      });
      await refresh;
    }
    if (tokens) config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  }
  return config;
});
http.interceptors.response.use(r => r, error => {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    tokens = null;
    window.dispatchEvent(new Event('aishop:session-expired'));
  }
  const message = axios.isAxiosError(error) ? typeof error.response?.data?.message === 'string' ? error.response.data.message : error.response?.status === 401 ? 'Your session has expired. Please sign in again.' : error.response?.status === 403 ? 'Access denied by the backend.' : error.response ? `API request failed (${error.response.status}).` : 'Cannot reach the backend. Check that Spring Boot is available on port 8081.' : error.message || 'API request failed.';
  return Promise.reject(new Error(message));
});
const unsupported = async () => {
  throw new Error('This feature has no endpoint in the current Spring Boot backend. See BACKEND_INTEGRATION.md.');
};
const authenticate = async (path, input) => {
  tokens = validate(authSchema, (await http.post(path, input)).data);
  expiresAt = Date.now() + tokens.expiresIn * 1000;
  try {
    return validate(userSchema, (await http.get('/users/me')).data);
  } catch (error) {
    tokens = null;
    throw error;
  }
};
export const apiService = {
  async initialize() {
    return tokens ? validate(userSchema, (await http.get('/users/me')).data) : null;
  },
  login: input => authenticate('/auth/login', input),
  register: input => authenticate('/auth/register', input),
  async logout() {
    const token = tokens?.refreshToken;
    tokens = null;
    if (token) await http.post('/auth/logout', {
      refreshToken: token
    });
  },
  profile: unsupported,
  async products() {
    return validate(z.array(productSchema), (await http.get('/products')).data);
  },
  async categories() {
    return validate(z.array(categorySchema), (await http.get('/categories')).data);
  },
  async saveProduct(input, id) {
    return validate(productSchema, (id ? await http.put(`/products/${id}`, input) : await http.post('/products', input)).data);
  },
  async deleteProduct(id) {
    await http.delete(`/products/${id}`);
  },
  async saveCategory(input, id) {
    return validate(categorySchema, (id ? await http.put(`/categories/${id}`, input) : await http.post('/categories', input)).data);
  },
  async deleteCategory(id) {
    await http.delete(`/categories/${id}`);
  },
  async cart() {
    return validate(cartSchema, (await http.get('/cart')).data);
  },
  async addCart(productId, quantity) {
    return validate(cartSchema, (await http.post('/cart/items', {
      productId,
      quantity
    })).data);
  },
  async updateCart(id, quantity) {
    return validate(cartSchema, (await http.put(`/cart/items/${id}`, {
      quantity
    })).data);
  },
  async removeCart(id) {
    return validate(cartSchema, (await http.delete(`/cart/items/${id}`)).data);
  },
  async orders(all) {
    return validate(z.array(orderSchema), (await http.get(all ? '/orders' : '/orders/my')).data);
  },
  checkout: async () => {
    throw new Error('The backend can create an order from the cart, but cannot store shipping details. Checkout is blocked until the shipping contract is agreed.');
  },
  async createOrderFromCart() {
    return validate(orderSchema, (await http.post('/orders')).data);
  },
  async status(id, status) {
    return validate(orderSchema, (await http.put(`/orders/${id}/status`, {
      status
    })).data);
  },
  users: unsupported,
  chat: unsupported
};
