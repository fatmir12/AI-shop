import { Link } from 'react-router-dom';

export const CheckoutCancel = () => {
  return (
    <div className="checkout-cancel-container">
      <div className="cancel-card">
        <h1>✗ Payment Cancelled</h1>
        <p>Your payment was cancelled. Please try again.</p>
        <Link to="/cart" className="return-cart-button">
          Return to Cart
        </Link>
      </div>
    </div>
  );
};

export default CheckoutCancel;
