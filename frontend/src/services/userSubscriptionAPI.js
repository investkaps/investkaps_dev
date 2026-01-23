import api from './api';

const userSubscriptionAPI = {
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

  // Renew a subscription
  renewSubscription: async (subscriptionId, paymentDetails) => {
    try {
      const res = await api.put(`/subscriptions/${subscriptionId}/renew`, paymentDetails);
      return res.data;
    } catch (err) {
      const message = err.response?.data?.error || 'Error renewing subscription';
      console.error('Error renewing subscription:', message);
      throw new Error(message);
    }
  },

  // Create test subscription (bypass payment for testing)
  createTestSubscription: async () => {
    try {
      const res = await api.post('/subscriptions/payment/test-bypass');
      return res.data;
    } catch (err) {
      const message = err.response?.data?.error || 'Error creating test subscription';
      console.error('Error creating test subscription:', message);
      throw new Error(message);
    }
  }
};

export default userSubscriptionAPI;
