import React from 'react';
import './GrievanceRedressal.css';

const GrievanceRedressal = () => {
  return (
    <div className="policy-page">
      <div className="policy-container">
        <h1 className="policy-title">Grievance Redressal</h1>
        
        <section className="policy-section">
          <p className="intro-text">
            Here are the steps a client can follow in case of grievance or feedback:
          </p>
        </section>

        <section className="policy-section">
          <div className="grievance-step">
            <div className="step-number">Step 1</div>
            <div className="step-content">
              <h3>Contact Us Directly</h3>
              <p>
                If you are not satisfied with my services or would like a discussion on the matter 
                or pass on a feedback, please reach out on the details mentioned in contact us 
                section through either email or phone or whatsapp.
              </p>
              <div className="timeline-info">
                <div className="timeline-item">
                  <strong>First Response:</strong> Within 24 hours seeking further details if any.
                </div>
                <div className="timeline-item">
                  <strong>Resolution Timeline:</strong> Best possible resolution or atleast any 
                  update within 7 working days after thoroughly revisiting all aspects of your submission.
                </div>
              </div>
            </div>
          </div>

          <div className="grievance-step">
            <div className="step-number">Step 2</div>
            <div className="step-content">
              <h3>Escalate to SEBI</h3>
              <p>
                Under the unfortunate circumstances wherein if you do not hear back as per above 
                timelines or your complaint is not resolved to satisfaction, you may refer your 
                complaint to the regulator through below mechanisms established by The Securities 
                and Exchange Board of India (SEBI).
              </p>
              <div className="sebi-portals">
                <div className="portal-card">
                  <div className="portal-icon">📋</div>
                  <h4>SCORES</h4>
                  <p>SEBI Complaints Redress System</p>
                  <a 
                    href="https://www.scores.sebi.gov.in" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="portal-link"
                  >
                    www.scores.sebi.gov.in
                  </a>
                </div>
                <div className="portal-card">
                  <div className="portal-icon">⚖️</div>
                  <h4>ODR Portal</h4>
                  <p>Online Dispute Resolution</p>
                  <a 
                    href="https://www.smartodr.in" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="portal-link"
                  >
                    www.smartodr.in
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="policy-section">
          <div className="contact-cta">
            <h3>Need Help?</h3>
            <p>
              We are committed to resolving your concerns promptly and fairly. Please don't 
              hesitate to reach out to us.
            </p>
            <a href="/contact" className="cta-button">Contact Us</a>
          </div>
        </section>
      </div>
    </div>
  );
};

export default GrievanceRedressal;
