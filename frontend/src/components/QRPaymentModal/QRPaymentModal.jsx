import React, { useState, useEffect, useRef } from 'react';
import { FaTimes as FaClose } from 'react-icons/fa';
import { isValidName, isValidTransactionId, isValidFileSize, isValidImageType, sanitizeInput } from '../../utils/validators';
import './QRPaymentModal.css';

const QRPaymentModal = ({ plan, duration, price, onClose, currentUser, onSuccess }) => {
  const [formData, setFormData] = useState({
    senderName: '',
    transactionId: '',
    transactionImage: null
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const dialogRef = useRef(null);

  const focusableSelector = [
    'button:not([disabled])',
    '[href]:not([aria-hidden="true"])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(', ');

  const getFocusableElements = (container) => {
    if (!container) return [];
    return Array.from(container.querySelectorAll(focusableSelector)).filter((element) => element.getAttribute('aria-hidden') !== 'true');
  };

  const focusFirstElement = () => {
    const dialogElement = dialogRef.current;
    if (!dialogElement) return;

    const focusableElements = getFocusableElements(dialogElement);
    (focusableElements[0] || dialogElement).focus();
  };

  useEffect(() => {
    requestAnimationFrame(focusFirstElement);
  }, []);

  useEffect(() => {
    requestAnimationFrame(focusFirstElement);
  }, [success]);

  const handleDialogKeyDown = (event) => {
    const dialogElement = dialogRef.current;

    if (event.key === 'Escape' && !uploading) {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== 'Tab' || !dialogElement) {
      return;
    }

    const focusableElements = getFocusableElements(dialogElement);
    if (focusableElements.length === 0) {
      event.preventDefault();
      dialogElement.focus();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
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

    setUploading(true);
    setError('');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('senderName', cleanName);
      formDataToSend.append('transactionId', cleanTxnId);
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
        // Call onSuccess callback if provided, otherwise call onClose
        if (onSuccess) {
          onSuccess(data);
        } else {
          onClose();
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
      <div className="duration-modal-overlay" role="presentation">
        <div
          className="qr-payment-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="qr-payment-success-title"
          aria-describedby="qr-payment-success-description"
          tabIndex={-1}
          ref={dialogRef}
          onKeyDown={handleDialogKeyDown}
        >
          <div className="success-message" role="status" aria-live="polite" aria-atomic="true">
            <div className="success-icon">✓</div>
            <h3 id="qr-payment-success-title">Payment Request Submitted!</h3>
            <p id="qr-payment-success-description">Your payment request has been submitted successfully.</p>
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
    <div className="duration-modal-overlay" role="presentation">
      <div
        className="qr-payment-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-payment-modal-title"
        aria-describedby="qr-payment-modal-description"
        tabIndex={-1}
        ref={dialogRef}
        onKeyDown={handleDialogKeyDown}
      >
        <div className="duration-modal-header">
          <div>
            <h2 id="qr-payment-modal-title">QR Code Payment</h2>
            <p id="qr-payment-modal-description" className="modal-description">
              Complete the transfer using QR and upload your transaction proof.
            </p>
          </div>
          <button className="duration-close-btn" onClick={onClose} aria-label="Close modal">
            <FaClose />
          </button>
        </div>

        <div className="qr-payment-content">
          <div className="qr-payment-details">
            <h3>Payment Details</h3>
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
            <h3>Scan QR Code to Pay</h3>
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
            
            {error && <div id="qr-payment-error" className="error-message" role="alert">{error}</div>}

            <div className="form-group">
              <label htmlFor="senderName">Sender Name *</label>
              <input
                id="senderName"
                type="text"
                value={formData.senderName}
                onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                placeholder="Enter name as per transaction"
                required
                autoComplete="name"
                aria-describedby={error ? 'qr-payment-error' : undefined}
              />
            </div>

            <div className="form-group">
              <label htmlFor="transactionId">Transaction ID / UTR Number *</label>
              <input
                id="transactionId"
                type="text"
                value={formData.transactionId}
                onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                required
                autoComplete="off"
                aria-describedby={error ? 'qr-payment-error' : undefined}
              />
            </div>

            <div className="form-group">
              <label htmlFor="transactionScreenshot">Transaction Screenshot *</label>
              <input
                id="transactionScreenshot"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                required
                aria-describedby={error ? 'qr-payment-error' : undefined}
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
