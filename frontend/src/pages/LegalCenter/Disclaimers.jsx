import React from 'react';
import './LegalCenter.css';

const Disclaimers = () => (
  <div className="legal-center-page">
    <div className="legal-center-container">
      <header className="legal-center-header">
        <h1 className="legal-center-title">
          <span className="lang-en" lang="en">Disclaimers</span>
          <span className="lang-hi" lang="hi">अस्वीकरण</span>
        </h1>
      </header>

      <section id="disclaimers" className="legal-section">
        <iframe
          src="https://res.cloudinary.com/dh9pmvu5j/image/upload/v1767112859/Disclaimers.pdf"
          title="Disclaimer Document"
          className="legal-pdf-frame"
        />
        <div className="legal-download-link">
          <a href="https://res.cloudinary.com/dh9pmvu5j/image/upload/v1767112859/Disclaimers.pdf" target="_blank" rel="noopener noreferrer">
            Download the PDF
          </a>
        </div>
      </section>
    </div>
  </div>
);

export default Disclaimers;
