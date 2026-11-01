
package com.aishop.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

import java.util.List;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http) throws Exception {

        JwtAuthenticationConverter converter =
                new JwtAuthenticationConverter();

        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            String role = jwt.getClaimAsString("role");

            if ("ADMIN".equals(role)) {
                return List.of(
                        new SimpleGrantedAuthority("ROLE_ADMIN")
                );
            }

            if ("USER".equals(role)) {
                return List.of(
                        new SimpleGrantedAuthority("ROLE_USER")
                );
            }

            return List.of();
        });

        http
                .csrf(csrf -> csrf.disable())

                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                .authorizeHttpRequests(auth -> auth

                        // Health endpoint
                        .requestMatchers("/api/health")
                        .permitAll()

                        // Registracija, prijava i refresh token
                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/auth/register",
                                "/api/auth/login",
                                "/api/auth/refresh",
                                "/api/auth/logout"
                        ).permitAll()

                        // Javni pregled kategorija i proizvoda
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/categories",
                                "/api/categories/**",
                                "/api/products",
                                "/api/products/**"
                        ).permitAll()

                        // Dodavanje kategorija i proizvoda - ADMIN
                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/categories",
                                "/api/categories/**",
                                "/api/products",
                                "/api/products/**"
                        ).hasRole("ADMIN")

                        // Izmjena kategorija i proizvoda - ADMIN
                        .requestMatchers(
                                HttpMethod.PUT,
                                "/api/categories/**",
                                "/api/products/**"
                        ).hasRole("ADMIN")

                        // Brisanje kategorija i proizvoda - ADMIN
                        .requestMatchers(
                                HttpMethod.DELETE,
                                "/api/categories/**",
                                "/api/products/**"
                        ).hasRole("ADMIN")

                        // Svi ostali endpointi zahtijevaju autentifikaciju
                        .anyRequest().authenticated()
                )

                // JWT Bearer autentifikacija
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt
                                .jwtAuthenticationConverter(converter)
                        )
                );

        return http.build();
    }
}
