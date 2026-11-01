
CREATE TABLE dbo.products (
                              id BIGINT IDENTITY(1,1) PRIMARY KEY,

                              category_id BIGINT NOT NULL,

                              name NVARCHAR(150) NOT NULL,

                              description NVARCHAR(1000) NULL,

                              price DECIMAL(12,2) NOT NULL,

                              stock INT NOT NULL DEFAULT 0,

                              image_url NVARCHAR(500) NULL,

                              CONSTRAINT fk_products_categories
                                  FOREIGN KEY (category_id)
                                      REFERENCES dbo.categories(id),

                              CONSTRAINT ck_products_price
                                  CHECK (price > 0),

                              CONSTRAINT ck_products_stock
                                  CHECK (stock >= 0)
);

CREATE INDEX ix_products_category_id
    ON dbo.products(category_id);
