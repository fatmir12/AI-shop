package com.aishop.backend;

import com.aishop.backend.config.SecurityConfig;
import com.aishop.backend.controller.UserController;
import com.aishop.backend.entity.Role;
import com.aishop.backend.entity.User;
import com.aishop.backend.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import java.util.List;
import java.util.Optional;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UserController.class)
@Import(SecurityConfig.class)
class UserApiSecurityTests {
    @Autowired MockMvc mvc;
    @MockitoBean UserRepository users;
    @MockitoBean JwtDecoder decoder;

    private User user() {
        User user = new User();
        user.setId(7L); user.setFirstName("Test"); user.setLastName("Kupac");
        user.setEmail("test@local.test"); user.setRole(Role.USER); user.setPasswordHash("must-never-be-returned");
        return user;
    }

    @Test void userDirectoryRequiresAdminAndReturnsOnlySafeFields() throws Exception {
        when(users.findAll()).thenReturn(List.of(user()));
        mvc.perform(get("/api/users")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/users").with(jwt().authorities(new SimpleGrantedAuthority("ROLE_USER"))))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/users").with(jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(7))
                .andExpect(jsonPath("$[0].passwordHash").doesNotExist())
                .andExpect(jsonPath("$[0].refreshToken").doesNotExist());
    }

    @Test void profileUpdateUsesOnlyAuthenticatedSubjectAndValidatesNames() throws Exception {
        User user = user();
        when(users.findById(7L)).thenReturn(Optional.of(user));
        when(users.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        mvc.perform(put("/api/users/me").with(jwt().jwt(token -> token.subject("7")))
                        .contentType("application/json").content("{\"firstName\":\" Novi \",\"lastName\":\" Kupac \"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.firstName").value("Novi"))
                .andExpect(jsonPath("$.id").value(7));
        mvc.perform(put("/api/users/me").with(jwt().jwt(token -> token.subject("7")))
                        .contentType("application/json").content("{\"firstName\":\" \",\"lastName\":\"Kupac\"}"))
                .andExpect(status().isBadRequest());
        verify(users, never()).findById(8L);
    }
}
