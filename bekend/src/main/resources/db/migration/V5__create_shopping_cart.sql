
CREATE TABLE dbo.shopping_carts (
                                    id BIGINT IDENTITY(1,1) PRIMARY KEY,

                                    user_id BIGINT NOT NULL,

                                    created_at DATETIME2 NOT NULL
                                        CONSTRAINT df_shopping_carts_created_at
                                        DEFAULT SYSUTCDATETIME(),

                                    updated_at DATETIME2 NOT NULL
                                        CONSTRAINT df_shopping_carts_updated_at
                                        DEFAULT SYSUTCDATETIME(),

                                    CONSTRAINT fk_shopping_carts_user
                                        FOREIGN KEY (user_id)
                                            REFERENCES dbo.users(id),

                                    CONSTRAINT uq_shopping_carts_user
                                        UNIQUE (user_id)
);

CREATE TABLE dbo.cart_items (
                                id BIGINT IDENTITY(1,1) PRIMARY KEY,

                                cart_id BIGINT NOT NULL,

                                product_id BIGINT NOT NULL,

                                quantity INT NOT NULL,

                                added_at DATETIME2 NOT NULL
                                    CONSTRAINT df_cart_items_added_at
                                    DEFAULT SYSUTCDATETIME(),

                                CONSTRAINT fk_cart_items_cart
                                    FOREIGN KEY (cart_id)
                                        REFERENCES dbo.shopping_carts(id)
                                        ON DELETE CASCADE,

                                CONSTRAINT fk_cart_items_product
                                    FOREIGN KEY (product_id)
                                        REFERENCES dbo.products(id),

                                CONSTRAINT chk_cart_items_quantity
                                    CHECK (quantity > 0),

                                CONSTRAINT uq_cart_items_product
                                    UNIQUE (cart_id, product_id)
);

CREATE INDEX ix_cart_items_product_id
    ON dbo.cart_items(product_id);
