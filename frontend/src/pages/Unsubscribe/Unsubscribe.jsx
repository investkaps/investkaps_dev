import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import './Unsubscribe.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Missing unsubscribe token.');
        return;
      }

      try {
        const response = await fetch(`${API_URL}/email/unsubscribe?token=${encodeURIComponent(token)}&format=json`, {
          method: 'GET',
          headers: {
            Accept: 'application/json'
          }
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.message || 'Unable to process unsubscribe request.');
        }

        setStatus('success');
        setMessage(payload.message || 'You have been unsubscribed.');
      } catch (error) {
        setStatus('error');
        setMessage(error.message || 'Unable to process unsubscribe request.');
      }
    };

    run();
  }, [token]);

  return (
    <div className="unsubscribe-page">
      <div className="unsubscribe-card">
        <div className="unsubscribe-badge">InvestKaps</div>
        <h1>{status === 'success' ? 'You have been unsubscribed' : status === 'error' ? 'Unsubscribe failed' : 'Processing your request'}</h1>
        <p>{status === 'loading' ? 'Please wait while we update your email preferences.' : message}</p>
        {status !== 'loading' && (
          <div className="unsubscribe-actions">
            <Link to="/" className="unsubscribe-link primary">Go to Home</Link>
            <Link to="/contact" className="unsubscribe-link secondary">Contact Support</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Unsubscribe;
