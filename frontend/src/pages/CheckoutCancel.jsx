import { Link, useSearchParams } from 'react-router-dom';

export default function CheckoutCancel() {
  const [params] = useSearchParams();
  const orderId = params.get('orderId');
  const valid = /^\d+$/.test(orderId || '');
  return <div className="container page confirmation"><section className="panel">
    <h1>Plaćanje nije završeno</h1>
    <p>Narudžba je sačuvana. Povratak sa Stripea ne otkazuje narudžbu niti potvrđuje naplatu. Status i nastavak plaćanja dostupni su u njenim detaljima.</p>
    <Link className="btn" to={valid ? `/account/orders/${orderId}` : '/account/orders'}>Moje narudžbe</Link>
    <Link to="/products">Nastavi kupovinu</Link>
  </section></div>;
}