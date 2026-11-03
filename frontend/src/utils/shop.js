export const money = value => `${new Intl.NumberFormat('bs-BA', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}).format(value)} KM`;
export const total = items => ({
  cartId: 1,
  items: items.map(i => ({
    ...i,
    subtotal: Math.round(i.unitPrice * 100) * i.quantity / 100
  })),
  totalPrice: items.reduce((sum, i) => sum + Math.round(i.unitPrice * 100) * i.quantity, 0) / 100,
  totalItems: items.reduce((sum, i) => sum + i.quantity, 0)
});
export const transitions = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: []
};
export function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback;
  } catch {
    return fallback;
  }
}
export function write(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}
export const errorMessage = error => error instanceof Error ? error.message : 'Something went wrong. Please try again.';
