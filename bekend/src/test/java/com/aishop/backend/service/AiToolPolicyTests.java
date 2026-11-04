package com.aishop.backend.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class AiToolPolicyTests {
    @Test void productQuestionCannotReachCartMutation() {
        var intent = AiToolPolicy.classify("Imate li laptop do 2000 KM?");
        assertEquals(AiToolPolicy.Intent.CATALOG, intent);
        assertTrue(AiToolPolicy.permitted("searchProducts", intent));
        assertFalse(AiToolPolicy.permitted("addToCart", intent));
        assertFalse(AiToolPolicy.permitted("getMyCart", intent));
    }

    @Test void explicitCartAddAllowsOnlyAddition() {
        var intent = AiToolPolicy.classify("Dodaj taj laptop u moju korpu.");
        assertEquals(AiToolPolicy.Intent.CART_ADD, intent);
        assertTrue(AiToolPolicy.permitted("addToCart", intent));
        assertFalse(AiToolPolicy.permitted("removeFromCart", intent));
        assertFalse(AiToolPolicy.permitted("updateCartQuantity", intent));
    }

    @Test void cartReadIsReadOnly() {
        var intent = AiToolPolicy.classify("Sta imam u korpi?");
        assertEquals(AiToolPolicy.Intent.CART_READ, intent);
        assertTrue(AiToolPolicy.permitted("getMyCart", intent));
        assertFalse(AiToolPolicy.permitted("addToCart", intent));
    }

    @Test void explicitRemoveAndUpdateUseCorrectTool() {
        var remove = AiToolPolicy.classify("Ukloni laptop iz korpe");
        assertTrue(AiToolPolicy.permitted("removeFromCart", remove));
        assertFalse(AiToolPolicy.permitted("addToCart", remove));
        var update = AiToolPolicy.classify("Povećaj količinu u korpi");
        assertTrue(AiToolPolicy.permitted("updateCartQuantity", update));
        assertFalse(AiToolPolicy.permitted("addToCart", update));
    }

    @Test void negationAndHowToQuestionNeverOfferWriteTool() {
        for (String question : new String[] {
                "Nemoj dodaj ovaj laptop u korpu",
                "Ne dodaj laptop u korpu",
                "Kako dodati proizvod u korpu?"
        }) {
            var intent = AiToolPolicy.classify(question);
            assertFalse(AiToolPolicy.isMutation(intent), question);
        }
    }

    @Test void namespacedMcpCallbacksAreRecognized() {
        assertTrue(AiToolPolicy.permitted("AIShop_addToCart", AiToolPolicy.Intent.CART_ADD));
        assertTrue(AiToolPolicy.permitted("AIShop.searchProducts", AiToolPolicy.Intent.CATALOG));
        assertFalse(AiToolPolicy.permitted("unknownDangerousTool", AiToolPolicy.Intent.CATALOG));
    }
}
