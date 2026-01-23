import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './PaymentSuccess.css';

const PaymentSuccess = () => {
  const [paymentDetails, setPaymentDetails] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Parse query parameters
    const queryParams = new URLSearchParams(location.search);
    const paymentId = queryParams.get('paymentId');
    const orderId = queryParams.get('orderId');

    if (paymentId && orderId) {
      setPaymentDetails({
        paymentId,
        orderId,
        date: new Date().toLocaleString()
      });
    }

    // Clean up any lingering Razorpay backdrops
    const removeRazorpayBackdrop = () => {
      const backdrops = document.querySelectorAll('.razorpay-backdrop, .razorpay-container');
      backdrops.forEach(backdrop => backdrop.remove());
    };
    
    // Remove immediately and after a short delay to catch late-loading backdrops
    removeRazorpayBackdrop();
    const timer = setTimeout(removeRazorpayBackdrop, 500);
    
    return () => clearTimeout(timer);
  }, [location]);

  const handleGoHome = () => {
    navigate('/');
  };

  const handleViewDashboard = () => {
    navigate('/dashboard');
  };

  // If no payment details found, show fallback message
  if (!paymentDetails) {
    return (
      <div className="payment-success-container error">
        <h1>No Payment Found</h1>
        <p>We couldn't find any payment information. If you believe this is an error, please contact support.</p>
        <button onClick={handleGoHome} className="action-button">
          Return to Home
        </button>
      </div>
    );
  }

  return (
    <div className="payment-success-container">
      <div className="success-icon">
        <svg viewBox="0 0 24 24" width="64" height="64">
          <path
            fill="currentColor"
            d="M12,0A12,12,0,1,0,24,12,12,12,0,0,0,12,0Zm6.93,8.2-6.85,9.29a1,1,0,0,1-1.43.19L5.76,13.77a1,1,0,0,1-.15-1.41,1,1,0,0,1,1.41-.15l4.24,3.35,6.31-8.56a1,1,0,0,1,1.4-.17A1,1,0,0,1,18.93,8.2Z"
          />
        </svg>
      </div>
      <h1>Payment Successful!</h1>
      <p className="success-message">
        Your payment has been processed successfully. Thank you for your subscription!
      </p>
      
      <div className="payment-details">
        <div className="detail-row">
          <span className="label">Payment ID:</span>
          <span className="value">{paymentDetails.paymentId}</span>
        </div>
        <div className="detail-row">
          <span className="label">Order ID:</span>
          <span className="value">{paymentDetails.orderId}</span>
        </div>
        <div className="detail-row">
          <span className="label">Date:</span>
          <span className="value">{paymentDetails.date}</span>
        </div>
      </div>
      
      <div className="action-buttons">
        <button onClick={handleViewDashboard} className="action-button primary">
          View Dashboard
        </button>
        <button onClick={handleGoHome} className="action-button secondary">
          Return to Home
        </button>
      </div>
      
      <p className="receipt-note">
        A receipt has been sent to your email address.
      </p>
    </div>
  );
};

export default PaymentSuccess;
