import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { PaymentService } from '../services/PaymentService';

export default function CheckoutSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get('sessionId');
  const cache = useQueryClient();
  const payment = useQuery({
    queryKey: ['payment', sessionId],
    queryFn: () => PaymentService.sessionStatus(sessionId),
    enabled: Boolean(sessionId),
    retry: false,
    refetchInterval: query => query.state.data?.paymentStatus === 'UNPAID' && query.state.data?.checkoutStatus !== 'expired' ? 5000 : false,
  });
  const paid = payment.data?.paymentStatus === 'PAID';
  const refunded = payment.data?.paymentStatus === 'REFUNDED';
  const expired = payment.data?.checkoutStatus === 'expired';
  useEffect(() => { if (paid || refunded) void cache.invalidateQueries({ queryKey: ['orders'] }); }, [paid, refunded, cache]);
  return <div className="container page confirmation"><section className="panel" aria-live="polite">
    <h1>{refunded ? 'Novac je vraćen' : paid ? 'Plaćanje je potvrđeno' : expired ? 'Sesija plaćanja je istekla' : 'Provjera plaćanja'}</h1>
    {refunded ? <p>Puni povrat je potvrđen. Detalje možete pregledati u narudžbi.</p> : expired ? <p>Ova sesija više nije aktivna. Otvorite narudžbu za siguran nastavak ili otkazivanje.</p> : paid ? <p>Hvala! Uplata za narudžbu #{payment.data.orderId} potvrđena je na serveru.</p>
      : !sessionId ? <p>Nedostaje oznaka plaćanja. Provjerite svoje narudžbe.</p>
      : payment.isError ? <><p role="alert">Potvrda trenutno nije dostupna. Nemojte ponovo plaćati dok ne provjerite status narudžbe.</p><button className="btn" onClick={() => payment.refetch()}>Provjeri ponovo</button></>
      : <p>{payment.isPending ? 'Provjeravamo Stripe potvrdu…' : 'Uplata još nije potvrđena. Status će se osvježiti automatski.'}</p>}
    <Link className="btn" to={payment.data ? `/account/orders/${payment.data.orderId}` : '/account/orders'}>Pregledaj narudžbu</Link>
    <Link to="/products">Nastavi kupovinu</Link>
  </section></div>;
}