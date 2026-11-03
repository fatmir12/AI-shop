import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UserRound, Package, ArrowRight } from 'lucide-react';
import { useApp } from '../app/context';
import { service, isMock } from '../services';
import { money, errorMessage } from '../utils/shop';
import { Empty, ErrorState, Field, Loading, Status } from '../components/ui';
export function OrderDetails({
  order
}) {
  return <div className="order-details"><div className="section-title"><div><h3>Order #{order.id}</h3><p>{new Date(order.createdAt).toLocaleDateString()}</p></div><Status status={order.status} /></div>{order.items.map(i => <div className="order-line" key={i.id}><div><Link to={`/products/${i.productId}`}>{i.productName}</Link><small>{i.quantity} × {money(i.unitPrice)}</small></div><strong>{money(i.subtotal)}</strong></div>)}<div className="summary-line"><strong>Total</strong><strong>{money(order.totalAmount)}</strong></div>{order.shipping && <div className="shipping-details"><h4>Delivery details</h4><p>{order.shipping.firstName} {order.shipping.lastName}<br />{order.shipping.address}, {order.shipping.postalCode} {order.shipping.city}<br />{order.shipping.email} · {order.shipping.phone}</p></div>}</div>;
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
      if (!firstName || !lastName) throw new Error('Please enter your name.');
      setUser(await service.profile({
        firstName,
        lastName
      }));
      notify('Profile updated');
    } catch (e) {
      notify(errorMessage(e), true);
    } finally {
      setBusy(false);
    }
  };
  if (!user) return null;
  return <div className="container page"><div className="page-heading"><span className="eyebrow">YOUR SPACE</span><h1>{id ? 'Your order, in detail.' : ordersOnly ? 'Your good finds.' : `Hello, ${user.firstName}.`}</h1><p>Everything you need, right where you left it.</p></div><div className="account-layout"><aside className="account-nav"><span className="avatar large">{user.firstName[0]}</span><strong>{user.firstName} {user.lastName}</strong><small>{user.email}</small><Link to="/account"><UserRound size={17} /> My profile</Link><Link to="/account/orders"><Package size={17} /> My orders</Link><Link to="/products">Keep discovering <ArrowRight size={17} /></Link></aside><div>{!ordersOnly && !id && <section className="panel"><h2>Personal information</h2><p className="muted">{isMock ? 'Changes are saved in this browser’s mock storage.' : 'Profile editing requires a new backend endpoint.'}</p><form onSubmit={submit}><div className="form-row"><Field label="First name" name="firstName" required maxLength={100} defaultValue={user.firstName} /><Field label="Last name" name="lastName" required maxLength={100} defaultValue={user.lastName} /></div><Field label="Email" type="email" value={user.email} disabled /><button className="btn" disabled={busy || !isMock}>{busy ? 'Saving…' : 'Save changes'}</button></form></section>}<section className="panel"><h2>{id ? 'Order details' : 'Order history'}</h2>{query.isPending ? <Loading /> : query.isError ? <ErrorState error={query.error} /> : id ? query.data.find(o => o.id === Number(id)) ? <OrderDetails order={query.data.find(o => o.id === Number(id))} /> : <Empty title="Order not found" text="This order is not associated with your account." /> : !query.data.length ? <Empty title="Your story starts here" text="Your orders will appear here after your first checkout."><Link className="btn" to="/products">Explore the collection</Link></Empty> : query.data.map(o => <Link className="order-summary" to={`/account/orders/${o.id}`} key={o.id}><div><strong>#{o.id}</strong><small>{new Date(o.createdAt).toLocaleDateString()} · {o.items.length} products</small></div><Status status={o.status} /><strong>{money(o.totalAmount)}</strong><ArrowRight size={17} /></Link>)}</section></div></div></div>;
}
export function Checkout() {
  const {
    cart,
    user,
    notify
  } = useApp();
  const cache = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      if (Object.values(data).some(v => !v.trim())) throw new Error('Please complete all delivery details.');
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
      notify('Your demo order has been placed');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  if (order) return <div className="container page confirmation"><span className="confirmation-icon">✓</span><span className="eyebrow">ALL SET</span><h1>A good find, on its way.</h1><p>Your simulated order is confirmed. No payment has been collected.</p><div className="panel"><OrderDetails order={order} /></div><Link className="btn" to="/account/orders">View your orders <ArrowRight size={18} /></Link></div>;
  if (!cart.items.length) return <div className="container page"><Empty title="Your bag is waiting" text="Add something you love before checking out."><Link to="/products" className="btn">Explore products</Link></Empty></div>;
  return <div className="container page"><div className="page-heading"><span className="eyebrow">ONE LAST THING</span><h1>Make it yours.</h1><p>{isMock ? 'Development checkout · No payment information needed.' : 'Checkout is unavailable: the backend does not yet accept shipping details.'}</p></div><form className="checkout-layout" onSubmit={submit}><div className="panel"><h2>Delivery details</h2><div className="form-row"><Field label="First name" name="firstName" required maxLength={100} defaultValue={user?.firstName} autoComplete="given-name" /><Field label="Last name" name="lastName" required maxLength={100} defaultValue={user?.lastName} autoComplete="family-name" /></div><Field label="Email address" name="email" type="email" required defaultValue={user?.email} autoComplete="email" /><Field label="Street address" name="address" required minLength={5} maxLength={200} autoComplete="street-address" /><div className="form-row"><Field label="City" name="city" required maxLength={100} autoComplete="address-level2" /><Field label="Postal code" name="postalCode" required pattern="[0-9]{5}" title="Enter a 5-digit postal code" autoComplete="postal-code" /></div><Field label="Phone number" name="phone" type="tel" required minLength={6} maxLength={30} autoComplete="tel" /></div><aside className="panel summary"><h2>Your order</h2>{cart.items.map(i => <div className="summary-line" key={i.id}><span>{i.productName} × {i.quantity}</span><strong>{money(i.subtotal)}</strong></div>)}<div className="summary-line"><span>Delivery</span><strong>Free</strong></div><div className="summary-line grand-total"><span>Total</span><strong>{money(cart.totalPrice)}</strong></div>{error && <p className="form-error" role="alert">{error}</p>}<button className="btn full" disabled={busy || !isMock}>{busy ? 'Placing order…' : 'Place demo order'}<ArrowRight size={17} /></button><p className="fine-print">This is a simulated order. No real purchase or payment is made.</p></aside></form></div>;
}
