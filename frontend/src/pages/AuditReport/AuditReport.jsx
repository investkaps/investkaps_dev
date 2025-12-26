import React from 'react';
import './AuditReport.css';

const AuditReport = () => {
  return (
    <div className="audit-report-page">
      <div className="audit-report-container">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">FAQs</h1>
          <p className="page-subtitle">Frequently Asked Questions</p>
        </div>

        {/* PDF Viewer Section */}
        <section className="audit-pdf-section">
          <div className="pdf-viewer-container">
            <iframe
              src="/investkaps - FAQs.pdf"
              title="InvestKaps FAQs"
              className="pdf-viewer"
              width="100%"
              height="800px"
            />
          </div>
          <div className="pdf-download-section">
            <a 
              href="/investkaps - FAQs.pdf" 
              download="InvestKaps-FAQs.pdf"
              className="download-button"
            >
              Download FAQ Document
            </a>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AuditReport;
