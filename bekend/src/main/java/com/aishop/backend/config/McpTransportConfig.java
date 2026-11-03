
package com.aishop.backend.config;

import io.modelcontextprotocol.common.McpTransportContext;

import org.springframework.ai.mcp.server.webmvc.transport.WebMvcStreamableServerTransportProvider;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@Configuration
public class McpTransportConfig {

    @Bean
    public WebMvcStreamableServerTransportProvider mcpTransport(
            JwtDecoder jwtDecoder) {

        return WebMvcStreamableServerTransportProvider
                .builder()
                .mcpEndpoint("/mcp")
                .contextExtractor(request -> {

                    String authorization = request.headers()
                            .firstHeader("Authorization");

                    if (authorization == null ||
                            !authorization.startsWith("Bearer ")) {

                        throw new ResponseStatusException(
                                HttpStatus.UNAUTHORIZED,
                                "Authentication required"
                        );
                    }

                    String accessToken =
                            authorization.substring(7).trim();

                    try {
                        // Ponovo validiramo JWT na serveru
                        Jwt jwt = jwtDecoder.decode(accessToken);

                        Long userId = Long.valueOf(
                                jwt.getSubject()
                        );

                        // U MCP context stavljamo samo userId
                        return McpTransportContext.create(
                                Map.of("userId", userId)
                        );

                    } catch (Exception ex) {
                        throw new ResponseStatusException(
                                HttpStatus.UNAUTHORIZED,
                                "Invalid authentication token"
                        );
                    }
                })
                .build();
    }
}
