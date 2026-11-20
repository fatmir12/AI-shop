package com.aishop.backend.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class CartModifyMcpServiceTests {

    @Test
    void understandsNewTotalQuantity() {
        assertEquals(2, CartModifyMcpService.requestedTotal(
                "Povećaj količinu Lenova u korpi na 2 komada"));
        assertEquals(3, CartModifyMcpService.requestedTotal(
                "Postavi količinu stavke na 3 komada"));
        assertEquals(2, CartModifyMcpService.requestedTotal(
                "Promijeni količinu u korpi na dva"));
    }

    @Test
    void refusesUnknownOrRelativeQuantity() {
        assertNull(CartModifyMcpService.requestedTotal("Povećaj količinu Lenova u korpi"));
        assertNull(CartModifyMcpService.requestedTotal("Povećaj količinu Lenova za 2 komada"));
    }
}
