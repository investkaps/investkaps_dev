import React, { useEffect, useState } from 'react';
import './PaymentSuccess.css';
import { useLocation, useNavigate } from 'react-router-dom';

const PaymentSuccess = () => {
  const { search } = useLocation();
  const navigate = useNavigate();
  const [seconds, setSeconds] = useState(5);
  const params = new URLSearchParams(search);
  const paymentId = params.get('payment_id') || params.get('paymentId') || params.get('razorpay_payment_id');
  const orderId = params.get('order_id') || params.get('orderId') || params.get('razorpay_order_id');
  const signature = params.get('signature') || params.get('razorpay_signature');

  useEffect(() => {
    if (paymentId) {
      const t = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            clearInterval(t);
            navigate('/dashboard');
            return 0;
          }
          return s - 1;
        });
      }, 1000);
      return () => clearInterval(t);
    }
  }, [paymentId, navigate]);

  if (!paymentId) {
    return (
      <div className="payment-success-container">
        <div className="payment-success-card">
          <h2>No payment found</h2>
          <p>We couldn't detect a payment on this page. If you did complete a payment, please contact support with your order details.</p>
          <button className="btn" onClick={() => navigate('/pricing')}>Go back to Pricing</button>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-success-container">
      <div className="payment-success-card">
        <h2>Payment successful 🎉</h2>
        <p>Payment ID: <strong>{paymentId}</strong></p>
        {orderId && <p>Order ID: <strong>{orderId}</strong></p>}
        {signature && <p>Signature: <strong>{signature}</strong></p>}
        <p>Redirecting to your dashboard in {seconds} second{seconds !== 1 ? 's' : ''}...</p>
        <div className="actions">
          <button className="btn" onClick={() => navigate('/dashboard')}>Go to Dashboard</button>
          <button className="btn secondary" onClick={() => navigate('/support')}>Contact Support</button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
