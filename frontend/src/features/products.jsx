import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Sparkles, Plus, Star, SlidersHorizontal, Headphones, Laptop, Mouse, House, Watch, Check, Truck, ShieldCheck, Minus } from 'lucide-react';
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
  return <article className="product-card"><Link to={`/products/${product.id}`} className="product-image"><Image src={product.imageUrl} alt={product.name} />{product.stock === 0 ? <span className="product-badge">Sold out</span> : product.stock < 5 ? <span className="product-badge">Only {product.stock} left</span> : <span className="product-badge subtle">Curated pick</span>}<span className="image-arrow"><ArrowUpRight size={18} /></span></Link><div className="product-info"><span className="product-category">{product.categoryName}</span><Link to={`/products/${product.id}`}><h3>{product.name}</h3></Link><p>{product.description}</p><div className="product-bottom"><strong>{money(product.price)}</strong><button className="add-btn" disabled={busy || !product.stock} aria-label={`Add ${product.name} to bag`} onClick={() => {
          setBusy(true);
          void add(product).catch(() => {}).finally(() => setBusy(false));
        }}><Plus size={19} /></button></div></div></article>;
}
const icons = [Headphones, Laptop, Mouse, House, Watch];
export function Home() {
  const products = useProducts();
  const categories = useCategories();
  return <div className="container home"><section className="hero"><div className="hero-copy"><span className="hero-label"><span /> A smarter way to discover</span><h1>Great finds.<br />Made <span>personal.</span></h1><p>Discover tech you’ll love, without the endless scrolling. A thoughtfully curated shop, with a little help from AI.</p><div className="hero-buttons"><Link to="/products" className="btn">Explore the collection <ArrowRight size={18} /></Link><Link to="/assistant" className="btn glass"><Sparkles size={17} /> Ask AIShop</Link></div><div className="hero-note"><span className="mini-avatars">✦</span><div><strong>Your next favorite is out there.</strong><small>Let’s find it together.</small></div></div></div><div className="hero-visual"><Image src="https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1200&q=90" alt="A thoughtfully arranged workspace with everyday technology" /><div className="hero-visual-shade" /><span className="floating-label"><Sparkles size={16} /> Selected for your everyday</span><div className="hero-product"><span>THE EVERYDAY EDIT</span><h3>Small upgrades.<br />Endless possibilities.</h3><Link to="/products">Find your essentials <ArrowUpRight size={18} /></Link></div></div></section><section className="section"><div className="section-title"><div><span className="eyebrow">FIND YOUR THING</span><h2>Shop by category</h2></div><Link to="/products">Explore all <ArrowRight size={16} /></Link></div>{categories.isError ? <ErrorState error={categories.error} /> : <div className="category-grid">{categories.data?.map((c, i) => {
          const Icon = icons[i % icons.length];
          return <Link to={`/products?category=${c.id}`} key={c.id} className={`category-card category-${i % 5}`}><span><Icon size={27} strokeWidth={1.5} /></span><strong>{c.name}</strong><ArrowUpRight size={17} /></Link>;
        })}</div>}</section><section className="section"><div className="section-title"><div><span className="eyebrow">WORTH A CLOSER LOOK</span><h2>Everyday favorites<span className="heading-dot">.</span></h2><p>Good design. Great performance. All in one place.</p></div><Link to="/products">Shop all products <ArrowRight size={16} /></Link></div>{products.isPending ? <Loading /> : products.isError ? <ErrorState error={products.error} retry={() => void products.refetch()} /> : <div className="grid products">{products.data.slice(0, 4).map(p => <ProductCard key={p.id} product={p} />)}</div>}</section><section className="ai-banner"><div className="ai-orb"><Sparkles size={38} /></div><div><span className="eyebrow">MEET YOUR SHOPPING SIDEKICK</span><h2>A little guidance. A perfect match.</h2><p>Tell us what you’re looking for. Your AI assistant will take it from there.</p></div><Link to="/assistant" className="btn">Let’s find your fit <ArrowUpRight size={17} /></Link></section><section className="section"><div className="section-title"><div><span className="eyebrow">THE LITTLE THINGS THAT MATTER</span><h2>Built around your everyday</h2></div></div><div className="editorial-grid"><Link to="/products?category=2" className="editorial"><Image src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1000&q=85" alt="Calm and light-filled creative workspace" /><div><span>WORK, REIMAGINED</span><h3>A space for your best ideas.</h3><p>Upgrade your workspace <ArrowUpRight size={17} /></p></div></Link><Link to="/products?category=1" className="editorial"><Image src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1000&q=85" alt="Immersive music and sound equipment" /><div><span>TURN UP THE EVERYDAY</span><h3>Find your own frequency.</h3><p>Discover audio essentials <ArrowUpRight size={17} /></p></div></Link></div></section><div className="trust-note"><Star size={16} fill="currentColor" /> Thoughtfully selected. Simply better. <span>That’s the AIShop way.</span></div></div>;
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
  return <div className="container page"><div className="page-heading"><span className="eyebrow">THE COLLECTION</span><h1>Find your next favorite<span className="heading-dot">.</span></h1><p>Thoughtfully selected tech. Ready for your everyday.</p></div><div className="catalog-layout"><aside className="filter-panel"><h3><SlidersHorizontal size={18} /> Refine your finds</h3><label className="field"><span>Search</span><input value={search} onChange={e => set('q', e.target.value)} placeholder="What are you looking for?" /></label><label className="field"><span>Category</span><select value={category} onChange={e => set('category', e.target.value)}><option value="">All categories</option>{categories.data?.map(c => <option value={c.id} key={c.id}>{c.name}</option>)}</select></label><label className="field"><span>Maximum price (KM)</span><input type="number" min="0" value={max} placeholder="Any price" onChange={e => set('max', e.target.value)} /></label><button className="text-btn" onClick={() => {
          setParams({});
          setLimit(8);
        }}>Clear filters</button><div className="filter-ai"><Sparkles /><strong>Need a little help?</strong><p>Find a fit for your needs and budget.</p><Link to="/assistant">Ask your assistant →</Link></div></aside><div><div className="catalog-toolbar"><span>{filtered.length} thoughtful finds</span><select aria-label="Sort products" value={sort} onChange={e => set('sort', e.target.value)}><option value="featured">Featured first</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="name">Name: A–Z</option></select></div>{query.isPending ? <Loading /> : query.isError ? <ErrorState error={query.error} retry={() => void query.refetch()} /> : !filtered.length ? <Empty /> : <><div className="grid products catalog-products">{filtered.slice(0, limit).map(p => <ProductCard key={p.id} product={p} />)}</div>{limit < filtered.length && <div className="load-more"><button className="btn secondary" onClick={() => setLimit(limit + 8)}>Discover more</button></div>}</>}</div></div></div>;
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
  return <div className="container page"><div className="breadcrumbs"><Link to="/products">Collection</Link> / {p.categoryName} / {p.name}</div><div className="detail-grid"><div><Image className="detail-image" src={p.imageUrl} alt={p.name} /><div className="gallery-thumbs">{[0, 1, 2].map(n => <button key={n} aria-label={`Enlarge ${p.name}, view ${n + 1}`} onClick={() => {
            const image = document.querySelector('.detail-image');
            if (image) image.style.objectPosition = n === 0 ? 'center' : n === 1 ? 'left' : 'right';
          }}><Image src={p.imageUrl} alt={`${p.name} crop ${n + 1}`} /></button>)}</div></div><div className="detail-copy"><span className="eyebrow">{p.categoryName}</span><h1>{p.name}</h1><strong className="detail-price">{money(p.price)}</strong><p>{p.description}</p><span className={`stock ${p.stock ? '' : 'out'}`}><Check size={16} />{p.stock ? `${p.stock} available · Ready for your everyday` : 'Currently out of stock'}</span><div className="purchase-row"><div className="quantity"><button aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity(quantity - 1)}><Minus size={15} /></button><input aria-label="Quantity" type="number" min="1" max={p.stock} value={quantity} onChange={e => setQuantity(Math.max(1, Math.min(p.stock || 1, Number(e.target.value) || 1)))} /><button aria-label="Increase quantity" disabled={quantity >= p.stock} onClick={() => setQuantity(quantity + 1)}><Plus size={15} /></button></div><button className="btn" disabled={!p.stock || busy} onClick={() => {
            setBusy(true);
            void add(p, quantity).catch(() => {}).finally(() => setBusy(false));
          }}>{busy ? 'Adding…' : 'Add to bag'} <Plus size={18} /></button></div><div className="detail-perks"><p><Truck size={20} /> Free delivery on demo orders</p><p><ShieldCheck size={20} /> Simulated checkout. No payment collected.</p></div><Link className="text-btn" to="/assistant"><Sparkles size={16} /> Questions? Ask your AI assistant</Link></div></div><section className="section"><div className="section-title"><h2>Good things go together.</h2><Link to="/products">Explore all →</Link></div><div className="grid products">{query.data.filter(item => item.id !== p.id).sort((a, b) => Number(b.categoryId === p.categoryId) - Number(a.categoryId === p.categoryId)).slice(0, 4).map(item => <ProductCard key={item.id} product={item} />)}</div></section></div>;
}
