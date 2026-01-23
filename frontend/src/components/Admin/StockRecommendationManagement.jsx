import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import stockRecommendationAPI from '../../services/stockRecommendationAPI';
import PDFReportGenerator from '../PDFReportGenerator/PDFReportGenerator';
import SymbolAutocomplete from './SymbolAutocomplete';
import './StockRecommendationManagement.css';

const StockRecommendationManagement = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [formMode, setFormMode] = useState('create'); // 'create' or 'edit'
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [pdfRecommendation, setPdfRecommendation] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState(null);
  
  // Stock price fetching state
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceMessage, setPriceMessage] = useState(null);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    stockSymbol: '',
    stockName: '',
    currentPrice: '',
    targetPrice: '',
    targetPrice2: '',
    targetPrice3: '',
    stopLoss: '',
    recommendationType: 'buy',
    timeFrame: 'short_term',
    description: '',
    rationale: '',
    riskLevel: 'moderate',
    targetStrategies: [],
    status: 'draft',
    expiresAt: ''
  });

  useEffect(() => {
    fetchRecommendations();
    fetchStrategies();
  }, []);
  
  const handleFetchPrice = async () => {
    if (!formData.stockSymbol) {
      setError('Please enter a stock symbol first');
      return;
    }

    const fetchStockPrice = async (symbol) => {
      try {
        setFetchingPrice(true);
        setError(null);
        setPriceMessage(null);
        
        const response = await adminAPI.updateStockPrices([symbol]);
        
        if (response.success && response.prices[symbol]) {
          setFormData(prev => ({
            ...prev,
            currentPrice: response.prices[symbol]
          }));
          setPriceMessage({ type: 'success', text: `Price updated: ${response.prices[symbol]}` });
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch stock price');
      } finally {
        setFetchingPrice(false);
      }
    };

    fetchStockPrice(formData.stockSymbol);
  };

  const updateAllPrices = async () => {
    try {
      setPriceLoading(true);
      setPriceMessage(null);
      
      // Get all unique symbols from recommendations
      const symbols = [...new Set(recommendations.map(rec => rec.stockSymbol))];
      
      if (symbols.length === 0) {
        setPriceMessage({ type: 'error', text: 'No stock symbols found' });
        return;
      }
      
      const response = await adminAPI.updateStockPrices(symbols);
      
      if (response.success) {
        setPriceMessage({ 
          type: 'success', 
          text: `Updated ${response.updated.length} stock prices` 
        });
        // Refresh recommendations to show updated prices
        fetchRecommendations();
      }
    } catch (err) {
      setPriceMessage({ type: 'error', text: err.message || 'Failed to update prices' });
    } finally {
      setPriceLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminAPI.getAllStockRecommendations();
      
      if (response.success) {
        setRecommendations(response.data || []);
      } else {
        setError(response.error || 'Failed to fetch recommendations');
      }
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError('An error occurred while fetching recommendations');
    } finally {
      setLoading(false);
    }
  };

  const fetchStrategies = async () => {
    try {
      console.log('Fetching strategies...');
      const response = await adminAPI.getAllStrategies();
      console.log('Strategies response:', response);
      
      // Handle both response formats: {success: true, data: [...]} or direct array [...]
      if (response.success && response.data) {
        console.log('Strategies data (new format):', response.data);
        setStrategies(response.data);
      } else if (Array.isArray(response)) {
        console.log('Strategies data (old format - direct array):', response);
        setStrategies(response);
      } else {
        console.error('Failed to fetch strategies:', response.error);
        setStrategies([]);
      }
    } catch (err) {
      console.error('Error fetching strategies:', err);
      setStrategies([]);
    }
  };

  const handleRefreshPrices = async () => {
    try {
      setRefreshing(true);
      setRefreshMessage(null);
      
      const response = await stockRecommendationAPI.refreshPrices();
      
      if (response.success) {
        let messageText = `Successfully refreshed ${response.updated} stock price(s).`;
        
        if (response.failed > 0) {
          messageText += ` Failed: ${response.failed}`;
          
          // Show detailed errors if available
          if (response.errors && response.errors.length > 0) {
            messageText += `\nErrors: ${response.errors.join(', ')}`;
          }
        }
        
        setRefreshMessage({
          type: response.failed > 0 ? 'warning' : 'success',
          text: messageText
        });
        
        // Update recommendations with fresh data from response
        if (response.data) {
          setRecommendations(response.data);
          setTotalRecommendations(response.data.length);
        } else {
          // Fallback: fetch recommendations if data not in response
          await fetchRecommendations();
        }
        
        // Clear message after 8 seconds (longer for error messages)
        setTimeout(() => setRefreshMessage(null), 8000);
      }
    } catch (error) {
      setRefreshMessage({
        type: 'error',
        text: `Failed to refresh prices: ${error.message}`
      });
      
      // Clear error message after 8 seconds
      setTimeout(() => setRefreshMessage(null), 8000);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreateNew = () => {
    setFormData({
      title: '',
      stockSymbol: '',
      stockName: '',
      currentPrice: '',
      targetPrice: '',
      targetPrice2: '',
      targetPrice3: '',
      stopLoss: '',
      recommendationType: 'buy',
      timeFrame: 'short_term',
      description: '',
      rationale: '',
      riskLevel: 'moderate',
      targetStrategies: [],
      status: 'draft',
      expiresAt: ''
    });
    setFormMode('create');
    setIsFormVisible(true);
  };

  const handleEdit = (recommendation) => {
    setFormData({
      ...recommendation,
      targetStrategies: recommendation.targetStrategies.map(strategy => strategy._id || strategy),
      currentPrice: recommendation.currentPrice.toString(),
      targetPrice: recommendation.targetPrice.toString(),
      targetPrice2: recommendation.targetPrice2 ? recommendation.targetPrice2.toString() : '',
      targetPrice3: recommendation.targetPrice3 ? recommendation.targetPrice3.toString() : '',
      stopLoss: recommendation.stopLoss ? recommendation.stopLoss.toString() : '',
      expiresAt: recommendation.expiresAt ? new Date(recommendation.expiresAt).toISOString().split('T')[0] : ''
    });
    setFormMode('edit');
    setIsFormVisible(true);
  };

  const handleViewDetails = (recommendation) => {
    setSelectedRecommendation(recommendation);
  };

  const closeDetails = () => {
    setSelectedRecommendation(null);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'targetStrategies') {
      // Handle multi-select for strategies
      const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
      setFormData({ ...formData, targetStrategies: selectedOptions });
    } else if (type === 'checkbox') {
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Convert string values to numbers
      const dataToSubmit = {
        ...formData,
        currentPrice: parseFloat(formData.currentPrice),
        targetPrice: parseFloat(formData.targetPrice),
        targetPrice2: formData.targetPrice2 ? parseFloat(formData.targetPrice2) : undefined,
        targetPrice3: formData.targetPrice3 ? parseFloat(formData.targetPrice3) : undefined,
        stopLoss: formData.stopLoss ? parseFloat(formData.stopLoss) : undefined,
      };
      
      let response;
      
      if (formMode === 'create') {
        response = await adminAPI.createStockRecommendation(dataToSubmit);
      } else {
        response = await adminAPI.updateStockRecommendation(formData._id, dataToSubmit);
      }
      
      if (response.success) {
        setIsFormVisible(false);
        fetchRecommendations();
      } else {
        setError(response.error || 'Failed to save recommendation');
      }
    } catch (err) {
      console.error('Error saving recommendation:', err);
      setError('An error occurred while saving the recommendation');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this recommendation?')) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await adminAPI.deleteStockRecommendation(id);
      
      if (response.success) {
        fetchRecommendations();
      } else {
        setError(response.error || 'Failed to delete recommendation');
      }
    } catch (err) {
      console.error('Error deleting recommendation:', err);
      setError('An error occurred while deleting the recommendation');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = (recommendation) => {
    setPdfRecommendation(recommendation);
    setShowPDFModal(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'published':
        return 'status-badge published';
      case 'draft':
        return 'status-badge draft';
      case 'archived':
        return 'status-badge archived';
      default:
        return 'status-badge';
    }
  };


  if (loading && recommendations.length === 0) {
    return (
      <div className="admin-loading">
        <div className="spinner"></div>
        <p>Loading recommendations...</p>
      </div>
    );
  }

  return (
    <div className="stock-recommendation-management">
      <div className="admin-section-header">
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="admin-button"
            onClick={updateAllPrices}
            disabled={priceLoading}
            style={{
              backgroundColor: priceLoading ? '#6c757d' : '#007bff',
              color: 'white'
            }}
          >
            {priceLoading ? '🔄 Updating Prices...' : '📊 Update All Prices'}
          </button>
          <button className="admin-button primary" onClick={handleCreateNew}>
            Create New Recommendation
          </button>
        </div>
      </div>

      {refreshMessage && (
        <div 
          className={`admin-alert ${refreshMessage.type}`}
          style={{
            padding: '12px 16px',
            borderRadius: '4px',
            marginBottom: '16px',
            whiteSpace: 'pre-line',
            backgroundColor: 
              refreshMessage.type === 'success' ? '#d4edda' : 
              refreshMessage.type === 'warning' ? '#fff3cd' : '#f8d7da',
            color: 
              refreshMessage.type === 'success' ? '#155724' : 
              refreshMessage.type === 'warning' ? '#856404' : '#721c24',
            border: `1px solid ${
              refreshMessage.type === 'success' ? '#c3e6cb' : 
              refreshMessage.type === 'warning' ? '#ffeeba' : '#f5c6cb'
            }`
          }}
        >
          {refreshMessage.text}
        </div>
      )}

      {error && (
        <div className="admin-error">
          <p>{error}</p>
          <button className="admin-button" onClick={fetchRecommendations}>
            Try Again
          </button>
        </div>
      )}

      {priceMessage && (
        <div 
          className={`admin-alert ${priceMessage.type}`}
          style={{
            padding: '12px 16px',
            borderRadius: '4px',
            marginBottom: '16px',
            whiteSpace: 'pre-line',
            backgroundColor: 
              priceMessage.type === 'success' ? '#d4edda' : '#f8d7da',
            color: 
              priceMessage.type === 'success' ? '#155724' : '#721c24',
            border: `1px solid ${
              priceMessage.type === 'success' ? '#c3e6cb' : '#f5c6cb'
            }`
          }}
        >
          {priceMessage.text}
        </div>
      )}

      {isFormVisible && (
        <>
          <div 
            className="admin-modal-backdrop" 
            style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              backgroundColor: 'rgba(0, 0, 0, 0.5)', 
              zIndex: 999,
              backdropFilter: 'blur(4px)'
            }}
            onClick={() => setIsFormVisible(false)}
          />
          <div 
            className="recommendation-form-container"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90%',
              maxWidth: '900px',
              maxHeight: '90vh',
              overflowY: 'auto',
              zIndex: 1000,
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '2rem',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: '#1f2937', fontSize: '1.25rem', fontWeight: '600' }}>{formMode === 'create' ? 'Create New Recommendation' : 'Edit Recommendation'}</h3>
              <button 
                type="button"
                onClick={() => setIsFormVisible(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  color: '#6b7280',
                  cursor: 'pointer',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="recommendation-form">
            <div className="form-group">
              <label htmlFor="title">Title</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleFormChange}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="stockSymbol">Stock Symbol</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <SymbolAutocomplete
                      value={formData.stockSymbol}
                      onChange={(value) => setFormData(prev => ({ ...prev, stockSymbol: value }))}
                      onSelect={(symbol) => {
                        setFormData(prev => ({ ...prev, stockSymbol: symbol }));
                        // Auto-fetch price when symbol is selected
                        setTimeout(() => handleFetchPrice(), 100);
                      }}
                      placeholder="Search stock symbol (e.g., RELIANCE, TCS, INFY)"
                    />
                  </div>
                  <button 
                    type="button"
                    className="admin-button primary" 
                    onClick={handleFetchPrice}
                    disabled={fetchingPrice || !formData.stockSymbol}
                    style={{ minWidth: '120px' }}
                  >
                    {fetchingPrice ? 'Fetching...' : 'Get Price'}
                  </button>
                </div>
                <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>
                  Type to search from 142,000+ symbols. Price fetches automatically on selection.
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="stockName">Stock Name</label>
                <input
                  type="text"
                  id="stockName"
                  name="stockName"
                  value={formData.stockName}
                  onChange={handleFormChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="currentPrice">Current Price (₹)</label>
                <input
                  type="number"
                  id="currentPrice"
                  name="currentPrice"
                  value={formData.currentPrice}
                  onChange={handleFormChange}
                  step="0.01"
                  required
                  style={{ 
                    color: '#0d6efd', 
                    fontWeight: 'bold',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="targetPrice">Target 1 (₹) *</label>
                <input
                  type="number"
                  id="targetPrice"
                  name="targetPrice"
                  value={formData.targetPrice}
                  onChange={handleFormChange}
                  step="0.01"
                  required
                  placeholder="Required"
                />
              </div>

              <div className="form-group">
                <label htmlFor="stopLoss">Stop Loss (₹)</label>
                <input
                  type="number"
                  id="stopLoss"
                  name="stopLoss"
                  value={formData.stopLoss}
                  onChange={handleFormChange}
                  step="0.01"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="targetPrice2">Target 2 (₹)</label>
                <input
                  type="number"
                  id="targetPrice2"
                  name="targetPrice2"
                  value={formData.targetPrice2}
                  onChange={handleFormChange}
                  step="0.01"
                  placeholder="Optional"
                />
              </div>

              <div className="form-group">
                <label htmlFor="targetPrice3">Target 3 (₹)</label>
                <input
                  type="number"
                  id="targetPrice3"
                  name="targetPrice3"
                  value={formData.targetPrice3}
                  onChange={handleFormChange}
                  step="0.01"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="recommendationType">Recommendation Type</label>
                <select
                  id="recommendationType"
                  name="recommendationType"
                  value={formData.recommendationType}
                  onChange={handleFormChange}
                  required
                >
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                  <option value="hold">Hold</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="timeFrame">Time Frame</label>
                <select
                  id="timeFrame"
                  name="timeFrame"
                  value={formData.timeFrame}
                  onChange={handleFormChange}
                  required
                >
                  <option value="short_term">Short Term</option>
                  <option value="medium_term">Medium Term</option>
                  <option value="long_term">Long Term</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="riskLevel">Risk Level</label>
                <select
                  id="riskLevel"
                  name="riskLevel"
                  value={formData.riskLevel}
                  onChange={handleFormChange}
                  required
                >
                  <option value="low">Low</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                required
                rows={3}
              />
            </div>

            <div className="form-group">
              <label htmlFor="rationale">Rationale</label>
              <textarea
                id="rationale"
                name="rationale"
                value={formData.rationale}
                onChange={handleFormChange}
                required
                rows={5}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="targetStrategies">Target Strategies</label>
                <select
                  id="targetStrategies"
                  name="targetStrategies"
                  value={formData.targetStrategies}
                  onChange={handleFormChange}
                  multiple
                  required
                  className="form-select-multiple"
                >
                  {strategies.length === 0 ? (
                    <option disabled>No strategies available. Please create strategies first.</option>
                  ) : (
                    strategies.map((strategy) => (
                      <option key={strategy._id} value={strategy._id}>
                        {strategy.name} ({strategy.strategyCode})
                      </option>
                    ))
                  )}
                </select>
                <small>Hold Ctrl/Cmd to select multiple strategies. {strategies.length} strategies loaded.</small>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleFormChange}
                  required
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="expiresAt">Expires At (Optional)</label>
                <input
                  type="date"
                  id="expiresAt"
                  name="expiresAt"
                  value={formData.expiresAt}
                  onChange={handleFormChange}
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="admin-button primary">
                {formMode === 'create' ? 'Create Recommendation' : 'Update Recommendation'}
              </button>
              <button
                type="button"
                className="admin-button secondary"
                onClick={() => setIsFormVisible(false)}
              >
                Cancel
              </button>
            </div>
          </form>
          </div>
        </>
      )}

      {recommendations.length === 0 && !loading ? (
        <div className="admin-empty-state">
          <p>No stock recommendations found.</p>
          <button className="admin-button" onClick={handleCreateNew}>
            Create Your First Recommendation
          </button>
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Stock</th>
                <th>Type</th>
                <th>Current Price</th>
                <th>Target Price</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recommendations.map((recommendation) => (
                <tr key={recommendation._id}>
                  <td>{recommendation.title}</td>
                  <td>
                    <strong>{recommendation.stockSymbol}</strong>
                    <br />
                    <small>{recommendation.stockName}</small>
                  </td>
                  <td className="recommendation-type">
                    <span className={`type-badge ${recommendation.recommendationType}`}>
                      {recommendation.recommendationType.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <strong>₹{recommendation.currentPrice}</strong>
                    <br />
                    <small style={{ color: '#666', fontSize: '0.85em' }}>
                      {recommendation.lastPriceUpdate 
                        ? `Updated: ${new Date(recommendation.lastPriceUpdate).toLocaleTimeString('en-IN', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}`
                        : 'Not updated'}
                    </small>
                  </td>
                  <td>
                    ₹{recommendation.targetPrice}
                    <br />
                    <small className={recommendation.recommendationType === 'buy' ? 'profit' : 'loss'}>
                      {recommendation.recommendationType === 'buy' 
                        ? `+${(((recommendation.targetPrice - recommendation.currentPrice) / recommendation.currentPrice) * 100).toFixed(2)}%`
                        : `${(((recommendation.targetPrice - recommendation.currentPrice) / recommendation.currentPrice) * 100).toFixed(2)}%`}
                    </small>
                  </td>
                  <td>
                    <span className={getStatusBadgeClass(recommendation.status)}>
                      {recommendation.status.charAt(0).toUpperCase() + recommendation.status.slice(1)}
                    </span>
                  </td>
                  <td>{formatDate(recommendation.createdAt)}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="admin-action-button view"
                        onClick={() => handleViewDetails(recommendation)}
                      >
                        View
                      </button>
                      <button
                        className="admin-action-button edit"
                        onClick={() => handleEdit(recommendation)}
                      >
                        Edit
                      </button>
                      {recommendation.pdfReport && recommendation.pdfReport.url ? (
                        <button
                          className="admin-action-button pdf"
                          onClick={() => window.open(recommendation.pdfReport.url, '_blank')}
                          title="View PDF"
                        >
                          View PDF
                        </button>
                      ) : (
                        <button
                          className="admin-action-button pdf"
                          onClick={() => handleGeneratePDF(recommendation)}
                          title="Generate PDF"
                        >
                          Gen PDF
                        </button>
                      )}
                      <button
                        className="admin-action-button delete"
                        onClick={() => handleDelete(recommendation._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedRecommendation && (
        <div className="admin-modal">
          <div className="admin-modal-content recommendation-detail">
            <div className="admin-modal-header">
              <h3>Recommendation Details</h3>
              <button className="admin-modal-close" onClick={closeDetails}>×</button>
            </div>
            <div className="admin-modal-body">
              <div className="recommendation-header">
                <h2>{selectedRecommendation.title}</h2>
                <div className="recommendation-meta">
                  <span className={getStatusBadgeClass(selectedRecommendation.status)}>
                    {selectedRecommendation.status.charAt(0).toUpperCase() + selectedRecommendation.status.slice(1)}
                  </span>
                  <span className={`type-badge ${selectedRecommendation.recommendationType}`}>
                    {selectedRecommendation.recommendationType.toUpperCase()}
                  </span>
                  <span className="time-frame-badge">
                    {selectedRecommendation.timeFrame.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="recommendation-stock-info">
                <div className="stock-symbol">
                  <h3>{selectedRecommendation.stockSymbol}</h3>
                  <p>{selectedRecommendation.stockName}</p>
                </div>
                <div className="stock-prices">
                  <div className="price-item">
                    <span className="price-label">Current</span>
                    <span className="price-value">₹{selectedRecommendation.currentPrice}</span>
                  </div>
                  <div className="price-item">
                    <span className="price-label">Target</span>
                    <span className="price-value">₹{selectedRecommendation.targetPrice}</span>
                  </div>
                  {selectedRecommendation.stopLoss && (
                    <div className="price-item">
                      <span className="price-label">Stop Loss</span>
                      <span className="price-value">₹{selectedRecommendation.stopLoss}</span>
                    </div>
                  )}
                  <div className="price-item">
                    <span className="price-label">Potential</span>
                    <span className={`price-value ${selectedRecommendation.recommendationType === 'buy' ? 'profit' : 'loss'}`}>
                      {selectedRecommendation.recommendationType === 'buy' 
                        ? `+${(((selectedRecommendation.targetPrice - selectedRecommendation.currentPrice) / selectedRecommendation.currentPrice) * 100).toFixed(2)}%`
                        : `${(((selectedRecommendation.targetPrice - selectedRecommendation.currentPrice) / selectedRecommendation.currentPrice) * 100).toFixed(2)}%`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="recommendation-section">
                <h4>Description</h4>
                <p>{selectedRecommendation.description}</p>
              </div>

              <div className="recommendation-section">
                <h4>Rationale</h4>
                <p>{selectedRecommendation.rationale}</p>
              </div>

              <div className="recommendation-section">
                <h4>Target Strategies</h4>
                <div className="strategy-tags">
                  {selectedRecommendation.targetStrategies && selectedRecommendation.targetStrategies.map((strategy) => (
                    <span key={strategy._id} className="strategy-tag">
                      {strategy.name || 'Unknown Strategy'} ({strategy.strategyCode || ''})
                    </span>
                  ))}
                </div>
              </div>

              <div className="recommendation-section">
                <h4>Timeline</h4>
                <div className="timeline-info">
                  <div className="timeline-item">
                    <span className="timeline-label">Created</span>
                    <span className="timeline-value">{formatDate(selectedRecommendation.createdAt)}</span>
                  </div>
                  {selectedRecommendation.publishedAt && (
                    <div className="timeline-item">
                      <span className="timeline-label">Published</span>
                      <span className="timeline-value">{formatDate(selectedRecommendation.publishedAt)}</span>
                    </div>
                  )}
                  {selectedRecommendation.expiresAt && (
                    <div className="timeline-item">
                      <span className="timeline-label">Expires</span>
                      <span className="timeline-value">{formatDate(selectedRecommendation.expiresAt)}</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
            <div className="admin-modal-footer">
              <button 
                className="admin-button" 
                onClick={() => handleEdit(selectedRecommendation)}
              >
                Edit
              </button>
              {selectedRecommendation.pdfReport && selectedRecommendation.pdfReport.url ? (
                <button 
                  className="admin-button pdf" 
                  onClick={() => window.open(selectedRecommendation.pdfReport.url, '_blank')}
                >
                  View PDF
                </button>
              ) : (
                <button 
                  className="admin-button pdf" 
                  onClick={() => handleGeneratePDF(selectedRecommendation)}
                >
                  Generate PDF
                </button>
              )}
              <button className="admin-button" onClick={closeDetails}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Report Generator Modal */}
      {showPDFModal && pdfRecommendation && (
        <PDFReportGenerator
          recommendation={pdfRecommendation}
          onClose={() => {
            setShowPDFModal(false);
            setPdfRecommendation(null);
          }}
        />
      )}
    </div>
  );
};

export default StockRecommendationManagement;
