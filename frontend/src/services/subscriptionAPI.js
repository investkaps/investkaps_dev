import api from './api';

const subscriptionAPI = {
  // ===== SUBSCRIPTION PLANS =====
  
  // Get all active subscription plans
  getAllSubscriptions: async () => {
    try {
      const res = await api.get('/subscriptions/plans');
      return res.data;
    } catch (err) {
      const message = err.response?.data?.error || 'Error fetching subscriptions';
      console.error('Error fetching subscriptions:', message);
      throw new Error(message);
    }
  },
  
  // Get subscription by ID
  getSubscriptionById: async (id) => {
    try {
      const res = await api.get(`/subscriptions/plans/${id}`);
      return res.data;
    } catch (err) {
      const message = err.response?.data?.error || 'Error fetching subscription';
      console.error('Error fetching subscription:', message);
      throw new Error(message);
    }
  },
  
  // ===== USER SUBSCRIPTIONS =====
  
  // Get all subscriptions for the current user
  getUserSubscriptions: async (userId) => {
    try {
      const res = await api.get(`/subscriptions/user/${userId}`);
      return res.data;
    } catch (err) {
      const message = err.response?.data?.error || 'Error fetching subscriptions';
      console.error('Error fetching user subscriptions:', message);
      throw new Error(message);
    }
  },

  // Get active subscription for the current user
  getActiveSubscription: async (userId) => {
    try {
      const res = await api.get(`/subscriptions/user/${userId}/active`);
      return res.data;
    } catch (err) {
      // If 404, it means no active subscription - not an error
      if (err.response?.status === 404) {
        return { success: false, data: null };
      }
      
      const message = err.response?.data?.error || 'Error fetching active subscription';
      console.error('Error fetching active subscription:', message);
      throw new Error(message);
    }
  },

  // Cancel a subscription
  cancelSubscription: async (subscriptionId) => {
    try {
      const res = await api.put(`/subscriptions/${subscriptionId}/cancel`);
      return res.data;
    } catch (err) {
      const message = err.response?.data?.error || 'Error cancelling subscription';
      console.error('Error cancelling subscription:', message);
      throw new Error(message);
    }
  },
  
  // ===== PAYMENT =====
  
  // Create a payment order
  createOrder: async (amount, currency, subscriptionId, duration) => {
    try {
      const res = await api.post('/subscriptions/payment/order', {
        amount,
        currency,
        subscriptionId,
        duration
      });
      return res.data;
    } catch (err) {
      const message = err.response?.data?.error || 'Error creating payment order';
      console.error('Error creating payment order:', message);
      throw new Error(message);
    }
  },
  
  // Verify payment
  verifyPayment: async (paymentData) => {
    try {
      const res = await api.post('/subscriptions/payment/verify', paymentData);
      return res.data;
    } catch (err) {
      const message = err.response?.data?.error || 'Error verifying payment';
      console.error('Error verifying payment:', message);
      throw new Error(message);
    }
  }
};

export default subscriptionAPI;
