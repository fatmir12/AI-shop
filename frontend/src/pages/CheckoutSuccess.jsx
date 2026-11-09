import { useSearchParams, Link } from 'react-router-dom';
import { useEffect } from 'react';

export const CheckoutSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  useEffect(() => {
    if (sessionId) {
      console.log('Payment successful. Session ID:', sessionId);
      // Ovdje možeš dodati API poziv za potvrdu plaćanja
    }
  }, [sessionId]);

  return (
    <div className="checkout-success-container">
      <div className="success-card">
        <h1>✓ Payment Successful!</h1>
        <p>Thank you for your purchase.</p>
        {sessionId && <p className="session-id">Session ID: {sessionId}</p>}
        <Link to="/" className="return-home-button">
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default CheckoutSuccess;
