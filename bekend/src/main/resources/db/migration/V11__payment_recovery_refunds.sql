ALTER TABLE dbo.orders ADD
    payment_attempt INT NOT NULL CONSTRAINT df_orders_payment_attempt DEFAULT 0,
    refund_status VARCHAR(20) NOT NULL CONSTRAINT df_orders_refund_status DEFAULT 'NONE',
    stripe_refund_id VARCHAR(255) NULL;
GO
ALTER TABLE dbo.orders DROP CONSTRAINT chk_orders_payment_status;
ALTER TABLE dbo.orders ADD CONSTRAINT chk_orders_payment_status CHECK (payment_status IN ('UNPAID','PAID','REFUNDED'));
ALTER TABLE dbo.orders ADD CONSTRAINT chk_orders_refund_status CHECK (refund_status IN ('NONE','PENDING','SUCCEEDED','FAILED'));
CREATE UNIQUE INDEX ux_orders_stripe_refund ON dbo.orders(stripe_refund_id) WHERE stripe_refund_id IS NOT NULL;