import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import './KycManagement.css';

const KycManagement = () => {
  const [kycVerifications, setKycVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedKyc, setSelectedKyc] = useState(null);

  useEffect(() => {
    fetchKycVerifications();
  }, []);

  const fetchKycVerifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminAPI.getAllKycVerifications();
      
      if (response.success) {
        setKycVerifications(response.data || []);
      } else {
        setError(response.error || 'Failed to fetch KYC verifications');
      }
    } catch (err) {
      console.error('Error fetching KYC verifications:', err);
      setError('An error occurred while fetching KYC verifications');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'success':
        return 'status-badge verified';
      case 'failed':
        return 'status-badge failed';
      case 'pending':
        return 'status-badge pending';
      default:
        return 'status-badge';
    }
  };

  const handleViewDetails = (kyc) => {
    setSelectedKyc(kyc);
  };

  const closeDetails = () => {
    setSelectedKyc(null);
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="spinner"></div>
        <p>Loading KYC verifications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-error">
        <p>{error}</p>
        <button className="admin-button" onClick={fetchKycVerifications}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <button className="admin-button refresh" onClick={fetchKycVerifications}>
          Refresh
        </button>
      </div>

      {kycVerifications.length === 0 ? (
        <div className="admin-empty-state">
          <p>No KYC verifications found.</p>
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>PAN</th>
                <th>Full Name</th>
                <th>Status</th>
                <th>Verification Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {kycVerifications.map((kyc) => (
                <tr key={kyc._id}>
                  <td>{kyc.user?.name || kyc.email || 'Unknown'}</td>
                  <td>{kyc.pan}</td>
                  <td>{kyc.kycData?.Name?.value || 'N/A'}</td>
                  <td>
                    <span className={getStatusBadgeClass(kyc.status)}>
                      {kyc.status === 'success' ? 'Success' : 
                       kyc.status === 'failed' ? 'Failed' : 'Pending'}
                    </span>
                  </td>
                  <td>{formatDate(kyc.createdAt)}</td>
                  <td>
                    <button 
                      className="admin-action-button"
                      onClick={() => handleViewDetails(kyc)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedKyc && (
        <div className="admin-modal">
          <div className="admin-modal-content">
            <div className="admin-modal-header">
              <h3>KYC Verification Details</h3>
              <button className="admin-modal-close" onClick={closeDetails}>×</button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-detail-group">
                <h4>User Information</h4>
                <div className="admin-detail-row">
                  <span className="admin-detail-label">User:</span>
                  <span className="admin-detail-value">{selectedKyc.user?.name || 'N/A'}</span>
                </div>
                <div className="admin-detail-row">
                  <span className="admin-detail-label">Email:</span>
                  <span className="admin-detail-value">{selectedKyc.email || selectedKyc.user?.email || selectedKyc.kycData?.Email?.value || 'N/A'}</span>
                </div>
              </div>

              <div className="admin-detail-group">
                <h4>KYC Information</h4>
                <div className="admin-detail-row">
                  <span className="admin-detail-label">PAN Number:</span>
                  <span className="admin-detail-value">{selectedKyc.pan || selectedKyc.kycData?.PAN?.value || 'N/A'}</span>
                </div>
                <div className="admin-detail-row">
                  <span className="admin-detail-label">Full Name:</span>
                  <span className="admin-detail-value">{selectedKyc.kycData?.Name?.value || 'N/A'}</span>
                </div>
                <div className="admin-detail-row">
                  <span className="admin-detail-label">Father's Name:</span>
                  <span className="admin-detail-value">{selectedKyc.kycData?.FatherName?.value || 'N/A'}</span>
                </div>
                <div className="admin-detail-row">
                  <span className="admin-detail-label">Date of Birth:</span>
                  <span className="admin-detail-value">{selectedKyc.dob || selectedKyc.kycData?.DOB?.value || 'N/A'}</span>
                </div>
                <div className="admin-detail-row">
                  <span className="admin-detail-label">Gender:</span>
                  <span className="admin-detail-value">{selectedKyc.kycData?.Gender?.value || 'N/A'}</span>
                </div>
                <div className="admin-detail-row">
                  <span className="admin-detail-label">Nationality:</span>
                  <span className="admin-detail-value">{selectedKyc.kycData?.Nationality?.value || 'N/A'}</span>
                </div>
                <div className="admin-detail-row">
                  <span className="admin-detail-label">Address:</span>
                  <span className="admin-detail-value">{selectedKyc.kycData?.Address?.value || 'N/A'}</span>
                </div>
                <div className="admin-detail-row">
                  <span className="admin-detail-label">Mobile:</span>
                  <span className="admin-detail-value">{selectedKyc.kycData?.Mobile?.value || 'N/A'}</span>
                </div>
              </div>

              {(selectedKyc.kycData?.Address1?.value || selectedKyc.kycData?.City?.value || selectedKyc.kycData?.State?.value) && (
                <div className="admin-detail-group">
                  <h4>Address Information</h4>
                  {selectedKyc.kycData?.Address1?.value && (
                    <div className="admin-detail-row">
                      <span className="admin-detail-label">Address:</span>
                      <span className="admin-detail-value">{selectedKyc.kycData.Address1.value}</span>
                    </div>
                  )}
                  {selectedKyc.kycData?.City?.value && (
                    <div className="admin-detail-row">
                      <span className="admin-detail-label">City:</span>
                      <span className="admin-detail-value">{selectedKyc.kycData.City.value}</span>
                    </div>
                  )}
                  {selectedKyc.kycData?.State?.value && (
                    <div className="admin-detail-row">
                      <span className="admin-detail-label">State:</span>
                      <span className="admin-detail-value">{selectedKyc.kycData.State.value}</span>
                    </div>
                  )}
                  {selectedKyc.kycData?.Pincode?.value && (
                    <div className="admin-detail-row">
                      <span className="admin-detail-label">Pincode:</span>
                      <span className="admin-detail-value">{selectedKyc.kycData.Pincode.value}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="admin-detail-group">
                <h4>Verification Status</h4>
                <div className="admin-detail-row">
                  <span className="admin-detail-label">Status:</span>
                  <span className={`admin-detail-value ${getStatusBadgeClass(selectedKyc.status)}`}>
                    {selectedKyc.status === 'success' ? 'Success' : 
                     selectedKyc.status === 'failed' ? 'Failed' : 'Pending'}
                  </span>
                </div>
                <div className="admin-detail-row">
                  <span className="admin-detail-label">Verification Date:</span>
                  <span className="admin-detail-value">{formatDate(selectedKyc.createdAt)}</span>
                </div>
                {selectedKyc.kycData?.Status?.value && (
                  <div className="admin-detail-row">
                    <span className="admin-detail-label">KYC Status:</span>
                    <span className="admin-detail-value">{selectedKyc.kycData.Status.value}</span>
                  </div>
                )}
                {selectedKyc.kycData?.StatusDate?.value && (
                  <div className="admin-detail-row">
                    <span className="admin-detail-label">Status Date:</span>
                    <span className="admin-detail-value">{selectedKyc.kycData.StatusDate.value}</span>
                  </div>
                )}
                {selectedKyc.kycData?.KYCMode?.value && (
                  <div className="admin-detail-row">
                    <span className="admin-detail-label">KYC Mode:</span>
                    <span className="admin-detail-value">{selectedKyc.kycData.KYCMode.value}</span>
                  </div>
                )}
                {selectedKyc.kycData?.SignFlag?.value && (
                  <div className="admin-detail-row">
                    <span className="admin-detail-label">Signature Available:</span>
                    <span className="admin-detail-value">{selectedKyc.kycData.SignFlag.value === 'Y' ? 'Yes' : 'No'}</span>
                  </div>
                )}
                {selectedKyc.kycData?.IPVFlag?.value && (
                  <div className="admin-detail-row">
                    <span className="admin-detail-label">IPV Completed:</span>
                    <span className="admin-detail-value">{selectedKyc.kycData.IPVFlag.value === 'Y' ? 'Yes' : 'No'}</span>
                  </div>
                )}
                {selectedKyc.kycData?.IPVDate?.value && (
                  <div className="admin-detail-row">
                    <span className="admin-detail-label">IPV Date:</span>
                    <span className="admin-detail-value">{selectedKyc.kycData.IPVDate.value}</span>
                  </div>
                )}
                {selectedKyc.kycData?.ApplicationNo?.value && (
                  <div className="admin-detail-row">
                    <span className="admin-detail-label">Application Number:</span>
                    <span className="admin-detail-value">{selectedKyc.kycData.ApplicationNo.value}</span>
                  </div>
                )}
                {selectedKyc.kycData?.RegistrationDate?.value && (
                  <div className="admin-detail-row">
                    <span className="admin-detail-label">Registration Date:</span>
                    <span className="admin-detail-value">{selectedKyc.kycData.RegistrationDate.value}</span>
                  </div>
                )}
                {selectedKyc.message && (
                  <div className="admin-detail-row">
                    <span className="admin-detail-label">Message:</span>
                    <span className="admin-detail-value">{selectedKyc.message}</span>
                  </div>
                )}
                {selectedKyc.auditInfo && (
                  <div className="admin-detail-row">
                    <span className="admin-detail-label">Audit Info:</span>
                    <span className="admin-detail-value">{selectedKyc.auditInfo}</span>
                  </div>
                )}
              </div>

              {selectedKyc.error && (
                <div className="admin-detail-group">
                  <h4>Error Information</h4>
                  <div className="admin-detail-row">
                    <span className="admin-detail-label">Error:</span>
                    <span className="admin-detail-value error">{selectedKyc.error}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="admin-modal-footer">
              <button className="admin-button" onClick={closeDetails}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KycManagement;
