import { statusLabel } from '../i18n/bs.js';
import { t } from "../i18n/bs.js";
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Package, ShoppingBag, Users, TrendingUp, Plus, Pencil, Trash2, Search, ArrowUpRight } from 'lucide-react';
import { service } from '../services';
import { useApp } from '../app/context';
import { useProducts, useCategories } from './products';
import { Empty, ErrorState, Field, Image, Loading, Modal, Status } from '../components/ui';
import { OrderDetails } from './account';
import { money, errorMessage, transitions } from '../utils/shop';
const useOrders = () => useQuery({
  queryKey: ['admin-orders'],
  queryFn: () => service.orders(true)
});
const useUsers = () => useQuery({
  queryKey: ['users'],
  queryFn: () => service.users()
});
function Heading({
  title,
  text,
  children
}) {
  return <div className="admin-page-heading"><div><span className="eyebrow">{t("AISHOP ADMINISTRATION")}</span><h1>{title}</h1><p>{text}</p></div>{children}</div>;
}
export function Dashboard() {
  const products = useProducts();
  const orders = useOrders();
  const users = useUsers();
  const revenue = orders.data?.filter(o => o.status !== 'CANCELLED').reduce((sum, o) => sum + o.totalAmount, 0) ?? 0;
  const stats = [{
    label: t("Total products"),
    value: products.data?.length ?? '—',
    Icon: Package
  }, {
    label: t("Total orders"),
    value: orders.data?.length ?? '—',
    Icon: ShoppingBag
  }, {
    label: t("Customers"),
    value: users.data?.length ?? t("Unavailable"),
    Icon: Users
  }, {
    label: t("Order value"),
    value: orders.data ? money(revenue) : '—',
    Icon: TrendingUp
  }];
  return <><Heading title={t("A good day to grow.")} text={t("Here\u2019s what\u2019s happening in your store.")} /><div className="stats-grid">{stats.map(({
        label,
        value,
        Icon
      }) => <div className="stat" key={label}><span><Icon size={21} /></span><small>{label}</small><strong>{value}</strong><p>{label === t("Order value") ? t("All non-cancelled orders") : t("Current store total")}</p></div>)}</div><div className="admin-two-col"><section className="panel"><div className="section-title"><h2>{t("Recent orders")}</h2><Link to="/admin/orders">{t("View all")}<ArrowUpRight size={15} /></Link></div>{orders.isPending ? <Loading /> : orders.isError ? <ErrorState error={orders.error} /> : <OrderTable orders={orders.data.slice(0, 5)} />}</section><section className="panel"><div className="section-title"><h2>{t("Stock watch")}</h2><span className="badge">{t("5 or fewer")}</span></div>{products.isError ? <ErrorState error={products.error} /> : products.data?.filter(p => p.stock <= 5).map(p => <Link className="stock-row" to="/admin/products" key={p.id}><Image src={p.imageUrl} alt={p.name} /><span><strong>{p.name}</strong><small>{p.categoryName}</small></span><span className="status status-pending">{p.stock}{t("left")}</span></Link>)}{products.data && !products.data.some(p => p.stock <= 5) && <Empty title={t("Stock looks healthy")} text={t("No low-stock products.")} />}</section></div><section className="panel"><h2>{t("Order pipeline")}</h2><p className="muted">{t("Current order distribution, based on store data.")}</p><div className="pipeline">{['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map(status => {
          const count = orders.data?.filter(o => o.status === status).length ?? 0;
          return <div key={status}><div><Status status={status} /><strong>{count}</strong></div><progress aria-label={`${statusLabel(status)} narudžbi`} value={count} max={orders.data?.length || 1} /></div>;
        })}</div></section></>;
}
export function AdminProducts() {
  const query = useProducts();
  const categories = useCategories();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [edit, setEdit] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [image, setImage] = useState('');
  const cache = useQueryClient();
  const {
    notify
  } = useApp();
  const mutation = useMutation({
    mutationFn: async ({
      form,
      id
    }) => {
      const name = String(form.get('name')).trim();
      if (!name) throw new Error(t("Product name is required."));
      return service.saveProduct({
        name,
        description: String(form.get('description')),
        categoryId: Number(form.get('categoryId')),
        price: Number(form.get('price')),
        stock: Number(form.get('stock')),
        imageUrl: String(form.get('imageUrl'))
      }, id);
    },
    onSuccess: async () => {
      await cache.invalidateQueries();
      setEdit(null);
      notify(t("Product saved"));
    },
    onError: e => notify(errorMessage(e), true)
  });
  const del = useMutation({
    mutationFn: id => service.deleteProduct(id),
    onSuccess: async () => {
      await cache.invalidateQueries();
      setDeleting(null);
      notify(t("Product deleted"));
    },
    onError: e => notify(errorMessage(e), true)
  });
  const p = edit && edit !== 'new' ? edit : null;
  const filtered = query.data?.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) && (!category || p.categoryId === Number(category)));
  return <><Heading title={t("Products")} text={t("A thoughtful collection starts here.")}><button className="btn" onClick={() => {
        setEdit('new');
        setImage('');
      }}><Plus size={17} />{t("Add product")}</button></Heading><div className="panel"><div className="table-toolbar"><label className="search-input"><Search size={18} /><input aria-label={t("Search products")} value={search} onChange={e => setSearch(e.target.value)} placeholder={t("Search products\u2026")} /></label><select aria-label={t("Filter by category")} value={category} onChange={e => setCategory(e.target.value)}><option value="">{t("All categories")}</option>{categories.data?.map(c => <option value={c.id} key={c.id}>{c.name}</option>)}</select></div>{query.isPending ? <Loading /> : query.isError ? <ErrorState error={query.error} /> : !filtered?.length ? <Empty /> : <div className="table-scroll"><table><thead><tr><th>{t("Product")}</th><th>{t("Category")}</th><th>{t("Price")}</th><th>{t("Stock")}</th><th>{t("Actions")}</th></tr></thead><tbody>{filtered.map(p => <tr key={p.id}><td><div className="table-product"><Image src={p.imageUrl} alt={p.name} /><strong>{p.name}</strong></div></td><td>{p.categoryName}</td><td>{money(p.price)}</td><td><span className={`status ${p.stock <= 5 ? 'status-pending' : 'status-delivered'}`}>{p.stock} {t("in stock")}</span></td><td><div className="actions"><button className="icon-btn" aria-label={`Uredi: ${p.name}`} onClick={() => {
                    setEdit(p);
                    setImage(p.imageUrl);
                  }}><Pencil size={16} /></button><button className="icon-btn danger" aria-label={`Obriši: ${p.name}`} onClick={() => setDeleting(p)}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div>}</div>{edit && <Modal title={p ? t("Edit product") : t("Add a thoughtful find")} close={() => !mutation.isPending && setEdit(null)}><form onSubmit={e => {
        e.preventDefault();
        mutation.mutate({
          form: new FormData(e.currentTarget),
          id: p?.id
        });
      }}><Field label={t("Product name")} name="name" required maxLength={150} defaultValue={p?.name} /><label className="field"><span>{t("Category")}</span><select name="categoryId" defaultValue={p?.categoryId ?? ''} required><option value="" disabled>{t("Select a category")}</option>{categories.data?.map(c => <option value={c.id} key={c.id}>{c.name}</option>)}</select></label><label className="field"><span>{t("Description")}</span><textarea name="description" maxLength={1000} rows={3} defaultValue={p?.description} /></label><div className="form-row"><Field label={t("Price (KM)")} name="price" type="number" min="0.01" max="9999999999.99" step="0.01" required defaultValue={p?.price} /><Field label={t("Stock")} name="stock" type="number" min="0" max="2147483647" step="1" required defaultValue={p?.stock ?? 0} /></div><Field label={t("Image URL")} name="imageUrl" type="url" maxLength={500} value={image} onChange={e => setImage(e.target.value)} placeholder="https://…" /><Image className="image-preview" src={image} alt={t("Product image preview")} /><button className="btn full" disabled={mutation.isPending}>{mutation.isPending ? t("Saving\u2026") : t("Save product")}</button></form></Modal>}{deleting && <Modal title={t("Delete this product?")} close={() => !del.isPending && setDeleting(null)}><p>“{deleting.name}{t("\u201D will be removed from the catalog. Products linked to orders cannot be deleted.")}</p><div className="modal-actions"><button className="btn secondary" onClick={() => setDeleting(null)}>{t("Keep product")}</button><button className="btn destructive" disabled={del.isPending} onClick={() => del.mutate(deleting.id)}>{t("Delete product")}</button></div></Modal>}</>;
}
export function AdminCategories() {
  const query = useCategories();
  const products = useProducts();
  return <><Heading title={t("Kategorije")} text={t("Pet definiranih kategorija kataloga.")} /><div className="notice">{t("Kategorije su dio definiranog kataloga. Dodavanje, preimenovanje i brisanje nije omogu\u0107eno.")}</div>{query.isPending ? <Loading /> : query.isError ? <ErrorState error={query.error} /> : <div className="admin-category-grid">{query.data.map(category => <section className="panel" key={category.id}><h2>{category.name}</h2><p>{category.description}</p><span className="badge">{products.data?.filter(product => product.categoryId === category.id).length ?? 0}{t("proizvoda")}</span></section>)}</div>}</>;
}
function OrderTable({
  orders,
  select
}) {
  return !orders.length ? <Empty title={t("No orders yet")} text={t("Orders will appear here after checkout.")} /> : <div className="table-scroll"><table><thead><tr><th>{t("Order")}</th><th>{t("Customer")}</th><th>{t("Status")}</th><th>{t("Total")}</th><th>{t("Details")}</th></tr></thead><tbody>{orders.map(o => <tr key={o.id}><td><strong>#{o.id}</strong><small>{new Date(o.createdAt).toLocaleDateString('bs-BA')}</small></td><td>{t("Customer #")}{o.userId}</td><td><Status status={o.status} /></td><td>{money(o.totalAmount)}</td><td>{select ? <button className="text-btn" onClick={() => select(o)}>{t("View \u2192")}</button> : <Link className="text-btn" to="/admin/orders">{t("View \u2192")}</Link>}</td></tr>)}</tbody></table></div>;
}
export function AdminOrders() {
  const query = useOrders();
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const cache = useQueryClient();
  const {
    notify
  } = useApp();
  const update = useMutation({
    mutationFn: ({
      id,
      status
    }) => service.status(id, status),
    onSuccess: async () => {
      await cache.invalidateQueries();
      notify(t("Order status updated"));
    },
    onError: e => notify(errorMessage(e), true)
  });
  const order = query.data?.find(o => o.id === selected);
  return <><Heading title={t("Orders")} text={t("Follow every find, from bag to doorstep.")} /><div className="panel"><div className="table-toolbar"><input aria-label={t("Search orders")} placeholder={t("Search order or customer ID\u2026")} value={search} onChange={e => setSearch(e.target.value)} /><select value={filter} onChange={e => setFilter(e.target.value)} aria-label={t("Order status")}><option value="">{t("All statuses")}</option>{Object.keys(transitions).map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}</select></div>{query.isPending ? <Loading /> : query.isError ? <ErrorState error={query.error} /> : <OrderTable orders={query.data.filter(o => (!filter || o.status === filter) && `${o.id} ${o.userId}`.includes(search))} select={o => setSelected(o.id)} />}</div>{order && <Modal title={t("Order details")} close={() => setSelected(null)}><OrderDetails order={order} />{transitions[order.status].length > 0 && <label className="field"><span>{t("Update status")}</span><select disabled={update.isPending} value="" onChange={e => update.mutate({
          id: order.id,
          status: e.target.value
        })}><option value="" disabled>{t("Select next status")}</option>{transitions[order.status].map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}</select></label>}</Modal>}</>;
}
export function AdminUsers() {
  const query = useUsers();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  return <><Heading title={t("Customers")} text={t("The people behind every good find.")} /><div className="notice">{t('Korisnički podaci su dostupni samo administratoru. Uloge su samo za pregled.')}</div><div className="panel"><div className="table-toolbar"><label className="search-input"><Search size={18} /><input aria-label={t("Search customers")} value={search} onChange={e => setSearch(e.target.value)} placeholder={t("Search name or email\u2026")} /></label></div>{query.isPending ? <Loading /> : query.isError ? <ErrorState error={query.error} /> : <div className="table-scroll"><table><thead><tr><th>{t("Name")}</th><th>{t("Email")}</th><th>{t("Role")}</th><th>{t("Details")}</th></tr></thead><tbody>{query.data.filter(u => `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase())).map(u => <tr key={u.id}><td><strong>{u.firstName} {u.lastName}</strong></td><td>{u.email}</td><td><span className="badge">{statusLabel(u.role)}</span></td><td><button className="text-btn" onClick={() => setSelected(u)}>{t("View \u2192")}</button></td></tr>)}</tbody></table>{!query.data.some(u => `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase())) && <Empty />}</div>}</div>{selected && <Modal title={t("Customer details")} close={() => setSelected(null)}><span className="avatar large">{selected.firstName[0]}</span><h2>{selected.firstName} {selected.lastName}</h2><p>{selected.email}</p><p>{t("Customer ID:")}{selected.id}</p><span className="badge">{statusLabel(selected.role)}</span><p className="muted">{t("Role changes require a future backend administration contract.")}</p></Modal>}</>;
}
