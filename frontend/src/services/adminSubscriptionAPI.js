import api from './api';

const adminSubscriptionAPI = {
  // ===== SUBSCRIPTION PLANS MANAGEMENT =====
  
  // Get all subscription plans (including inactive)
  getAllSubscriptions: async () => {
    try {
      const res = await api.get('/subscriptions/admin/plans');
      return res.data;
    } catch (err) {
      const message = err.response?.data?.error || 'Error fetching all subscriptions';
      console.error('Error fetching all subscriptions:', message);
      throw new Error(message);
    }
  },
  
  // Create new subscription plan
  createSubscription: async (subscriptionData) => {
    try {
      const res = await api.post('/subscriptions/plans', subscriptionData);
      return res.data;
    } catch (err) {
      const message = err.response?.data?.error || 'Error creating subscription';
      console.error('Error creating subscription:', message);
      throw new Error(message);
    }
  },
  
  // Update subscription plan
  updateSubscription: async (id, subscriptionData) => {
    try {
      const res = await api.put(`/subscriptions/plans/${id}`, subscriptionData);
      return res.data;
    } catch (err) {
      const message = err.response?.data?.error || 'Error updating subscription';
      console.error('Error updating subscription:', message);
      throw new Error(message);
    }
  },
  
  // Delete subscription plan
  deleteSubscription: async (id) => {
    try {
      const res = await api.delete(`/subscriptions/plans/${id}`);
      return res.data;
    } catch (err) {
      const message = err.response?.data?.error || 'Error deleting subscription';
      console.error('Error deleting subscription:', message);
      throw new Error(message);
    }
  },
  
  // Toggle subscription plan status
  toggleSubscriptionStatus: async (id) => {
    try {
      const res = await api.patch(`/subscriptions/plans/${id}/toggle`);
      return res.data;
    } catch (err) {
      const message = err.response?.data?.error || 'Error toggling subscription status';
      console.error('Error toggling subscription status:', message);
      throw new Error(message);
    }
  },
  
  // ===== USER SUBSCRIPTIONS MANAGEMENT =====
  
  // Get all user subscriptions (with filtering and pagination)
  getAllUserSubscriptions: async (filters = {}, page = 1, limit = 10) => {
    try {
      const queryParams = new URLSearchParams({
        page,
        limit,
        ...filters
      });
      
      const res = await api.get(`/subscriptions/admin/users?${queryParams}`);
      return res.data;
    } catch (err) {
      const message = err.response?.data?.error || 'Error fetching user subscriptions';
      console.error('Error fetching all user subscriptions:', message);
      throw new Error(message);
    }
  },

  // Get subscription statistics
  getSubscriptionStats: async () => {
    try {
      const res = await api.get('/subscriptions/admin/stats');
      return res.data;
    } catch (err) {
      const message = err.response?.data?.error || 'Error fetching subscription statistics';
      console.error('Error fetching subscription stats:', message);
      throw new Error(message);
    }
  }
};

export default adminSubscriptionAPI;
export { adminSubscriptionAPI };
