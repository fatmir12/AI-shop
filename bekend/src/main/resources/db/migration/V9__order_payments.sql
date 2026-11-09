ALTER TABLE dbo.orders ADD
    payment_status VARCHAR(20) NOT NULL CONSTRAINT df_orders_payment_status DEFAULT 'UNPAID',
    stripe_session_id VARCHAR(255) NULL,
    payment_amount_minor BIGINT NULL,
    payment_currency VARCHAR(3) NULL,
    paid_at DATETIME2 NULL;
GO
ALTER TABLE dbo.orders ADD CONSTRAINT chk_orders_payment_status CHECK (payment_status IN ('UNPAID', 'PAID'));
GO
CREATE UNIQUE INDEX ux_orders_stripe_session ON dbo.orders(stripe_session_id) WHERE stripe_session_id IS NOT NULL;