package com.aishop.backend.service;

import com.aishop.backend.dto.AddCartItemRequest;
import com.aishop.backend.dto.ShoppingCartResponse;
import com.aishop.backend.dto.UpdateCartItemRequest;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PendingCartActionServiceTests {
    private final ShoppingCartService cart = mock(ShoppingCartService.class);
    private final PendingCartActionService service = new PendingCartActionService(cart);
    private final ShoppingCartResponse result = new ShoppingCartResponse(1L, List.of(), BigDecimal.ZERO, 0);

    @Test void proposalsDoNotMutateCartAndAreScopedToUserAndRequest() {
        var action = service.create(7L, PendingCartActionService.ActionType.ADD, 40L, null, 2, "request-a");
        assertEquals(List.of(action), service.forRequest(7L, "request-a"));
        assertTrue(service.forRequest(8L, "request-a").isEmpty());
        assertTrue(service.forRequest(7L, "request-b").isEmpty());
        verifyNoInteractions(cart);
        assertThrows(ResponseStatusException.class, () -> service.confirm(8L, action.actionId()));
        verifyNoInteractions(cart);
    }

    @Test void concurrentConfirmationExecutesAtMostOnce() throws Exception {
        when(cart.addItem(eq(7L), any(AddCartItemRequest.class))).thenReturn(result);
        var action = service.create(7L, PendingCartActionService.ActionType.ADD, 40L, null, 2);
        var start = new CountDownLatch(1);
        var successes = new AtomicInteger();
        try (var executor = Executors.newFixedThreadPool(8)) {
            var tasks = java.util.stream.IntStream.range(0, 8).mapToObj(i -> executor.submit(() -> {
                start.await();
                try { service.confirm(7L, action.actionId()); successes.incrementAndGet(); }
                catch (ResponseStatusException expected) { assertTrue(List.of(404, 409).contains(expected.getStatusCode().value())); }
                return null;
            })).toList();
            start.countDown();
            for (var task : tasks) task.get();
        }
        assertEquals(1, successes.get());
        verify(cart, times(1)).addItem(7L, new AddCartItemRequest(40L, 2));
    }

    @Test void updateAndRemoveUseCartItemIdsRatherThanProductIds() {
        when(cart.updateItem(eq(7L), eq(91L), any(UpdateCartItemRequest.class))).thenReturn(result);
        when(cart.removeItem(7L, 91L)).thenReturn(result);
        var update = service.create(7L, PendingCartActionService.ActionType.UPDATE, null, 91L, 3);
        service.confirm(7L, update.actionId());
        verify(cart).updateItem(7L, 91L, new UpdateCartItemRequest(3));
        var remove = service.create(7L, PendingCartActionService.ActionType.REMOVE, null, 91L, null);
        service.confirm(7L, remove.actionId());
        verify(cart).removeItem(7L, 91L);
    }

    @Test void quantityProposalRequiresConfirmationAndCannotExecuteTwice() {
        when(cart.updateItem(eq(7L), eq(91L), any(UpdateCartItemRequest.class))).thenReturn(result);
        var action = service.create(7L, PendingCartActionService.ActionType.UPDATE, null, 91L, 3, "clarification");
        verifyNoInteractions(cart);
        assertThrows(ResponseStatusException.class, () -> service.confirm(8L, action.actionId()));
        verifyNoInteractions(cart);
        service.confirm(7L, action.actionId());
        assertThrows(ResponseStatusException.class, () -> service.confirm(7L, action.actionId()));
        verify(cart, times(1)).updateItem(7L, 91L, new UpdateCartItemRequest(3));
    }

    @Test void failedCartMutationIsNotReplayedByRepeatedConfirmation() {
        when(cart.addItem(anyLong(), any())).thenThrow(new IllegalStateException("stock"));
        var action = service.create(7L, PendingCartActionService.ActionType.ADD, 40L, null, 2);
        assertThrows(IllegalStateException.class, () -> service.confirm(7L, action.actionId()));
        assertThrows(ResponseStatusException.class, () -> service.confirm(7L, action.actionId()));
        verify(cart, times(1)).addItem(anyLong(), any());
    }
}
