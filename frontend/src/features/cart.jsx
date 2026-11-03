import { isMock } from '../services';
import { t } from "../i18n/bs.js";
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
  return <div className="container page"><div className="page-heading"><span className="eyebrow">{t("YOUR GOOD FINDS")}</span><h1>{t("In the bag")}<span className="heading-dot">.</span> <ShoppingBag size={30} /></h1><p>{cart.totalItems} {cart.totalItems === 1 ? 'proizvod' : 'proizvoda'} {t("picked for your everyday.")}</p></div>{cartLoading && !cart.items.length ? <Loading /> : !cart.items.length ? <Empty title={t("Something good belongs here.")} text={t("Explore the collection and find your next favorite.")}><Link className="btn" to="/products">{t("Discover products")}<ArrowRight size={18} /></Link></Empty> : <div className="checkout-layout"><div>{cart.items.map(i => {
          const p = products.data?.find(p => p.id === i.productId);
          return <article className="cart-row" key={i.id}><Link to={`/products/${i.productId}`}><Image src={p?.imageUrl ?? ''} alt={i.productName} /></Link><div className="cart-row-info"><small>{p?.categoryName}</small><Link to={`/products/${i.productId}`}><h3>{i.productName}</h3></Link><p>{money(i.unitPrice)}</p><div className="quantity"><button aria-label={`Smanji količinu: ${i.productName}`} disabled={cartLoading || i.quantity <= 1} onClick={() => void update(i.id, i.quantity - 1).catch(() => {})}><Minus size={14} /></button><span>{i.quantity}</span><button aria-label={`Povećaj količinu: ${i.productName}`} disabled={cartLoading || !!p && i.quantity >= p.stock} onClick={() => void update(i.id, i.quantity + 1).catch(() => {})}><Plus size={14} /></button></div></div><div className="cart-row-end"><strong>{money(i.subtotal)}</strong><button className="icon-btn" disabled={cartLoading} aria-label={`Ukloni: ${i.productName}`} onClick={() => void remove(i.id).catch(() => {})}><Trash2 size={18} /></button></div></article>;
        })}<Link className="text-btn" to="/products">{t("\u2190 Keep discovering")}</Link></div><aside className="panel summary"><h2>{t("A lovely little collection.")}</h2><div className="summary-line"><span>{t("Subtotal")}</span><strong>{money(cart.totalPrice)}</strong></div><div className="summary-line"><span>{t("Delivery")}</span><span className="green">{isMock ? t("On us") : t("Nije uključena")}</span></div><div className="summary-line grand-total"><span>{t("Total")}</span><strong>{money(cart.totalPrice)}</strong></div><Link className="btn full" to="/checkout">{t("Continue to checkout")}<ArrowRight size={18} /></Link><p className="fine-print">{t("Demo checkout \xB7 No real payment required")}</p></aside></div>}</div>;
}
