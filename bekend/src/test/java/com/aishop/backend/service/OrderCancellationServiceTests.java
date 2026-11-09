package com.aishop.backend.service;
import com.aishop.backend.entity.*;
import com.aishop.backend.repository.*;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
class OrderCancellationServiceTests {
    @Test void cancellationRestoresOnlyOrderedQuantityOnce() {
        var items=mock(OrderItemRepository.class);var products=mock(ProductRepository.class);
        var service=new OrderCancellationService(items,products);
        var order=new Order();order.setId(4L);order.setStatus(OrderStatus.PENDING);
        var product=new Product();product.setId(8L);
        var item=new OrderItem();item.setProduct(product);item.setQuantity(2);
        when(items.findByOrderId(4L)).thenReturn(List.of(item));when(products.increaseStock(8L,2)).thenReturn(1);
        service.restoreAndCancel(order);service.restoreAndCancel(order);
        assertEquals(OrderStatus.CANCELLED,order.getStatus());verify(products,times(1)).increaseStock(8L,2);
    }
}