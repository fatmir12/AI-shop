package com.aishop.backend.service;

import com.aishop.backend.dto.AiChatRequest;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.client.ChatClient;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AiSmallTalkTests {
    final ChatClient client = mock(ChatClient.class);
    final ChatClient.Builder builder = mock(ChatClient.Builder.class, RETURNS_SELF);
    final McpClientService mcp = mock(McpClientService.class);
    final PendingCartActionService pending = mock(PendingCartActionService.class);
    final CatalogMcpAnswerService catalog = mock(CatalogMcpAnswerService.class);
    final CartAddMcpService add = mock(CartAddMcpService.class);
    final CartModifyMcpService modify = mock(CartModifyMcpService.class);

    AiChatService service() {
        when(builder.build()).thenReturn(client);
        return new AiChatService(builder, mcp, pending, catalog, add, modify);
    }

    @Test void expectedReplies() {
        assertEquals("Zdravo! 👋 Kako vam mogu pomoći danas?", AiSmallTalk.reply("Zdravo"));
        assertEquals("Dobar dan! Kako vam mogu pomoći pri kupovini?", AiSmallTalk.reply("Dobar dan!"));
        assertEquals(AiSmallTalk.reply("Ćao"), AiSmallTalk.reply("cao"));
        assertEquals("Nema na čemu! Ako vam zatreba još nešto, slobodno pitajte.", AiSmallTalk.reply("Hvala puno"));
        assertEquals("Odlično, hvala na pitanju! 😊 Kako vam mogu pomoći?", AiSmallTalk.reply("Kako si?"));
        assertTrue(AiSmallTalk.reply("Ko si ti?").startsWith("Ja sam AIShop asistent."));
        assertTrue(AiSmallTalk.reply("Šta možeš raditi?").contains("iz naše ponude"));
    }

    @Test void allSupportedVariantsBypassModelMcpCatalogAndCart() {
        var service = service();
        var history = List.of(new AiChatRequest.ChatTurn("user", "Treba mi laptop do 1500 KM."));
        for (String message : List.of("zdravo", "ZDRAVO", "zdravo!", "zdravo :)", "Ćao", "cao",
                "hej", "hejj", "pozdrav", "dobar dan!", "  dobro   jutro  ", "Dobro veče", "dobro vece",
                "Kako si?", "Šta ima?", "Hvala", "hvalaa", "hvala ti", "Hvala puno", "Super, hvala",
                "Nema na čemu", "Doviđenja", "Vidimo se", "Laku noć", "Ko si ti?", "Šta možeš raditi?",
                "Zdravo! 👋", "hvala :-)", "hej :D", "DOBAR\u00a0DAN")) {
            var response = service.chat(message, "token", 7L, history);
            assertNotNull(response.reply(), message);
            assertFalse(response.reply().isBlank(), message);
            assertTrue(response.pendingActions().isEmpty());
            assertNull(response.pendingAction());
        }
        verifyNoInteractions(client, mcp, pending, catalog, add, modify);
        assertEquals(1, history.size());
    }

    @Test void mixedAndAmbiguousMessagesReachExistingFlow() {
        var service = service();
        when(mcp.withClient(anyString(), anyString(), any())).thenReturn("Odgovor iz postojećeg toka");
        for (String message : List.of("Zdravo, koji najjeftiniji miš imate?",
                "Dobar dan, trebam laptop do 1500 KM.", "Hej, preporuči mi tastaturu.",
                "Hej, preporuči mi laptop", "Hvala, a koji je najskuplji miš?",
                "Hvala, a koji je najskuplji laptop?", "Možeš li mi pronaći miš za gaming?",
                "Kako si, imaš li neke dobre slušalice?", "Koji je bolji od ova dva?",
                "A šta je s onim laptopom?", "A koji je od tih laptopa najjeftiniji?",
                "hvala laptop", "zdravo :) laptop", "hej\nlaptop", "", "da", "hvalaaa")) {
            assertNull(AiSmallTalk.reply(message), message);
            service.chat(message, "token", 7L, List.of());
        }
        verify(mcp, times(17)).withClient(eq("token"), anyString(), any());
    }
}
