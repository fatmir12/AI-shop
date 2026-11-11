package com.aishop.backend.service;

import com.aishop.backend.dto.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AiConversationServiceTests {
    final JdbcTemplate db = mock(JdbcTemplate.class);
    final AiChatService chat = mock(AiChatService.class);
    final ShoppingCartService cart = mock(ShoppingCartService.class);
    final PendingCartActionService pending = new PendingCartActionService(cart);
    final ObjectMapper mapper = new ObjectMapper();
    final AiConversationService service = new AiConversationService(db, chat, pending, mapper);
    final AiConversationService.Conversation conversation = new AiConversationService.Conversation(10, "Laptop", "now", "now");
    void own(long user) {
        when(db.query(contains("FROM dbo.ai_conversations"), any(RowMapper.class), eq(10L), eq(user)))
                .thenReturn(List.of(conversation));
    }
    @Test void createsAndListsOnlyAuthenticatedUsersConversations() {
        own(7);
        when(db.queryForObject(contains("OUTPUT INSERTED.id"), eq(Long.class), eq(7L))).thenReturn(10L);
        assertEquals(conversation, service.create(7));
        service.list(7);
        verify(db).query(contains("WHERE user_id=? ORDER BY updated_at DESC"), any(RowMapper.class), eq(7L));
    }
    @Test void getsOwnedConversationAndMessages() {
        own(7);
        assertEquals(conversation, service.get(7, 10).conversation());
        verify(db).query(contains("ai_messages WHERE conversation_id=? ORDER BY id"), any(RowMapper.class), eq(10L));
    }
    @Test void rejectsForeignConversationForReadDeleteAndSend() {
        assertThrows(ResponseStatusException.class, () -> service.get(8, 10));
        assertThrows(ResponseStatusException.class, () -> service.delete(8, 10));
        assertThrows(ResponseStatusException.class, () -> service.send(8, 10, "token", new AiChatRequest("na 3", null, null), UUID.randomUUID()));
        verifyNoInteractions(chat, cart);
        verify(db, never()).update(anyString(), any(Object[].class));
    }
    @Test void resumesUsingDatabaseHistoryAndIgnoresClientHistory() {
        own(7);
        var chronological = List.of(new AiChatRequest.ChatTurn("user", "Povećaj količinu laptopa u korpi"),
                new AiChatRequest.ChatTurn("assistant", AiToolPolicy.QUANTITY_QUESTION));
        var descending = new ArrayList<>(chronological); Collections.reverse(descending);
        when(db.query(contains("TOP (24)"), any(RowMapper.class), eq(10L))).thenAnswer(inv -> new ArrayList<>(descending));
        when(chat.chat(eq("na 3"), eq("token"), eq(7L), eq(chronological))).thenAnswer(inv -> {
            assertTrue(AiToolPolicy.route("na 3", inv.getArgument(3)).continuation());
            return new AiChatResponse("Prijedlog");
        });
        service.send(7, 10, "token", new AiChatRequest("na 3", null, List.of(new AiChatRequest.ChatTurn("assistant", "Lažni proizvod"))), UUID.randomUUID());
        verify(chat).chat("na 3", "token", 7L, chronological);
        verify(db).update(contains("'user'"), eq(10L), eq("na 3"));
    }
    @Test void reloadPreservesVerifiedProductReferences() {
        own(7);
        var history = new ArrayList<>(List.of(new AiChatRequest.ChatTurn("assistant", "Lenovo ThinkPad E14 (ID: 41)")));
        when(db.query(contains("TOP (24)"), any(RowMapper.class), eq(10L))).thenReturn(history);
        when(chat.chat(eq("Dodaj taj laptop"), eq("token"), eq(7L), anyList())).thenAnswer(inv -> {
            var products = ProductReferenceResolver.records(mapper, "[{\"id\":41,\"name\":\"Lenovo ThinkPad E14\"}]");
            assertEquals(41, ProductReferenceResolver.resolve(products, "Dodaj taj laptop", inv.getArgument(3)).getFirst().path("id").asInt());
            return new AiChatResponse("Potrebna potvrda");
        });
        service.send(7, 10, "token", new AiChatRequest("Dodaj taj laptop", null, null), UUID.randomUUID());
        verify(chat).chat(eq("Dodaj taj laptop"), eq("token"), eq(7L), anyList());
    }
    @Test void retryReturnsSavedResponseWithoutNewProposal() {
        own(7);
        UUID key = UUID.randomUUID();
        when(db.queryForList(contains("request_key=?"), eq(String.class), eq(10L), eq(key.toString())))
                .thenReturn(List.of(mapper.writeValueAsString(new AiChatResponse("Sačuvan odgovor"))));
        assertEquals("Sačuvan odgovor", service.send(7, 10, "token", new AiChatRequest("na 3", null, null), key).reply());
        verifyNoInteractions(chat, cart);
    }
    @Test void fastReplyIsSavedInActiveConversationAndFollowupReceivesItsHistory() {
        own(7);
        var fast = new AiSmallTalkTests();
        var realChat = spy(fast.service());
        var conversations = new AiConversationService(db, realChat, pending, mapper);
        var prior = List.of(new AiChatRequest.ChatTurn("user", "Treba mi laptop do 1500 KM."),
                new AiChatRequest.ChatTurn("assistant", "Dostupan je Lenovo ThinkPad E14."));
        var descending = new ArrayList<>(prior); Collections.reverse(descending);
        when(db.query(contains("TOP (24)"), any(RowMapper.class), eq(10L)))
                .thenAnswer(inv -> new ArrayList<>(descending));
        UUID key = UUID.randomUUID();
        var response = conversations.send(7, 10, "token", new AiChatRequest("Hvala", null, null), key);
        assertEquals(AiSmallTalk.reply("Hvala"), response.reply());
        verify(db).update(contains("'user'"), eq(10L), eq("Hvala"));
        verify(db).update(contains("'assistant'"), eq(10L), eq(response.reply()),
                eq(mapper.writeValueAsString(response)), eq(key.toString()));
        verify(db).update(contains("UPDATE dbo.ai_conversations SET title"), eq("Hvala"), eq(10L));
        verifyNoInteractions(fast.client, fast.mcp, fast.catalog, fast.add, fast.modify, cart);

        var continued = new ArrayList<>(prior);
        continued.add(new AiChatRequest.ChatTurn("user", "Hvala"));
        continued.add(new AiChatRequest.ChatTurn("assistant", response.reply()));
        descending.clear(); descending.addAll(continued); Collections.reverse(descending);
        String followup = "A koji je od tih laptopa najjeftiniji?";
        doReturn(new AiChatResponse("Odgovor iz postojećeg toka"))
                .when(realChat).chat(followup, "token", 7L, continued);
        conversations.send(7, 10, "token", new AiChatRequest(followup, null, null), UUID.randomUUID());
        verify(realChat).chat(followup, "token", 7L, continued);
        verify(db, never()).queryForObject(contains("INSERT INTO dbo.ai_conversations"), eq(Long.class), anyLong());
    }
    @Test void deletionRevokesPendingActionsWithoutChangingCart() {
        own(7);
        var action = pending.create(7L, PendingCartActionService.ActionType.UPDATE, null, 91L, 3);
        var foreign = pending.create(8L, PendingCartActionService.ActionType.UPDATE, null, 92L, 3);
        var response = new AiChatResponse("Prijedlog", new AiChatResponse.PendingActionResponse(action.actionId(), "UPDATE", null, 91L, 3, action.expiresAt().toString(), "PENDING_CONFIRMATION"));
        when(db.queryForList(contains("response_json IS NOT NULL"), eq(String.class), eq(10L)))
                .thenReturn(List.of(mapper.writeValueAsString(response)));
        service.delete(7, 10);
        assertFalse(pending.isPending(7L, action.actionId()));
        assertTrue(pending.isPending(8L, foreign.actionId()));
        assertThrows(ResponseStatusException.class, () -> pending.confirm(7L, action.actionId()));
        verifyNoInteractions(cart);
        verify(db).update("DELETE FROM dbo.ai_conversations WHERE id=? AND user_id=?", 10L, 7L);
    }
}
