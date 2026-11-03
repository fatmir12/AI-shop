import { z } from 'zod';
z.config({ localeError: () => 'Provjerite unesenu vrijednost.' });
const id = z.number().int().positive();
const name = z.string().trim().min(1, 'Unesite naziv.').max(100);
const text = max => z.string().max(max).nullish().transform(value => value ?? '');
export const roleSchema = z.enum(['USER', 'ADMIN']);
export const statusSchema = z.enum(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']);
export const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1, 'Unesite lozinku.')
});
export const registerSchema = loginSchema.extend({
  firstName: name,
  lastName: name,
  password: z.string().min(8).max(72).refine(value => new TextEncoder().encode(value).length <= 72, 'Lozinka može sadržavati najviše 72 UTF-8 bajta.')
});
export const profileSchema = z.object({
  firstName: name,
  lastName: name
});
export const userSchema = profileSchema.extend({
  id,
  email: z.email(),
  role: roleSchema
});
export const categoryRequestSchema = z.object({
  name,
  description: text(500)
});
export const categorySchema = categoryRequestSchema.extend({
  id
});
export const productRequestSchema = z.object({
  categoryId: id,
  name: z.string().trim().min(1).max(150),
  description: text(1000),
  price: z.number().positive().max(9999999999.99).refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 0.0001, 'Cijena može imati najviše dvije decimale.'),
  stock: z.number().int().min(0).max(2147483647),
  imageUrl: z.union([z.literal(''), z.url().refine(value => /^https?:\/\//i.test(value), 'Unesite HTTP ili HTTPS adresu slike.')]).nullish().transform(value => value ?? '')
});
export const productSchema = productRequestSchema.extend({
  id,
  categoryName: z.string()
});
export const quantitySchema = z.number().int().min(1).max(2147483647);
export const shippingSchema = profileSchema.extend({
  email: z.email(),
  address: z.string().trim().min(5).max(200),
  city: name,
  postalCode: z.string().regex(/^\d{5}$/, 'Unesite petocifreni poštanski broj.'),
  phone: z.string().trim().min(6).max(30)
});
export const cartItemSchema = z.object({
  id,
  productId: id,
  productName: z.string(),
  unitPrice: z.number().nonnegative(),
  quantity: quantitySchema,
  subtotal: z.number().nonnegative()
});
export const cartSchema = z.object({
  cartId: id,
  items: z.array(cartItemSchema),
  totalPrice: z.number().nonnegative(),
  totalItems: z.number().int().nonnegative()
});
export const orderSchema = z.object({
  id,
  userId: id,
  status: statusSchema,
  totalAmount: z.number().nonnegative(),
  createdAt: z.string(),
  items: z.array(cartItemSchema),
  shipping: shippingSchema.optional()
});
export const authSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  tokenType: z.literal('Bearer'),
  expiresIn: z.number().positive(),
  userId: id,
  email: z.email(),
  role: roleSchema
});
export function validate(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success) throw new Error(result.error.issues.map(issue => `${'Unos'}: ${issue.message}`).join(' '));
  return result.data;
}
export function withValidation(adapter) {
  return {
    ...adapter,
    login: input => adapter.login(validate(loginSchema, input)),
    register: input => adapter.register(validate(registerSchema, input)),
    profile: input => adapter.profile(validate(profileSchema, input)),
    saveProduct: (input, id) => adapter.saveProduct(validate(productRequestSchema, input), id),
    saveCategory: (input, id) => adapter.saveCategory(validate(categoryRequestSchema, input), id),
    addCart: (productId, quantity) => adapter.addCart(productId, validate(quantitySchema, quantity)),
    updateCart: (id, quantity) => adapter.updateCart(id, validate(quantitySchema, quantity)),
    checkout: input => adapter.checkout(validate(shippingSchema, input)),
    status: (id, status) => adapter.status(id, validate(statusSchema, status)),
    chat: input => adapter.chat(validate(z.string().trim().min(1).max(1000), input))
  };
}
