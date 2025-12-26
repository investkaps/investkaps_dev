import React, { useState } from 'react';
import axios from 'axios';
import './Newsletter.css';

const Newsletter = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setStatus({ type: 'error', message: 'Please enter a valid email address' });
      return;
    }

    setIsLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await axios.post('/api/newsletter/subscribe', { email });
      
      setStatus({ 
        type: 'success', 
        message: 'Thank you for subscribing! You will be notified when this service starts.' 
      });
      setEmail('');
    } catch (error) {
      if (error.response?.status === 409) {
        setStatus({ 
          type: 'info', 
          message: 'You are already subscribed to our newsletter!' 
        });
      } else {
        setStatus({ 
          type: 'error', 
          message: error.response?.data?.message || 'Something went wrong. Please try again.' 
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="newsletter-section">
      <div className="newsletter-container">
        <div className="newsletter-content">
          <div className="newsletter-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
          </div>
          <h2 className="newsletter-title">Stay Updated</h2>
          <p className="newsletter-description">
            Register for our newsletter and be the first to know when our services launch
          </p>
          
          <form onSubmit={handleSubmit} className="newsletter-form">
            <div className="newsletter-input-group">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="newsletter-input"
                disabled={isLoading}
              />
              <button 
                type="submit" 
                className="newsletter-button"
                disabled={isLoading}
              >
                {isLoading ? 'Subscribing...' : 'Subscribe'}
              </button>
            </div>
          </form>

          {status.message && (
            <div className={`newsletter-status ${status.type}`}>
              {status.message}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Newsletter;
