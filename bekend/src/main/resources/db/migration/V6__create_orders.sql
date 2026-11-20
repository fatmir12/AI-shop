
CREATE TABLE dbo.orders (
                            id BIGINT IDENTITY(1,1) PRIMARY KEY,

                            user_id BIGINT NOT NULL,

                            total_amount DECIMAL(12,2) NOT NULL,

                            status VARCHAR(20) NOT NULL
                                CONSTRAINT df_orders_status
                                DEFAULT 'PENDING',

                            created_at DATETIME2 NOT NULL
                                CONSTRAINT df_orders_created_at
                                DEFAULT SYSUTCDATETIME(),

                            CONSTRAINT fk_orders_user
                                FOREIGN KEY (user_id)
                                    REFERENCES dbo.users(id),

                            CONSTRAINT chk_orders_total
                                CHECK (total_amount >= 0),

                            CONSTRAINT chk_orders_status
                                CHECK (status IN (
                                                  'PENDING',
                                                  'CONFIRMED',
                                                  'SHIPPED',
                                                  'DELIVERED',
                                                  'CANCELLED'
                                    ))
);

CREATE INDEX ix_orders_user_id
    ON dbo.orders(user_id);


CREATE TABLE dbo.order_items (
                                 id BIGINT IDENTITY(1,1) PRIMARY KEY,

                                 order_id BIGINT NOT NULL,
                                 product_id BIGINT NOT NULL,

                                 product_name NVARCHAR(255) NOT NULL,

                                 quantity INT NOT NULL,
                                 unit_price DECIMAL(12,2) NOT NULL,
                                 subtotal DECIMAL(12,2) NOT NULL,

                                 CONSTRAINT fk_order_items_order
                                     FOREIGN KEY (order_id)
                                         REFERENCES dbo.orders(id)
                                         ON DELETE CASCADE,

                                 CONSTRAINT fk_order_items_product
                                     FOREIGN KEY (product_id)
                                         REFERENCES dbo.products(id),

                                 CONSTRAINT chk_order_items_quantity
                                     CHECK (quantity > 0),

                                 CONSTRAINT chk_order_items_unit_price
                                     CHECK (unit_price > 0),

                                 CONSTRAINT chk_order_items_subtotal
                                     CHECK (subtotal > 0)
);

CREATE INDEX ix_order_items_order_id
    ON dbo.order_items(order_id);

CREATE INDEX ix_order_items_product_id
    ON dbo.order_items(product_id);
