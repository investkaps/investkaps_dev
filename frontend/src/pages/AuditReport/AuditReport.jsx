import React from 'react';
import './AuditReport.css';

const AuditReport = () => {
  return (
    <div className="audit-report-page">
      <div className="audit-report-container">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">Audit Report</h1>
          <p className="page-subtitle">SEBI Research Analysts Information</p>
        </div>

        {/* Image Section */}
        <section className="audit-image-section">
          <div className="image-container">
            <img src="/audit.png" alt="Audit Report 1" className="audit-image" />
          </div>
          <div className="image-container">
            <img src="/audit2.png" alt="Audit Report 2" className="audit-image" />
          </div>
        </section>
      </div>
    </div>
  );
};

export default AuditReport;
