ALTER TABLE dbo.orders ADD
    shipping_first_name NVARCHAR(100) NULL,
    shipping_last_name NVARCHAR(100) NULL,
    shipping_email NVARCHAR(254) NULL,
    shipping_address NVARCHAR(200) NULL,
    shipping_city NVARCHAR(100) NULL,
    shipping_postal_code NVARCHAR(5) NULL,
    shipping_phone NVARCHAR(30) NULL;