CREATE TABLE dbo.ai_conversations (
 id BIGINT IDENTITY(1,1) PRIMARY KEY,
 user_id BIGINT NOT NULL REFERENCES dbo.users(id),
 title NVARCHAR(160) NOT NULL DEFAULT N'Novi razgovor',
 created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
 updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX ix_ai_conversations_user_updated ON dbo.ai_conversations(user_id, updated_at DESC);
CREATE TABLE dbo.ai_messages (
 id BIGINT IDENTITY(1,1) PRIMARY KEY,
 conversation_id BIGINT NOT NULL REFERENCES dbo.ai_conversations(id) ON DELETE CASCADE,
 role VARCHAR(10) NOT NULL CHECK (role IN ('user','assistant')),
 content NVARCHAR(MAX) NOT NULL,
 response_json NVARCHAR(MAX) NULL,
 request_key VARCHAR(36) NULL,
 created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX ix_ai_messages_conversation ON dbo.ai_messages(conversation_id, id);
CREATE UNIQUE INDEX ux_ai_messages_request ON dbo.ai_messages(conversation_id, request_key) WHERE request_key IS NOT NULL;
