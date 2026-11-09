import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PaymentService } from '../services/PaymentService';
import { isMock } from '../services';
import { useApp } from '../app/context';
import { Modal } from './ui';
import { money, errorMessage } from '../utils/shop';
import { refundLabel } from '../utils/payment';

export default function PaymentActions({ order, admin = false }) {
  const [action, setAction] = useState(null);
  const cache = useQueryClient();
  const { notify } = useApp();
  const mutation = useMutation({
    mutationFn: kind => kind === 'refund' ? PaymentService.refund(order.id) : PaymentService.cancel(order.id),
    onSuccess: async result => {
      setAction(null);
      await Promise.all([cache.invalidateQueries({ queryKey: ['orders'] }), cache.invalidateQueries({ queryKey: ['admin-orders'] }), cache.invalidateQueries({ queryKey: ['products'] }), cache.invalidateQueries({ queryKey: ['cart'] })]);
      notify(result.paymentStatus === 'REFUNDED' ? 'Povrat novca je potvrđen.' : result.checkoutStatus === 'CANCELLED' ? 'Narudžba je otkazana i zalihe vraćene.' : 'Status je osvježen. Provjerite narudžbu prije nove radnje.');
    }
  });
  if (isMock) return null;
  const unsent = ['PENDING', 'CONFIRMED'].includes(order.status);
  const canCancel = unsent && order.paymentStatus === 'UNPAID';
  const canRefund = admin && unsent && order.paymentStatus === 'PAID';
  const refundStarted = order.refundStatus && order.refundStatus !== 'NONE';
  return <div className="payment-actions">
    {refundStarted && <p role="status">{refundLabel(order.refundStatus)}</p>}
    {canCancel && <button type="button" className="btn secondary" disabled={mutation.isPending} onClick={() => { mutation.reset(); setAction('cancel'); }}>Otkaži neplaćenu narudžbu</button>}
    {canRefund && <button type="button" className="btn secondary" disabled={mutation.isPending} onClick={() => { mutation.reset(); setAction('refund'); }}>{refundStarted ? 'Provjeri povrat novca' : 'Vrati puni iznos'}</button>}
    {mutation.isError && !action && <p className="form-error" role="alert">{errorMessage(mutation.error)}</p>}
    {action && <Modal title={action === 'refund' ? 'Povrat novca' : 'Otkazivanje narudžbe'} close={() => { if (!mutation.isPending) setAction(null); }}>
      <p>{action === 'refund' ? `Tražite puni povrat ${money(order.totalAmount)} na izvorno sredstvo plaćanja. Narudžba i zalihe ažuriraju se tek nakon Stripe potvrde.` : 'Otvorena Stripe sesija bit će zatvorena prije vraćanja zaliha. Ako je uplata u međuvremenu prošla, narudžba neće biti otkazana.'}</p>
      {mutation.isError && <p className="form-error" role="alert">{errorMessage(mutation.error)} Provjerite status prije ponavljanja.</p>}
      <div className="form-row"><button type="button" className="btn secondary" disabled={mutation.isPending} onClick={() => setAction(null)}>Odustani</button><button type="button" className="btn" disabled={mutation.isPending} onClick={() => mutation.mutate(action)}>{mutation.isPending ? 'Obrada…' : action === 'refund' ? (refundStarted ? 'Provjeri status' : 'Potvrdi puni povrat') : 'Potvrdi otkazivanje'}</button></div>
    </Modal>}
  </div>;
}