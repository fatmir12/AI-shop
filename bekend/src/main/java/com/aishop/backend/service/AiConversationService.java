package com.aishop.backend.service;

import com.aishop.backend.dto.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;
import java.util.*;

@Service
public class AiConversationService {
    private final JdbcTemplate db;
    private final AiChatService chat;
    private final PendingCartActionService pending;
    private final ObjectMapper mapper;
    public AiConversationService(JdbcTemplate db, AiChatService chat, PendingCartActionService pending, ObjectMapper mapper) {
        this.db = db; this.chat = chat; this.pending = pending; this.mapper = mapper;
    }
    public record Conversation(long id, String title, String createdAt, String updatedAt) {}
    public record ChatMessage(long id, String role, String content, String createdAt, List<AiChatResponse.PendingActionResponse> pendingActions) {}
    public record Detail(Conversation conversation, List<ChatMessage> messages) {}
    private final org.springframework.jdbc.core.RowMapper<Conversation> row = (rs, n) -> new Conversation(
            rs.getLong("id"), rs.getString("title"), rs.getTimestamp("created_at").toLocalDateTime().toString() + "Z",
            rs.getTimestamp("updated_at").toLocalDateTime().toString() + "Z");
    public List<Conversation> list(long user) {
        return db.query("SELECT * FROM dbo.ai_conversations WHERE user_id=? ORDER BY updated_at DESC, id DESC", row, user);
    }
    public Conversation create(long user) {
        Long id = db.queryForObject("INSERT INTO dbo.ai_conversations(user_id) OUTPUT INSERTED.id VALUES (?)", Long.class, user);
        return owned(user, id, false);
    }
    private Conversation owned(long user, long id, boolean lock) {
        var rows = db.query("SELECT * FROM dbo.ai_conversations" + (lock ? " WITH (UPDLOCK, HOLDLOCK)" : "")
                + " WHERE id=? AND user_id=?", row, id, user);
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Razgovor nije pronađen.");
        return rows.getFirst();
    }
    public Detail get(long user, long id) {
        var conversation = owned(user, id, false);
        var messages = db.query("SELECT * FROM dbo.ai_messages WHERE conversation_id=? ORDER BY id", (rs, n) -> {
            String json = rs.getString("response_json");
            var actions = json == null ? List.<AiChatResponse.PendingActionResponse>of() : activeActions(user, decode(json));
            return new ChatMessage(rs.getLong("id"), rs.getString("role"), rs.getString("content"),
                    rs.getTimestamp("created_at").toLocalDateTime().toString() + "Z", actions);
        }, id);
        return new Detail(conversation, messages);
    }
    private List<AiChatResponse.PendingActionResponse> activeActions(long user, AiChatResponse response) {
        return response.pendingActions() == null ? List.of() : response.pendingActions().stream()
                .filter(a -> pending.isPending(user, a.actionId())).toList();
    }
    private AiChatResponse decode(String json) { return mapper.readValue(json, AiChatResponse.class); }
    @Transactional
    public void delete(long user, long id) {
        owned(user, id, true); // Serializes deletion with generation and retries for this conversation.
        var responses = db.queryForList("SELECT response_json FROM dbo.ai_messages WHERE conversation_id=? AND response_json IS NOT NULL", String.class, id);
        for (String json : responses) for (var action : decode(json).pendingActions()) pending.revoke(user, action.actionId());
        db.update("DELETE FROM dbo.ai_conversations WHERE id=? AND user_id=?", id, user);
    }
    @Transactional
    public AiChatResponse send(long user, long id, String token, AiChatRequest request, UUID requestKey) {
        owned(user, id, true);
        var cached = db.queryForList("SELECT response_json FROM dbo.ai_messages WHERE conversation_id=? AND request_key=?", String.class, id, requestKey.toString());
        if (!cached.isEmpty()) return decode(cached.getFirst());
        // Server history, bounded independently of anything supplied by the client.
        var history = db.query("SELECT TOP (24) role, content FROM dbo.ai_messages WHERE conversation_id=? ORDER BY id DESC",
                (rs, n) -> new AiChatRequest.ChatTurn(rs.getString(1), rs.getString(2)), id);
        Collections.reverse(history);
        AiChatResponse response = request.cartAction() == null
                ? chat.chat(request.message(), token, user, history)
                : chat.prepareCartAction(user, request.cartAction());
        try {
            db.update("INSERT INTO dbo.ai_messages(conversation_id,role,content) VALUES (?,'user',?)", id, request.message());
            db.update("INSERT INTO dbo.ai_messages(conversation_id,role,content,response_json,request_key) VALUES (?,'assistant',?,?,?)",
                    id, response.reply(), mapper.writeValueAsString(response), requestKey.toString());
            db.update("UPDATE dbo.ai_conversations SET title=CASE WHEN title=N'Novi razgovor' THEN ? ELSE title END, updated_at=SYSUTCDATETIME() WHERE id=?", title(request.message()), id);
            return response;
        } catch (RuntimeException ex) {
            if (response.pendingActions() != null) for (var action : response.pendingActions()) pending.revoke(user, action.actionId());
            throw ex;
        }
    }
    static String title(String text) {
        String title = text.strip().replaceAll("\\s+", " ");
        return title.length() > 80 ? title.substring(0, 77) + "…" : title;
    }
}
