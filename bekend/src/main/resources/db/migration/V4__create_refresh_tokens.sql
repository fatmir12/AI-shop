
CREATE TABLE dbo.refresh_tokens (
                                    id BIGINT IDENTITY(1,1) PRIMARY KEY,

                                    user_id BIGINT NOT NULL,

                                    token_hash CHAR(64) NOT NULL,

                                    family_id UNIQUEIDENTIFIER NOT NULL,

                                    expires_at DATETIME2 NOT NULL,

                                    created_at DATETIME2 NOT NULL
                                        CONSTRAINT df_refresh_tokens_created_at
                                        DEFAULT SYSUTCDATETIME(),

                                    revoked_at DATETIME2 NULL,

                                    CONSTRAINT fk_refresh_tokens_user
                                        FOREIGN KEY (user_id)
                                            REFERENCES dbo.users(id),

                                    CONSTRAINT uq_refresh_tokens_hash
                                        UNIQUE (token_hash)
);

CREATE INDEX ix_refresh_tokens_user_id
    ON dbo.refresh_tokens(user_id);

CREATE INDEX ix_refresh_tokens_family_id
    ON dbo.refresh_tokens(family_id);
