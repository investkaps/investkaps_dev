import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import './AdminDashboard.css';

const StrategyManagement = () => {
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingStrategy, setEditingStrategy] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    strategyCode: '',
    name: '',
    description: '',
    tradingOptions: {
      stockOptions: false,
      indexOptions: false,
      stockFuture: false,
      indexFuture: false,
      equity: false,
      mcx: false
    },
    isActive: true
  });
  const [subscriptionsWithStrategy, setSubscriptionsWithStrategy] = useState([]);
  const [showSubscriptions, setShowSubscriptions] = useState(false);

  useEffect(() => {
    fetchStrategies();
  }, []);

  const fetchStrategies = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAllStrategies();
      setStrategies(response);
      setError(null);
    } catch (err) {
      console.error('Error fetching strategies:', err);
      setError('Failed to load strategies. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle nested properties
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      });
    } else {
      // Handle top-level properties
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value
      });
    }
  };

  const openCreateModal = () => {
    setEditingStrategy(null);
    setFormData({
      strategyCode: '',
      name: '',
      description: '',
      tradingOptions: {
        stockOptions: false,
        indexOptions: false,
        stockFuture: false,
        indexFuture: false,
        equity: false,
        mcx: false
      },
      isActive: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (strategy) => {
    setEditingStrategy(strategy);
    setFormData({
      strategyCode: strategy.strategyCode,
      name: strategy.name,
      description: strategy.description,
      tradingOptions: {
        stockOptions: strategy.tradingOptions?.stockOptions || false,
        indexOptions: strategy.tradingOptions?.indexOptions || false,
        stockFuture: strategy.tradingOptions?.stockFuture || false,
        indexFuture: strategy.tradingOptions?.indexFuture || false,
        equity: strategy.tradingOptions?.equity || false,
        mcx: strategy.tradingOptions?.mcx || false
      },
      isActive: strategy.isActive
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingStrategy(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      if (editingStrategy) {
        await adminAPI.updateStrategy(editingStrategy._id, formData);
      } else {
        await adminAPI.createStrategy(formData);
      }
      
      fetchStrategies();
      closeModal();
    } catch (err) {
      console.error('Error saving strategy:', err);
      setError(`Failed to ${editingStrategy ? 'update' : 'create'} strategy: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      setLoading(true);
      await adminAPI.toggleStrategyStatus(id);
      fetchStrategies();
    } catch (err) {
      console.error('Error toggling strategy status:', err);
      setError(`Failed to toggle strategy status: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this strategy? This action cannot be undone.')) {
      return;
    }
    
    try {
      setLoading(true);
      await adminAPI.deleteStrategy(id);
      fetchStrategies();
    } catch (err) {
      console.error('Error deleting strategy:', err);
      setError(`Failed to delete strategy: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleViewSubscriptions = async (id) => {
    try {
      setLoading(true);
      const response = await adminAPI.getSubscriptionsByStrategy(id);
      setSubscriptionsWithStrategy(response);
      setShowSubscriptions(true);
    } catch (err) {
      console.error('Error fetching subscriptions by strategy:', err);
      setError(`Failed to fetch subscriptions: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && strategies.length === 0) {
    return (
      <div className="admin-loading">
        <div className="spinner"></div>
        <p>Loading strategies...</p>
      </div>
    );
  }

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <button 
          className="admin-add-btn" 
          onClick={openCreateModal}
          disabled={loading}
        >
          Add New Strategy
        </button>
      </div>
      
      {error && (
        <div className="admin-error">
          {error}
        </div>
      )}
      
      {showSubscriptions && (
        <div className="admin-subscriptions-modal">
          <div className="admin-modal-content">
            <div className="admin-modal-header">
              <h3>Subscriptions Using This Strategy</h3>
              <button className="admin-modal-close" onClick={() => setShowSubscriptions(false)}>&times;</button>
            </div>
            <div className="admin-modal-body">
              {subscriptionsWithStrategy.length > 0 ? (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Package Code</th>
                      <th>Name</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptionsWithStrategy.map((subscription) => (
                      <tr key={subscription._id}>
                        <td>{subscription.packageCode}</td>
                        <td>{subscription.name}</td>
                        <td>
                          <span className={`status-badge ${subscription.isActive ? 'active' : 'inactive'}`}>
                            {subscription.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No subscriptions are using this strategy.</p>
              )}
            </div>
          </div>
        </div>
      )}
      
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Strategy Code</th>
              <th>Name</th>
              <th>Trading Options</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {strategies.map((strategy) => (
              <tr key={strategy._id}>
                <td>{strategy.strategyCode}</td>
                <td>{strategy.name}</td>
                <td>
                  {Object.entries(strategy.tradingOptions || {}).filter(([_, value]) => value).map(([key]) => (
                    <span key={key} className="trading-option-badge">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  ))}
                </td>
                <td>
                  <span className={`status-badge ${strategy.isActive ? 'active' : 'inactive'}`}>
                    {strategy.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="admin-actions">
                  <button 
                    className="admin-view-btn" 
                    onClick={() => handleViewSubscriptions(strategy._id)}
                    disabled={loading}
                  >
                    View Subscriptions
                  </button>
                  <button 
                    className="admin-edit-btn" 
                    onClick={() => openEditModal(strategy)}
                    disabled={loading}
                  >
                    Edit
                  </button>
                  <button 
                    className="admin-toggle-btn" 
                    onClick={() => handleToggleStatus(strategy._id)}
                    disabled={loading}
                  >
                    {strategy.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button 
                    className="admin-delete-btn" 
                    onClick={() => handleDelete(strategy._id)}
                    disabled={loading}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {strategies.length === 0 && !loading && (
              <tr>
                <td colSpan="5" className="admin-no-data">
                  No strategies found. Click "Add New Strategy" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {isModalOpen && (
        <div className="admin-modal">
          <div className="admin-modal-content">
            <div className="admin-modal-header">
              <h3>{editingStrategy ? 'Edit Strategy' : 'Create New Strategy'}</h3>
              <button className="admin-modal-close" onClick={closeModal}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="admin-form">
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label htmlFor="strategyCode">Strategy Code</label>
                  <input
                    type="text"
                    id="strategyCode"
                    name="strategyCode"
                    value={formData.strategyCode}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="admin-form-group">
                  <label htmlFor="name">Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              
              <div className="admin-form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="admin-form-section">
                <h4>Trading Options</h4>
                <div className="admin-trading-options">
                  <label className="admin-checkbox-label">
                    <input
                      type="checkbox"
                      name="tradingOptions.stockOptions"
                      checked={formData.tradingOptions.stockOptions}
                      onChange={handleInputChange}
                    />
                    Stock Options
                  </label>
                  
                  <label className="admin-checkbox-label">
                    <input
                      type="checkbox"
                      name="tradingOptions.indexOptions"
                      checked={formData.tradingOptions.indexOptions}
                      onChange={handleInputChange}
                    />
                    Index Options
                  </label>
                  
                  <label className="admin-checkbox-label">
                    <input
                      type="checkbox"
                      name="tradingOptions.stockFuture"
                      checked={formData.tradingOptions.stockFuture}
                      onChange={handleInputChange}
                    />
                    Stock Future
                  </label>
                  
                  <label className="admin-checkbox-label">
                    <input
                      type="checkbox"
                      name="tradingOptions.indexFuture"
                      checked={formData.tradingOptions.indexFuture}
                      onChange={handleInputChange}
                    />
                    Index Future
                  </label>
                  
                  <label className="admin-checkbox-label">
                    <input
                      type="checkbox"
                      name="tradingOptions.equity"
                      checked={formData.tradingOptions.equity}
                      onChange={handleInputChange}
                    />
                    Equity
                  </label>
                  
                  <label className="admin-checkbox-label">
                    <input
                      type="checkbox"
                      name="tradingOptions.mcx"
                      checked={formData.tradingOptions.mcx}
                      onChange={handleInputChange}
                    />
                    MCX
                  </label>
                </div>
              </div>
              
              <div className="admin-form-group">
                <label className="admin-checkbox-label">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                  />
                  Active
                </label>
              </div>
              
              <div className="admin-form-actions">
                <button 
                  type="button" 
                  className="admin-cancel-btn" 
                  onClick={closeModal}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="admin-submit-btn"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : editingStrategy ? 'Update Strategy' : 'Create Strategy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StrategyManagement;
