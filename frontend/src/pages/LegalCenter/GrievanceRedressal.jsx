import React from 'react';
import './LegalCenter.css';

const GrievanceRedressal = () => (
  <div className="legal-center-page">
    <div className="legal-center-container">
      <header className="legal-center-header">
        <h1 className="legal-center-title">
          <span className="lang-en" lang="en">Grievance Redressal</span>
          <span className="lang-hi" lang="hi">शिकायत निवारण</span>
        </h1>
      </header>

      <section id="grievance-redressal" className="legal-section">
        <p className="intro-text">Here are the steps a client can follow in case of grievance or feedback:</p>
        <div className="grievance-step">
          <h3>Contact Us Directly</h3>
          <p>
            If you are not satisfied with my services or would like a discussion on the matter
            or pass on a feedback, please reach out on the details mentioned in contact us
            section through either email or phone or whatsapp.
          </p>
          <p><strong>First Response:</strong> Within 24 hours seeking further details if any.</p>
          <p><strong>Resolution Timeline:</strong> Best possible resolution or atleast any update within 7 working days after thoroughly revisiting all aspects of your submission.</p>
        </div>
        <div className="grievance-step">
          <h3>Escalate to SEBI</h3>
          <p>
            Under the unfortunate circumstances wherein if you do not hear back as per above
            timelines or your complaint is not resolved to satisfaction, you may refer your
            complaint to the regulator through below mechanisms established by The Securities
            and Exchange Board of India (SEBI).
          </p>
          <h4>SCORES</h4>
          <p>SEBI Complaints Redress System</p>
          <a href="https://www.scores.sebi.gov.in" target="_blank" rel="noopener noreferrer">www.scores.sebi.gov.in</a>
          <h4>ODR Portal</h4>
          <p>Online Dispute Resolution</p>
          <a href="https://www.smartodr.in" target="_blank" rel="noopener noreferrer">www.smartodr.in</a>
        </div>
        <div className="legal-contact-cta">
          <h3>Need Help?</h3>
          <p>
            We are committed to resolving your concerns promptly and fairly. Please don't
            hesitate to reach out to us.
          </p>
          <a href="mailto:investkaps@gmail.com">Contact Us</a>
        </div>
      </section>
    </div>
  </div>
);

export default GrievanceRedressal;
