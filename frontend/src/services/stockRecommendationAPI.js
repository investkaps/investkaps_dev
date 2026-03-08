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
  
  // Generate PDF report (draft – downloaded locally, NOT saved to server)
  // Accepts FormData so an optional chartImage file can be included.
  generatePDFReport: async (id, formDataOrObj) => {
    try {
      // Accept either a FormData instance or a plain object
      let body = formDataOrObj;
      if (!(formDataOrObj instanceof FormData)) {
        // Legacy plain-object call – wrap in FormData
        body = new FormData();
        Object.entries(formDataOrObj).forEach(([k, v]) => body.append(k, v));
      }

      const res = await api.post(`/recommendations/${id}/generate-pdf`, body, {
        responseType: 'blob',
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Extract filename from Content-Disposition header
      let filename = `InvestKaps_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      const cd = res.headers['content-disposition'];
      if (cd) {
        const m = cd.match(/filename="(.+)"/);
        if (m?.[1]) filename = m[1];
      }

      // Trigger browser download
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true, message: 'PDF downloaded successfully' };
    } catch (err) {
      const { message } = extractError(err);
      console.error(`Error generating PDF report for ${id}:`, message);
      throw new Error(message);
    }
  },

  // Upload the admin-signed PDF so users can view it
  uploadSignedPDF: async (id, formData) => {
    try {
      const res = await api.post(`/recommendations/${id}/upload-signed-pdf`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data;
    } catch (err) {
      const { message } = extractError(err);
      console.error(`Error uploading signed PDF for ${id}:`, message);
      throw new Error(message);
    }
  }
};

export default stockRecommendationAPI;
