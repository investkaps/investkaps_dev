import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { adminAPI } from '../../services/api';
import stockRecommendationAPI from '../../services/stockRecommendationAPI';
import PDFReportGenerator from '../PDFReportGenerator/PDFReportGenerator';
import SymbolAutocomplete from './SymbolAutocomplete';
import './StockRecommendationManagement.css';
import Modal from '../Shared/Modal';

// Import the API instance for authenticated requests
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token from localStorage to every request automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('clerk_jwt');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

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
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [updatingPrices, setUpdatingPrices] = useState(false);
  const [lastPriceUpdate, setLastPriceUpdate] = useState(null);
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(true);
  const [formSuccessMessage, setFormSuccessMessage] = useState('');
  const [uploadingPdfId, setUploadingPdfId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);
  const uploadPdfInputRef = React.useRef(null);
  const uploadPdfTargetRec = React.useRef(null);
  
  const [formData, setFormData] = useState({
    title: '',
    stockSymbol: '',
    stockName: '',
    exchange: 'NSE',
    // NFO/derivative fields
    expiry: '',
    strike: '',
    lotSize: '',
    instrumentType: '',
    currentPrice: '',
    buyingRangeLow: '',
    buyingRangeHigh: '',
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

  const NFO_EXCHANGES = new Set(['NFO', 'BFO', 'CDS', 'MCX']);
  const isNFO = NFO_EXCHANGES.has(formData.exchange);

  useEffect(() => {
    fetchRecommendations();
    fetchStrategies();
  }, []);

  // Close three-dot menu when clicking outside
  useEffect(() => {
    if (!openMenuId) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenuId]);

  // Auto-update prices every 5 minutes
  useEffect(() => {
    if (!autoUpdateEnabled) return;

    // Update immediately on mount
    const updatePrices = async () => {
      if (recommendations.length > 0) {
        await updateAllPrices();
      }
    };

    // Initial update after recommendations are loaded
    if (recommendations.length > 0 && !lastPriceUpdate) {
      updatePrices();
    }

    // Set up interval for auto-updates
    const intervalId = setInterval(() => {
      if (recommendations.length > 0) {
        updatePrices();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(intervalId);
  }, [recommendations.length, autoUpdateEnabled]);

  const handleFetchPrice = async () => {
    if (!formData.stockSymbol || !formData.exchange) {
      setError('Please select a stock symbol first');
      return;
    }

    try {
      setFetchingPrice(true);
      setError(null);
      
      const response = await adminAPI.fetchSinglePrice(formData.exchange, formData.stockSymbol);
      
      if (response.success && response.data.ltp) {
        setFormData(prev => ({
          ...prev,
          currentPrice: response.data.ltp
        }));
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch stock price');
    } finally {
      setFetchingPrice(false);
    }
  };

  // recList is optional — pass it to avoid stale closure when called right after fetchRecommendations
  const updateAllPrices = async (recList) => {
    const list = Array.isArray(recList) ? recList : Array.isArray(recommendations) ? recommendations : [];
    if (list.length === 0) return;

    try {
      setUpdatingPrices(true);
      setRefreshMessage(null);

      const response = await adminAPI.fetchRecommendationPrices(
        list.map(r => ({ stockSymbol: r.stockSymbol, exchange: r.exchange || 'NSE' }))
      );

      const prices = response.prices || {};

      let totalUpdated = 0;
      const errors = [];

      for (const rec of list) {
        const newPrice = prices[rec.stockSymbol] ?? prices[rec.stockSymbol?.toUpperCase()];
        if (newPrice != null) {
          try {
            await adminAPI.updateStockRecommendation(rec._id, { currentPrice: newPrice, lastPriceUpdate: new Date().toISOString() });
            totalUpdated++;
          } catch (updateErr) {
            console.error(`Failed to update ${rec.stockSymbol}:`, updateErr);
            errors.push(rec.stockSymbol);
          }
        }
      }

      await fetchRecommendations();
      setLastPriceUpdate(new Date());

      if (errors.length > 0) {
        setRefreshMessage({ type: 'warning', text: `Updated ${totalUpdated} prices. Failed: ${errors.join(', ')}` });
      } else {
        setRefreshMessage({ type: 'success', text: `✓ Updated ${totalUpdated} stock prices at ${new Date().toLocaleTimeString()}` });
      }

      setTimeout(() => setRefreshMessage(null), 5000);

    } catch (err) {
      console.error('Error updating all prices:', err);
      setRefreshMessage({ type: 'error', text: `Failed to update prices: ${err.message}` });
    } finally {
      setUpdatingPrices(false);
    }
  };
  


  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminAPI.getAllStockRecommendations();

      if (response.success) {
        const list = response.data || [];
        setRecommendations(list);
        return list;
      } else {
        setError(response.error || 'Failed to fetch recommendations');
      }
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError('An error occurred while fetching recommendations');
    } finally {
      setLoading(false);
    }
    return [];
  };

  const fetchStrategies = async () => {
    try {
      const response = await adminAPI.getAllStrategies();
      
      // Handle both response formats: {success: true, data: [...]} or direct array [...]
      if (response.success && response.data) {
        setStrategies(response.data);
      } else if (Array.isArray(response)) {
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

  const handleCreateNew = () => {
    setFormData({
      title: '',
      stockSymbol: '',
      stockName: '',
      currentPrice: '',
      buyingRangeLow: '',
      buyingRangeHigh: '',
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

  const handleUploadPDF = (recommendation) => {
    uploadPdfTargetRec.current = recommendation;
    uploadPdfInputRef.current?.click();
  };

  const handleUploadPdfFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !uploadPdfTargetRec.current) return;
    e.target.value = ''; // reset so same file can be re-selected
    const rec = uploadPdfTargetRec.current;
    setUploadingPdfId(rec._id);
    try {
      const fd = new FormData();
      fd.append('signedPdf', file);
      await stockRecommendationAPI.uploadSignedPDF(rec._id, fd);
      setRefreshMessage({ type: 'success', text: `✅ PDF uploaded successfully for ${rec.stockSymbol}` });
      setTimeout(() => setRefreshMessage(null), 5000);
      fetchRecommendations();
    } catch (err) {
      setRefreshMessage({ type: 'error', text: `❌ PDF upload failed: ${err.message}` });
      setTimeout(() => setRefreshMessage(null), 6000);
    } finally {
      setUploadingPdfId(null);
      uploadPdfTargetRec.current = null;
    }
  };

  const handleEdit = (recommendation) => {
    setFormData({
      ...recommendation,
      targetStrategies: recommendation.targetStrategies.map(strategy => strategy._id || strategy),
      currentPrice: recommendation.currentPrice.toString(),
      buyingRangeLow: recommendation.buyingRangeLow ? recommendation.buyingRangeLow.toString() : '',
      buyingRangeHigh: recommendation.buyingRangeHigh ? recommendation.buyingRangeHigh.toString() : '',
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
      
      const isNfoSubmit = new Set(['NFO', 'BFO', 'CDS', 'MCX']).has(formData.exchange);
      const dataToSubmit = {
        ...formData,
        currentPrice: parseFloat(formData.currentPrice),
        buyingRangeLow: formData.buyingRangeLow ? parseFloat(formData.buyingRangeLow) : undefined,
        buyingRangeHigh: formData.buyingRangeHigh ? parseFloat(formData.buyingRangeHigh) : undefined,
        targetPrice: parseFloat(formData.targetPrice),
        targetPrice2: formData.targetPrice2 ? parseFloat(formData.targetPrice2) : undefined,
        targetPrice3: formData.targetPrice3 ? parseFloat(formData.targetPrice3) : undefined,
        stopLoss: formData.stopLoss ? parseFloat(formData.stopLoss) : undefined,
        strike: isNfoSubmit && formData.strike ? parseFloat(formData.strike) : undefined,
        lotSize: isNfoSubmit && formData.lotSize ? parseFloat(formData.lotSize) : undefined,
        expiry: isNfoSubmit ? formData.expiry || undefined : undefined,
        instrumentType: isNfoSubmit ? formData.instrumentType || undefined : undefined,
      };
      
      let response;
      
      if (formMode === 'create') {
        response = await adminAPI.createStockRecommendation(dataToSubmit);
      } else {
        response = await adminAPI.updateStockRecommendation(formData._id, dataToSubmit);
      }
      
      if (response.success) {
        const action = formMode === 'create' ? 'created' : 'updated';
        setFormSuccessMessage(`✅ Recommendation ${action} successfully!`);
        setTimeout(() => {
          setFormSuccessMessage('');
          setIsFormVisible(false);
        }, 1800);
        // Fetch fresh list then immediately update prices so the new/edited rec shows live price
        fetchRecommendations().then(list => { if (list?.length) updateAllPrices(list); });
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

  const handleToggleActive = async (recommendation) => {
    const newValue = recommendation.isActive === false ? true : false;
    try {
      await adminAPI.updateStockRecommendation(recommendation._id, { isActive: newValue });
      fetchRecommendations();
    } catch (err) {
      console.error('Error toggling active state:', err);
      setError('Failed to update active state');
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button 
              className="admin-button"
              onClick={updateAllPrices}
              disabled={updatingPrices}
              style={{
                backgroundColor: updatingPrices ? '#6c757d' : '#007bff',
                color: 'white'
              }}
            >
              {updatingPrices ? '🔄 Updating...' : '📊 Update All Prices'}
            </button>
            <button className="admin-button primary" onClick={handleCreateNew}>
              Create New Recommendation
            </button>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#666', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={autoUpdateEnabled}
                onChange={(e) => setAutoUpdateEnabled(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Auto-update every 5 min
            </label>
          </div>
          {lastPriceUpdate && (
            <div style={{ fontSize: '13px', color: '#666' }}>
              Last updated: {lastPriceUpdate.toLocaleTimeString()}
            </div>
          )}
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

            <div className="form-group">
              <label htmlFor="exchange">Exchange</label>
              <select
                id="exchange"
                name="exchange"
                value={formData.exchange}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  exchange: e.target.value,
                  stockSymbol: '',
                  stockName: '',
                  expiry: '',
                  strike: '',
                  lotSize: '',
                  instrumentType: '',
                }))}
                required
                style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', width: '100%' }}
              >
                <option value="NSE">NSE</option>
                <option value="BSE">BSE</option>
                <option value="NFO">NFO</option>
                <option value="BFO">BFO</option>
                <option value="CDS">CDS</option>
                <option value="MCX">MCX</option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="stockSymbol">Stock Symbol</label>
                <SymbolAutocomplete
                  value={formData.stockSymbol}
                  onChange={(value) => setFormData(prev => ({ ...prev, stockSymbol: value }))}
                  onSelect={(item) => {
                    setFormData(prev => ({
                      ...prev,
                      stockSymbol: item.symbol,
                      stockName: item.name || prev.stockName,
                      exchange: item.exchange || prev.exchange,
                      expiry: item.expiry || '',
                      strike: item.strike || '',
                      lotSize: item.lotSize || '',
                      instrumentType: item.instrumentType || '',
                    }));
                  }}
                  placeholder={`Search ${formData.exchange} symbol…`}
                  exchange={formData.exchange}
                />
                <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>
                  Results filtered by selected exchange.
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="stockName">Stock Name</label>
                <SymbolAutocomplete
                  value={formData.stockName}
                  onChange={(value) => setFormData(prev => ({ ...prev, stockName: value }))}
                  onSelect={(item) => {
                    setFormData(prev => ({
                      ...prev,
                      stockSymbol: item.symbol,
                      stockName: item.name || prev.stockName,
                      exchange: item.exchange || prev.exchange,
                      expiry: item.expiry || '',
                      strike: item.strike || '',
                      lotSize: item.lotSize || '',
                      instrumentType: item.instrumentType || '',
                    }));
                  }}
                  placeholder={`Search ${formData.exchange} company name…`}
                  exchange={formData.exchange}
                />
                <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>
                  Results filtered by selected exchange.
                </small>
              </div>
            </div>

            {/* NFO/derivative fields — only shown for NFO, BFO, CDS, MCX */}
            {isNFO && (
              <div style={{ background: '#fffdf0', border: '1px solid #fde68a', borderRadius: 6, padding: '14px 16px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', marginBottom: 4 }}>
                  <span style={{ background: '#fbbf24', color: '#78350f', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>F&O</span>
                  <span style={{ fontSize: 12, color: '#92400e' }}>Derivative details — auto-filled from symbol search</span>
                </div>
                <div className="form-group" style={{ flex: '1 1 160px' }}>
                  <label>Expiry Date</label>
                  <input
                    type="text"
                    name="expiry"
                    value={formData.expiry}
                    onChange={handleFormChange}
                    placeholder="e.g. 26-DEC-2024"
                    style={{ padding: '8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, width: '100%' }}
                  />
                </div>
                <div className="form-group" style={{ flex: '1 1 120px' }}>
                  <label>Strike Price</label>
                  <input
                    type="number"
                    name="strike"
                    value={formData.strike}
                    onChange={handleFormChange}
                    placeholder="e.g. 25000"
                    style={{ padding: '8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, width: '100%' }}
                  />
                </div>
                <div className="form-group" style={{ flex: '1 1 100px' }}>
                  <label>Lot Size</label>
                  <input
                    type="number"
                    name="lotSize"
                    value={formData.lotSize}
                    onChange={handleFormChange}
                    placeholder="e.g. 50"
                    style={{ padding: '8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, width: '100%' }}
                  />
                </div>
                <div className="form-group" style={{ flex: '1 1 120px' }}>
                  <label>Type</label>
                  <select
                    name="instrumentType"
                    value={formData.instrumentType}
                    onChange={handleFormChange}
                    style={{ padding: '8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, width: '100%' }}
                  >
                    <option value="">Select</option>
                    <option value="CE">CE (Call)</option>
                    <option value="PE">PE (Put)</option>
                    <option value="FUT">FUT (Future)</option>
                  </select>
                </div>
              </div>
            )}

            <div className="form-row" style={{ alignItems: 'flex-start' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="currentPrice">Current Price (₹)</label>
                <input
                  type="number"
                  id="currentPrice"
                  name="currentPrice"
                  value={formData.currentPrice}
                  onChange={handleFormChange}
                  step="0.01"
                  required
                  placeholder="Enter manually or fetch"
                  style={{ fontSize: '16px', width: '100%' }}
                />
                <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>
                  Click "Fetch Price" to get live LTP from market
                </small>
              </div>
              
              <div style={{ paddingTop: '28px' }}>
                <button 
                  type="button"
                  className="admin-button primary" 
                  onClick={handleFetchPrice}
                  disabled={fetchingPrice || !formData.stockSymbol || !formData.exchange}
                  style={{ minWidth: '120px', whiteSpace: 'nowrap' }}
                >
                  {fetchingPrice ? 'Fetching...' : 'Fetch Price'}
                </button>
              </div>

              <div className="form-group" style={{ flex: 1 }}>
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
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="buyingRangeLow">Buying Range Low (₹)</label>
                <input
                  type="number"
                  id="buyingRangeLow"
                  name="buyingRangeLow"
                  value={formData.buyingRangeLow}
                  onChange={handleFormChange}
                  step="0.01"
                  placeholder="e.g. 450"
                />
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="buyingRangeHigh">Buying Range High (₹)</label>
                <input
                  type="number"
                  id="buyingRangeHigh"
                  name="buyingRangeHigh"
                  value={formData.buyingRangeHigh}
                  onChange={handleFormChange}
                  step="0.01"
                  placeholder="e.g. 480"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
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

            {formSuccessMessage && (
              <div style={{ padding: '12px 16px', borderRadius: '6px', marginBottom: '16px', backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7', fontWeight: 500 }}>
                {formSuccessMessage}
              </div>
            )}
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

      <input
        type="file"
        accept="application/pdf"
        ref={uploadPdfInputRef}
        style={{ display: 'none' }}
        onChange={handleUploadPdfFileChange}
      />

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
                <th>Alert</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recommendations.map((recommendation) => {
                const flags = recommendation.alertFlags || {};
                const targetHit = flags.target1Hit || flags.target2Hit || flags.target3Hit;
                const slHit = flags.stopLossHit;
                const inactive = recommendation.isActive === false;
                const isMenuOpen = openMenuId === recommendation._id;
                return (
                <tr key={recommendation._id} className={inactive ? 'rec-row-admin-inactive' : ''}>
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
                    {(() => {
                      const isSell = recommendation.recommendationType === 'sell';
                      // For buy: positive % = good (price needs to rise to target)
                      // For sell: positive % = good (price needs to fall to target)
                      const pct = isSell
                        ? ((recommendation.currentPrice - recommendation.targetPrice) / recommendation.currentPrice) * 100
                        : ((recommendation.targetPrice - recommendation.currentPrice) / recommendation.currentPrice) * 100;
                      return (
                        <small className={pct >= 0 ? 'profit' : 'loss'}>
                          {(pct >= 0 ? '+' : '') + pct.toFixed(2) + '%'}
                        </small>
                      );
                    })()}
                  </td>
                  <td className="alert-cell">
                    {slHit
                      ? <span className="admin-price-hit-badge admin-sl-hit">Stop Loss Hit</span>
                      : targetHit
                      ? <span className="admin-price-hit-badge admin-target-hit">Target Hit</span>
                      : <span className="alert-none">—</span>}
                    {inactive && <span className="admin-price-hit-badge admin-inactive-badge" style={{ display: 'block', marginTop: 4 }}>Inactive</span>}
                  </td>
                  <td>
                    <span className={getStatusBadgeClass(recommendation.status)}>
                      {recommendation.status.charAt(0).toUpperCase() + recommendation.status.slice(1)}
                    </span>
                  </td>
                  <td>{formatDate(recommendation.createdAt)}</td>
                  <td className="actions-cell">
                    <div className="rec-menu-wrap" ref={isMenuOpen ? menuRef : null}>
                      <button
                        className="rec-three-dot-btn"
                        onClick={() => setOpenMenuId(isMenuOpen ? null : recommendation._id)}
                        aria-label="Actions"
                      >
                        &#8942;
                      </button>
                      {isMenuOpen && (
                        <div className="rec-dropdown-menu">
                          <button onClick={() => { handleViewDetails(recommendation); setOpenMenuId(null); }}>
                            View
                          </button>
                          <button onClick={() => { handleEdit(recommendation); setOpenMenuId(null); }}>
                            Edit
                          </button>
                          <button onClick={() => { handleToggleActive(recommendation); setOpenMenuId(null); }}>
                            {recommendation.isActive === false ? 'Mark Active' : 'Mark Inactive'}
                          </button>
                          {recommendation.pdfReport?.url ? (
                            <button onClick={() => { window.open(recommendation.pdfReport.url, '_blank'); setOpenMenuId(null); }}>
                              View PDF
                            </button>
                          ) : (
                            <button onClick={() => { handleGeneratePDF(recommendation); setOpenMenuId(null); }}>
                              Generate PDF
                            </button>
                          )}
                          <button onClick={() => { handleUploadPDF(recommendation); setOpenMenuId(null); }} disabled={uploadingPdfId === recommendation._id}>
                            {uploadingPdfId === recommendation._id ? 'Uploading…' : 'Upload PDF'}
                          </button>
                          <button className="rec-menu-delete" onClick={() => { handleDelete(recommendation._id); setOpenMenuId(null); }}>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedRecommendation && (
        <Modal isOpen={!!selectedRecommendation} onClose={closeDetails}>
          <div className="recommendation-detail">
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
                      {(() => {
                        const pct = ((selectedRecommendation.targetPrice - selectedRecommendation.currentPrice) / selectedRecommendation.currentPrice) * 100;
                        return (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
                      })()}
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
        </Modal>
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
