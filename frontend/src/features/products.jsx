import ProductResults from './ProductResults.jsx';
import { t } from "../i18n/bs.js";
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Sparkles, Plus, Star, SlidersHorizontal, Headphones, Laptop, Mouse, Smartphone, Keyboard, Check, Truck, ShieldCheck, Minus } from 'lucide-react';
import { service } from '../services';
import { useApp } from '../app/context';
import { money } from '../utils/shop';
import { Empty, ErrorState, Image, Loading, Missing } from '../components/ui';
export const useProducts = () => useQuery({
  queryKey: ['products'],
  queryFn: () => service.products()
});
export const useCategories = () => useQuery({
  queryKey: ['categories'],
  queryFn: () => service.categories()
});
export function ProductCard({
  product
}) {
  const {
    add
  } = useApp();
  const [busy, setBusy] = useState(false);
  return <article className="product-card"><Link to={`/products/${product.id}`} className="product-image"><Image src={product.imageUrl} alt={product.name} />{product.stock === 0 ? <span className="product-badge">{t("Sold out")}</span> : product.stock < 5 ? <span className="product-badge">{t("Only")} {product.stock} {t("left")}</span> : <span className="product-badge subtle">{t("Curated pick")}</span>}<span className="image-arrow"><ArrowUpRight size={18} /></span></Link><div className="product-info"><span className="product-category">{product.categoryName}</span><Link to={`/products/${product.id}`}><h3>{product.name}</h3></Link><p>{product.description}</p><div className="product-bottom"><strong>{money(product.price)}</strong><button className="add-btn" aria-busy={busy} disabled={busy || !product.stock} aria-label={`Dodaj ${product.name} u korpu`} onClick={() => {
          setBusy(true);
          void add(product).catch(() => {}).finally(() => setBusy(false));
        }}>{busy ? t("Adding…") : t("Dodaj u korpu")}</button></div></div></article>;
}
const categoryIcons = { laptopi: Laptop, telefoni: Smartphone, slusalice: Headphones, tastature: Keyboard, misevi: Mouse };
export function Home() {
  const navigate = useNavigate();
  const products = useProducts();
  const categories = useCategories();
  return <div className="container home"><section className="shop-intro"><h1>{t("Laptopi, telefoni i oprema")}</h1><form onSubmit={event => {
        event.preventDefault();
        navigate('/products?q=' + encodeURIComponent(new FormData(event.currentTarget).get('q')));
      }}><input aria-label={t("Pretra\u017Ei proizvode")} name="q" placeholder={t("Pretra\u017Ei proizvode")} /><button className="btn">{t("Pretra\u017Ei")}</button></form></section><section className="section"><div className="section-title"><h2>{t("Kategorije")}</h2><Link to="/products">{t("Svi proizvodi")}<ArrowRight size={16} /></Link></div>{categories.isError ? <ErrorState error={categories.error} /> : <div className="category-grid">{categories.data?.map(category => {
          const Icon = categoryIcons[category.slug] ?? Laptop;
          return <Link key={category.id} className="category-card" to={`/products?category=${category.id}`}><Icon size={24} /><strong>{category.name}</strong></Link>;
        })}</div>}</section><section className="section"><div className="section-title"><h2>{t("Izdvojeni proizvodi")}</h2><Link to="/products">{t("Prika\u017Ei sve")}<ArrowRight size={16} /></Link></div>{products.isPending ? <Loading /> : products.isError ? <ErrorState error={products.error} retry={() => void products.refetch()} /> : <div className="grid products">{products.data.slice(0, 6).map(product => <ProductCard key={product.id} product={product} />)}</div>}</section></div>;
}
export function Catalog() {
  const query = useProducts();
  const categories = useCategories();
  const [params, setParams] = useSearchParams();
  const [limit, setLimit] = useState(8);
  const search = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const max = params.get('max') ?? '';
  const sort = params.get('sort') ?? 'featured';
  const set = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);else next.delete(key);
    setParams(next);
    setLimit(8);
  };
  const filtered = (query.data ?? []).filter(p => (!category || p.categoryId === Number(category)) && (!max || p.price <= Number(max)) && `${p.name} ${p.description}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => sort === 'price-low' ? a.price - b.price : sort === 'price-high' ? b.price - a.price : sort === 'name' ? a.name.localeCompare(b.name) : 0);
  return <div className="container page"><div className="page-heading"><span className="eyebrow">{t("THE COLLECTION")}</span><h1>{t("Find your next favorite")}<span className="heading-dot">.</span></h1><p>{t("Thoughtfully selected tech. Ready for your everyday.")}</p></div><div className="catalog-layout"><aside className="filter-panel"><h3><SlidersHorizontal size={18} />{t("Refine your finds")}</h3><label className="field"><span>{t("Search")}</span><input value={search} onChange={e => set('q', e.target.value)} placeholder={t("What are you looking for?")} /></label><label className="field"><span>{t("Category")}</span><select value={category} onChange={e => set('category', e.target.value)}><option value="">{t("All categories")}</option>{categories.data?.map(c => <option value={c.id} key={c.id}>{c.name}</option>)}</select></label><label className="field"><span>{t("Maximum price (KM)")}</span><input type="number" min="0" value={max} placeholder={t("Any price")} onChange={e => set('max', e.target.value)} /></label><button className="text-btn" onClick={() => {
          setParams({});
          setLimit(8);
        }}>{t("Clear filters")}</button><div className="filter-ai"><Sparkles /><strong>{t("Need a little help?")}</strong><p>{t("Find a fit for your needs and budget.")}</p><Link to="/assistant">{t("Ask your assistant \u2192")}</Link></div></aside><div><div className="catalog-toolbar"><span>{filtered.length}{t("thoughtful finds")}</span><select aria-label={t("Sort products")} value={sort} onChange={e => set('sort', e.target.value)}><option value="featured">{t("Featured first")}</option><option value="price-low">{t("Price: low to high")}</option><option value="price-high">{t("Price: high to low")}</option><option value="name">{t("Name: A\u2013Z")}</option></select></div><ProductResults products={filtered.slice(0, limit)} pending={query.isPending} error={query.isError ? query.error : null} retry={() => void query.refetch()} renderProduct={product => <ProductCard product={product} />} />{!query.isPending && !query.isError && limit < filtered.length && <div className="load-more"><button className="btn secondary" onClick={() => setLimit(limit + 8)}>{t("Discover more")}</button></div>}</div></div></div>;
}
export function ProductDetails() {
  const {
    id
  } = useParams();
  const query = useProducts();
  const {
    add
  } = useApp();
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  if (query.isPending) return <div className="container page"><Loading /></div>;
  if (query.isError) return <div className="container page"><ErrorState error={query.error} /></div>;
  const p = query.data.find(p => p.id === Number(id));
  if (!p) return <Missing />;
  return <div className="container page"><div className="breadcrumbs"><Link to="/products">{t("Collection")}</Link> / {p.categoryName} / {p.name}</div><div className="detail-grid"><div><Image className="detail-image" src={p.imageUrl} alt={p.name} /><div className="gallery-thumbs">{[0, 1, 2].map(n => <button key={n} aria-label={`Uvećaj ${p.name}, prikaz ${n + 1}`} onClick={() => {
            const image = document.querySelector('.detail-image');
            if (image) image.style.objectPosition = n === 0 ? 'center' : n === 1 ? t("left") : 'right';
          }}><Image src={p.imageUrl} alt={`${p.name}, detalj ${n + 1}`} /></button>)}</div></div><div className="detail-copy"><span className="eyebrow">{p.categoryName}</span><h1>{p.name}</h1><strong className="detail-price">{money(p.price)}</strong><p>{p.description}</p><span className={`stock ${p.stock ? '' : 'out'}`}><Check size={16} />{p.stock ? `${p.stock} na stanju` : t("Currently out of stock")}</span><div className="purchase-row"><div className="quantity"><button aria-label={t("Decrease quantity")} disabled={quantity <= 1} onClick={() => setQuantity(quantity - 1)}><Minus size={15} /></button><input aria-label={t("Quantity")} type="number" min="1" max={p.stock} value={quantity} onChange={e => setQuantity(Math.max(1, Math.min(p.stock || 1, Number(e.target.value) || 1)))} /><button aria-label={t("Increase quantity")} disabled={quantity >= p.stock} onClick={() => setQuantity(quantity + 1)}><Plus size={15} /></button></div><button className="btn" disabled={!p.stock || busy} onClick={() => {
            setBusy(true);
            void add(p, quantity).catch(() => {}).finally(() => setBusy(false));
          }}>{busy ? t("Adding\u2026") : t("Add to bag")} <Plus size={18} /></button></div><div className="detail-perks"><p><Truck size={20} />{t("Free delivery on demo orders")}</p><p><ShieldCheck size={20} />{t("Simulated checkout. No payment collected.")}</p></div><Link className="text-btn" to="/assistant"><Sparkles size={16} />{t("Questions? Ask your AI assistant")}</Link></div></div><section className="section"><div className="section-title"><h2>{t("Good things go together.")}</h2><Link to="/products">{t("Explore all \u2192")}</Link></div><div className="grid products related-products">{query.data.filter(item => item.id !== p.id).sort((a, b) => Number(b.categoryId === p.categoryId) - Number(a.categoryId === p.categoryId)).slice(0, 4).map(item => <ProductCard key={item.id} product={item} />)}</div></section></div>;
}
