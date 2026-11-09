package com.aishop.backend;

import com.aishop.backend.config.SecurityConfig;
import com.aishop.backend.controller.PaymentController;
import com.aishop.backend.service.StripeService;
import com.stripe.Stripe;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HexFormat;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(value=PaymentController.class, properties="stripe.webhook.secret=whsec_contract_test")
@Import(SecurityConfig.class)
class PaymentApiSecurityTests {
    @Autowired MockMvc mvc;
    @MockitoBean StripeService stripe;
    @MockitoBean JwtDecoder decoder;
    @Test void checkoutAndStatusRequireAuthentication() throws Exception {
        mvc.perform(post("/api/checkout/create-session?orderId=4")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/checkout/session-status?sessionId=cs_test_4")).andExpect(status().isUnauthorized());
        verifyNoInteractions(stripe);
    }
    @Test void webhookRejectsMissingAndForgedSignatures() throws Exception {
        mvc.perform(post("/api/checkout/webhook").contentType("application/json").content("{}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/checkout/webhook").header("Stripe-Signature", "t=1,v1=forged")
                .contentType("application/json").content("{}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(stripe);
    }
    @Test void signedWebhookDoesNotRequireBearerToken() throws Exception {
        String body = "{\"id\":\"evt_test\",\"object\":\"event\",\"api_version\":\"" + Stripe.API_VERSION +
                "\",\"type\":\"checkout.session.completed\",\"data\":{\"object\":{\"id\":\"cs_test_4\",\"object\":\"checkout.session\"}}}";
        long time = Instant.now().getEpochSecond();
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec("whsec_contract_test".getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String hash = HexFormat.of().formatHex(mac.doFinal((time + "." + body).getBytes(StandardCharsets.UTF_8)));
        mvc.perform(post("/api/checkout/webhook").header("Stripe-Signature", "t="+time+",v1="+hash)
                .contentType("application/json").content(body)).andExpect(status().isNoContent());
        verify(stripe).handleEvent(any());
    }
}