import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import './ESignForm.css';

// Get API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
// ⚠️ IMPORTANT: This profile ID must be a "Simple Sign" profile, NOT a "Template Workflow"
// Current profile 'TNbM5NR' is a template workflow and requires additional fields
// Create a new "Simple Sign" profile in Leegality dashboard and update this ID
const LEEGALITY_PROFILE_ID = 'TNbM5NR'; // TODO: Replace with Simple Sign profile ID

// Import the BASE64_PDF from the base64.jsx file
import { BASE64_PDF } from './base64.jsx';

function ESignForm() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [requestId, setRequestId] = useState(null);
  const [signUrl, setSignUrl] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      // Get Clerk auth token
      const token = await getToken();
      
      const response = await fetch(`${API_URL}/esign`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          profileId: LEEGALITY_PROFILE_ID,
          fileName: 'Terms and Conditions',
          // ✅ FIXED: Match backend expectations
          invitees: [{ 
            name: formData.name, 
            email: formData.email 
          }], // Array format
          // ✅ FIXED: Correct structure for file
          file: {
            name: 'Terms and Conditions',
            file: BASE64_PDF
          },
          irn: `INV-${Date.now()}-${Math.floor(Math.random() * 10000)}`
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Success:', result);
        
        // Debug the response structure
        console.log('Response data structure:', JSON.stringify(result, null, 2));
        
        // Extract the signUrl and documentId from the nested response structure
        // The structure is: result.data.data.invitees[0].signUrl
        if (result.success && 
            result.data && 
            result.data.data && 
            result.data.data.invitees && 
            result.data.data.invitees.length > 0 && 
            result.data.data.invitees[0].signUrl) {
          
          const extractedSignUrl = result.data.data.invitees[0].signUrl;
          const leegalityDocumentId = result.data.data.documentId || result.data.data.requestId || result.data.data.irn;
          const mongoDocumentId = result.data.mongoDocumentId; // MongoDB _id from backend
          
          console.log('Sign URL:', extractedSignUrl);
          console.log('Leegality Document ID:', leegalityDocumentId);
          console.log('MongoDB Document ID:', mongoDocumentId);
          
          // Store MongoDB document ID for status checking
          if (mongoDocumentId) {
            localStorage.setItem('activeDocumentId', mongoDocumentId);
            console.log('Stored MongoDB documentId in localStorage:', mongoDocumentId);
          }
          
          // Also store Leegality documentId as backup
          if (leegalityDocumentId) {
            localStorage.setItem('leegalityDocumentId', leegalityDocumentId);
          }
          
          // Store for status checking
          setSignUrl(extractedSignUrl);
          setRequestId(leegalityDocumentId);
          
          // Redirect to the Leegality signing URL
          window.location.href = extractedSignUrl;
        } else {
          console.error('No signing URL found in the response:', result);
          setError('No signing URL found in the response. Please contact support.');
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to send request:', errorData);
        setError(errorData.error || 'Failed to process your request. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="esign-container">
      <div className="esign-card">
        <h2>Aadhaar E-Sign Form</h2>
        <p className="esign-description">
          Please enter your details below to proceed with the e-signing process. 
          After submission, you will be redirected to the Aadhaar e-sign platform.
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
              placeholder="Enter your full name"
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
              placeholder="Enter your email address"
            />
            <small>You will receive the signed document on this email</small>
          </div>
          <button 
            type="submit" 
            className={`submit-button ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Proceed to E-Sign'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ESignForm;
 