export const categories = [{
  id: 1,
  name: 'Audio',
  description: 'Your world, in perfect sound.'
}, {
  id: 2,
  name: 'Computers',
  description: 'Make room for your next big idea.'
}, {
  id: 3,
  name: 'Accessories',
  description: 'Little upgrades. A big difference.'
}, {
  id: 4,
  name: 'Smart home',
  description: 'Everyday living, a little smarter.'
}, {
  id: 5,
  name: 'Wearables',
  description: 'Keep up with what moves you.'
}];
const photo = id => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=85`;
export const products = [{
  id: 1,
  categoryId: 1,
  categoryName: 'Audio',
  name: 'Sony WH-1000XM5',
  description: 'Find your focus with exceptional noise cancellation, rich balanced sound, and up to 30 hours of battery life. Lightweight over-ear comfort for your everyday soundtrack.',
  price: 649,
  stock: 18,
  imageUrl: photo('photo-1546435770-a3e426bf472b')
}, {
  id: 2,
  categoryId: 2,
  categoryName: 'Computers',
  name: 'MacBook Air 13″ M3',
  description: 'Remarkably thin. Incredibly capable. A brilliant 13-inch display, 16 GB memory and 512 GB storage make work and creativity feel effortless.',
  price: 2499,
  stock: 8,
  imageUrl: photo('photo-1517336714731-489689fd1ca8')
}, {
  id: 3,
  categoryId: 5,
  categoryName: 'Wearables',
  name: 'Apple Watch Series 9',
  description: 'A thoughtful companion for a healthier, more connected day. Track your activity, follow your workouts, and see the essentials at a glance.',
  price: 799,
  stock: 12,
  imageUrl: photo('photo-1546868871-7041f2a55e12')
}, {
  id: 4,
  categoryId: 3,
  categoryName: 'Accessories',
  name: 'Logitech MX Master 3S',
  description: 'Precision that feels natural. A quiet wireless mouse with an ergonomic shape, fast scrolling, and seamless multi-device control.',
  price: 219,
  stock: 4,
  imageUrl: photo('photo-1527814050087-3793815479db')
}, {
  id: 5,
  categoryId: 1,
  categoryName: 'Audio',
  name: 'Marshall Emberton II',
  description: 'Big sound for wherever you go. A compact portable Bluetooth speaker with a durable design and 30 hours of wireless listening.',
  price: 349,
  stock: 9,
  imageUrl: photo('photo-1608043152269-423dbba4e7e1')
}, {
  id: 6,
  categoryId: 3,
  categoryName: 'Accessories',
  name: 'Keychron K2 Wireless',
  description: 'A satisfying mechanical keyboard for your creative workspace. Compact layout, tactile switches, and wireless connectivity for Mac and Windows.',
  price: 189,
  stock: 22,
  imageUrl: photo('photo-1587829741301-dc798b83add3')
}, {
  id: 7,
  categoryId: 4,
  categoryName: 'Smart home',
  name: 'Ambient Desk Light',
  description: 'A warmer way to work. Adjustable brightness and color temperature, a minimal aluminum body, and a soft glow that brings your desk to life.',
  price: 129,
  stock: 3,
  imageUrl: photo('photo-1507473885765-e6ed057f782c')
}, {
  id: 8,
  categoryId: 1,
  categoryName: 'Audio',
  name: 'Nothing Ear Wireless',
  description: 'Clear calls and immersive listening in a pocket-sized design. Active noise cancellation with a comfortable fit and all-day charging case.',
  price: 249,
  stock: 16,
  imageUrl: photo('photo-1606220945770-b5b6c2c55bf1')
}, {
  id: 9,
  categoryId: 2,
  categoryName: 'Computers',
  name: 'Studio 27″ Monitor',
  description: 'See the bigger picture with a crisp 4K panel, accurate colors, USB-C connectivity and a clean, adjustable stand.',
  price: 899,
  stock: 6,
  imageUrl: photo('photo-1527443224154-c4a3942d3acf')
}, {
  id: 10,
  categoryId: 3,
  categoryName: 'Accessories',
  name: 'Everyday Tech Backpack',
  description: 'Everything in its place. A weather-resistant everyday backpack with a padded laptop sleeve and thoughtful pockets for your essentials.',
  price: 159,
  stock: 24,
  imageUrl: photo('photo-1553062407-98eeb64c6a62')
}, {
  id: 11,
  categoryId: 5,
  categoryName: 'Wearables',
  name: 'Active Fit Watch',
  description: 'Keep your goals close with heart-rate tracking, sleep insights, GPS workouts and a bright always-on screen.',
  price: 299,
  stock: 0,
  imageUrl: photo('photo-1523275335684-37898b6baf30')
}, {
  id: 12,
  categoryId: 4,
  categoryName: 'Smart home',
  name: 'Nest Home Speaker',
  description: 'Room-filling sound and simple voice control in a soft fabric design. A versatile speaker for your connected home.',
  price: 179,
  stock: 14,
  imageUrl: photo('photo-1589003077984-894e133dabab')
}];
export const users = [{
  id: 1,
  firstName: 'Alex',
  lastName: 'Morgan',
  email: 'user@aishop.test',
  role: 'USER'
}, {
  id: 2,
  firstName: 'Sam',
  lastName: 'Admin',
  email: 'admin@aishop.test',
  role: 'ADMIN'
}];
export const orders = [{
  id: 1001,
  userId: 1,
  status: 'DELIVERED',
  createdAt: '2026-10-26T10:30:00',
  totalAmount: 408,
  items: [{
    id: 1,
    productId: 4,
    productName: products[3].name,
    quantity: 1,
    unitPrice: 219,
    subtotal: 219
  }, {
    id: 2,
    productId: 6,
    productName: products[5].name,
    quantity: 1,
    unitPrice: 189,
    subtotal: 189
  }]
}, {
  id: 1002,
  userId: 1,
  status: 'PENDING',
  createdAt: '2026-11-02T14:00:00',
  totalAmount: 649,
  items: [{
    id: 3,
    productId: 1,
    productName: products[0].name,
    quantity: 1,
    unitPrice: 649,
    subtotal: 649
  }]
}];
