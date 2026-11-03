
package com.aishop.backend.service;

import io.modelcontextprotocol.client.McpClient;
import io.modelcontextprotocol.client.McpSyncClient;
import io.modelcontextprotocol.client.transport.HttpClientStreamableHttpTransport;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.http.HttpRequest;
import java.time.Duration;
import java.util.function.Function;

@Service
public class McpClientService {

    private final String mcpBaseUrl;

    public McpClientService(
            @Value("${app.mcp.base-url}") String mcpBaseUrl) {

        this.mcpBaseUrl = mcpBaseUrl;
    }

    public <T> T withClient(
            String accessToken,
            Function<McpSyncClient, T> operation) {

        // Streamable HTTP konekcija na nas MCP Server
        var transport = HttpClientStreamableHttpTransport
                .builder(mcpBaseUrl)
                .endpoint("/mcp")
                .requestBuilder(
                        HttpRequest.newBuilder()
                                .header(
                                        "Authorization",
                                        "Bearer " + accessToken
                                )
                )
                .build();

        // Klijent se kreira tek tokom chat zahtjeva
        McpSyncClient client = McpClient.sync(transport)
                .requestTimeout(Duration.ofSeconds(30))
                .build();

        try {
            // MCP initialize + initialized
            client.initialize();
            System.out.println("MCP CLIENT INITIALIZED");

            // Izvrsavanje zeljene operacije
            return operation.apply(client);

        } finally {
            // Zatvaranje MCP sesije
            client.closeGracefully();
        }
    }
}
