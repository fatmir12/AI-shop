import { useState } from 'react';
import { PaymentService } from '../services/PaymentService';

export const CheckoutButton = ({ orderId, disabled = false }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const session = await PaymentService.createCheckoutSession(orderId);
      if (session && session.sessionUrl) {
        PaymentService.redirectToCheckout(session.sessionUrl);
      } else {
        setError('Plaćanje se nije otvorilo. Pokušajte ponovo ili provjerite narudžbu.');
      }
    } catch (err) {
      setError(err.message || 'Plaćanje trenutno nije dostupno. Pokušajte ponovo.');
      console.error('Checkout error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checkout-button-container">
      <button
        type="button"
        onClick={handleCheckout}
        disabled={disabled || loading}
        className="checkout-button"
      >
        {loading ? 'Otvaranje plaćanja…' : 'Nastavi na plaćanje'}
      </button>
      {error && <p className="error-message" role="alert">{error}</p>}
    </div>
  );
};

export default CheckoutButton;
