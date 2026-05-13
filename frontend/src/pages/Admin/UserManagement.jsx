import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import subscriptionAPI from '../../services/subscriptionAPI';
import './AdminDashboard.css';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterVerified, setFilterVerified] = useState('all');
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ show: false, userId: null, userName: '', userEmail: '', userRole: '' });
  const [deleteSuccess, setDeleteSuccess] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const normalizeApiPayload = (payload) => {
    if (!payload) return null;
    return payload.data ?? payload;
  };
  
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAllUsers();
      const payload = normalizeApiPayload(response);
      setUsers(Array.isArray(payload) ? payload : []);
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
      const payload = normalizeApiPayload(response);
      const userDetails = payload || {};

      // Fallback fetch for subscription history when admin payload lacks relations
      if ((!userDetails.userSubscriptions || userDetails.userSubscriptions.length === 0) && userDetails.clerkId) {
        try {
          const subsResponse = await subscriptionAPI.getUserSubscriptions(userDetails.clerkId);
          const subsPayload = normalizeApiPayload(subsResponse);
          userDetails.userSubscriptions = Array.isArray(subsPayload) ? subsPayload : [];
        } catch (subErr) {
          console.error('Fallback subscription fetch failed:', subErr);
          userDetails.userSubscriptions = userDetails.userSubscriptions || [];
        }
      }

      setSelectedUser(userDetails);
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
  
  const openDeleteConfirm = (user) => {
    setDeleteConfirmModal({
      show: true,
      userId: user._id,
      userName: user.name || 'Unknown',
      userEmail: user.email || '',
      userRole: user.role
    });
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirmModal({ show: false, userId: null, userName: '', userEmail: '', userRole: '' });
  };

  const handleDeleteUser = async () => {
    const { userId, userName } = deleteConfirmModal;
    try {
      setDeletingUserId(userId);
      closeDeleteConfirm();
      await adminAPI.deleteUser(userId);

      // Remove from local state
      setUsers(prev => prev.filter(u => u._id !== userId));
      if (selectedUser && selectedUser._id === userId) {
        setSelectedUser(null);
      }

      setDeleteSuccess(`✓ User "${userName}" has been permanently deleted.`);
      setTimeout(() => setDeleteSuccess(null), 5000);
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(`Failed to delete user: ${err.message}`);
    } finally {
      setDeletingUserId(null);
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
      {/* Delete confirmation modal */}
      {deleteConfirmModal.show && (
        <>
          <div
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 1100,
              backdropFilter: 'blur(4px)'
            }}
            onClick={closeDeleteConfirm}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#1a1a2e', border: '1px solid #dc3545',
            borderRadius: '12px', padding: '2rem',
            width: '90%', maxWidth: '460px',
            zIndex: 1101, boxShadow: '0 20px 60px rgba(220,53,69,0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.8rem' }}>⚠️</span>
              <h3 style={{ color: '#ff6b6b', margin: 0, fontSize: '1.2rem' }}>Permanently Delete User</h3>
            </div>

            <p style={{ color: '#ccc', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
              You are about to permanently delete:
            </p>
            <div style={{
              background: 'rgba(220,53,69,0.1)', border: '1px solid rgba(220,53,69,0.3)',
              borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem'
            }}>
              <strong style={{ color: '#fff', display: 'block' }}>{deleteConfirmModal.userName}</strong>
              <span style={{ color: '#aaa', fontSize: '0.9rem' }}>{deleteConfirmModal.userEmail}</span>
            </div>

            <p style={{ color: '#aaa', fontSize: '0.875rem', marginBottom: '1rem' }}>
              This will permanently remove:
            </p>
            <ul style={{ color: '#ccc', fontSize: '0.875rem', margin: '0 0 1.5rem 1.2rem', lineHeight: 1.8 }}>
              <li>MongoDB user account</li>
              <li>All KYC verification records</li>
              <li>All subscription plans (active &amp; historical)</li>
              <li>All linked documents</li>
              <li>Clerk authentication identity</li>
            </ul>
            <p style={{ color: '#ff6b6b', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1.5rem' }}>
              ⚠ This action is irreversible and cannot be undone.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={closeDeleteConfirm}
                style={{
                  padding: '0.6rem 1.4rem', borderRadius: '8px',
                  border: '1px solid #555', background: 'transparent',
                  color: '#ccc', cursor: 'pointer', fontSize: '0.9rem'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                style={{
                  padding: '0.6rem 1.4rem', borderRadius: '8px',
                  border: 'none', background: '#dc3545',
                  color: '#fff', cursor: 'pointer', fontSize: '0.9rem',
                  fontWeight: 600, letterSpacing: '0.02em'
                }}
              >
                🗑 Confirm Delete
              </button>
            </div>
          </div>
        </>
      )}

      {error && (
        <div className="admin-error">
          {error}
        </div>
      )}

      {deleteSuccess && (
        <div className="admin-success" style={{
          background: '#0f5132', color: '#d1e7dd', border: '1px solid #badbcc',
          borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem',
          fontWeight: 500
        }}>
          {deleteSuccess}
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
                  <th>Client Types</th>
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
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {user.clientTypes?.RA?.isCompleted && (
                          <span className="status-badge verified" title={`RA completed on ${new Date(user.clientTypes.RA.completedAt).toLocaleDateString()}`}>
                            RA
                          </span>
                        )}
                        {user.clientTypes?.IA?.isCompleted && (
                          <span className="status-badge verified" title={`IA completed on ${new Date(user.clientTypes.IA.completedAt).toLocaleDateString()}`}>
                            IA
                          </span>
                        )}
                        {!user.clientTypes?.RA?.isCompleted && !user.clientTypes?.IA?.isCompleted && (
                          <span className="status-badge inactive">None</span>
                        )}
                      </div>
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
                          if (newRole !== currentRole) {
                            handleRoleChange(user._id, newRole, currentRole);
                            e.target.value = currentRole;
                          }
                        }}
                        className="role-select"
                        disabled={loading}
                      >
                        <option value="customer">Customer</option>
                        <option value="admin">Admin</option>
                      </select>
                      {user.role !== 'admin' && (
                        <button
                          className="admin-btn-small"
                          disabled={deletingUserId === user._id}
                          onClick={() => openDeleteConfirm(user)}
                          style={{
                            background: deletingUserId === user._id ? '#6c757d' : '#dc3545',
                            color: '#fff',
                            border: 'none',
                            marginLeft: '4px',
                            opacity: deletingUserId === user._id ? 0.7 : 1
                          }}
                          title="Permanently delete this user"
                        >
                          {deletingUserId === user._id ? '...' : '🗑 Delete'}
                        </button>
                      )}
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
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {selectedUser.role !== 'admin' && (
                  <button
                    onClick={() => openDeleteConfirm(selectedUser)}
                    disabled={deletingUserId === selectedUser._id}
                    style={{
                      padding: '0.4rem 1rem',
                      background: '#dc3545', color: '#fff',
                      border: 'none', borderRadius: '6px',
                      cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
                    }}
                    title="Permanently delete this user"
                  >
                    {deletingUserId === selectedUser._id ? 'Deleting…' : '🗑 Delete Account'}
                  </button>
                )}
                <button 
                  className="admin-btn-close"
                  onClick={() => setSelectedUser(null)}
                >
                  ×
                </button>
              </div>
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
                <h4>Client Types</h4>
                <div className="admin-details-grid">
                  <div className="admin-details-item">
                    <span className="admin-details-label">RA Client</span>
                    <span className="admin-details-value">
                      {selectedUser.clientTypes?.RA?.isCompleted ? (
                        <span className="status-badge verified">
                          Completed on {new Date(selectedUser.clientTypes.RA.completedAt).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="status-badge inactive">Not Completed</span>
                      )}
                    </span>
                  </div>
                  <div className="admin-details-item">
                    <span className="admin-details-label">IA Client</span>
                    <span className="admin-details-value">
                      {selectedUser.clientTypes?.IA?.isCompleted ? (
                        <span className="status-badge verified">
                          Completed on {new Date(selectedUser.clientTypes.IA.completedAt).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="status-badge inactive">Not Completed</span>
                      )}
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
                {(selectedUser.userSubscriptions || selectedUser.subscriptions) && (selectedUser.userSubscriptions || selectedUser.subscriptions).length > 0 ? (
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
                        {(selectedUser.userSubscriptions || selectedUser.subscriptions).map((subscription) => (
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
                                {subscription.duration === 'sixMonth' ? '6 Months' : (subscription.duration || 'N/A')}
                              </span>
                            </td>
                            <td>
                              <span className={`status-badge ${subscription.status}`}>
                                {subscription.status}
                              </span>
                            </td>
                            <td>{new Date(subscription.startDate).toLocaleDateString()}</td>
                            <td>{new Date(subscription.endDate).toLocaleDateString()}</td>
                            <td>₹{(subscription.price ?? subscription.amount ?? 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    {/* Show active subscription details */}
                    {(selectedUser.userSubscriptions || selectedUser.subscriptions).some(sub => sub.status === 'active') && (
                      <div style={{ 
                        marginTop: '1rem', 
                        padding: '1rem', 
                        background: '#d1e7dd', 
                        borderRadius: '8px',
                        border: '1px solid #badbcc'
                      }}>
                        <strong style={{ color: '#0f5132' }}>Active Subscription:</strong>
                        {(selectedUser.userSubscriptions || selectedUser.subscriptions)
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
