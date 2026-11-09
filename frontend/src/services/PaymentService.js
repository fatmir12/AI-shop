import { http } from './adapters/api';

export const PaymentService = {
  cancel: async orderId => (await http.post('/checkout/cancel', null, { params: { orderId } })).data,
  refund: async orderId => (await http.post('/checkout/refund', null, { params: { orderId } })).data,
  sessionStatus: async (sessionId) => (await http.get('/checkout/session-status', { params: { sessionId } })).data,
  createCheckoutSession: async (orderId) => {
    try {
      const response = await http.post(
        `/checkout/create-session?orderId=${orderId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  },

  redirectToCheckout: (sessionUrl) => {
    if (sessionUrl) {
      window.location.href = sessionUrl;
    }
  }
};
