// src/services/api.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Axios instance with baseURL and json headers
const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token from localStorage to every request automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('clerk_jwt');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    
    // Log outgoing requests
    console.log('🌐 API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'none',
      data: config.data
    });
    
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Log responses and handle errors
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', {
      status: response.status,
      statusText: response.statusText,
      url: response.config.url,
      method: response.config.method?.toUpperCase(),
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      data: error.response?.data,
      message: error.message
    });
    return Promise.reject(error);
  }
);

// Centralized error extractor
export const extractError = (err) => {
  if (!err) return { message: 'Unknown error' };
  if (err.response && err.response.data) {
    return { message: err.response.data.error || err.response.data.message || JSON.stringify(err.response.data) };
  }
  return { message: err.message || String(err) };
};

// Simple debounce mechanism to prevent excessive API calls
const debounceMap = new Map();
const debounce = (key, fn, delay = 2000) => {
  if (debounceMap.has(key)) {
    return Promise.resolve({ success: false, error: 'Request debounced' });
  }
  
  debounceMap.set(key, true);
  setTimeout(() => {
    debounceMap.delete(key);
  }, delay);
  
  return fn();
};

export const userAPI = {
  // Create or update user in backend. Uses api instance so token interceptor runs.
  createUser: async (userData) => {
    try {
      // Backend route is /api/users/create, so we POST to '/users/create'
      const res = await api.post('/users/create', userData);
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error creating user:', message, err);
      throw new Error(message);
    }
  },

  getUserByClerkId: async (clerkId) => {
    try {
      const res = await api.get(`/users/clerk/${clerkId}`);
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error fetching user by clerkId:', message);
      throw new Error(message);
    }
  },
  
  getUserByEmail: async (email) => {
    try {
      const res = await api.get(`/users/email/${encodeURIComponent(email)}`);
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error fetching user by email:', message);
      throw new Error(message);
    }
  },

  updateProfile: async (clerkId, profileData) => {
    try {
      const res = await api.put(`/users/${clerkId}/profile`, profileData);
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error updating profile:', message);
      throw new Error(message);
    }
  },

  // Update KYC by clerkId
  updateKYCByClerkId: async (clerkId, kycData) => {
    try {
      const res = await api.put(`/users/clerk/${clerkId}/kyc`, kycData);
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error updating KYC by clerkId:', message);
      throw new Error(message);
    }
  },
  
  // Update KYC by email
  updateKYCByEmail: async (email, kycData) => {
    try {
      const res = await api.put(`/users/email/${encodeURIComponent(email)}/kyc`, kycData);
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error updating KYC by email:', message);
      throw new Error(message);
    }
  },
  
  // Get user KYC status by clerkId
  getKYCStatusByClerkId: async (clerkId) => {
    return debounce(`kyc_status_clerk_${clerkId}`, async () => {
      try {
        const res = await api.get(`/users/clerk/${clerkId}/kyc`);
        return res.data;
      } catch (err) {
        const { message } = extractError(err);
        console.error('Error fetching KYC status by clerkId:', message);
        throw new Error(message);
      }
    });
  },
  
  // Get user KYC status by email
  getKYCStatusByEmail: async (email) => {
    return debounce(`kyc_status_email_${email}`, async () => {
      try {
        const res = await api.get(`/users/email/${encodeURIComponent(email)}/kyc`);
        return res.data;
      } catch (err) {
        const { message } = extractError(err);
        console.error('Error fetching KYC status by email:', message);
        throw new Error(message);
      }
    });
  },
  
  // Get user KYC history by clerkId
  getKYCHistoryByClerkId: async (clerkId) => {
    return debounce(`kyc_history_clerk_${clerkId}`, async () => {
      try {
        const res = await api.get(`/users/clerk/${clerkId}/kyc/history`);
        return res.data;
      } catch (err) {
        const { message } = extractError(err);
        console.error('Error fetching KYC history by clerkId:', message);
        throw new Error(message);
      }
    });
  },
  
  // Get user KYC history by email
  getKYCHistoryByEmail: async (email) => {
    return debounce(`kyc_history_email_${email}`, async () => {
      try {
        const res = await api.get(`/users/email/${encodeURIComponent(email)}/kyc/history`);
        return res.data;
      } catch (err) {
        const { message } = extractError(err);
        console.error('Error fetching KYC history by email:', message);
        throw new Error(message);
      }
    });
  }
};

export const adminAPI = {
  // Get admin dashboard data
  getDashboard: async () => {
    try {
      const res = await api.get('/admin/dashboard');
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error getting admin dashboard:', message);
      throw new Error(message);
    }
  },
  
  // Get all users
  getAllUsers: async () => {
    try {
      const res = await api.get('/admin/users');
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error getting all users:', message);
      throw new Error(message);
    }
  },
  
  // Get user by ID
  getUserById: async (id) => {
    try {
      const res = await api.get(`/admin/users/${id}`);
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error getting user by ID:', message);
      throw new Error(message);
    }
  },
  
  // Update user role
  updateUserRole: async (id, role) => {
    try {
      const res = await api.put(`/admin/users/${id}/role`, { role });
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error updating user role:', message);
      throw new Error(message);
    }
  },
  
  // Get all KYC verifications
  getAllKycVerifications: async () => {
    try {
      const res = await api.get('/admin/kyc');
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error getting all KYC verifications:', message);
      throw new Error(message);
    }
  },
  
  // Stock Recommendation Methods
  getAllStockRecommendations: async (params = {}) => {
    try {
      const res = await api.get('/recommendations', { params });
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error getting stock recommendations:', message);
      throw new Error(message);
    }
  },
  
  getStockRecommendation: async (id) => {
    try {
      const res = await api.get(`/recommendations/${id}`);
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error(`Error getting stock recommendation ${id}:`, message);
      throw new Error(message);
    }
  },
  
  createStockRecommendation: async (data) => {
    try {
      const res = await api.post('/recommendations', data);
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error creating stock recommendation:', message);
      throw new Error(message);
    }
  },
  
  updateStockRecommendation: async (id, data) => {
    try {
      const res = await api.put(`/recommendations/${id}`, data);
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error(`Error updating stock recommendation ${id}:`, message);
      throw new Error(message);
    }
  },
  
  deleteStockRecommendation: async (id) => {
    try {
      const res = await api.delete(`/recommendations/${id}`);
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error(`Error deleting stock recommendation ${id}:`, message);
      throw new Error(message);
    }
  },
  
  sendStockRecommendation: async (id) => {
    try {
      const res = await api.post(`/recommendations/${id}/send`);
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error(`Error sending stock recommendation ${id}:`, message);
      throw new Error(message);
    }
  },
  
  // Symbol Search API Methods
  searchSymbols: async (query, limit = 50) => {
    try {
      const res = await api.get('/symbols/search', {
        params: { query, limit }
      });
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error searching symbols:', message);
      throw new Error(message);
    }
  },

  getAllSymbols: async (page = 1, limit = 100) => {
    try {
      const res = await api.get('/symbols', {
        params: { page, limit }
      });
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error getting all symbols:', message);
      throw new Error(message);
    }
  },

  reloadSymbols: async () => {
    try {
      const res = await api.post('/symbols/reload');
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error reloading symbols:', message);
      throw new Error(message);
    }
  },

  // LTP (Last Traded Price) API Methods
  fetchSinglePrice: async (exchange, symbol) => {
    try {
      const res = await api.get('/ltp/single', {
        params: { exchange, symbol }
      });
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error fetching single price:', message);
      throw new Error(message);
    }
  },

  fetchBatchPrices: async (exchange, symbols) => {
    try {
      const res = await api.post('/ltp/batch', { exchange, symbols });
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error fetching batch prices:', message);
      throw new Error(message);
    }
  },

  fetchMultiExchangePrices: async (items) => {
    try {
      const res = await api.post('/ltp/multi', { items });
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error fetching multi-exchange prices:', message);
      throw new Error(message);
    }
  },

  smartFetchPrices: async (items) => {
    try {
      const res = await api.post('/ltp/smart', { items });
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error in smart fetch prices:', message);
      throw new Error(message);
    }
  },

  fetchRecommendationPrices: async (recommendations) => {
    try {
      const res = await api.post('/ltp/recommendations', { recommendations });
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error fetching recommendation prices:', message);
      throw new Error(message);
    }
  },
  
  // Get all investments
  getAllInvestments: async () => {
    try {
      const res = await api.get('/admin/investments');
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error getting all investments:', message);
      throw new Error(message);
    }
  },

  // Get all subscriptions (including inactive)
  getAllSubscriptions: async () => {
    try {
      const res = await api.get('/subscriptions/admin/plans');
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error getting all subscriptions:', message);
      throw new Error(message);
    }
  },

  // Create a new subscription
  createSubscription: async (subscriptionData) => {
    try {
      const res = await api.post('/subscriptions/plans', subscriptionData);
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error creating subscription:', message);
      throw new Error(message);
    }
  },

  // Update a subscription
  updateSubscription: async (id, subscriptionData) => {
    try {
      const res = await api.put(`/subscriptions/plans/${id}`, subscriptionData);
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error updating subscription:', message);
      throw new Error(message);
    }
  },

  // Delete a subscription
  deleteSubscription: async (id) => {
    try {
      const res = await api.delete(`/subscriptions/plans/${id}`);
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error deleting subscription:', message);
      throw new Error(message);
    }
  },

  // Toggle subscription active status
  toggleSubscriptionStatus: async (id) => {
    try {
      const res = await api.patch(`/subscriptions/plans/${id}/toggle`);
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error toggling subscription status:', message);
      throw new Error(message);
    }
  },
  
  // Get all user subscriptions
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
      const { message } = extractError(err);
      console.error('Error getting all user subscriptions:', message);
      throw new Error(message);
    }
  },
  
  // Get subscription statistics
  getSubscriptionStats: async () => {
    try {
      const res = await api.get('/subscriptions/admin/stats');
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error getting subscription statistics:', message);
      throw new Error(message);
    }
  },

  // Strategy Management
  // Get all strategies
  getAllStrategies: async () => {
    try {
      const res = await api.get('/strategies');
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error getting all strategies:', message);
      throw new Error(message);
    }
  },

  // Get strategy by ID
  getStrategyById: async (id) => {
    try {
      const res = await api.get(`/strategies/${id}`);
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error getting strategy by ID:', message);
      throw new Error(message);
    }
  },

  // Create a new strategy
  createStrategy: async (strategyData) => {
    try {
      const res = await api.post('/strategies', strategyData);
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error creating strategy:', message);
      throw new Error(message);
    }
  },

  // Update a strategy
  updateStrategy: async (id, strategyData) => {
    try {
      const res = await api.put(`/strategies/${id}`, strategyData);
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error updating strategy:', message);
      throw new Error(message);
    }
  },

  // Delete a strategy
  deleteStrategy: async (id) => {
    try {
      const res = await api.delete(`/strategies/${id}`);
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error deleting strategy:', message);
      throw new Error(message);
    }
  },

  // Toggle strategy active status
  toggleStrategyStatus: async (id) => {
    try {
      const res = await api.patch(`/strategies/${id}/toggle-status`);
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error toggling strategy status:', message);
      throw new Error(message);
    }
  },

  // Get subscriptions by strategy ID
  getSubscriptionsByStrategy: async (id) => {
    try {
      const res = await api.get(`/strategies/${id}/subscriptions`);
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error getting subscriptions by strategy:', message);
      throw new Error(message);
    }
  },

  // Add strategies to subscription
  addStrategiesToSubscription: async (subscriptionId, strategyIds) => {
    try {
      const res = await api.post(`/subscriptions/plans/${subscriptionId}/strategies`, { strategyIds });
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error adding strategies to subscription:', message);
      throw new Error(message);
    }
  },

  // Remove strategies from subscription
  removeStrategiesFromSubscription: async (subscriptionId, strategyIds) => {
    try {
      const res = await api.delete(`/subscriptions/plans/${subscriptionId}/strategies`, { data: { strategyIds } });
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error removing strategies from subscription:', message);
      throw new Error(message);
    }
  }
};

export const setupAPI = {
  // Set initial admin user
  setInitialAdmin: async (email, adminSecret) => {
    try {
      const res = await api.post('/setup/admin', { email, adminSecret });
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error setting initial admin:', message);
      throw new Error(message);
    }
  },
  
  // Get admin status
  getAdminStatus: async () => {
    try {
      const res = await api.get('/setup/admin-status');
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error getting admin status:', message);
      throw new Error(message);
    }
  }
};

export const esignAPI = {
  createSignRequest: async (data) => {
    try {
      const res = await api.post('/esign', data);
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error creating sign request:', message);
      throw new Error(message);
    }
  },
  checkSignStatus: async (requestId) => {
    try {
      const res = await api.get(`/esign/${requestId}`);
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error checking sign status:', message);
      throw new Error(message);
    }
  },
  // Check document status by MongoDB document ID
  checkDocumentStatus: async (documentId) => {
    try {
      const res = await api.get(`/esign/document/${documentId}`);
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error checking document status:', message);
      throw new Error(message);
    }
  },
  // Bypass e-signing for testing (creates fake signed document without calling external API)
  bypassEsign: async () => {
    try {
      const res = await api.post('/esign/bypass');
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error bypassing e-sign:', message);
      throw new Error(message);
    }
  }
};

export const subscriptionAPI = {
  // Get all active subscriptions (public)
  getAllSubscriptions: async () => {
    try {
      const res = await api.get('/subscriptions/plans');
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error getting subscriptions:', message);
      throw new Error(message);
    }
  },

  // Get subscription by ID
  getSubscriptionById: async (id) => {
    try {
      const res = await api.get(`/subscriptions/plans/${id}`);
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error getting subscription:', message);
      throw new Error(message);
    }
  },

  // Get user's subscriptions
  getUserSubscriptions: async (userId) => {
    try {
      const res = await api.get(`/subscriptions/user/${userId}`);
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error getting user subscriptions:', message);
      throw new Error(message);
    }
  },

  // Get user's active subscription
  getActiveSubscription: async (userId) => {
    try {
      const res = await api.get(`/subscriptions/user/${userId}/active`);
      return res.data;
    } catch (err) {
      // If 404, it means no active subscription - not an error
      if (err.response?.status === 404) {
        return { success: false, data: null };
      }
      const { message } = extractError(err);
      console.error('Error getting active subscription:', message);
      throw new Error(message);
    }
  },

  // Cancel a subscription
  cancelSubscription: async (subscriptionId) => {
    try {
      const res = await api.put(`/subscriptions/${subscriptionId}/cancel`);
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error cancelling subscription:', message);
      throw new Error(message);
    }
  },

  // Payment functions
  createOrder: async (amount, currency = 'INR', subscriptionId, duration) => {
    try {
      const res = await api.post('/subscriptions/payment/order', { 
        amount, 
        currency, 
        subscriptionId, 
        duration 
      });
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error creating order:', message);
      throw new Error(message);
    }
  },

  verifyPayment: async (paymentData) => {
    try {
      const res = await api.post('/subscriptions/payment/verify', paymentData);
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error verifying payment:', message);
      throw new Error(message);
    }
  }
};

// Phone Verification API
export const phoneAPI = {
  // Send OTP to phone number
  sendOTP: async (phone) => {
    try {
      const res = await api.post('/phone/send-otp', { phone });
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error sending OTP:', message);
      throw new Error(message);
    }
  },
  
  // Verify OTP
  verifyOTP: async (phone, otp) => {
    try {
      const res = await api.post('/phone/verify-otp', { phone, otp });
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error verifying OTP:', message);
      throw new Error(message);
    }
  },
  
  // Check phone verification status
  checkPhoneStatus: async () => {
    try {
      const res = await api.get('/phone/status');
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error checking phone status:', message);
      throw new Error(message);
    }
  }
};

// KYC API
export const kycAPI = {
  // Verify KYC using PAN and DOB
  verifyKYC: async (kycData) => {
    try {
      const res = await api.post('/kyc/verify', kycData);
      
      // Handle duplicate or already verified case
      if (res.data.isDuplicate || res.data.isAlreadyVerified) {
        // Still return success but with the appropriate flags
        return {
          ...res.data,
          // Make sure client code knows this was successful
          success: true,
          isDuplicate: !!res.data.isDuplicate,
          isAlreadyVerified: !!res.data.isAlreadyVerified,
          // Special message for UI
          message: res.data.message || 'Your KYC verification has already been completed successfully'
        };
      }
      
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error verifying KYC:', message);
      throw new Error(message);
    }
  },
  
  // Get KYC verification history for a user by clerkId
  getKYCHistoryByClerkId: async (clerkId) => {
    try {
      const res = await api.get(`/kyc/history/clerk/${clerkId}`);
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error fetching KYC history by clerkId:', message);
      throw new Error(message);
    }
  },
  
  // Get KYC verification history for a user by email
  getKYCHistoryByEmail: async (email) => {
    try {
      const res = await api.get(`/kyc/history/email/${encodeURIComponent(email)}`);
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error fetching KYC history by email:', message);
      throw new Error(message);
    }
  },
  
  // Get a specific KYC verification by ID
  getKYCVerification: async (id) => {
    try {
      const res = await api.get(`/kyc/verification/${id}`);
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error fetching KYC verification:', message);
      throw new Error(message);
    }
  },
  
  // Check if a PAN number already exists in the system
  checkPANExists: async (pan) => {
    try {
      // Debounce this call to prevent excessive API requests
      return debounce(`check_pan_${pan}`, async () => {
        const res = await api.get(`/kyc/check-pan/${pan}`);
        return res.data;
      }, 1000); // 1 second debounce
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error checking PAN existence:', message);
      throw new Error(message);
    }
  },
  
  // Bypass KYC for testing (creates fake verification without calling external API)
  bypassKYC: async () => {
    try {
      const res = await api.post('/kyc/bypass');
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error bypassing KYC:', message);
      throw new Error(message);
    }
  }
};

export default api;
