import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../app/context';
import { t } from '../i18n/bs';
import { money } from '../utils/shop';
import CheckoutButton from '../components/CheckoutButton';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import { Loading } from '../components/ui';

export function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, user, cartLoading } = useApp();
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [error, setError] = useState(null);

  const handleCreateOrder = async () => {
    if (!user) {
      navigate('/auth/login');
      return;
    }

    setOrderLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }

      const orderData = await response.json();
      setOrderId(orderData.id);
    } catch (err) {
      setError(err.message || 'An error occurred');
      console.error('Order creation error:', err);
    } finally {
      setOrderLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container page">
        <div className="page-heading">
          <span className="eyebrow">{t("CHECKOUT")}</span>
          <h1>Please log in to continue</h1>
        </div>
      </div>
    );
  }

  if (cartLoading) {
    return <Loading />;
  }

  if (!cart.items.length) {
    return (
      <div className="container page">
        <div className="page-heading">
          <span className="eyebrow">{t("CHECKOUT")}</span>
          <h1>Your cart is empty</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="container page">
      <div className="page-heading">
        <span className="eyebrow">{t("CHECKOUT")}</span>
        <h1>{t("Review Your Order")} <span className="heading-dot">.</span> <ShoppingBag size={30} /></h1>
      </div>

      <div className="checkout-layout">
        <div className="checkout-items">
          <h2>Order Summary</h2>
          {cart.items.map(item => (
            <div key={item.id} className="checkout-item">
              <div>
                <h3>{item.productName}</h3>
                <p>Quantity: {item.quantity}</p>
              </div>
              <p className="item-total">{money(item.subtotal)}</p>
            </div>
          ))}
        </div>

        <aside className="panel summary">
          <h2>{t("Order Total")}</h2>
          <div className="summary-line">
            <span>{t("Subtotal")}</span>
            <strong>{money(cart.totalPrice)}</strong>
          </div>
          <div className="summary-line">
            <span>{t("Delivery")}</span>
            <span className="green">{t("On us")}</span>
          </div>
          <div className="summary-line grand-total">
            <span>{t("Total")}</span>
            <strong>{money(cart.totalPrice)}</strong>
          </div>

          {error && <p className="error-message">{error}</p>}

          {!orderId ? (
            <button
              className="btn full"
              onClick={handleCreateOrder}
              disabled={orderLoading}
            >
              {orderLoading ? 'Creating Order...' : 'Proceed to Payment'}
              <ArrowRight size={18} />
            </button>
          ) : (
            <CheckoutButton orderId={orderId} />
          )}

          <p className="fine-print">{t("Demo checkout · No real payment required")}</p>
        </aside>
      </div>
    </div>
  );
}

export default CheckoutPage;
STRIPE_API_KEY=sk_test_... (test ključ sa Stripe-a)
DB_USERNAME=your_sql_login
DB_PASSWORD=your_password
JWT_SECRET=base64_encoded_secret
OLLAMA_MODEL=model_nameSTRIPE_API_KEY=sk_test_... (test ključ sa Stripe-a)
DB_USERNAME=your_sql_login
DB_PASSWORD=your_password
JWT_SECRET=base64_encoded_secret
OLLAMA_MODEL=model_name