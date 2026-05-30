import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import AdminModal from '../../components/Admin/AdminModal';
import './AdminDashboard.css';

const SubscriptionManagement = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState(null);
  const [formData, setFormData] = useState({
    packageCode: '',
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
    currency: 'INR',
    features: [],
    telegramChatId: '',
    isActive: true,
    isTrial: false
  });
  const [newFeature, setNewFeature] = useState({ name: '', included: true, description: '' });
  const [planOptions, setPlanOptions] = useState([{ name: '', months: 1, price: '', description: '' }]);
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
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value
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

  const moveFeatureUp = (index) => {
    if (index === 0) return;
    const features = [...formData.features];
    [features[index - 1], features[index]] = [features[index], features[index - 1]];
    setFormData({ ...formData, features });
  };

  const moveFeatureDown = (index) => {
    if (index === formData.features.length - 1) return;
    const features = [...formData.features];
    [features[index], features[index + 1]] = [features[index + 1], features[index]];
    setFormData({ ...formData, features });
  };

  const normalizeLegacyPlanOptions = (pricing = {}) => {
    const legacyPlans = [
      { name: 'Monthly', months: 1, price: pricing.monthly },
      { name: '6 Months', months: 6, price: pricing.sixMonth },
      { name: 'Yearly', months: 12, price: pricing.yearly }
    ];

    return legacyPlans.filter((plan) => plan.price !== undefined && plan.price !== null);
  };

  const handlePlanOptionChange = (index, field, value) => {
    const updated = [...planOptions];
    updated[index] = {
      ...updated[index],
      [field]: field === 'months' ? Math.max(1, Math.min(12, Number(value) || 1)) : value
    };
    setPlanOptions(updated);
  };

  const addPlanOption = () => {
    setPlanOptions((current) => [...current, { name: '', months: 1, price: '', description: '' }]);
  };

  const removePlanOption = (index) => {
    setPlanOptions((current) => current.filter((_, optionIndex) => optionIndex !== index));
  };

  const handleStrategySelection = (strategyId) => {
    if (selectedStrategies.includes(strategyId)) {
      setSelectedStrategies(selectedStrategies.filter(id => id !== strategyId));
    } else {
      setSelectedStrategies([...selectedStrategies, strategyId]);
    }
  };

  const openCreateModal = () => {
    setEditingSubscription(null);
    setFormData({
      packageCode: '',
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
      currency: 'INR',
      features: [],
      telegramChatId: '',
      isActive: true,
      isTrial: false
    });
    setPlanOptions([{ name: '', months: 1, price: '', description: '' }]);
    setSelectedStrategies([]);
    setIsModalOpen(true);
  };

  const openEditModal = (subscription) => {
    setEditingSubscription(subscription);
    setFormData({
      packageCode: subscription.packageCode,
      name: subscription.name,
      description: subscription.description,
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
      isActive: subscription.isActive,
      isTrial: subscription.isTrial || false
    });

    const existingPlanOptions = Array.isArray(subscription.planOptions) && subscription.planOptions.length > 0
      ? subscription.planOptions.map((option) => ({
          _id: option._id,
          name: option.name || '',
          months: option.months || 1,
          price: option.price ?? '',
          description: option.description || ''
        }))
      : normalizeLegacyPlanOptions(subscription.pricing);

    setPlanOptions(existingPlanOptions.length > 0 ? existingPlanOptions : [{ name: '', months: 1, price: '', description: '' }]);
    
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

      const normalizedPlanOptions = planOptions
        .map((option) => ({
          ...(option._id ? { _id: option._id } : {}),
          name: String(option.name || '').trim(),
          months: Number(option.months) || 0,
          price: String(option.price).trim(),
          description: String(option.description || '').trim()
        }))
        .filter((option) => option.name && option.months >= 1 && option.months <= 12 && option.price !== '');

      const submissionPlanOptions = normalizedPlanOptions.map((option) => ({
        ...(option._id ? { _id: option._id } : {}),
        name: option.name,
        months: option.months,
        price: Number(option.price),
        description: option.description
      }));

      if (!formData.packageCode || !formData.name || !formData.description || submissionPlanOptions.length === 0) {
        setError('Please provide package code, name, description, and at least one plan option');
        setLoading(false);
        return;
      }

      const payload = {
        ...formData,
        planOptions: submissionPlanOptions
      };
      
      let subscriptionId;
      let response;
      
      if (editingSubscription) {
        response = await adminAPI.updateSubscription(editingSubscription._id, payload);
        subscriptionId = editingSubscription._id;
      } else {
        response = await adminAPI.createSubscription(payload);
        subscriptionId = response.data._id;
      }
      
      if (selectedStrategies && selectedStrategies.length > 0) {
        if (editingSubscription && editingSubscription.strategies && editingSubscription.strategies.length > 0) {
          const existingStrategyIds = editingSubscription.strategies.map(strategy => 
            typeof strategy === 'object' ? strategy._id : strategy
          );
          await adminAPI.removeStrategiesFromSubscription(subscriptionId, existingStrategyIds);
        }
        await adminAPI.addStrategiesToSubscription(subscriptionId, selectedStrategies);
      }
      
      setSuccessMessage(`Subscription ${editingSubscription ? 'updated' : 'created'} successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
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
      
      {successMessage && (
        <div className="admin-success">
          {successMessage}
        </div>
      )}
      
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Package Code</th>
              <th>Name</th>
              <th>Plans</th>
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
                  {(Array.isArray(subscription.planOptions) && subscription.planOptions.length > 0
                    ? subscription.planOptions
                    : normalizeLegacyPlanOptions(subscription.pricing)
                  ).map((plan, index) => (
                    <div key={plan._id || `${subscription._id}-${index}`} style={{ marginBottom: 4 }}>
                      <strong>{plan.name}</strong> - {plan.months} month{plan.months > 1 ? 's' : ''} - {subscription.currency} {plan.price}
                    </div>
                  ))}
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

      <AdminModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingSubscription ? 'Edit Subscription' : 'Create New Subscription'}
        size="xlarge"
      >
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
            <h4>Plan Options</h4>
            <p style={{ color: '#6b7280', marginTop: '-4px' }}>
              Add any number of duration plans from 1 to 12 months. Each plan can have its own label and price.
            </p>

            <div className="admin-plan-options-list">
              {planOptions.map((plan, index) => (
                <div key={plan._id || index} className="admin-plan-option-item">
                  <div className="admin-form-row">
                    <div className="admin-form-group">
                      <label htmlFor={`plan-name-${index}`}>Plan Name</label>
                      <input
                        id={`plan-name-${index}`}
                        type="text"
                        value={plan.name}
                        onChange={(event) => handlePlanOptionChange(index, 'name', event.target.value)}
                        placeholder="Monthly, Quarterly, Half Yearly"
                        required
                      />
                    </div>

                    <div className="admin-form-group">
                      <label htmlFor={`plan-months-${index}`}>Months</label>
                      <input
                        id={`plan-months-${index}`}
                        type="number"
                        min="1"
                        max="12"
                        value={plan.months}
                        onChange={(event) => handlePlanOptionChange(index, 'months', event.target.value)}
                        required
                      />
                    </div>

                    <div className="admin-form-group">
                      <label htmlFor={`plan-price-${index}`}>Price</label>
                      <input
                        id={`plan-price-${index}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={plan.price}
                        onChange={(event) => handlePlanOptionChange(index, 'price', event.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="admin-form-row">
                    <div className="admin-form-group" style={{ flex: 1 }}>
                      <label htmlFor={`plan-description-${index}`}>Description</label>
                      <input
                        id={`plan-description-${index}`}
                        type="text"
                        value={plan.description}
                        onChange={(event) => handlePlanOptionChange(index, 'description', event.target.value)}
                        placeholder="Optional note for this plan"
                      />
                    </div>

                    <div className="admin-form-group" style={{ minWidth: 120, alignSelf: 'flex-end' }}>
                      <button
                        type="button"
                        className="admin-delete-btn"
                        onClick={() => removePlanOption(index)}
                        disabled={planOptions.length === 1}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button type="button" className="admin-add-btn" onClick={addPlanOption} style={{ marginTop: 12 }}>
              Add Another Plan
            </button>

            <div className="admin-form-group" style={{ marginTop: 20 }}>
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
            <label className="admin-checkbox-label">
              <input
                type="checkbox"
                name="isTrial"
                checked={formData.isTrial}
                onChange={handleInputChange}
              />
              Trial Plan
            </label>
            <small style={{ color: '#6c757d', display: 'block', marginTop: '4px' }}>
              Trial plans can only be claimed once per user account and cannot be reclaimed.
            </small>
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
                    <div className="feature-description">
                      <strong>{feature.name}</strong>
                      {feature.description && <div style={{ color: '#718096' }}>{feature.description}</div>}
                    </div>
                  </div>

                  <div className="admin-feature-actions">
                    <button
                      type="button"
                      className="admin-feature-move"
                      onClick={() => moveFeatureUp(index)}
                      disabled={index === 0}
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="admin-feature-move"
                      onClick={() => moveFeatureDown(index)}
                      disabled={index === formData.features.length - 1}
                      title="Move down"
                    >
                      ↓
                    </button>
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
      </AdminModal>
    </div>
  );
};

export default SubscriptionManagement;
