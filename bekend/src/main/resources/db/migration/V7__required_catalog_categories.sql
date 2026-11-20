IF EXISTS (
    SELECT 1 FROM dbo.categories
    WHERE name COLLATE Latin1_General_100_BIN2 NOT IN (N'Laptopi', N'Telefoni', N'Slušalice', N'Tastature', N'Miševi')
)
    THROW 51000, 'Catalog taxonomy conflict: existing category names differ from the five required names. Review categories and product relationships manually; no data was removed. See LOCAL_SETUP.md.', 1;

INSERT INTO dbo.categories (name, description)
SELECT seed.name, seed.description
FROM (VALUES
    (N'Laptopi', N'Laptopi za posao i svakodnevnu upotrebu.'),
    (N'Telefoni', N'Mobilni telefoni.'),
    (N'Slušalice', N'Bežične i žične slušalice.'),
    (N'Tastature', N'Tastature za računar.'),
    (N'Miševi', N'Računarski miševi.')
) seed(name, description)
WHERE NOT EXISTS (SELECT 1 FROM dbo.categories existing WHERE existing.name = seed.name);
