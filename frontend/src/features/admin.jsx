import ShippingDetails from '../components/ShippingDetails';
import { statusLabel } from '../i18n/bs.js';
import { t } from "../i18n/bs.js";
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Search, ArrowUpRight, ArrowLeft } from 'lucide-react';
import { service, isMock } from '../services';
import { useApp } from '../app/context';
import { useProducts, useCategories } from './products';
import { Empty, ErrorState, Field, Image, Modal, Status } from '../components/ui';
import { money, errorMessage, transitions } from '../utils/shop';
const date = value => `${new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value))}.`;
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
  return <div className="admin-page-heading"><div><h1>{title}</h1><p>{text}</p></div>{children}</div>;
}
function Loading() {
  return <div className="admin-loading" role="status" aria-label="Učitavanje podataka"><span /><span /><span /><span /><span className="sr-only">Učitavanje podataka…</span></div>;
}
export function Dashboard() {
  const products = useProducts();
  const orders = useOrders();
  const users = useUsers();
  const recent = [...(orders.data ?? [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 4);
  const lowStock = products.data?.filter(p => p.stock <= 5).sort((a, b) => a.stock - b.stock);
  const orderValue = orders.data?.filter(o => o.status !== 'CANCELLED').reduce((sum, o) => sum + o.totalAmount, 0);
  const stats = [
    ['Proizvodi', products, products.data?.length, 'U trenutnom katalogu'],
    ['Narudžbe', orders, orders.data?.length, 'Ukupno kreiranih narudžbi'],
    ['Korisnici', users, users.data?.length, 'Registrirani računi'],
    ['Vrijednost narudžbi', orders, orderValue === undefined ? undefined : money(orderValue), 'Sve neotkazane narudžbe']
  ];
  return <>
    <Heading title="Pregled prodavnice" text="Sve važne informacije o prodavnici na jednom mjestu."><Link className="btn" to="/admin/products?new=1"><Plus size={16} />Dodaj proizvod</Link></Heading>
    {isMock && <p className="admin-demo-label">DEMO PRIKAZ · Podaci se čuvaju u ovom pregledniku</p>}
    <div className="stats-grid">{stats.map(([label, query, metric, description]) => <section className="stat" key={label} aria-busy={query.isPending}><small>{label}</small><strong>{query.isError ? 'Nedostupno' : metric ?? '—'}</strong><p>{query.isError ? 'Podaci trenutno nisu dostupni' : description}</p></section>)}</div>
    <div className="admin-two-col"><section className="panel"><div className="section-title"><h2>Najnovije narudžbe</h2></div>{orders.isPending ? <Loading /> : orders.isError ? <ErrorState error={orders.error} retry={orders.refetch} /> : <><OrderTable orders={recent} compact users={users.data} /><Link className="btn secondary admin-view-all" to="/admin/orders">Sve narudžbe <ArrowUpRight size={14} /></Link></>}</section>
    <section className="panel"><div className="section-title"><h2>Potrebna dopuna zaliha</h2></div><p className="muted">Proizvodi sa 5 ili manje komada</p>{products.isPending ? <Loading /> : products.isError ? <ErrorState error={products.error} retry={products.refetch} /> : lowStock.length ? <div className="admin-stock-list">{lowStock.slice(0, 5).map(p => <Link className="stock-row" to={`/admin/products?edit=${p.id}`} key={p.id}><strong>{p.name}</strong><div><small>{p.categoryName}</small><span className="status status-pending">{p.stock} na stanju</span></div></Link>)}{lowStock.length > 5 && <Link className="text-btn" to="/admin/products">Pregledaj sve proizvode →</Link>}</div> : <Empty title="Zalihe su dovoljne" text="Nema proizvoda s niskim zalihama." />}</section></div>
    <section className="panel"><h2>Tok narudžbi</h2>{orders.isPending ? <Loading /> : orders.isError ? <ErrorState error={orders.error} retry={orders.refetch} /> : <div className="pipeline">{Object.keys(transitions).map(status => <div key={status}><strong>{orders.data.filter(o => o.status === status).length}</strong><span>{statusLabel(status)}</span></div>)}</div>}</section>
  </>;
}
export function AdminProducts() {
  const query = useProducts();
  const categories = useCategories();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [params, setParams] = useSearchParams();
  const creating = params.get('new') === '1';
  const editing = params.get('edit');
  const edit = creating ? 'new' : query.data?.find(item => String(item.id) === editing) ?? null;
  const setEdit = value => { mutation.reset(); setParams(value === 'new' ? { new: '1' } : value ? { edit: String(value.id) } : {}); };
  const [deleting, setDeleting] = useState(null);
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
        description: String(form.get('description')).trim(),
        categoryId: Number(form.get('categoryId')),
        price: Number(form.get('price')),
        stock: Number(form.get('stock')),
        imageUrl: String(form.get('imageUrl')).trim()
      }, id);
    },
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: ['products'] });
      setParams({});
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
  const filtered = query.data?.filter(p => p.name.toLocaleLowerCase('bs').includes(search.trim().toLocaleLowerCase('bs')) && (!category || p.categoryId === Number(category)));
  if (creating || editing) {
    if (query.isPending || categories.isPending) return <Loading />;
    if (query.isError || categories.isError) return <ErrorState error={query.error ?? categories.error} retry={() => { void query.refetch(); void categories.refetch(); }} />;
    if (editing && !p) return <Empty title="Proizvod nije pronađen" text="Proizvod je možda uklonjen iz kataloga."><button className="btn secondary" onClick={() => setEdit(null)}>Nazad na proizvode</button></Empty>;
    return <ProductEditor key={p?.id ?? 'new'} product={p} categories={categories.data} close={() => setEdit(null)} onSave={form => mutation.mutate({ form, id: p?.id })} pending={mutation.isPending} error={mutation.error} />;
  }
  return <><Heading title="Proizvodi" text="Upravljaj katalogom, cijenama i dostupnim zalihama."><button className="btn" onClick={() => {
        setEdit('new');
      }}><Plus size={17} />{t("Add product")}</button></Heading><div className="panel"><div className="table-toolbar"><label className="search-input"><Search size={18} /><input type="search" aria-label={t("Search products")} value={search} onChange={e => setSearch(e.target.value)} placeholder={t("Search products\u2026")} /></label><select aria-label={t("Filter by category")} value={category} onChange={e => setCategory(e.target.value)}><option value="">{t("All categories")}</option>{categories.data?.map(c => <option value={c.id} key={c.id}>{c.name}</option>)}</select></div>{categories.isError && <ErrorState error={categories.error} retry={categories.refetch} />}{query.data && <p className="admin-table-count">Prikazano {filtered.length} od {query.data.length} proizvoda</p>}{query.isPending ? <Loading /> : query.isError ? <ErrorState error={query.error} retry={query.refetch} /> : !filtered?.length ? <Empty /> : <div className="table-scroll"><table><thead><tr><th>{t("Product")}</th><th>{t("Category")}</th><th>{t("Price")}</th><th>{t("Stock")}</th><th>{t("Actions")}</th></tr></thead><tbody>{filtered.map(p => <tr key={p.id}><td><strong>{p.name}</strong></td><td>{p.categoryName}</td><td>{money(p.price)}</td><td><span className={`status ${p.stock <= 5 ? 'status-pending' : 'status-delivered'}`}>{p.stock} {t("in stock")}</span></td><td><div className="actions"><button className="text-btn" aria-label={`Uredi: ${p.name}`} onClick={() => {
                    setEdit(p);
                  }}>Uredi</button><button className="text-btn danger" aria-label={`Obriši: ${p.name}`} onClick={() => { del.reset(); setDeleting(p); }}>Obriši</button></div></td></tr>)}</tbody></table></div>}<p className="admin-table-note">Brisanje proizvoda povezanih s narudžbama može biti onemogućeno.</p></div>{deleting && <Modal title={t("Delete this product?")} close={() => !del.isPending && setDeleting(null)}><p>“{deleting.name}{t("\u201D will be removed from the catalog. Products linked to orders cannot be deleted.")}</p>{del.isError && <div className="form-error" role="alert">{errorMessage(del.error)}</div>}<div className="modal-actions"><button className="btn secondary" disabled={del.isPending} onClick={() => setDeleting(null)}>{t("Keep product")}</button><button className="btn destructive" disabled={del.isPending} onClick={() => del.mutate(deleting.id)}>{t("Delete product")}</button></div></Modal>}</>;
}
export function AdminCategories() {
  const query = useCategories();
  const products = useProducts();
  return <><Heading title="Kategorije" text="Pet definiranih kategorija AIShop kataloga." /><div className="notice">{t("Kategorije su dio definiranog kataloga. Dodavanje, preimenovanje i brisanje nije omogu\u0107eno.")}</div>{query.isPending ? <Loading /> : query.isError ? <ErrorState error={query.error} /> : <div className="admin-category-grid">{query.data.map(category => <section className="panel" key={category.id}><h2>{category.name}</h2><p>{category.description}</p><span className="badge">{products.isError ? "Broj proizvoda nedostupan" : products.isPending ? "Učitavanje…" : `${products.data.filter(product => product.categoryId === category.id).length} proizvoda`}</span></section>)}</div>}</>;
}
function ProductEditor({ product, categories, close, onSave, pending, error }) {
  const [image, setImage] = useState(product?.imageUrl ?? '');
  return <><Heading title={product ? 'Uredi proizvod' : 'Dodaj proizvod'} text="Unesi osnovne podatke i dostupnost proizvoda."><button className="btn secondary" onClick={close} disabled={pending}><ArrowLeft size={16} />Nazad na proizvode</button></Heading>
    <section className="panel admin-product-editor"><h2>Osnovne informacije</h2><form onSubmit={event => { event.preventDefault(); onSave(new FormData(event.currentTarget)); }}>
      <div className="form-row"><Field label="Naziv proizvoda *" name="name" required maxLength={150} defaultValue={product?.name} placeholder="npr. Lenovo ThinkPad E14" /><label className="field"><span>Kategorija *</span><select name="categoryId" required defaultValue={product?.categoryId ?? ''}><option value="" disabled>Odaberi kategoriju</option>{categories.map(category => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label></div>
      <label className="field"><span>Opis</span><textarea name="description" maxLength={1000} rows={3} defaultValue={product?.description} placeholder="Opiši glavne karakteristike proizvoda" /></label>
      <div className="form-row"><Field label="Cijena (KM) *" name="price" type="number" min="0.01" max="9999999999.99" step="0.01" required defaultValue={product?.price} placeholder="0,00" /><Field label="Količina na stanju *" name="stock" type="number" min="0" max="2147483647" step="1" required defaultValue={product?.stock ?? 0} /></div>
      <Field label="URL slike" name="imageUrl" type="url" maxLength={500} value={image} onChange={event => setImage(event.target.value)} placeholder="https://…" />
      {image && <Image className="image-preview" src={image} alt="Pregled slike proizvoda" />}
      <p className="muted">Slika se dodaje putem URL-a. Polja označena zvjezdicom su obavezna.</p>
      {error && <div className="form-error" role="alert">{errorMessage(error)}</div>}
      <div className="admin-form-actions"><button className="btn" disabled={pending}>{pending ? 'Čuvanje…' : 'Sačuvaj proizvod'}</button><button type="button" className="btn secondary" onClick={close} disabled={pending}>Odustani</button></div>
    </form></section></>;
}
function customerName(id, users = []) {
  const user = users.find(item => item.id === id);
  return user ? `${user.firstName} ${user.lastName}`.trim() : `Korisnik #${id}`;
}
function OrderTable({ orders, compact = false, users = [] }) {
  return !orders.length ? <Empty title="Nema narudžbi" text="Narudžbe će se prikazati nakon kupovine ili promjene filtera." /> : <div className="table-scroll"><table><thead><tr><th>Narudžba</th><th>Kupac</th>{!compact && <th>Datum</th>}<th>Status</th><th>Plaćanje</th><th>{compact ? 'Iznos' : 'Ukupno'}</th>{!compact && <th>Akcija</th>}</tr></thead><tbody>{orders.map(order => <tr key={order.id}><td><Link className="admin-order-link" to={`/admin/orders?order=${order.id}`}>#{order.id}</Link></td><td>{customerName(order.userId, users)}<small className="admin-user-id">#{order.userId}</small></td>{!compact && <td>{date(order.createdAt)}</td>}<td><Status status={order.status} /></td><td>{isMock ? 'Probna narudžba' : order.paymentStatus === 'PAID' ? 'Plaćeno' : 'Čeka uplatu'}</td><td>{money(order.totalAmount)}</td>{!compact && <td><Link className="text-btn" to={`/admin/orders?order=${order.id}`}>Detalji →</Link></td>}</tr>)}</tbody></table></div>;
}
export function AdminOrders() {
  const query = useOrders();
  const users = useUsers();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState(''), [search, setSearch] = useState('');
  const cache = useQueryClient();
  const { notify } = useApp();
  const selected = params.get('order');
  const order = query.data?.find(item => String(item.id) === selected);
  const update = useMutation({ mutationFn: ({ id, status }) => service.status(id, status), onSuccess: async () => { await Promise.all([cache.invalidateQueries({ queryKey: ['admin-orders'] }), cache.invalidateQueries({ queryKey: ['orders'] }), cache.invalidateQueries({ queryKey: ['products'] })]); notify('Status narudžbe je ažuriran.'); } });
  if (selected) {
    if (query.isPending) return <Loading />;
    if (query.isError) return <ErrorState error={query.error} retry={query.refetch} />;
    if (!order) return <Empty title="Narudžba nije pronađena" text="Provjeri broj narudžbe."><button className="btn secondary" onClick={() => setParams({})}>Nazad na narudžbe</button></Empty>;
    return <><Heading title={`Narudžba #${order.id}`} text="Detalji narudžbe i upravljanje statusom."><button className="btn secondary" onClick={() => { update.reset(); setParams({}); }}><ArrowLeft size={16} />Sve narudžbe</button></Heading><div className="admin-two-col"><section className="panel"><h2>Stavke narudžbe</h2><div className="table-scroll"><table><thead><tr><th>Proizvod</th><th>Količina</th><th>Cijena</th><th>Ukupno</th></tr></thead><tbody>{order.items.map(item => <tr key={item.id}><td><Link to={`/products/${item.productId}`}>{item.productName}</Link></td><td>{item.quantity}</td><td>{money(item.unitPrice)}</td><td>{money(item.subtotal)}</td></tr>)}</tbody></table></div><p className="admin-order-total">Ukupno: {money(order.totalAmount)}</p></section><section className="panel admin-order-summary"><h2>Sažetak narudžbe</h2><Status status={order.status} /><p>Plaćanje: {isMock ? 'probna narudžba' : order.paymentStatus === 'PAID' ? 'plaćeno' : 'čeka uplatu'}</p><p>Kupac: {customerName(order.userId, users.data)}<small className="admin-user-id">#{order.userId}</small></p><p className="muted">Kreirano: {date(order.createdAt)}</p><hr /><ShippingDetails shipping={order.shipping} /><hr /><h3>Promijeni status</h3>{(transitions[order.status] ?? []).length ? <div className="admin-status-actions">{transitions[order.status].map(status => <button key={status} className={`btn ${status === 'CANCELLED' ? 'secondary' : ''}`} disabled={update.isPending} onClick={() => update.mutate({ id: order.id, status })}>{update.isPending && update.variables?.status === status ? 'Čuvanje…' : { CONFIRMED: 'Potvrdi narudžbu', CANCELLED: 'Otkaži narudžbu', SHIPPED: 'Označi kao poslano', DELIVERED: 'Označi kao dostavljeno' }[status]}</button>)}</div> : <p className="muted">Ova narudžba je u završnom statusu.</p>}{update.isError && <div className="form-error" role="alert">{errorMessage(update.error)}</div>}<p className="muted">Dostupne su samo dozvoljene promjene statusa.</p></section></div></>;
  }
  const filtered = query.data?.filter(item => (!filter || item.status === filter) && `${item.id} ${item.userId} ${customerName(item.userId, users.data)} ${users.data?.find(user => user.id === item.userId)?.email ?? ''}`.toLocaleLowerCase('bs').includes(search.trim().replace(/^#/, '').toLocaleLowerCase('bs'))).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return <><Heading title="Narudžbe" text="Prati narudžbe i ažuriraj dozvoljene statuse." /><section className="panel"><div className="table-toolbar"><label className="search-input"><Search size={17} /><input type="search" aria-label="Pretraži narudžbe" placeholder="Broj narudžbe, ime ili email…" value={search} onChange={event => setSearch(event.target.value)} /></label><select aria-label="Status narudžbe" value={filter} onChange={event => setFilter(event.target.value)}><option value="">Svi statusi</option>{Object.keys(transitions).map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></div>{query.isPending ? <Loading /> : query.isError ? <ErrorState error={query.error} retry={query.refetch} /> : <OrderTable orders={filtered} users={users.data} />}</section></>;
}
export function AdminUsers() {
  const query = useUsers();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  return <><Heading title="Korisnici" text="Pregled registriranih korisnika i njihovih uloga." /><div className="panel"><div className="table-toolbar"><label className="search-input"><Search size={18} /><input aria-label={t("Search customers")} value={search} onChange={e => setSearch(e.target.value)} placeholder={t("Search name or email\u2026")} /></label></div>{query.isPending ? <Loading /> : query.isError ? <ErrorState error={query.error} /> : <div className="table-scroll"><table><thead><tr><th>{t("Name")}</th><th>{t("Email")}</th><th>{t("Role")}</th><th>{t("Details")}</th></tr></thead><tbody>{query.data.filter(u => `${u.firstName} ${u.lastName} ${u.email}`.toLocaleLowerCase('bs').includes(search.trim().toLocaleLowerCase('bs'))).map(u => <tr key={u.id}><td><strong>{u.firstName} {u.lastName}</strong></td><td>{u.email}</td><td><span className="badge">{statusLabel(u.role)}</span></td><td><button className="text-btn" onClick={() => setSelected(u)}>{t("View \u2192")}</button></td></tr>)}</tbody></table>{!query.data.some(u => `${u.firstName} ${u.lastName} ${u.email}`.toLocaleLowerCase('bs').includes(search.trim().toLocaleLowerCase('bs'))) && <Empty />}</div>}<p className="admin-table-note">Uloge su samo za pregled.</p></div>{selected && <Modal title={t("Customer details")} close={() => setSelected(null)}><span className="avatar large">{selected.firstName[0]}</span><h2>{selected.firstName} {selected.lastName}</h2><p>{selected.email}</p><p>{t("Customer ID:")}{selected.id}</p><span className="badge">{statusLabel(selected.role)}</span><p className="muted">{t("Uloge su samo za pregled.")}</p></Modal>}</>;
}
