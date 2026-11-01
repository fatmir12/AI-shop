
CREATE TABLE dbo.categories (
                                id BIGINT IDENTITY(1,1) PRIMARY KEY,
                                name NVARCHAR(100) NOT NULL,
                                description NVARCHAR(500) NULL,
                                CONSTRAINT uq_categories_name UNIQUE (name)
);
