package com.aishop.backend;

import com.aishop.backend.config.SecurityConfig;
import com.aishop.backend.controller.OrderController;
import com.aishop.backend.dto.ShippingDetails;
import com.aishop.backend.service.OrderService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(OrderController.class)
@Import(SecurityConfig.class)
class OrderShippingApiTests {
    @Autowired MockMvc mvc;
    @MockitoBean OrderService orders;
    @MockitoBean JwtDecoder decoder;
    private final String valid = """
        {"firstName":" Test ","lastName":" Kupac ","email":"test@example.test",
        "address":" Testna ulica 12 ","city":" Sarajevo ","postalCode":"71000","phone":"+38761123456"}
        """;
    @Test void checkoutRequiresLogin() throws Exception {
        mvc.perform(post("/api/orders").contentType("application/json").content(valid)).andExpect(status().isUnauthorized());
        verifyNoInteractions(orders);
    }
    @Test void validShippingIsTrimmedAndIdentityComesFromJwt() throws Exception {
        mvc.perform(post("/api/orders").with(jwt().jwt(j -> j.subject("7")))
                .contentType("application/json").content(valid.replace("{", "{\"userId\":999,\"totalAmount\":1,")))
                .andExpect(status().isCreated());
        verify(orders).createOrder(7L, new ShippingDetails("Test", "Kupac", "test@example.test",
                "Testna ulica 12", "Sarajevo", "71000", "+38761123456"));
    }
    @Test void missingOrMalformedShippingNeverCreatesAnOrder() throws Exception {
        for (String body : new String[]{"{}", valid.replace("71000", "abc"),
                valid.replace("+38761123456", "------"), valid.replace("test@example.test", "wrong"),
                valid.replace(" Testna ulica 12 ", "   "), valid.replace(" Test ", "x".repeat(101))}) {
            mvc.perform(post("/api/orders").with(jwt().jwt(j -> j.subject("7")))
                    .contentType("application/json").content(body)).andExpect(status().isBadRequest());
        }
        mvc.perform(post("/api/orders").with(jwt().jwt(j -> j.subject("7"))))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(orders);
    }
}