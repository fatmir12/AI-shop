import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Package, ShoppingBag, Users, TrendingUp, Plus, Pencil, Trash2, Search, ArrowUpRight } from 'lucide-react';
import { service, isMock } from '../services';
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
  return <div className="admin-page-heading"><div><span className="eyebrow">AISHOP ADMINISTRATION</span><h1>{title}</h1><p>{text}</p></div>{children}</div>;
}
export function Dashboard() {
  const products = useProducts();
  const orders = useOrders();
  const users = useUsers();
  const revenue = orders.data?.filter(o => o.status !== 'CANCELLED').reduce((sum, o) => sum + o.totalAmount, 0) ?? 0;
  const stats = [{
    label: 'Total products',
    value: products.data?.length ?? '—',
    Icon: Package
  }, {
    label: 'Total orders',
    value: orders.data?.length ?? '—',
    Icon: ShoppingBag
  }, {
    label: 'Customers',
    value: users.data?.length ?? 'Unavailable',
    Icon: Users
  }, {
    label: 'Order value',
    value: money(revenue),
    Icon: TrendingUp
  }];
  return <><Heading title="A good day to grow." text="Here’s what’s happening in your store." /><div className="stats-grid">{stats.map(({
        label,
        value,
        Icon
      }) => <div className="stat" key={label}><span><Icon size={21} /></span><small>{label}</small><strong>{value}</strong><p>{label === 'Order value' ? 'All non-cancelled orders' : 'Current store total'}</p></div>)}</div><div className="admin-two-col"><section className="panel"><div className="section-title"><h2>Recent orders</h2><Link to="/admin/orders">View all <ArrowUpRight size={15} /></Link></div>{orders.isPending ? <Loading /> : orders.isError ? <ErrorState error={orders.error} /> : <OrderTable orders={orders.data.slice(0, 5)} />}</section><section className="panel"><div className="section-title"><h2>Stock watch</h2><span className="badge">5 or fewer</span></div>{products.isError ? <ErrorState error={products.error} /> : products.data?.filter(p => p.stock <= 5).map(p => <Link className="stock-row" to="/admin/products" key={p.id}><Image src={p.imageUrl} alt={p.name} /><span><strong>{p.name}</strong><small>{p.categoryName}</small></span><span className="status status-pending">{p.stock} left</span></Link>)}{products.data && !products.data.some(p => p.stock <= 5) && <Empty title="Stock looks healthy" text="No low-stock products." />}</section></div><section className="panel"><h2>Order pipeline</h2><p className="muted">Current order distribution, based on store data.</p><div className="pipeline">{['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map(status => {
          const count = orders.data?.filter(o => o.status === status).length ?? 0;
          return <div key={status}><div><Status status={status} /><strong>{count}</strong></div><progress aria-label={`${status} orders`} value={count} max={orders.data?.length || 1} /></div>;
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
      if (!name) throw new Error('Product name is required.');
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
      notify('Product saved');
    },
    onError: e => notify(errorMessage(e), true)
  });
  const del = useMutation({
    mutationFn: id => service.deleteProduct(id),
    onSuccess: async () => {
      await cache.invalidateQueries();
      setDeleting(null);
      notify('Product deleted');
    },
    onError: e => notify(errorMessage(e), true)
  });
  const p = edit && edit !== 'new' ? edit : null;
  const filtered = query.data?.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) && (!category || p.categoryId === Number(category)));
  return <><Heading title="Products" text="A thoughtful collection starts here."><button className="btn" onClick={() => {
        setEdit('new');
        setImage('');
      }}><Plus size={17} /> Add product</button></Heading><div className="panel"><div className="table-toolbar"><label className="search-input"><Search size={18} /><input aria-label="Search products" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…" /></label><select aria-label="Filter by category" value={category} onChange={e => setCategory(e.target.value)}><option value="">All categories</option>{categories.data?.map(c => <option value={c.id} key={c.id}>{c.name}</option>)}</select></div>{query.isPending ? <Loading /> : query.isError ? <ErrorState error={query.error} /> : !filtered?.length ? <Empty /> : <div className="table-scroll"><table><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead><tbody>{filtered.map(p => <tr key={p.id}><td><div className="table-product"><Image src={p.imageUrl} alt={p.name} /><strong>{p.name}</strong></div></td><td>{p.categoryName}</td><td>{money(p.price)}</td><td><span className={`status ${p.stock <= 5 ? 'status-pending' : 'status-delivered'}`}>{p.stock} in stock</span></td><td><div className="actions"><button className="icon-btn" aria-label={`Edit ${p.name}`} onClick={() => {
                    setEdit(p);
                    setImage(p.imageUrl);
                  }}><Pencil size={16} /></button><button className="icon-btn danger" aria-label={`Delete ${p.name}`} onClick={() => setDeleting(p)}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div>}</div>{edit && <Modal title={p ? 'Edit product' : 'Add a thoughtful find'} close={() => !mutation.isPending && setEdit(null)}><form onSubmit={e => {
        e.preventDefault();
        mutation.mutate({
          form: new FormData(e.currentTarget),
          id: p?.id
        });
      }}><Field label="Product name" name="name" required maxLength={150} defaultValue={p?.name} /><label className="field"><span>Category</span><select name="categoryId" defaultValue={p?.categoryId ?? ''} required><option value="" disabled>Select a category</option>{categories.data?.map(c => <option value={c.id} key={c.id}>{c.name}</option>)}</select></label><label className="field"><span>Description</span><textarea name="description" maxLength={1000} rows={3} defaultValue={p?.description} /></label><div className="form-row"><Field label="Price (KM)" name="price" type="number" min="0.01" max="9999999999.99" step="0.01" required defaultValue={p?.price} /><Field label="Stock" name="stock" type="number" min="0" max="2147483647" step="1" required defaultValue={p?.stock ?? 0} /></div><Field label="Image URL" name="imageUrl" type="url" maxLength={500} value={image} onChange={e => setImage(e.target.value)} placeholder="https://…" /><Image className="image-preview" src={image} alt="Product image preview" /><button className="btn full" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Save product'}</button></form></Modal>}{deleting && <Modal title="Delete this product?" close={() => !del.isPending && setDeleting(null)}><p>“{deleting.name}” will be removed from the catalog. Products linked to orders cannot be deleted.</p><div className="modal-actions"><button className="btn secondary" onClick={() => setDeleting(null)}>Keep product</button><button className="btn destructive" disabled={del.isPending} onClick={() => del.mutate(deleting.id)}>Delete product</button></div></Modal>}</>;
}
export function AdminCategories() {
  const query = useCategories();
  const products = useProducts();
  const [edit, setEdit] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const cache = useQueryClient();
  const {
    notify
  } = useApp();
  const save = useMutation({
    mutationFn: ({
      data,
      id
    }) => {
      const name = String(data.get('name')).trim();
      if (!name) throw new Error('Category name is required.');
      return service.saveCategory({
        name,
        description: String(data.get('description'))
      }, id);
    },
    onSuccess: async () => {
      await cache.invalidateQueries();
      setEdit(null);
      notify('Category saved');
    },
    onError: e => notify(errorMessage(e), true)
  });
  const del = useMutation({
    mutationFn: id => service.deleteCategory(id),
    onSuccess: async () => {
      await cache.invalidateQueries();
      setDeleting(null);
      notify('Category deleted');
    },
    onError: e => notify(errorMessage(e), true)
  });
  const c = edit && edit !== 'new' ? edit : null;
  return <><Heading title="Categories" text="Give every good find a place to belong."><button className="btn" onClick={() => setEdit('new')}><Plus size={17} /> Add category</button></Heading>{query.isPending ? <Loading /> : query.isError ? <ErrorState error={query.error} /> : !query.data.length ? <Empty /> : <div className="admin-category-grid">{query.data.map(c => <div className="panel" key={c.id}><span className="category-symbol"><Package /></span><h2>{c.name}</h2><p>{c.description}</p><span className="badge">{products.data?.filter(p => p.categoryId === c.id).length ?? 0} products</span><div className="modal-actions"><button className="btn secondary" onClick={() => setEdit(c)}><Pencil size={15} /> Edit</button><button className="icon-btn danger" onClick={() => setDeleting(c)} aria-label={`Delete ${c.name}`}><Trash2 size={17} /></button></div></div>)}</div>}{edit && <Modal title={c ? 'Edit category' : 'Add category'} close={() => !save.isPending && setEdit(null)}><form onSubmit={e => {
        e.preventDefault();
        save.mutate({
          data: new FormData(e.currentTarget),
          id: c?.id
        });
      }}><Field label="Category name" name="name" required maxLength={100} defaultValue={c?.name} /><label className="field"><span>Description</span><textarea name="description" maxLength={500} rows={3} defaultValue={c?.description} /></label><button className="btn full" disabled={save.isPending}>Save category</button></form></Modal>}{deleting && <Modal title="Delete category?" close={() => !del.isPending && setDeleting(null)}><p>Remove “{deleting.name}”? Categories must be empty before they can be deleted.</p><div className="modal-actions"><button className="btn secondary" onClick={() => setDeleting(null)}>Keep category</button><button className="btn destructive" disabled={del.isPending} onClick={() => del.mutate(deleting.id)}>Delete category</button></div></Modal>}</>;
}
function OrderTable({
  orders,
  select
}) {
  return !orders.length ? <Empty title="No orders yet" text="Orders will appear here after checkout." /> : <div className="table-scroll"><table><thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Total</th><th>Details</th></tr></thead><tbody>{orders.map(o => <tr key={o.id}><td><strong>#{o.id}</strong><small>{new Date(o.createdAt).toLocaleDateString()}</small></td><td>Customer #{o.userId}</td><td><Status status={o.status} /></td><td>{money(o.totalAmount)}</td><td>{select ? <button className="text-btn" onClick={() => select(o)}>View →</button> : <Link className="text-btn" to="/admin/orders">View →</Link>}</td></tr>)}</tbody></table></div>;
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
      notify('Order status updated');
    },
    onError: e => notify(errorMessage(e), true)
  });
  const order = query.data?.find(o => o.id === selected);
  return <><Heading title="Orders" text="Follow every find, from bag to doorstep." /><div className="panel"><div className="table-toolbar"><input aria-label="Search orders" placeholder="Search order or customer ID…" value={search} onChange={e => setSearch(e.target.value)} /><select value={filter} onChange={e => setFilter(e.target.value)} aria-label="Order status"><option value="">All statuses</option>{Object.keys(transitions).map(s => <option key={s}>{s}</option>)}</select></div>{query.isPending ? <Loading /> : query.isError ? <ErrorState error={query.error} /> : <OrderTable orders={query.data.filter(o => (!filter || o.status === filter) && `${o.id} ${o.userId}`.includes(search))} select={o => setSelected(o.id)} />}</div>{order && <Modal title="Order details" close={() => setSelected(null)}><OrderDetails order={order} />{transitions[order.status].length > 0 && <label className="field"><span>Update status</span><select disabled={update.isPending} value="" onChange={e => update.mutate({
          id: order.id,
          status: e.target.value
        })}><option value="" disabled>Select next status</option>{transitions[order.status].map(s => <option key={s}>{s}</option>)}</select></label>}</Modal>}</>;
}
export function AdminUsers() {
  const query = useUsers();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  return <><Heading title="Customers" text="The people behind every good find." /><div className="notice">{isMock ? 'Development directory. Roles are read-only; the backend has no user-management endpoint.' : 'The current backend supports only GET /users/me. An admin user directory requires a new endpoint.'}</div><div className="panel"><div className="table-toolbar"><label className="search-input"><Search size={18} /><input aria-label="Search customers" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email…" /></label></div>{query.isPending ? <Loading /> : query.isError ? <ErrorState error={query.error} /> : <div className="table-scroll"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Details</th></tr></thead><tbody>{query.data.filter(u => `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase())).map(u => <tr key={u.id}><td><strong>{u.firstName} {u.lastName}</strong></td><td>{u.email}</td><td><span className="badge">{u.role}</span></td><td><button className="text-btn" onClick={() => setSelected(u)}>View →</button></td></tr>)}</tbody></table>{!query.data.some(u => `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase())) && <Empty />}</div>}</div>{selected && <Modal title="Customer details" close={() => setSelected(null)}><span className="avatar large">{selected.firstName[0]}</span><h2>{selected.firstName} {selected.lastName}</h2><p>{selected.email}</p><p>Customer ID: {selected.id}</p><span className="badge">{selected.role}</span><p className="muted">Role changes require a future backend administration contract.</p></Modal>}</>;
}
