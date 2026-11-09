import { useSearchParams, Link } from 'react-router-dom';

export const CheckoutSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  return (
    <div className="checkout-success-container">
      <div className="success-card">
        <h1>Povratak sa Stripe plaćanja</h1>
        <p>Status plaćanja provjerite u Stripe dashboardu. Serverska potvrda plaćanja još nije povezana.</p>
        {sessionId && <p className="session-id">Session ID: {sessionId}</p>}
        <Link to="/" className="return-home-button">
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default CheckoutSuccess;
