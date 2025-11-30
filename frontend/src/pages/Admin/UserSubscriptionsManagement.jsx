import React, { useState, useEffect } from 'react';
import { adminSubscriptionAPI } from '../../services/adminSubscriptionAPI';
import './UserSubscriptionsManagement.css';
import moment from 'moment';

const UserSubscriptionsManagement = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    duration: '',
    search: '',
    startDateFrom: '',
    startDateTo: '',
    endDateFrom: '',
    endDateTo: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });

  // Fetch subscriptions with filters and pagination
  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Remove empty filters
      const activeFilters = Object.entries(filters).reduce((acc, [key, value]) => {
        if (value) acc[key] = value;
        return acc;
      }, {});
      
      const response = await adminSubscriptionAPI.getAllUserSubscriptions(
        activeFilters,
        pagination.page,
        pagination.limit
      );
      
      if (response.success) {
        setSubscriptions(response.data);
        setPagination(prev => ({
          ...prev,
          total: response.total,
          pages: response.pages
        }));
      } else {
        setError('Failed to load subscriptions');
      }
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
      setError('Failed to load subscriptions. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch subscription statistics
  const fetchStats = async () => {
    try {
      const response = await adminSubscriptionAPI.getSubscriptionStats();
      
      if (response.success) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Error fetching subscription stats:', err);
      // Don't set error state for stats to avoid blocking the main functionality
    }
  };

  // Initial data load
  useEffect(() => {
    fetchSubscriptions();
    fetchStats();
  }, []);

  // Refetch when page or filters change
  useEffect(() => {
    fetchSubscriptions();
  }, [pagination.page, pagination.limit]);

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Apply filters
  const applyFilters = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
    fetchSubscriptions();
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      status: '',
      duration: '',
      search: '',
      startDateFrom: '',
      startDateTo: '',
      endDateFrom: '',
      endDateTo: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchSubscriptions();
  };

  // Handle page change
  const changePage = (newPage) => {
    if (newPage < 1 || newPage > pagination.pages) return;
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // Format date
  const formatDate = (date) => {
    return moment(date).format('MMM DD, YYYY');
  };

  // Get duration text
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

  // Get status badge class
  const getStatusClass = (status) => {
    switch (status) {
      case 'active':
        return 'status-badge active';
      case 'expired':
        return 'status-badge expired';
      case 'cancelled':
        return 'status-badge cancelled';
      case 'pending':
        return 'status-badge pending';
      default:
        return 'status-badge';
    }
  };

  return (
    <div className="user-subscriptions-container">
      <h2>User Subscriptions Management</h2>
      
      {/* Stats Cards */}
      {stats && (
        <div className="stats-cards">
          <div className="stat-card">
            <h3>Active Subscriptions</h3>
            <div className="stat-value">{stats.activeSubscriptions}</div>
          </div>
          <div className="stat-card warning">
            <h3>Expiring Soon</h3>
            <div className="stat-value">{stats.expiringSoon}</div>
            <div className="stat-note">Next 7 days</div>
          </div>
          <div className="stat-card danger">
            <h3>Recently Expired</h3>
            <div className="stat-value">{stats.recentlyExpired}</div>
            <div className="stat-note">Last 30 days</div>
          </div>
        </div>
      )}
      
      {/* Filters */}
      <div className="filters-section">
        <h3>Filters</h3>
        <form onSubmit={applyFilters} className="filters-form">
          <div className="filters-row">
            <div className="filter-group">
              <label htmlFor="status">Status</label>
              <select 
                id="status" 
                name="status" 
                value={filters.status} 
                onChange={handleFilterChange}
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            
            <div className="filter-group">
              <label htmlFor="duration">Duration</label>
              <select 
                id="duration" 
                name="duration" 
                value={filters.duration} 
                onChange={handleFilterChange}
              >
                <option value="">All</option>
                <option value="monthly">Monthly</option>
                <option value="sixMonth">6 Months</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            
            <div className="filter-group">
              <label htmlFor="search">Search</label>
              <input 
                type="text" 
                id="search" 
                name="search" 
                placeholder="User or plan name" 
                value={filters.search} 
                onChange={handleFilterChange}
              />
            </div>
          </div>
          
          <div className="filters-row">
            <div className="filter-group">
              <label htmlFor="startDateFrom">Start Date From</label>
              <input 
                type="date" 
                id="startDateFrom" 
                name="startDateFrom" 
                value={filters.startDateFrom} 
                onChange={handleFilterChange}
              />
            </div>
            
            <div className="filter-group">
              <label htmlFor="startDateTo">Start Date To</label>
              <input 
                type="date" 
                id="startDateTo" 
                name="startDateTo" 
                value={filters.startDateTo} 
                onChange={handleFilterChange}
              />
            </div>
            
            <div className="filter-group">
              <label htmlFor="endDateFrom">End Date From</label>
              <input 
                type="date" 
                id="endDateFrom" 
                name="endDateFrom" 
                value={filters.endDateFrom} 
                onChange={handleFilterChange}
              />
            </div>
            
            <div className="filter-group">
              <label htmlFor="endDateTo">End Date To</label>
              <input 
                type="date" 
                id="endDateTo" 
                name="endDateTo" 
                value={filters.endDateTo} 
                onChange={handleFilterChange}
              />
            </div>
          </div>
          
          <div className="filters-actions">
            <button type="submit" className="apply-filters-btn">Apply Filters</button>
            <button type="button" className="reset-filters-btn" onClick={resetFilters}>Reset</button>
          </div>
        </form>
      </div>
      
      {/* Subscriptions Table */}
      <div className="subscriptions-table-container">
        {loading ? (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <p>Loading subscriptions...</p>
          </div>
        ) : error ? (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={fetchSubscriptions} className="retry-btn">Retry</button>
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="no-subscriptions">
            <p>No subscriptions found matching your filters.</p>
          </div>
        ) : (
          <>
            <table className="subscriptions-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map(subscription => (
                  <tr key={subscription._id}>
                    <td className="user-cell">
                      <div className="user-name">{subscription.user.name}</div>
                      <div className="user-email">{subscription.user.email}</div>
                    </td>
                    <td>{subscription.subscription.name}</td>
                    <td>
                      <span className={getStatusClass(subscription.status)}>
                        {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                      </span>
                    </td>
                    <td>{getDurationText(subscription.duration)}</td>
                    <td>{formatDate(subscription.startDate)}</td>
                    <td>{formatDate(subscription.endDate)}</td>
                    <td>{subscription.currency} {subscription.price}</td>
                    <td className="actions-cell">
                      <button 
                        className="view-btn"
                        onClick={() => {/* View details implementation */}}
                      >
                        View
                      </button>
                      {subscription.status === 'active' && (
                        <button 
                          className="cancel-btn"
                          onClick={() => {/* Cancel implementation */}}
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination */}
            <div className="pagination">
              <button 
                className="pagination-btn"
                disabled={pagination.page === 1}
                onClick={() => changePage(1)}
              >
                &laquo;
              </button>
              <button 
                className="pagination-btn"
                disabled={pagination.page === 1}
                onClick={() => changePage(pagination.page - 1)}
              >
                &lsaquo;
              </button>
              
              <span className="pagination-info">
                Page {pagination.page} of {pagination.pages}
              </span>
              
              <button 
                className="pagination-btn"
                disabled={pagination.page === pagination.pages}
                onClick={() => changePage(pagination.page + 1)}
              >
                &rsaquo;
              </button>
              <button 
                className="pagination-btn"
                disabled={pagination.page === pagination.pages}
                onClick={() => changePage(pagination.pages)}
              >
                &raquo;
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UserSubscriptionsManagement;
