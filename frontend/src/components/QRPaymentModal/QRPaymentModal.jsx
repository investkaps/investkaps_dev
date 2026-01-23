import React, { useState } from 'react';
import { FaTimes as FaClose } from 'react-icons/fa';
import './QRPaymentModal.css';

const QRPaymentModal = ({ plan, duration, price, onClose, currentUser }) => {
  const [formData, setFormData] = useState({
    senderName: '',
    transactionId: '',
    transactionImage: null
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }
      
      setFormData({ ...formData, transactionImage: file });
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.senderName || !formData.transactionId || !formData.transactionImage) {
      setError('Please fill all fields and upload transaction screenshot');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('senderName', formData.senderName);
      formDataToSend.append('transactionId', formData.transactionId);
      formDataToSend.append('transactionImage', formData.transactionImage);
      formDataToSend.append('planId', plan._id);
      formDataToSend.append('planName', plan.name);
      formDataToSend.append('duration', duration);
      formDataToSend.append('amount', price);
      formDataToSend.append('userId', currentUser.id);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/payment-requests/submit`, {
        method: 'POST',
        body: formDataToSend,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit payment request');
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err) {
      console.error('Error submitting payment request:', err);
      setError(err.message || 'Failed to submit payment request. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (success) {
    return (
      <div className="duration-modal-overlay">
        <div className="qr-payment-modal">
          <div className="success-message">
            <div className="success-icon">✓</div>
            <h3>Payment Request Submitted!</h3>
            <p>Your payment request has been submitted successfully.</p>
            <p>Our admin will verify and approve your subscription within 24 hours.</p>
            <button className="modern-select-btn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="duration-modal-overlay">
      <div className="qr-payment-modal">
        <div className="duration-modal-header">
          <h3>QR Code Payment</h3>
          <button className="duration-close-btn" onClick={onClose} aria-label="Close">
            <FaClose />
          </button>
        </div>

        <div className="qr-payment-content">
          <div className="qr-payment-details">
            <h4>Payment Details</h4>
            <div className="payment-info">
              <div className="info-row">
                <span className="label">Plan:</span>
                <span className="value">{plan.name}</span>
              </div>
              <div className="info-row">
                <span className="label">Duration:</span>
                <span className="value">{duration === 'sixMonth' ? '6 Months' : duration}</span>
              </div>
              <div className="info-row">
                <span className="label">Amount:</span>
                <span className="value amount">₹{price}</span>
              </div>
            </div>
          </div>

          <div className="qr-code-section">
            <h4>Scan QR Code to Pay</h4>
            <div className="qr-code-placeholder">
              <img 
                src="/qrcode.png" 
                alt="Payment QR Code" 
                className="qr-code-image"
              />
            </div>
            <p className="qr-instruction">Scan this QR code with any UPI app to make payment</p>
          </div>

          <form onSubmit={handleSubmit} className="qr-payment-form">
            <h4>Upload Transaction Proof</h4>
            
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label>Sender Name *</label>
              <input
                type="text"
                value={formData.senderName}
                onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                placeholder="Enter name as per transaction"
                required
              />
            </div>

            <div className="form-group">
              <label>Transaction ID / UTR Number *</label>
              <input
                type="text"
                value={formData.transactionId}
                onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                placeholder="Enter transaction ID"
                required
              />
            </div>

            <div className="form-group">
              <label>Transaction Screenshot *</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                required
              />
              {imagePreview && (
                <div className="image-preview">
                  <img src={imagePreview} alt="Transaction preview" />
                </div>
              )}
            </div>

            <button 
              type="submit" 
              className="modern-select-btn"
              disabled={uploading}
            >
              {uploading ? 'Submitting...' : 'Submit Payment Request'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default QRPaymentModal;
