import api, { extractError } from './api';

const stockRecommendationAPI = {
  // Admin endpoints
  
  // Get all stock recommendations (admin)
  getAllRecommendations: async (filters = {}, page = 1, limit = 10) => {
    try {
      const queryParams = new URLSearchParams({
        page,
        limit,
        ...filters
      });
      
      const res = await api.get(`/recommendations?${queryParams}`);
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error getting stock recommendations:', message);
      throw new Error(message);
    }
  },
  
  // Get a single stock recommendation (admin)
  getRecommendation: async (id) => {
    try {
      const res = await api.get(`/recommendations/${id}`);
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error(`Error getting stock recommendation ${id}:`, message);
      throw new Error(message);
    }
  },
  
  // Create a new stock recommendation (admin)
  createRecommendation: async (recommendationData) => {
    try {
      const res = await api.post('/recommendations', recommendationData);
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error creating stock recommendation:', message);
      throw new Error(message);
    }
  },
  
  // Update a stock recommendation (admin)
  updateRecommendation: async (id, recommendationData) => {
    try {
      const res = await api.put(`/recommendations/${id}`, recommendationData);
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error(`Error updating stock recommendation ${id}:`, message);
      throw new Error(message);
    }
  },
  
  // Delete a stock recommendation (admin)
  deleteRecommendation: async (id) => {
    try {
      const res = await api.delete(`/recommendations/${id}`);
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error(`Error deleting stock recommendation ${id}:`, message);
      throw new Error(message);
    }
  },
  
  // Send a stock recommendation to users (admin)
  sendRecommendation: async (id) => {
    try {
      const res = await api.post(`/recommendations/${id}/send`);
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error(`Error sending stock recommendation ${id}:`, message);
      throw new Error(message);
    }
  },
  
  // User endpoints
  
  // Get recommendations for the current user
  getUserRecommendations: async (page = 1, limit = 10) => {
    try {
      const res = await api.get(`/recommendations/user?page=${page}&limit=${limit}`);
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error getting user recommendations:', message);
      throw new Error(message);
    }
  },
  
  // Refresh stock prices (updates stale prices)
  refreshPrices: async () => {
    try {
      const res = await api.post('/recommendations/refresh-prices');
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error('Error refreshing stock prices:', message);
      throw new Error(message);
    }
  },
  
  // Generate PDF report for a recommendation (admin)
  generatePDFReport: async (id, reportData) => {
    try {
      const res = await api.post(`/recommendations/${id}/generate-pdf`, reportData, {
        responseType: 'blob' // Important for binary data
      });
      
      // Extract filename from Content-Disposition header
      let filename = `InvestKaps_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      const contentDisposition = res.headers['content-disposition'];
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }
      
      // Create a blob from the PDF data
      const blob = new Blob([res.data], { type: 'application/pdf' });
      
      // Create a download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return { success: true, message: 'PDF downloaded successfully' };
    } catch (err) {
      const { message } = extractError(err);
      console.error(`Error generating PDF report for ${id}:`, message);
      throw new Error(message);
    }
  }
};

export default stockRecommendationAPI;
