import * as seed from './data.js';
import { read, write, total, transitions } from '../utils/shop.js';
const key = 'aishop.mock.v1';
const load = () => read(key, structuredClone({ ...seed, carts: {} }));
const save = db => write(key, db);
const pause = () => new Promise(resolve => setTimeout(resolve, 250));
const session = () => read('aishop.session', null);
const current = () => {
  const user = load().users.find(u => u.id === session());
  if (!user) throw new Error('Please sign in to continue.');
  return user;
};
const admin = () => {
  if (current().role !== 'ADMIN') throw new Error('Administrator access required.');
};
const cartKey = () => String(session() ?? 'guest');
const getCart = () => {
  const db = load();
  const items = db.carts[cartKey()]?.items ?? [];
  return total(items.flatMap(item => {
    const product = db.products.find(product => product.id === item.productId);
    return product ? [{ ...item, productName: product.name, unitPrice: product.price }] : [];
  }));
};
const setCart = cart => {
  const db = load();
  db.carts[cartKey()] = cart;
  save(db);
  return cart;
};
const credentials = new Map();
const signIn = user => {
  const db = load();
  const guest = db.carts.guest;
  const target = db.carts[String(user.id)] ?? total([]);
  if (guest?.items.length) {
    const items = [...target.items];
    for (const item of guest.items) {
      const existing = items.find(i => i.productId === item.productId);
      const stock = db.products.find(p => p.id === item.productId)?.stock ?? 0;
      if (existing) existing.quantity = Math.min(stock, existing.quantity + item.quantity);else if (stock) items.push({
        ...item,
        quantity: Math.min(stock, item.quantity)
      });
    }
    db.carts[String(user.id)] = total(items.filter(item => item.quantity > 0));
    delete db.carts.guest;
    save(db);
  }
  write('aishop.session', user.id);
  return user;
};
export const mockService = {
  async initialize() {
    await pause();
    return load().users.find(u => u.id === session()) ?? null;
  },
  async login(input) {
    await pause();
    const email = input.email.trim().toLowerCase();
    const expected = email === 'user@aishop.test' ? 'User123!' : email === 'admin@aishop.test' ? 'Admin123!' : credentials.get(email);
    const user = load().users.find(u => u.email === email);
    if (!user || !expected || input.password !== expected) throw new Error('Invalid email or password. Newly registered mock passwords only last until reload.');
    return signIn(user);
  },
  async register(input) {
    await pause();
    const db = load();
    const email = input.email.trim().toLowerCase();
    if (db.users.some(u => u.email === email)) throw new Error('This email is already registered.');
    const user = {
      id: Date.now(),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email,
      role: 'USER'
    };
    db.users.push(user);
    save(db);
    credentials.set(email, input.password);
    return signIn(user);
  },
  async logout() {
    localStorage.removeItem('aishop.session');
  },
  async profile(input) {
    const user = {
      ...current(),
      ...input
    };
    const db = load();
    db.users = db.users.map(u => u.id === user.id ? user : u);
    save(db);
    return user;
  },
  async products() {
    await pause();
    const db = load();
    return db.products.map(p => ({
      ...p,
      categoryName: db.categories.find(c => c.id === p.categoryId)?.name ?? 'Uncategorized'
    }));
  },
  async saveProduct(input, id) {
    admin();
    const db = load();
    if (!db.categories.some(c => c.id === input.categoryId) || input.price <= 0 || !Number.isInteger(input.stock) || input.stock < 0) throw new Error('Check category, price and stock.');
    const product = {
      ...input,
      id: id ?? Date.now(),
      categoryName: db.categories.find(c => c.id === input.categoryId).name
    };
    db.products = id ? db.products.map(p => p.id === id ? product : p) : [...db.products, product];
    save(db);
    return product;
  },
  async deleteProduct(id) {
    admin();
    const db = load();
    if (db.orders.some(o => o.items.some(i => i.productId === id))) throw new Error('This product belongs to an order and cannot be deleted. Set its stock to zero instead.');
    db.products = db.products.filter(p => p.id !== id);
    for (const k of Object.keys(db.carts)) db.carts[k] = total(db.carts[k].items.filter(i => i.productId !== id));
    save(db);
  },
  async categories() {
    await pause();
    return load().categories;
  },
  async saveCategory(input, id) {
    admin();
    const db = load();
    if (db.categories.some(c => c.id !== id && c.name.toLowerCase() === input.name.trim().toLowerCase())) throw new Error('Category already exists.');
    const category = {
      ...input,
      name: input.name.trim(),
      id: id ?? Date.now()
    };
    db.categories = id ? db.categories.map(c => c.id === id ? category : c) : [...db.categories, category];
    save(db);
    return category;
  },
  async deleteCategory(id) {
    admin();
    const db = load();
    if (db.products.some(p => p.categoryId === id)) throw new Error('Move or delete products in this category first.');
    db.categories = db.categories.filter(c => c.id !== id);
    save(db);
  },
  async cart() {
    return getCart();
  },
  async addCart(productId, quantity) {
    const product = load().products.find(p => p.id === productId);
    const cart = getCart();
    const existing = cart.items.find(i => i.productId === productId);
    if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity + (existing?.quantity ?? 0) > product.stock) throw new Error('The requested quantity is not in stock.');
    if (existing) existing.quantity += quantity;else cart.items.push({
      id: productId,
      productId,
      productName: product.name,
      quantity,
      unitPrice: product.price,
      subtotal: 0
    });
    return setCart(total(cart.items));
  },
  async updateCart(id, quantity) {
    const cart = getCart();
    const item = cart.items.find(i => i.id === id);
    const product = load().products.find(p => p.id === item?.productId);
    if (!item || !product || !Number.isInteger(quantity) || quantity < 1 || quantity > product.stock) throw new Error('The requested quantity is not in stock.');
    item.quantity = quantity;
    return setCart(total(cart.items));
  },
  async removeCart(id) {
    return setCart(total(getCart().items.filter(i => i.id !== id)));
  },
  async orders(all) {
    await pause();
    const user = current();
    if (all) admin();
    return load().orders.filter(o => all || o.userId === user.id).sort((a, b) => b.id - a.id);
  },
  async checkout(shipping) {
    await pause();
    const user = current();
    const db = load();
    const cart = getCart();
    if (!cart.items.length) throw new Error('Your bag is empty.');
    for (const item of cart.items) {
      const p = db.products.find(p => p.id === item.productId);
      if (!p || p.stock < item.quantity) throw new Error(`Insufficient stock for ${item.productName}.`);
      item.unitPrice = p.price;
    }
    const order = {
      id: Date.now(),
      userId: user.id,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      totalAmount: total(cart.items).totalPrice,
      items: total(cart.items).items,
      shipping
    };
    for (const item of cart.items) db.products.find(p => p.id === item.productId).stock -= item.quantity;
    db.orders.push(order);
    db.carts[cartKey()] = total([]);
    save(db);
    return order;
  },
  async status(id, status) {
    admin();
    const db = load();
    const order = db.orders.find(o => o.id === id);
    if (!order || !transitions[order.status].includes(status)) throw new Error('Invalid order status transition.');
    if (status === 'CANCELLED') for (const item of order.items) {
      const product = db.products.find(p => p.id === item.productId);
      if (product) product.stock += item.quantity;
    }
    order.status = status;
    save(db);
    return order;
  },
  async users() {
    admin();
    await pause();
    return load().users;
  },
  async chat(prompt) {
    await new Promise(resolve => setTimeout(resolve, 700));
    const text = prompt.toLowerCase();
    const budget = text.match(/(?:under|below|budget|max)\s*(\d+)/)?.[1];
    let catalog = await this.products();
    const matches = catalog.filter(p => `${p.name} ${p.description} ${p.categoryName}`.toLowerCase().split(/\W+/).some(word => word.length > 3 && text.includes(word)));
    if (matches.length) catalog = matches;
    if (budget) catalog = catalog.filter(p => p.price <= Number(budget));
    catalog = catalog.filter(p => p.stock > 0).sort((a, b) => a.price - b.price).slice(0, 3);
    return {
      content: catalog.length ? `Here are ${catalog.length} in-stock picks${budget ? ` under ${budget} KM` : ' from our catalog'} that could be a good fit. ${catalog.map(p => `${p.name}: ${p.description.split('.')[0]}.`).join(' ')} Tell me your budget or what you will use it for to narrow things down. This is a simulated shopping assistant.` : 'I could not find an in-stock match within that budget. Try a higher budget, or ask about audio, computers, accessories, wearables, or smart home.',
      products: catalog
    };
  }
};
