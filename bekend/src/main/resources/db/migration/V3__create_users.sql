
CREATE TABLE dbo.users (
                           id BIGINT IDENTITY(1,1) PRIMARY KEY,

                           first_name NVARCHAR(100) NOT NULL,

                           last_name NVARCHAR(100) NOT NULL,

                           email NVARCHAR(255) NOT NULL,

                           password_hash NVARCHAR(255) NOT NULL,

                           role VARCHAR(20) NOT NULL
                               CONSTRAINT df_users_role DEFAULT 'USER',

                           created_at DATETIME2 NOT NULL
                               CONSTRAINT df_users_created_at DEFAULT SYSUTCDATETIME(),

                           CONSTRAINT uq_users_email UNIQUE (email),

                           CONSTRAINT ck_users_role
                               CHECK (role IN ('USER', 'ADMIN'))
);
