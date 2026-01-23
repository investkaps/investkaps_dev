import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import './AdminDashboard.css';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterVerified, setFilterVerified] = useState('all');
  
  useEffect(() => {
    fetchUsers();
  }, []);
  
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAllUsers();
      setUsers(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchUserDetails = async (userId) => {
    try {
      setLoading(true);
      const response = await adminAPI.getUserById(userId);
      setSelectedUser(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching user details:', err);
      setError('Failed to load user details. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleRoleChange = async (userId, newRole, currentRole) => {
    // Get user details for confirmation message
    const user = users.find(u => u._id === userId);
    const userName = user?.name || user?.email || 'this user';
    
    // Create confirmation message based on role change
    let confirmMessage = '';
    if (newRole === 'admin') {
      confirmMessage = `Are you sure you want to upgrade "${userName}" to Admin?\n\nAdmins have full access to:\n• User management\n• Subscription management\n• Stock recommendations\n• All administrative features`;
    } else {
      confirmMessage = `Are you sure you want to downgrade "${userName}" to Customer?\n\nThis will remove their admin privileges and they will lose access to:\n• User management\n• Subscription management\n• Stock recommendations management\n• All administrative features`;
    }
    
    // Show confirmation dialog
    const confirmed = window.confirm(confirmMessage);
    
    if (!confirmed) {
      // User cancelled - revert the select dropdown
      return;
    }
    
    try {
      setLoading(true);
      await adminAPI.updateUserRole(userId, newRole);
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user._id === userId ? { ...user, role: newRole } : user
        )
      );
      
      if (selectedUser && selectedUser._id === userId) {
        setSelectedUser(prev => ({ ...prev, role: newRole }));
      }
      
      // Show success message
      alert(`✓ Successfully ${newRole === 'admin' ? 'upgraded' : 'downgraded'} ${userName} to ${newRole}`);
      
      setError(null);
    } catch (err) {
      console.error('Error updating user role:', err);
      setError('Failed to update user role. Please try again later.');
      alert('Failed to update user role. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Filter and sort users - admins first, then customers
  const filteredUsers = users
    .filter(user => {
      const matchesSearch = 
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = filterRole === 'all' || user.role === filterRole;
      
      const matchesVerified = 
        filterVerified === 'all' || 
        (filterVerified === 'verified' && user.kycStatus?.isVerified) ||
        (filterVerified === 'unverified' && !user.kycStatus?.isVerified);
      
      return matchesSearch && matchesRole && matchesVerified;
    })
    .sort((a, b) => {
      // Sort by role: admins first, then customers
      if (a.role === 'admin' && b.role !== 'admin') return -1;
      if (a.role !== 'admin' && b.role === 'admin') return 1;
      
      // Within same role, sort by name
      return (a.name || '').localeCompare(b.name || '');
    });
  
  return (
    <div className="admin-section">
      {error && (
        <div className="admin-error">
          {error}
        </div>
      )}
      
      <div className="admin-filters">
        <div className="admin-search">
          <input
            type="text"
            placeholder="Search by name or email"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="admin-filter-group">
          <select 
            value={filterRole} 
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="customer">Customers</option>
            <option value="admin">Admins</option>
          </select>
          
          <select 
            value={filterVerified} 
            onChange={(e) => setFilterVerified(e.target.value)}
          >
            <option value="all">All Verification</option>
            <option value="verified">KYC Verified</option>
            <option value="unverified">Not Verified</option>
          </select>
        </div>
      </div>
      
      <div className="admin-users-list" style={{ width: '100%' }}>
        <h3>Users ({filteredUsers.length})</h3>
          
          {loading && !selectedUser && (
            <div className="admin-loading-inline">
              <div className="spinner-small"></div>
              <span>Loading users...</span>
            </div>
          )}
          
          {!loading && filteredUsers.length === 0 && (
            <div className="admin-empty-state">
              <p>No users found matching your filters.</p>
            </div>
          )}
          
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>KYC Status</th>
                  <th>Subscription</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr 
                    key={user._id} 
                    className={selectedUser && selectedUser._id === user._id ? 'selected' : ''}
                  >
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`role-badge ${user.role}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${user.kycStatus?.isVerified ? 'verified' : 'pending'}`}>
                        {user.kycStatus?.isVerified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${user.hasActiveSubscription ? 'active' : 'inactive'}`}>
                        {user.hasActiveSubscription ? 'Active' : 'None'}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="admin-btn-small"
                        onClick={() => fetchUserDetails(user._id)}
                      >
                        View
                      </button>
                      <select
                        value={user.role}
                        onChange={(e) => {
                          const newRole = e.target.value;
                          const currentRole = user.role;
                          
                          // Only trigger if role actually changed
                          if (newRole !== currentRole) {
                            handleRoleChange(user._id, newRole, currentRole);
                            
                            // Reset dropdown to current role if user cancels
                            // This will be overridden if the API call succeeds
                            e.target.value = currentRole;
                          }
                        }}
                        className="role-select"
                        disabled={loading}
                      >
                        <option value="customer">Customer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      </div>
        
      {selectedUser && (
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
            onClick={() => setSelectedUser(null)}
          />
          <div 
            className="admin-user-details" 
            style={{ 
              position: 'fixed', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)',
              width: '90%',
              maxWidth: '800px',
              maxHeight: '90vh', 
              overflowY: 'auto', 
              zIndex: 1000,
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)'
            }}
          >
            <div className="admin-details-header">
              <h3>User Details</h3>
              <button 
                className="admin-btn-close"
                onClick={() => setSelectedUser(null)}
              >
                ×
              </button>
            </div>
            
            <div className="admin-details-content">
              <div className="admin-details-section">
                <h4>Basic Information</h4>
                <div className="admin-details-grid">
                  <div className="admin-details-item">
                    <span className="admin-details-label">Name</span>
                    <span className="admin-details-value">{selectedUser.name}</span>
                  </div>
                  <div className="admin-details-item">
                    <span className="admin-details-label">Email</span>
                    <span className="admin-details-value">{selectedUser.email}</span>
                  </div>
                  <div className="admin-details-item">
                    <span className="admin-details-label">Role</span>
                    <span className="admin-details-value">
                      <span className={`role-badge ${selectedUser.role}`}>
                        {selectedUser.role}
                      </span>
                    </span>
                  </div>
                  <div className="admin-details-item">
                    <span className="admin-details-label">Clerk ID</span>
                    <span className="admin-details-value">{selectedUser.clerkId}</span>
                  </div>
                  <div className="admin-details-item">
                    <span className="admin-details-label">Created</span>
                    <span className="admin-details-value">
                      {new Date(selectedUser.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="admin-details-item">
                    <span className="admin-details-label">Last Updated</span>
                    <span className="admin-details-value">
                      {new Date(selectedUser.updatedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="admin-details-section">
                <h4>KYC Information</h4>
                {selectedUser.kycStatus?.isVerified ? (
                  <div className="admin-details-grid">
                    <div className="admin-details-item">
                      <span className="admin-details-label">Status</span>
                      <span className="admin-details-value">
                        <span className="status-badge verified">Verified</span>
                      </span>
                    </div>
                    <div className="admin-details-item">
                      <span className="admin-details-label">PAN Number</span>
                      <span className="admin-details-value">{selectedUser.kycStatus.panNumber || 'N/A'}</span>
                    </div>
                    <div className="admin-details-item">
                      <span className="admin-details-label">Full Name</span>
                      <span className="admin-details-value">{selectedUser.kycStatus.fullName || 'N/A'}</span>
                    </div>
                    <div className="admin-details-item">
                      <span className="admin-details-label">Father's Name</span>
                      <span className="admin-details-value">{selectedUser.kycStatus.fatherName || 'N/A'}</span>
                    </div>
                    <div className="admin-details-item">
                      <span className="admin-details-label">Date of Birth</span>
                      <span className="admin-details-value">{selectedUser.kycStatus.dob || 'N/A'}</span>
                    </div>
                    <div className="admin-details-item">
                      <span className="admin-details-label">Gender</span>
                      <span className="admin-details-value">{selectedUser.kycStatus.gender || 'N/A'}</span>
                    </div>
                    <div className="admin-details-item">
                      <span className="admin-details-label">Verified At</span>
                      <span className="admin-details-value">
                        {selectedUser.kycStatus.verifiedAt ? 
                          new Date(selectedUser.kycStatus.verifiedAt).toLocaleString() : 
                          'N/A'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="admin-empty-state">
                    <p>User has not completed KYC verification.</p>
                  </div>
                )}
              </div>
              
              <div className="admin-details-section">
                <h4>Profile Information</h4>
                {selectedUser.profile && (
                  <div className="admin-details-grid">
                    <div className="admin-details-item">
                      <span className="admin-details-label">Phone</span>
                      <span className="admin-details-value">{selectedUser.profile.phone || 'N/A'}</span>
                    </div>
                    <div className="admin-details-item">
                      <span className="admin-details-label">Address</span>
                      <span className="admin-details-value">{selectedUser.profile.address || 'N/A'}</span>
                    </div>
                    <div className="admin-details-item">
                      <span className="admin-details-label">City</span>
                      <span className="admin-details-value">{selectedUser.profile.city || 'N/A'}</span>
                    </div>
                    <div className="admin-details-item">
                      <span className="admin-details-label">State</span>
                      <span className="admin-details-value">{selectedUser.profile.state || 'N/A'}</span>
                    </div>
                    <div className="admin-details-item">
                      <span className="admin-details-label">Pincode</span>
                      <span className="admin-details-value">{selectedUser.profile.pincode || 'N/A'}</span>
                    </div>
                  </div>
                ) || (
                  <div className="admin-empty-state">
                    <p>No profile information available.</p>
                  </div>
                )}
              </div>
              
              <div className="admin-details-section">
                <h4>KYC Verification History</h4>
                {selectedUser.kycVerifications && selectedUser.kycVerifications.length > 0 ? (
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>PAN</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedUser.kycVerifications.map((verification) => (
                          <tr key={verification._id}>
                            <td>{new Date(verification.createdAt).toLocaleString()}</td>
                            <td>{verification.pan}</td>
                            <td>
                              <span className={`status-badge ${verification.status === 'success' ? 'verified' : 'failed'}`}>
                                {verification.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="admin-empty-state">
                    <p>No KYC verification history available.</p>
                  </div>
                )}
              </div>
              
              <div className="admin-details-section">
                <h4>Investments</h4>
                {selectedUser.investments && selectedUser.investments.length > 0 ? (
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedUser.investments.map((investment) => (
                          <tr key={investment._id}>
                            <td>{new Date(investment.createdAt).toLocaleString()}</td>
                            <td>₹{investment.amount.toLocaleString()}</td>
                            <td>
                              <span className={`status-badge ${investment.status}`}>
                                {investment.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="admin-empty-state">
                    <p>No investments available.</p>
                  </div>
                )}
              </div>
              
              <div className="admin-details-section">
                <h4>Subscription Information</h4>
                {selectedUser.userSubscriptions && selectedUser.userSubscriptions.length > 0 ? (
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Plan</th>
                          <th>Duration</th>
                          <th>Status</th>
                          <th>Start Date</th>
                          <th>End Date</th>
                          <th>Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedUser.userSubscriptions.map((subscription) => (
                          <tr key={subscription._id}>
                            <td>
                              <strong>{subscription.subscription?.name || 'N/A'}</strong>
                              {subscription.subscription?.packageCode && (
                                <div style={{ fontSize: '0.85em', color: '#6c757d' }}>
                                  {subscription.subscription.packageCode}
                                </div>
                              )}
                            </td>
                            <td>
                              <span style={{ textTransform: 'capitalize' }}>
                                {subscription.duration === 'sixMonth' ? '6 Months' : subscription.duration}
                              </span>
                            </td>
                            <td>
                              <span className={`status-badge ${subscription.status}`}>
                                {subscription.status}
                              </span>
                            </td>
                            <td>{new Date(subscription.startDate).toLocaleDateString()}</td>
                            <td>{new Date(subscription.endDate).toLocaleDateString()}</td>
                            <td>₹{subscription.price.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    {/* Show active subscription details */}
                    {selectedUser.userSubscriptions.some(sub => sub.status === 'active') && (
                      <div style={{ 
                        marginTop: '1rem', 
                        padding: '1rem', 
                        background: '#d1e7dd', 
                        borderRadius: '8px',
                        border: '1px solid #badbcc'
                      }}>
                        <strong style={{ color: '#0f5132' }}>Active Subscription:</strong>
                        {selectedUser.userSubscriptions
                          .filter(sub => sub.status === 'active')
                          .map(sub => (
                            <div key={sub._id} style={{ marginTop: '0.5rem', color: '#0f5132' }}>
                              <div>Plan: <strong>{sub.subscription?.name}</strong></div>
                              <div>Started: {new Date(sub.startDate).toLocaleDateString()}</div>
                              <div>Expires: {new Date(sub.endDate).toLocaleDateString()}</div>
                              <div>
                                Days Remaining: <strong>
                                  {Math.max(0, Math.ceil((new Date(sub.endDate) - new Date()) / (1000 * 60 * 60 * 24)))}
                                </strong>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="admin-empty-state">
                    <p>No subscription history available.</p>
                  </div>
                )}
              </div>
              
              <div className="admin-details-section">
                <h4>Documents</h4>
                {selectedUser.documents && selectedUser.documents.length > 0 ? (
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedUser.documents.map((document) => (
                          <tr key={document._id}>
                            <td>{new Date(document.createdAt).toLocaleString()}</td>
                            <td>{document.type}</td>
                            <td>
                              <span className={`status-badge ${document.status}`}>
                                {document.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="admin-empty-state">
                    <p>No documents available.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UserManagement;
