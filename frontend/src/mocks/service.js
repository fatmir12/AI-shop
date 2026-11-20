import { initialCategories, taxonomyError } from '../services/categories.js';
import { t } from "../i18n/bs.js";
import * as seed from './data.js';
import { read, write, total, transitions } from '../utils/shop.js';
const key = 'aishop.mock.v1';
const load = () => {
  const db = read(key, structuredClone({ ...seed, carts: {} }));
  if (db.taxonomyVersion !== 2) {
    db.products = db.products.map(product => {
      const replacement = seed.products.find(item => item.id === product.id);
      return replacement ? { ...replacement, price: product.price, stock: product.stock } : { ...product, categoryId: initialCategories.some(c => c.id === product.categoryId) ? product.categoryId : 1 };
    });
    db.categories = structuredClone(initialCategories);
    db.taxonomyVersion = 2;
    write(key, db);
  }
  return db;
};
const save = db => write(key, db);
const pause = () => new Promise(resolve => setTimeout(resolve, 250));
const session = () => read('aishop.session', null);
const current = () => {
  const user = load().users.find(u => u.id === session());
  if (!user) throw new Error(t("Please sign in to continue."));
  return user;
};
const admin = () => {
  if (current().role !== 'ADMIN') throw new Error(t("Administrator access required."));
};
const cartKey = () => String(session() ?? 'guest');
const getCart = () => {
  const db = load();
  const items = db.carts[cartKey()]?.items ?? [];
  return total(items.flatMap(item => {
    const product = db.products.find(product => product.id === item.productId);
    return product ? [{
      ...item,
      productName: product.name,
      unitPrice: product.price
    }] : [];
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
    if (!user || !expected || input.password !== expected) throw new Error(t("Invalid email or password. Newly registered mock passwords only last until reload."));
    return signIn(user);
  },
  async register(input) {
    await pause();
    const db = load();
    const email = input.email.trim().toLowerCase();
    if (db.users.some(u => u.email === email)) throw new Error(t("This email is already registered."));
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
      categoryName: db.categories.find(c => c.id === p.categoryId)?.name ?? t("Uncategorized")
    }));
  },
  async saveProduct(input, id) {
    admin();
    const db = load();
    if (!db.categories.some(c => c.id === input.categoryId) || input.price <= 0 || !Number.isInteger(input.stock) || input.stock < 0) throw new Error(t("Check category, price and stock."));
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
    if (db.orders.some(o => o.items.some(i => i.productId === id))) throw new Error(t("This product belongs to an order and cannot be deleted. Set its stock to zero instead."));
    db.products = db.products.filter(p => p.id !== id);
    for (const k of Object.keys(db.carts)) db.carts[k] = total(db.carts[k].items.filter(i => i.productId !== id));
    save(db);
  },
  async categories() {
    await pause();
    return load().categories;
  },
  async saveCategory() { admin(); throw new Error(taxonomyError); },
  async deleteCategory() { admin(); throw new Error(taxonomyError); },
  async cart() {
    return getCart();
  },
  async addCart(productId, quantity) {
    const product = load().products.find(p => p.id === productId);
    const cart = getCart();
    const existing = cart.items.find(i => i.productId === productId);
    if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity + (existing?.quantity ?? 0) > product.stock) throw new Error(t("The requested quantity is not in stock."));
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
    if (!item || !product || !Number.isInteger(quantity) || quantity < 1 || quantity > product.stock) throw new Error(t("The requested quantity is not in stock."));
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
    if (!cart.items.length) throw new Error(t("Your bag is empty."));
    for (const item of cart.items) {
      const p = db.products.find(p => p.id === item.productId);
      if (!p || p.stock < item.quantity) throw new Error(`Nedovoljna zaliha za ${item.productName}.`);
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
    if (!order || !transitions[order.status].includes(status)) throw new Error(t("Invalid order status transition."));
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
    const text = prompt.toLocaleLowerCase('bs-BA');
    const budget = text.match(/(?:do|ispod|budžet|under|below|max)\s*(\d+)/)?.[1];
    let catalog = await this.products();
    const slug = /laptop|posao/.test(text) ? 'laptopi' : /telefon|mobitel/.test(text) ? 'telefoni' : /sluš|slus|headphone/.test(text) ? 'slusalice' : /tastatur|keyboard/.test(text) ? 'tastature' : /miš|mise|mouse/.test(text) ? 'misevi' : null;
    const category = initialCategories.find(c => c.slug === slug);
    if (category) catalog = catalog.filter(p => p.categoryId === category.id);
    catalog = catalog.filter(p => p.stock > 0 && (!budget || p.price <= Number(budget))).sort((a,b) => a.price-b.price).slice(0,3);
    return { content: catalog.length ? 'Dostupni proizvodi prema vašem upitu: ' + catalog.map(p => p.name + ' — ' + p.description).join(' ') + ' Ovo je probna preporuka iz kataloga.' : 'Nema dostupnih proizvoda za navedene uslove. Pokušajte s drugim budžetom ili kategorijom.', products: catalog };
  }
};
