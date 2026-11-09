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
        setError('Failed to create checkout session');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during checkout');
      console.error('Checkout error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checkout-button-container">
      <button
        onClick={handleCheckout}
        disabled={disabled || loading}
        className="checkout-button"
      >
        {loading ? 'Processing...' : 'Proceed to Payment'}
      </button>
      {error && <p className="error-message">{error}</p>}
    </div>
  );
};

export default CheckoutButton;
