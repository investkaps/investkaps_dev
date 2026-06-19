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
  createOrder: async (amount, currency, subscriptionId, planOptionId, duration) => {
    try {
      const res = await api.post('/subscriptions/payment/order', {
        amount,
        currency,
        subscriptionId,
        planOptionId,
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
  },

  // Get public model portfolios (for pricing page)
  getPublicModelPortfolios: async () => {
    try {
      const res = await api.get('/subscriptions/model-portfolios/public');
      return res.data;
    } catch (err) {
      const message = err.response?.data?.error || 'Error fetching model portfolios';
      console.error('Error fetching model portfolios:', message);
      throw new Error(message);
    }
  },

  // Get the model portfolio linked to the current user's active MP subscription
  getMyModelPortfolio: async () => {
    try {
      const res = await api.get('/subscriptions/my-model-portfolio');
      return res.data;
    } catch (err) {
      if (err.response?.status === 404) return { success: false, data: null };
      const message = err.response?.data?.error || 'Error fetching model portfolio';
      console.error('Error fetching model portfolio:', message);
      return { success: false, data: null };
    }
  }
};

export default subscriptionAPI;
