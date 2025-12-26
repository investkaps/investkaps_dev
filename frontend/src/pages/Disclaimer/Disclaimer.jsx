import React from 'react';
import './Disclaimer.css';

const Disclaimer = () => {
  return (
    <div className="disclaimer-page">
      <div className="disclaimer-container">
        <h1 className="disclaimer-title">Disclaimer</h1>
        
        <div className="pdf-viewer-container">
          <iframe
            src="/Disclaimers.pdf"
            className="pdf-viewer"
            title="Disclaimer Document"
            type="application/pdf"
          >
            <p>
              Your browser does not support PDFs. 
              <a href="/Disclaimers.pdf" download="Disclaimers.pdf">Download the PDF</a> instead.
            </p>
          </iframe>
        </div>

        <div className="download-section">
          <a 
            href="/Disclaimers.pdf" 
            download="Disclaimers.pdf"
            className="download-button"
          >
            📥 Download Disclaimer PDF
          </a>
        </div>
      </div>
    </div>
  );
};

export default Disclaimer;
