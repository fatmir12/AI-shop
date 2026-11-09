import PaymentActions from '../components/PaymentActions';
import { paymentLabel } from '../utils/payment';
import { t } from "../i18n/bs.js";
import { useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UserRound, Package, ArrowRight } from 'lucide-react';
import { useApp } from '../app/context';
import { service, isMock } from '../services';
import { money, errorMessage } from '../utils/shop';
import { Empty, ErrorState, Field, Loading, Status } from '../components/ui';
import CheckoutButton from '../components/CheckoutButton';
import ShippingDetails from '../components/ShippingDetails';
export function OrderDetails({
  order
}) {
  return <div className="order-details"><div className="section-title"><div><h3>{t("Narud\u017Eba #")}{order.id}</h3><p>{new Date(order.createdAt).toLocaleDateString('bs-BA')}</p></div><Status status={order.status} /></div><p className="muted">Plaćanje: {isMock ? 'probna narudžba' : paymentLabel(order.paymentStatus)}</p>{!isMock && order.paymentStatus === 'UNPAID' && order.status !== 'CANCELLED' && <CheckoutButton orderId={order.id} />}{order.items.map(i => <div className="order-line" key={i.id}><div><Link to={`/products/${i.productId}`}>{i.productName}</Link><small>{i.quantity} × {money(i.unitPrice)}</small></div><strong>{money(i.subtotal)}</strong></div>)}<div className="summary-line"><strong>{t("Total")}</strong><strong>{money(order.totalAmount)}</strong></div><ShippingDetails shipping={order.shipping} /><PaymentActions order={order} /></div>;
}
export function Account({
  ordersOnly = false
}) {
  const {
    user,
    setUser,
    notify
  } = useApp();
  const query = useQuery({
    queryKey: ['orders', user?.id],
    queryFn: () => service.orders()
  });
  const {
    id
  } = useParams();
  const [busy, setBusy] = useState(false);
  const submit = async e => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const firstName = String(data.get('firstName')).trim();
      const lastName = String(data.get('lastName')).trim();
      if (!firstName || !lastName) throw new Error(t("Please enter your name."));
      setUser(await service.profile({
        firstName,
        lastName
      }));
      notify(t("Profile updated"));
    } catch (e) {
      notify(errorMessage(e), true);
    } finally {
      setBusy(false);
    }
  };
  if (!user) return null;
  return <div className="container page"><div className="page-heading"><h1>{id ? t("Your order, in detail.") : ordersOnly ? t("Your good finds.") : `Pozdrav, ${user.firstName}.`}</h1><p>{t("Everything you need, right where you left it.")}</p></div><div className="account-layout"><aside className="account-nav"><span className="avatar large">{user.firstName[0]}</span><strong>{user.firstName} {user.lastName}</strong><small>{user.email}</small><Link to="/account"><UserRound size={17} />{t("My profile")}</Link><Link to="/account/orders"><Package size={17} />{t("My orders")}</Link><Link to="/products">{t("Keep discovering")}<ArrowRight size={17} /></Link></aside><div>{!ordersOnly && !id && <section className="panel"><h2>{t("Personal information")}</h2><p className="muted">{isMock ? t("Changes are saved in this browser\u2019s mock storage.") : t('Izmjene se čuvaju na vašem korisničkom računu.')}</p><form onSubmit={submit}><div className="form-row"><Field label={t("First name")} name="firstName" required maxLength={100} defaultValue={user.firstName} /><Field label={t("Last name")} name="lastName" required maxLength={100} defaultValue={user.lastName} /></div><Field label={t("Email")} type="email" value={user.email} disabled /><button className="btn" disabled={busy}>{busy ? t("Saving\u2026") : t("Save changes")}</button></form></section>}<section className="panel"><h2>{id ? t("Order details") : t("Order history")}</h2>{query.isPending ? <Loading /> : query.isError ? <ErrorState error={query.error} /> : id ? query.data.find(o => o.id === Number(id)) ? <OrderDetails order={query.data.find(o => o.id === Number(id))} /> : <Empty title={t("Order not found")} text={t("This order is not associated with your account.")} /> : !query.data.length ? <Empty title={t("Your story starts here")} text={t("Your orders will appear here after your first checkout.")}><Link className="btn" to="/products">{t("Explore the collection")}</Link></Empty> : query.data.map(o => <Link className="order-summary" to={`/account/orders/${o.id}`} key={o.id}><div><strong>#{o.id}</strong><small>{new Date(o.createdAt).toLocaleDateString('bs-BA')} · {o.items.length}{t("products")}</small></div><Status status={o.status} />{!isMock && <small>{paymentLabel(o.paymentStatus)}</small>}<strong>{money(o.totalAmount)}</strong><ArrowRight size={17} /></Link>)}</section></div></div></div>;
}
export function Checkout() {
  const {
    cart, cartLoading,
    user,
    notify
  } = useApp();
  const cache = useQueryClient();
  const [busy, setBusy] = useState(false);
  const submission = useRef(false);
  const [uncertain, setUncertain] = useState(false);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const submit = async e => {
    e.preventDefault();
    if (submission.current) return;
    submission.current = true;
    setBusy(true);
    setError('');
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      if (Object.values(data).some(v => !v.trim())) throw new Error(t("Please complete all delivery details."));
      const result = await service.checkout({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        address: data.address,
        city: data.city,
        postalCode: data.postalCode,
        phone: data.phone
      });
      setOrder(result);
      await cache.invalidateQueries();
      notify(isMock ? t('Your demo order has been placed') : t('Narudžba je sačuvana u bazi.'));
    } catch (e) {
      setError(errorMessage(e));
      if (e.uncertain) { setUncertain(true); setError('Ishod slanja nije poznat. Provjerite historiju narudžbi prije novog pokušaja.'); }
      else submission.current = false;
    } finally {
      setBusy(false);
    }
  };
  if (order && !isMock) return <div className="container page confirmation"><h1>Nastavi na plaćanje</h1><p>Narudžba je kreirana. Nastavite na Stripe za sljedeći korak plaćanja.</p><div className="panel"><OrderDetails order={order} /></div><Link to="/account/orders">Moje narudžbe</Link></div>;
  if (order) return <div className="container page confirmation"><span className="confirmation-icon">✓</span><h1>{t("A good find, on its way.")}</h1><p>{isMock ? t('Your simulated order is confirmed. No payment has been collected.') : t('Narudžba je sačuvana. Plaćanje i dostava nisu dio ove lokalne demonstracije.')}</p><div className="panel"><OrderDetails order={order} /></div><Link className="btn" to="/account/orders">{t("View your orders")}<ArrowRight size={18} /></Link></div>;
  if (cartLoading && !cart.items.length) return <div className="container page"><Loading /></div>;
  if (!cart.items.length) return <div className="container page"><Empty title={t("Your bag is waiting")} text={t("Add something you love before checking out.")}><Link to="/products" className="btn">{t("Explore products")}</Link></Empty></div>;
  return <div className="container page"><div className="page-heading"><h1>{t("Make it yours.")}</h1><p>{isMock ? t("Development checkout \xB7 No payment information needed.") : t('Unesite podatke za dostavu i provjerite narudžbu prije plaćanja.')}</p></div><form className="checkout-layout" onSubmit={submit}><div className="panel"><h2>{t("Delivery details")}</h2><div className="form-row"><Field label={t("First name")} name="firstName" required maxLength={100} defaultValue={user?.firstName} autoComplete="given-name" /><Field label={t("Last name")} name="lastName" required maxLength={100} defaultValue={user?.lastName} autoComplete="family-name" /></div><Field label={t("Email address")} name="email" type="email" required maxLength={254} defaultValue={user?.email} autoComplete="email" /><Field label={t("Street address")} name="address" required minLength={5} maxLength={200} autoComplete="street-address" /><div className="form-row"><Field label={t("City")} name="city" required maxLength={100} autoComplete="address-level2" /><Field label={t("Postal code")} name="postalCode" required pattern="[0-9]{5}" title={t("Enter a 5-digit postal code")} autoComplete="postal-code" /></div><Field label={t("Phone number")} name="phone" type="tel" required minLength={6} maxLength={30} autoComplete="tel" /></div><aside className="panel summary"><h2>{t("Your order")}</h2>{cart.items.map(i => <div className="summary-line" key={i.id}><span>{i.productName} × {i.quantity}</span><strong>{money(i.subtotal)}</strong></div>)}<div className="summary-line"><span>{t("Delivery")}</span><strong>{isMock ? t("Free") : t("Nije uključena")}</strong></div><div className="summary-line grand-total"><span>{t("Total")}</span><strong>{money(cart.totalPrice)}</strong></div>{error && <p className="form-error" role="alert">{error}</p>}<button className="btn full" disabled={busy || uncertain || cartLoading}>{busy ? t("Placing order\u2026") : isMock ? t('Place demo order') : t('Potvrdi narudžbu')}<ArrowRight size={17} /></button><p className="fine-print">{isMock ? t("This is a simulated order. No real purchase or payment is made.") : t("Potvrdom kreirate narudžbu. Plaćanje je zaseban sljedeći korak.")}</p>{uncertain && <Link to="/account/orders">{t("Provjeri narudžbe")}</Link>}</aside></form></div>;
}
