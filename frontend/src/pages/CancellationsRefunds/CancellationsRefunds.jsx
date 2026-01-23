import React from 'react';
import './CancellationsRefunds.css';

const CancellationsRefunds = () => {
  return (
    <div className="policy-page">
      <div className="policy-container">
        <h1 className="policy-title">Cancellation & Refunds</h1>
        
        <section className="policy-section">
          <div className="alert-box">
            <div className="alert-icon">⚠️</div>
            <div className="alert-content">
              <h3>No Refund Policy</h3>
              <p>
                There is no provision for any refund or cancellations for the services offered by 
                investkaps through its website <strong>www.investkaps.com</strong>, its subdomains 
                or its associate or affiliate channels.
              </p>
            </div>
          </div>
        </section>

        <section className="policy-section">
          <h2>Before You Subscribe</h2>
          <p>
            Therefore, I request you to read through all the information including frequently asked 
            questions (FAQs) about the scope of the service before subscribing. Thereafter, if you 
            have any queries, then please feel free to write to me at{' '}
            <a href="mailto:support@investkaps.com" className="email-link">
              support@investkaps.com
            </a>{' '}
            before you make any purchase.
          </p>
        </section>

        <section className="policy-section">
          <div className="agreement-box">
            <h3>Your Agreement</h3>
            <p>
              By availing of services, you agree to the condition of no cancellations or refunds.
            </p>
          </div>
        </section>

        <section className="policy-section">
          <div className="contact-support">
            <h3>Have Questions?</h3>
            <p>
              Please contact us before making any purchase decision. We're here to help clarify 
              any doubts you may have about our services.
            </p>
            <a href="mailto:support@investkaps.com" className="support-button">
              Contact Support
            </a>
          </div>
        </section>
      </div>
    </div>
  );
};

export default CancellationsRefunds;
