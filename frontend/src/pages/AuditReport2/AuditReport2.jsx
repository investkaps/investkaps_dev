import React from 'react';
import './AuditReport2.css';

const AuditReport2 = () => {
  const pdfUrl = encodeURI('/Audit Report 24-25_investkaps.pdf');

  return (
    <div className="audit-report-page">
      <div className="audit-report-container">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">Audit Report FY24-25</h1>
        </div>

        {/* PDF Viewer Section */}
        <section className="audit-pdf-section">
          <div className="pdf-viewer-container">
            <iframe
              src={pdfUrl}
              title="InvestKaps Audit Report FY24-25"
              className="pdf-viewer"
              width="100%"
              height="800px"
            />
          </div>
          <div className="pdf-download-section">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="download-button"
            >
              Open Audit Report
            </a>
            <a
              href={pdfUrl}
              download="InvestKaps-Audit-Report-FY24-25.pdf"
              className="download-button secondary-download-button"
            >
              Download PDF
            </a>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AuditReport2;
