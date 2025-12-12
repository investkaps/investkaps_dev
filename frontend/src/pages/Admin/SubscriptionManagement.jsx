import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import './AdminDashboard.css';

const SubscriptionManagement = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingSubscription, setEditingSubscription] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    packageCode: '',
    name: '',
    description: '',
    pricing: {
      monthly: '',
      sixMonth: '',
      yearly: ''
    },
    tradingOptions: {
      stockOptions: false,
      indexOptions: false,
      stockFuture: false,
      indexFuture: false,
      equity: false,
      mcx: false
    },
    currency: 'INR',
    features: [],
    isActive: true
  });
  const [newFeature, setNewFeature] = useState({ name: '', included: true, description: '' });
  const [strategies, setStrategies] = useState([]);
  const [selectedStrategies, setSelectedStrategies] = useState([]);

  useEffect(() => {
    fetchSubscriptions();
    fetchStrategies();
  }, []);
  
  const fetchStrategies = async () => {
    try {
      const response = await adminAPI.getAllStrategies();
      setStrategies(response);
    } catch (err) {
      console.error('Error fetching strategies:', err);
      setError('Failed to load strategies. Please try again later.');
    }
  };

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAllSubscriptions();
      setSubscriptions(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
      setError('Failed to load subscriptions. Please try again later.');
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
          [child]: type === 'checkbox' ? checked : 
                  (parent === 'pricing') ? Number(value) || 0 : value
        }
      });
    } else {
      // Handle top-level properties
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : 
               name === 'displayOrder' ? Number(value) || 0 : value
      });
    }
  };

  const handleFeatureInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewFeature({
      ...newFeature,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const addFeature = () => {
    if (!newFeature.name.trim()) return;
    
    setFormData({
      ...formData,
      features: [...formData.features, { ...newFeature }]
    });
    
    setNewFeature({ name: '', included: true, description: '' });
  };

  const removeFeature = (index) => {
    const updatedFeatures = [...formData.features];
    updatedFeatures.splice(index, 1);
    setFormData({ ...formData, features: updatedFeatures });
  };
  
  const handleStrategySelection = (strategyId) => {
    if (selectedStrategies.includes(strategyId)) {
      // Remove strategy if already selected
      setSelectedStrategies(selectedStrategies.filter(id => id !== strategyId));
    } else {
      // Add strategy if not selected
      setSelectedStrategies([...selectedStrategies, strategyId]);
    }
  };

  const openCreateModal = () => {
    setEditingSubscription(null);
    setFormData({
      packageCode: '',
      name: '',
      description: '',
      pricing: {
        monthly: '',
        sixMonth: '',
        yearly: ''
      },
      tradingOptions: {
        stockOptions: false,
        indexOptions: false,
        stockFuture: false,
        indexFuture: false,
        equity: false,
        mcx: false
      },
      currency: 'INR',
      features: [],
      telegramChatId: '',
      isActive: true
    });
    setSelectedStrategies([]);
    setIsModalOpen(true);
  };

  const openEditModal = (subscription) => {
    setEditingSubscription(subscription);
    setFormData({
      packageCode: subscription.packageCode,
      name: subscription.name,
      description: subscription.description,
      pricing: {
        monthly: subscription.pricing?.monthly || 0,
        sixMonth: subscription.pricing?.sixMonth || 0,
        yearly: subscription.pricing?.yearly || 0
      },
      tradingOptions: {
        stockOptions: subscription.tradingOptions?.stockOptions || false,
        indexOptions: subscription.tradingOptions?.indexOptions || false,
        stockFuture: subscription.tradingOptions?.stockFuture || false,
        indexFuture: subscription.tradingOptions?.indexFuture || false,
        equity: subscription.tradingOptions?.equity || false,
        mcx: subscription.tradingOptions?.mcx || false
      },
      currency: subscription.currency || 'INR',
      features: subscription.features || [],
      telegramChatId: subscription.telegramChatId || '',
      isActive: subscription.isActive
    });
    
    // Set selected strategies if they exist
    if (subscription.strategies && Array.isArray(subscription.strategies)) {
      const strategyIds = subscription.strategies.map(strategy => 
        typeof strategy === 'object' ? strategy._id : strategy
      );
      setSelectedStrategies(strategyIds);
    } else {
      setSelectedStrategies([]);
    }
    
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSubscription(null);
    setSelectedStrategies([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Validate required fields
      if (!formData.packageCode || !formData.name || !formData.description || !formData.pricing) {
        setError('Please provide package code, name, description, and pricing');
        setLoading(false);
        return;
      }
      
      // First create/update the subscription
      let subscriptionId;
      let response;
      
      if (editingSubscription) {
        response = await adminAPI.updateSubscription(editingSubscription._id, formData);
        subscriptionId = editingSubscription._id;
      } else {
        response = await adminAPI.createSubscription(formData);
        subscriptionId = response.data._id;
      }
      
      // Then update the strategies if there are any selected (this is optional)
      if (selectedStrategies && selectedStrategies.length > 0) {
        // First remove any existing strategies
        if (editingSubscription && editingSubscription.strategies && editingSubscription.strategies.length > 0) {
          const existingStrategyIds = editingSubscription.strategies.map(strategy => 
            typeof strategy === 'object' ? strategy._id : strategy
          );
          await adminAPI.removeStrategiesFromSubscription(subscriptionId, existingStrategyIds);
        }
        
        // Then add the selected strategies
        await adminAPI.addStrategiesToSubscription(subscriptionId, selectedStrategies);
      }
      
      fetchSubscriptions();
      closeModal();
    } catch (err) {
      console.error('Error saving subscription:', err);
      setError(`Failed to ${editingSubscription ? 'update' : 'create'} subscription: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      setLoading(true);
      await adminAPI.toggleSubscriptionStatus(id);
      fetchSubscriptions();
    } catch (err) {
      console.error('Error toggling subscription status:', err);
      setError(`Failed to toggle subscription status: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this subscription? This action cannot be undone.')) {
      return;
    }
    
    try {
      setLoading(true);
      await adminAPI.deleteSubscription(id);
      fetchSubscriptions();
    } catch (err) {
      console.error('Error deleting subscription:', err);
      setError(`Failed to delete subscription: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && subscriptions.length === 0) {
    return (
      <div className="admin-loading">
        <div className="spinner"></div>
        <p>Loading subscriptions...</p>
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
          Add New Subscription
        </button>
      </div>
      
      {error && (
        <div className="admin-error">
          {error}
        </div>
      )}
      
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Package Code</th>
              <th>Name</th>
              <th>Pricing (Monthly/6M/Yearly)</th>
              <th>Trading Options</th>
              <th>Features</th>
              <th>Strategies</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((subscription) => (
              <tr key={subscription._id}>
                <td>{subscription.packageCode}</td>
                <td>{subscription.name}</td>
                <td>
                  {subscription.currency} {subscription.pricing?.monthly || 0} / 
                  {subscription.currency} {subscription.pricing?.sixMonth || 0} / 
                  {subscription.currency} {subscription.pricing?.yearly || 0}
                </td>
                <td>
                  {Object.entries(subscription.tradingOptions || {}).filter(([_, value]) => value).map(([key]) => (
                    <span key={key} className="trading-option-badge">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  ))}
                </td>
                <td>{subscription.features?.length || 0} features</td>
                <td>
                  {subscription.strategies && Array.isArray(subscription.strategies) ? (
                    <div className="strategy-badges">
                      {subscription.strategies.length > 0 ? (
                        subscription.strategies.map(strategy => (
                          <span key={typeof strategy === 'object' ? strategy._id : strategy} className="strategy-badge">
                            {typeof strategy === 'object' ? strategy.name : 'Strategy'}
                          </span>
                        ))
                      ) : (
                        <span className="no-strategies">None</span>
                      )}
                    </div>
                  ) : (
                    <span className="no-strategies">None</span>
                  )}
                </td>
                <td>
                  <span className={`status-badge ${subscription.isActive ? 'active' : 'inactive'}`}>
                    {subscription.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="admin-actions">
                  <button 
                    className="admin-edit-btn" 
                    onClick={() => openEditModal(subscription)}
                    disabled={loading}
                  >
                    Edit
                  </button>
                  <button 
                    className="admin-toggle-btn" 
                    onClick={() => handleToggleStatus(subscription._id)}
                    disabled={loading}
                  >
                    {subscription.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button 
                    className="admin-delete-btn" 
                    onClick={() => handleDelete(subscription._id)}
                    disabled={loading}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {subscriptions.length === 0 && !loading && (
              <tr>
                <td colSpan="7" className="admin-no-data">
                  No subscriptions found. Click "Add New Subscription" to create one.
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
              <h3>{editingSubscription ? 'Edit Subscription' : 'Create New Subscription'}</h3>
              <button className="admin-modal-close" onClick={closeModal}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="admin-form">
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label htmlFor="packageCode">Package Code</label>
                  <input
                    type="text"
                    id="packageCode"
                    name="packageCode"
                    value={formData.packageCode}
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
                <h4>Pricing Options</h4>
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label htmlFor="pricing.monthly">Monthly Price</label>
                    <input
                      type="number"
                      id="pricing.monthly"
                      name="pricing.monthly"
                      value={formData.pricing.monthly}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  
                  <div className="admin-form-group">
                    <label htmlFor="pricing.sixMonth">Six Month Price</label>
                    <input
                      type="number"
                      id="pricing.sixMonth"
                      name="pricing.sixMonth"
                      value={formData.pricing.sixMonth}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  
                  <div className="admin-form-group">
                    <label htmlFor="pricing.yearly">Yearly Price</label>
                    <input
                      type="number"
                      id="pricing.yearly"
                      name="pricing.yearly"
                      value={formData.pricing.yearly}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>
                
                <div className="admin-form-group">
                  <label htmlFor="currency">Currency</label>
                  <select
                    id="currency"
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                  >
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
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

              <div className="admin-form-group">
                <label>Telegram Chat ID</label>
                <input
                  type="text"
                  name="telegramChatId"
                  value={formData.telegramChatId}
                  onChange={handleInputChange}
                  placeholder="e.g., -1001234567890"
                />
                <small style={{ color: '#6c757d', display: 'block', marginTop: '4px' }}>
                  Enter the Telegram group/channel chat ID for this subscription's notifications
                </small>
              </div>
              
              <div className="admin-form-section">
                <h4>Strategies</h4>
                {strategies.length > 0 ? (
                  <div className="admin-strategies-list">
                    {strategies.map((strategy) => (
                      <div key={strategy._id} className="admin-strategy-item">
                        <label className="admin-checkbox-label">
                          <input
                            type="checkbox"
                            checked={selectedStrategies.includes(strategy._id)}
                            onChange={() => handleStrategySelection(strategy._id)}
                          />
                          <strong>{strategy.name}</strong> ({strategy.strategyCode})
                        </label>
                        <div className="admin-strategy-description">
                          {strategy.description}
                        </div>
                        <div className="admin-strategy-trading-options">
                          {Object.entries(strategy.tradingOptions || {}).filter(([_, value]) => value).map(([key]) => (
                            <span key={key} className="trading-option-badge">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No strategies available. Create strategies first.</p>
                )}
              </div>
              
              <div className="admin-form-section">
                <h4>Features</h4>
                
                <div className="admin-features-list">
                  {formData.features.map((feature, index) => (
                    <div key={index} className="admin-feature-item">
                      <div className="admin-feature-content">
                        <span 
                          className={`admin-feature-status ${feature.included ? 'included' : 'excluded'}`}
                          onClick={() => {
                            const updatedFeatures = [...formData.features];
                            updatedFeatures[index].included = !updatedFeatures[index].included;
                            setFormData({ ...formData, features: updatedFeatures });
                          }}
                          title={feature.included ? 'Click to exclude' : 'Click to include'}
                        >
                          {feature.included ? '✓' : '✗'}
                        </span>
                        <div>
                          <strong>{feature.name}</strong>
                          {feature.description && <p className="feature-description">{feature.description}</p>}
                        </div>
                      </div>
                      <div className="admin-feature-actions">
                        <button 
                          type="button" 
                          className="admin-edit-feature" 
                          onClick={() => {
                            setNewFeature({
                              name: feature.name,
                              description: feature.description || '',
                              included: feature.included
                            });
                            removeFeature(index);
                          }}
                          title="Edit this feature"
                        >
                          ✎
                        </button>
                        <button 
                          type="button" 
                          className="admin-remove-feature" 
                          onClick={() => removeFeature(index)}
                          title="Remove this feature"
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {formData.features.length === 0 && (
                    <div className="admin-no-features">
                      <p>No features added yet.</p>
                      <p className="admin-features-hint">Features help customers understand what's included in each subscription plan.</p>
                    </div>
                  )}
                </div>
                
                <div className="admin-add-feature">
                  <h5>Add New Feature</h5>
                  <div className="admin-form-row">
                    <div className="admin-form-group">
                      <label htmlFor="feature-name">Feature Name</label>
                      <input
                        id="feature-name"
                        type="text"
                        placeholder="e.g., 24/7 Support"
                        name="name"
                        value={newFeature.name}
                        onChange={handleFeatureInputChange}
                      />
                    </div>
                    
                    <div className="admin-form-group">
                      <label htmlFor="feature-description">Description (optional)</label>
                      <input
                        id="feature-description"
                        type="text"
                        placeholder="e.g., Access to support team anytime"
                        name="description"
                        value={newFeature.description}
                        onChange={handleFeatureInputChange}
                      />
                    </div>
                    
                    <div className="admin-form-group admin-checkbox-group">
                      <label className="admin-checkbox-label">
                        <input
                          type="checkbox"
                          name="included"
                          checked={newFeature.included}
                          onChange={handleFeatureInputChange}
                        />
                        Included in this plan
                      </label>
                    </div>
                  </div>
                  
                  <button 
                    type="button" 
                    className="admin-add-feature-btn" 
                    onClick={addFeature}
                    disabled={!newFeature.name.trim()}
                  >
                    Add Feature
                  </button>
                </div>
                
                <div className="admin-features-tips">
                  <h5>Tips for effective features:</h5>
                  <ul>
                    <li>Keep feature names concise and clear</li>
                    <li>Use descriptions to provide additional details</li>
                    <li>Include both included and excluded features for transparency</li>
                    <li>List the most important features first</li>
                  </ul>
                </div>
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
                  {loading ? 'Saving...' : editingSubscription ? 'Update Subscription' : 'Create Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionManagement;
