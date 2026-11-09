import { apiClient } from './api';

export const PaymentService = {
  createCheckoutSession: async (orderId) => {
    try {
      const response = await apiClient.post(
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
