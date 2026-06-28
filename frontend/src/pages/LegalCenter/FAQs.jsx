import React from 'react';
import './LegalCenter.css';

const FAQs = () => (
  <div className="legal-center-page">
    <div className="legal-center-container">
      <header className="legal-center-header">
        <h1 className="legal-center-title">
          <span className="lang-en" lang="en">FAQs</span>
          <span className="lang-hi" lang="hi">सामान्य प्रश्न</span>
        </h1>
      </header>

      <section id="faqs" className="legal-section">
        <div className="faq-item">
          <h3>I have many basic questions about SEBI RAs in general. Where can I know more about them?</h3>
          <p>
            <a href="https://res.cloudinary.com/dh9pmvu5j/image/upload/v1767112860/FAQs.pdf" target="_blank" rel="noopener noreferrer">Read the SEBI RA basics FAQ PDF</a>.
          </p>
        </div>
        <div className="faq-item">
          <h3>I know about SEBI RAs but I want to know more about investkaps, its offerings and how to subscribe. Where can I know more?</h3>
          <p>
            <a href="https://res.cloudinary.com/dh9pmvu5j/image/upload/v1767112860/FAQs.pdf" target="_blank" rel="noopener noreferrer">Read investkaps offerings and subscription FAQs</a>.
          </p>
        </div>
        <div className="faq-item">
          <h3>How do I verify genuine Research Analyst so as to not fall prey to impersonation fraud?</h3>
          <p>
            Please refer to <a href="/complaints-and-audit">Complaints and Audit</a> and ensure the correct registered RA details including contact number on <a href="https://www.sebi.gov.in/sebiweb/other/OtherAction.do?doRecognisedFpi=yes&intmId=14" target="_blank" rel="noopener noreferrer">SEBI website</a>.
          </p>
        </div>
      </section>
    </div>
  </div>
);

export default FAQs;
