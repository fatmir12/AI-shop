import { Link } from 'react-router-dom';
import { Trash2, ArrowRight, Minus, Plus, ShoppingBag } from 'lucide-react';
import { useApp } from '../app/context';
import { useProducts } from './products';
import { money } from '../utils/shop';
import { Empty, Image, Loading } from '../components/ui';
export function CartPage() {
  const {
    cart,
    update,
    remove,
    cartLoading
  } = useApp();
  const products = useProducts();
  return <div className="container page"><div className="page-heading"><span className="eyebrow">YOUR GOOD FINDS</span><h1>In the bag<span className="heading-dot">.</span> <ShoppingBag size={30} /></h1><p>{cart.totalItems} {cart.totalItems === 1 ? 'item' : 'items'} picked for your everyday.</p></div>{cartLoading && !cart.items.length ? <Loading /> : !cart.items.length ? <Empty title="Something good belongs here." text="Explore the collection and find your next favorite."><Link className="btn" to="/products">Discover products <ArrowRight size={18} /></Link></Empty> : <div className="checkout-layout"><div>{cart.items.map(i => {
          const p = products.data?.find(p => p.id === i.productId);
          return <article className="cart-row" key={i.id}><Link to={`/products/${i.productId}`}><Image src={p?.imageUrl ?? ''} alt={i.productName} /></Link><div className="cart-row-info"><small>{p?.categoryName}</small><Link to={`/products/${i.productId}`}><h3>{i.productName}</h3></Link><p>{money(i.unitPrice)}</p><div className="quantity"><button aria-label={`Decrease ${i.productName}`} disabled={cartLoading || i.quantity <= 1} onClick={() => void update(i.id, i.quantity - 1).catch(() => {})}><Minus size={14} /></button><span>{i.quantity}</span><button aria-label={`Increase ${i.productName}`} disabled={cartLoading || !!p && i.quantity >= p.stock} onClick={() => void update(i.id, i.quantity + 1).catch(() => {})}><Plus size={14} /></button></div></div><div className="cart-row-end"><strong>{money(i.subtotal)}</strong><button className="icon-btn" disabled={cartLoading} aria-label={`Remove ${i.productName}`} onClick={() => void remove(i.id).catch(() => {})}><Trash2 size={18} /></button></div></article>;
        })}<Link className="text-btn" to="/products">← Keep discovering</Link></div><aside className="panel summary"><h2>A lovely little collection.</h2><div className="summary-line"><span>Subtotal</span><strong>{money(cart.totalPrice)}</strong></div><div className="summary-line"><span>Delivery</span><span className="green">On us</span></div><div className="summary-line grand-total"><span>Total</span><strong>{money(cart.totalPrice)}</strong></div><Link className="btn full" to="/checkout">Continue to checkout <ArrowRight size={18} /></Link><p className="fine-print">Demo checkout · No real payment required</p></aside></div>}</div>;
}
