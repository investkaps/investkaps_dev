import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import subscriptionAPI from '../../services/subscriptionAPI';
import './UserSubscription.css';
import moment from 'moment';
import { Link } from 'react-router-dom';

const UserSubscription = () => {
  const { currentUser } = useAuth();
  const [activeSubscriptions, setActiveSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    const fetchSubscriptions = async () => {
      if (!currentUser?.id) return;
      
      try {
        setLoading(true);
        setError('');
        const response = await subscriptionAPI.getActiveSubscription(currentUser.id);
        
        if (response.success && response.data) {
          // Backend now returns an array
          setActiveSubscriptions(Array.isArray(response.data) ? response.data : [response.data]);
        } else {
          setActiveSubscriptions([]);
        }
      } catch (err) {
        console.error('Error fetching subscriptions:', err);
        setError('Unable to load your subscription information. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSubscriptions();
  }, [currentUser]);
  
  // Calculate days remaining
  const getDaysRemaining = (endDate) => {
    const now = moment();
    const end = moment(endDate);
    return Math.max(0, end.diff(now, 'days'));
  };
  
  // Format date
  const formatDate = (date) => {
    return moment(date).format('MMM DD, YYYY');
  };
  
  // Get duration in readable format
  const getDurationText = (duration) => {
    switch (duration) {
      case 'monthly':
        return 'Monthly';
      case 'sixMonth':
        return '6 Months';
      case 'yearly':
        return 'Yearly';
      default:
        return duration;
    }
  };
  
  // Calculate progress percentage
  const getProgressPercentage = (startDate, endDate) => {
    const start = moment(startDate);
    const end = moment(endDate);
    const now = moment();
    
    const totalDays = end.diff(start, 'days');
    const daysElapsed = now.diff(start, 'days');
    
    return Math.min(100, Math.max(0, Math.round((daysElapsed / totalDays) * 100)));
  };
  
  // Check if subscription is expiring soon (within 7 days)
  const isExpiringSoon = (endDate) => {
    const daysRemaining = getDaysRemaining(endDate);
    return daysRemaining <= 7 && daysRemaining > 0;
  };
  
  // Check if subscription has expired
  const isExpired = (endDate) => {
    return moment().isAfter(moment(endDate));
  };
  
  if (loading) {
    return (
      <div className="subscription-container loading">
        <div className="subscription-loader"></div>
        <p>Loading your subscription information...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="subscription-container error">
        <div className="error-icon">⚠️</div>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }
  
  if (activeSubscriptions.length === 0) {
    return (
      <div className="subscription-container no-subscription">
        <div className="no-subscription-icon">📊</div>
        <h3>No Active Subscriptions</h3>
        <p>You don't have any active subscription plans.</p>
        <Link to="/pricing" className="subscribe-button">
          View Available Plans
        </Link>
      </div>
    );
  }
  
  return (
    <div className="subscription-container">
      <div className="subscription-header">
        <h2>Your Subscriptions</h2>
        <p className="subscription-count">
          {activeSubscriptions.length} Active {activeSubscriptions.length === 1 ? 'Subscription' : 'Subscriptions'}
        </p>
      </div>
      
      <div className="subscriptions-list">
        {activeSubscriptions.map((subscription) => {
          const daysRemaining = getDaysRemaining(subscription.endDate);
          const progress = getProgressPercentage(subscription.startDate, subscription.endDate);
          const expiringSoon = isExpiringSoon(subscription.endDate);
          const expired = isExpired(subscription.endDate);
          
          return (
            <div key={subscription._id} className="subscription-card">
              <div className="subscription-card-header">
                <div className="subscription-plan-name">
                  {subscription.subscription?.name || 'Unknown Plan'}
                </div>
                {expiringSoon && (
                  <div className="expiring-badge">
                    Expires in {daysRemaining} days
                  </div>
                )}
                {expired && (
                  <div className="expired-badge">
                    Expired
                  </div>
                )}
              </div>
              
              <div className="subscription-details">
                <div className="subscription-detail">
                  <span className="detail-label">Status:</span>
                  <span className={`detail-value status-${subscription.status}`}>
                    {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                  </span>
                </div>
                
                <div className="subscription-detail">
                  <span className="detail-label">Duration:</span>
                  <span className="detail-value">
                    {getDurationText(subscription.duration)}
                  </span>
                </div>
                
                <div className="subscription-detail">
                  <span className="detail-label">Start Date:</span>
                  <span className="detail-value">
                    {formatDate(subscription.startDate)}
                  </span>
                </div>
                
                <div className="subscription-detail">
                  <span className="detail-label">End Date:</span>
                  <span className="detail-value">
                    {formatDate(subscription.endDate)}
                  </span>
                </div>
                
                <div className="subscription-detail">
                  <span className="detail-label">Amount Paid:</span>
                  <span className="detail-value">
                    {subscription.currency} {subscription.price}
                  </span>
                </div>
              </div>
              
              <div className="subscription-progress">
                <div className="progress-label">
                  <span>Subscription Progress</span>
                  <span>{progress}%</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <div className="progress-dates">
                  <span>{formatDate(subscription.startDate)}</span>
                  <span>{formatDate(subscription.endDate)}</span>
                </div>
              </div>
              
              <div className="subscription-actions">
                {expiringSoon && (
                  <Link to="/pricing" className="renew-button">
                    Renew Subscription
                  </Link>
                )}
                {expired && (
                  <Link to="/pricing" className="renew-button urgent">
                    Renew Now
                  </Link>
                )}
              </div>
              
              {subscription.subscription?.features && subscription.subscription.features.length > 0 && (
                <div className="subscription-features">
                  <h4>Plan Features</h4>
                  <ul className="features-list">
                    {subscription.subscription.features
                      .filter(feature => feature.included)
                      .map((feature, index) => (
                        <li key={index} className="feature-item">
                          <span className="feature-icon">✓</span>
                          <span className="feature-name">{feature.name}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="add-subscription-section">
        <Link to="/pricing" className="add-subscription-button">
          + Add Another Subscription
        </Link>
      </div>
    </div>
  );
};

export default UserSubscription;
