import React, { useState } from 'react';
import './IAPaymentStep.css';

const IAPaymentStep = ({ currentUser, onPaymentComplete }) => {
  const [paymentMethod, setPaymentMethod] = useState('qr'); // 'qr' or 'bank_transfer'
  const [formData, setFormData] = useState({
    senderName: '',
    transactionId: '',
    transactionImage: null
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Bank transfer details
  const bankDetails = {
    bankName: 'ICICI Bank',
    accountNumber: '082905002404',
    ifscCode: 'ICIC0000829'
  };

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

  const sanitizeInput = (input) => {
    return String(input).trim();
  };

  const isValidName = (name) => {
    return /^[a-zA-Z\s]{2,100}$/.test(name);
  };

  const isValidTransactionId = (txnId) => {
    return /^.{6,50}$/.test(txnId);
  };

  const isValidImageType = (file) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    return validTypes.includes(file.type);
  };

  const isValidFileSize = (file, maxSizeMB) => {
    return file.size <= maxSizeMB * 1024 * 1024;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const cleanName = sanitizeInput(formData.senderName);
    const cleanTxnId = sanitizeInput(formData.transactionId);

    if (!isValidName(cleanName)) {
      setError('Please enter a valid name (2-100 characters, letters only)');
      return;
    }
    if (!isValidTransactionId(cleanTxnId)) {
      setError('Please enter a valid Transaction ID (6-50 characters)');
      return;
    }
    if (!formData.transactionImage) {
      setError('Please upload a transaction screenshot');
      return;
    }
    if (!isValidImageType(formData.transactionImage)) {
      setError('Please upload a valid image (JPEG, PNG, GIF, or WebP)');
      return;
    }
    if (!isValidFileSize(formData.transactionImage, 5)) {
      setError('Image size should be less than 5MB');
      return;
    }

    // Extra safety checks & logging to help debug missing fields reported by backend
    const resolvedUserId = currentUser?.id || currentUser?.clerkId || null;
    if (!resolvedUserId) {
      setError('Unable to determine your account id. Please refresh and try again.');
      console.error('IAPaymentStep: missing user id on currentUser', currentUser);
      return;
    }

    // Sanity-check before sending to server
    if (!cleanName || !cleanTxnId || !resolvedUserId) {
      setError('All fields are required');
      console.warn('IAPaymentStep: missing fields', { cleanName, cleanTxnId, resolvedUserId, file: !!formData.transactionImage });
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('senderName', cleanName);
      formDataToSend.append('transactionId', cleanTxnId);
      formDataToSend.append('transactionImage', formData.transactionImage);
      formDataToSend.append('amount', '0'); // Amount can be updated by admin later
      formDataToSend.append('planId', '6a042ef92b5f23d183b50770'); // Using dummy IA plan created
      formDataToSend.append('planName', 'Investment Advisory Services');
      formDataToSend.append('duration', 'yearly');
      formDataToSend.append('userId', resolvedUserId);
      formDataToSend.append('serviceType', 'IA');
      formDataToSend.append('paymentMethod', paymentMethod);

      // Debug: log form entries (do not log file binary)
      try {
        for (const pair of formDataToSend.entries()) {
          if (pair[0] === 'transactionImage') continue;
          console.debug('IAPaymentStep form:', pair[0], pair[1]);
        }
      } catch (logErr) { console.debug('IAPaymentStep: could not iterate form entries', logErr); }

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
        if (onPaymentComplete) {
          onPaymentComplete(data);
        }
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
      <div className="ia-payment-step">
        <div className="payment-success">
          <div className="success-icon">✓</div>
          <h3>Payment Submitted Successfully!</h3>
          <p>Your payment proof has been submitted. Our admin team will verify and activate your IA account within 24 hours.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ia-payment-step">
      <p className="step-desc">
        Complete your payment to activate your Investment Advisor account.
      </p>

      {/* Payment Method Selection */}
      <div className="payment-method-selector">
        <div className="method-option">
          <input
            type="radio"
            id="method-qr"
            name="paymentMethod"
            value="qr"
            checked={paymentMethod === 'qr'}
            onChange={(e) => setPaymentMethod(e.target.value)}
          />
          <label htmlFor="method-qr">
            <span className="method-icon">📱</span>
            <div className="method-info">
              <strong>QR Code Payment</strong>
              <p>Scan QR & upload transaction proof</p>
            </div>
          </label>
        </div>

        <div className="method-option">
          <input
            type="radio"
            id="method-bank"
            name="paymentMethod"
            value="bank_transfer"
            checked={paymentMethod === 'bank_transfer'}
            onChange={(e) => setPaymentMethod(e.target.value)}
          />
          <label htmlFor="method-bank">
            <span className="method-icon">🏦</span>
            <div className="method-info">
              <strong>Bank Transfer</strong>
              <p>Direct bank transfer with proof upload</p>
            </div>
          </label>
        </div>
      </div>

      {/* QR Payment Section */}
      {paymentMethod === 'qr' && (
        <div className="payment-section qr-section">
          <h3>QR Code Payment</h3>
          <div className="qr-code-container">
            <img 
              src="/qrcode.png" 
              alt="Payment QR Code" 
              className="qr-code-image"
            />
            <p className="qr-instruction">Scan this QR code with any UPI app to make payment</p>
          </div>
        </div>
      )}

      {/* Bank Transfer Payment Section */}
      {paymentMethod === 'bank_transfer' && (
        <div className="payment-section bank-section">
          <h3>Bank Transfer Details</h3>
          <div className="bank-details-card">
            <div className="detail-row">
              <span className="detail-label">Bank Name</span>
              <span className="detail-value">{bankDetails.bankName}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Account Number</span>
              <span className="detail-value account-number">{bankDetails.accountNumber}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">IFSC Code</span>
              <span className="detail-value ifsc-code">{bankDetails.ifscCode}</span>
            </div>
          </div>
        </div>
      )}

      {/* Upload Transaction Proof */}
      <form onSubmit={handleSubmit} className="payment-form">
        <h3>Upload Transaction Proof</h3>

        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label htmlFor="senderName">Payer Name *</label>
          <input
            id="senderName"
            type="text"
            value={formData.senderName}
            onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
            placeholder="Enter name as per transaction"
            required
            disabled={uploading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="transactionId">
            {paymentMethod === 'qr' ? 'Transaction ID / UTR Number' : 'Reference Number / Transaction ID'} *
          </label>
          <input
            id="transactionId"
            type="text"
            value={formData.transactionId}
            onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
            placeholder={paymentMethod === 'qr' ? 'e.g., UPI Reference ID' : 'e.g., NEFT Reference or Cheque Number'}
            required
            disabled={uploading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="transactionScreenshot">Upload Proof Screenshot *</label>
          <input
            id="transactionScreenshot"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            required
            disabled={uploading}
          />
          <p className="file-hint">Accepted formats: JPEG, PNG, GIF, WebP (Max 5MB)</p>
          {imagePreview && (
            <div className="image-preview">
              <img src={imagePreview} alt="Transaction preview" />
              <p>Preview</p>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button 
            type="submit" 
            className="submit-btn"
            disabled={uploading}
          >
            {uploading ? 'Submitting...' : 'Submit Payment Proof'}
          </button>
        </div>

        <p className="form-note">
          ✓ Your submission will be verified by our admin team within 24 hours. 
          You will receive an email confirmation once approved.
        </p>
      </form>
    </div>
  );
};

export default IAPaymentStep;
