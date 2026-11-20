SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF NOT EXISTS (SELECT 1 FROM dbo.products WITH (UPDLOCK, HOLDLOCK))
BEGIN
    IF (SELECT COUNT(*) FROM dbo.categories WHERE name IN (N'Laptopi', N'Telefoni', N'Slušalice', N'Tastature', N'Miševi')) <> 5
        THROW 51001, 'Run Flyway and resolve the five catalog categories before seeding products.', 1;
    INSERT INTO dbo.products (category_id, name, description, price, stock, image_url)
    SELECT category.id, seed.name, seed.description, seed.price, seed.stock, seed.image_url
    FROM (VALUES
        (N'Laptopi', N'Lenovo ThinkPad E14 16/512 GB', N'Laptop od 14 inča, 16 GB memorije i SSD od 512 GB.', 1599.00, 8, N'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=85'),
        (N'Telefoni', N'Samsung Galaxy S24 256 GB', N'AMOLED ekran od 6,2 inča i 256 GB prostora.', 1499.00, 10, N'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=85'),
        (N'Slušalice', N'Sony WH-1000XM5', N'Bežične slušalice s aktivnim poništavanjem buke.', 649.00, 12, N'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=85'),
        (N'Tastature', N'Keychron K2 Wireless', N'Kompaktna bežična mehanička tastatura.', 189.00, 5, N'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=85'),
        (N'Miševi', N'Logitech MX Master 3S', N'Ergonomski bežični miš s tihim tipkama.', 219.00, 4, N'https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=900&q=85')
    ) seed(category_name, name, description, price, stock, image_url)
    JOIN dbo.categories category ON category.name = seed.category_name;
END
ELSE PRINT 'Product seed skipped: existing catalog retained.';
COMMIT;
