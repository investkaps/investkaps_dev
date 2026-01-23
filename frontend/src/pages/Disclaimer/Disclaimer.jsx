import React from 'react';
import './Disclaimer.css';

const Disclaimer = () => {
  const pdfUrl =
    'https://res.cloudinary.com/dh9pmvu5j/image/upload/v1767112859/Disclaimers.pdf';

  return (
    <div className="disclaimer-page">
      <div className="disclaimer-container">
        <h1 className="disclaimer-title">Disclaimers</h1>

        <div className="pdf-viewer-container">
          <iframe
            src={pdfUrl}
            className="pdf-viewer"
            title="Disclaimer Document"
            type="application/pdf"
          >
            <p>
              Your browser does not support PDFs.
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Download the PDF
              </a>{' '}
              instead.
            </p>
          </iframe>
        </div>

        <div className="download-section">
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="download-button"
          >
            📥 Download Disclaimers PDF
          </a>
        </div>
      </div>
    </div>
  );
};

export default Disclaimer;
