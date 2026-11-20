-- Align existing paid orders with automatic confirmation after payment.
UPDATE dbo.orders
SET status = 'CONFIRMED'
WHERE payment_status = 'PAID' AND status = 'PENDING';
