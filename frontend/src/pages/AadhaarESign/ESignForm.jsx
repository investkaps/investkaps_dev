import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { isValidEmail, isValidName } from '../../utils/validators';
import { loadAgreementBase64 } from './agreementBase64Loader';
import './ESignForm.css';

// Get API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const SERVICE_TYPE = (() => {
  const search = typeof window !== 'undefined' ? window.location.search : '';
  const urlServiceType = new URLSearchParams(search).get('serviceType');
  if (urlServiceType === 'IA' || urlServiceType === 'RA') {
    return urlServiceType;
  }

  const storedServiceType = typeof window !== 'undefined'
    ? window.localStorage.getItem('active_esign_service_type')
    : null;

  return storedServiceType === 'IA' ? 'IA' : 'RA';
})();

const AGREEMENT_CONFIG = {
  RA: {
    profileId: 'TNbM5NR',
    fileName: 'RA Client Agreement',
    heading: 'RA Aadhaar E-Sign Form',
    description: 'Complete the Research Analyst agreement to continue with onboarding.'
  },
  IA: {
    profileId: 'sJRIpdu',
    fileName: 'IA Service Agreement',
    heading: 'IA Aadhaar E-Sign Form',
    description: 'Complete the Investment Advisor agreement to continue with onboarding.'
  }
};

function ESignForm() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [formData, setFormData] = useState({ name: '', email: '' });
  const agreement = AGREEMENT_CONFIG[SERVICE_TYPE];

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [requestId, setRequestId] = useState(null);
  const [signUrl, setSignUrl] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const esignStatus = urlParams.get('esign');
    if (esignStatus !== 'completed') return;

    const activeDocId = localStorage.getItem('active_esign_document_id');
    if (!activeDocId) {
      navigate('/dashboard?esign=completed');
      return;
    }

    const run = async () => {
      setCheckingStatus(true);
      try {
        const token = await getToken();
        const resp = await fetch(`${API_URL}/esign/document/${activeDocId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (resp.ok) {
          const data = await resp.json();
          if (data?.success && (data?.data?.isCompleted === true || data?.data?.status === 'COMPLETED' || data?.data?.status === 'completed')) {
            localStorage.removeItem('active_esign_document_id');
            localStorage.removeItem('active_esign_service_type');
          }
        }
      } finally {
        setCheckingStatus(false);
        navigate('/dashboard?esign=completed');
      }
    };

    run();
  }, [getToken, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isValidName(formData.name)) {
      setError('Please enter a valid full name (2-100 characters, letters only)');
      return;
    }
    if (!isValidEmail(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get Clerk auth token
      const token = await getToken();
      const agreementBase64 = await loadAgreementBase64(SERVICE_TYPE);

      const response = await fetch(`${API_URL}/esign`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          serviceType: SERVICE_TYPE,
          profileId: agreement.profileId,
          fileName: agreement.fileName,
          // ✅ FIXED: Match backend expectations
          invitees: [{ 
            name: formData.name, 
            email: formData.email 
          }], // Array format
          // ✅ FIXED: Correct structure for file with empty fields for template workflow
          file: {
            name: agreement.fileName,
            file: agreementBase64,
            fields: [{}] // Empty fields array for template workflow
          },
          irn: `INV-${Date.now()}-${Math.floor(Math.random() * 10000)}`
        })
      });

      if (response.ok) {
        const result = await response.json();

        // Backend returns Leegality response at result.data (no extra nesting)
        if (
          result.success &&
          result.data &&
          result.data.invitees &&
          result.data.invitees.length > 0 &&
          result.data.invitees[0].signUrl
        ) {
          const extractedSignUrl = result.data.invitees[0].signUrl;
          const leegalityDocumentId = result.data.documentId || result.data.requestId || result.data.irn;
          const mongoDocumentId = result.data.mongoDocumentId; // MongoDB _id from backend
          
          // Store MongoDB doc id for Dashboard to check status later
          if (mongoDocumentId) localStorage.setItem('active_esign_document_id', mongoDocumentId);
          localStorage.setItem('active_esign_service_type', SERVICE_TYPE);
          
          // Store for status checking
          setSignUrl(extractedSignUrl);
          setRequestId(leegalityDocumentId);
          
          // Redirect to the Leegality signing URL
          window.location.href = extractedSignUrl;
        } else {
          setError('No signing URL found in the response. Please contact support.');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to process your request. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="esign-container">
      <div className="esign-card">
        <h2>{agreement.heading}</h2>
        <p className="esign-description">
          {agreement.description}
        </p>
        {error && <div className="error-message">{error}</div>}
        <form className="esign-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input 
              id="name"
              type="text" 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              required 
              disabled={isLoading}
            />
            <small>As per your Aadhaar card</small>
          </div>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input 
              id="email"
              type="email" 
              name="email" 
              value={formData.email} 
              onChange={handleChange} 
              required 
              disabled={isLoading}
            />
            <small>You will receive the signed document on this email</small>
          </div>
          <button 
            type="submit" 
            className={`submit-button ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? '​' : 'Proceed to E-Sign'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ESignForm;
 