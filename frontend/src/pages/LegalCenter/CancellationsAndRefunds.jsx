import React from 'react';
import './LegalCenter.css';

const CancellationsAndRefunds = () => (
  <div className="legal-center-page">
    <div className="legal-center-container">
      <header className="legal-center-header">
        <h1 className="legal-center-title">
          <span className="lang-en" lang="en">Cancellations and Refunds</span>
          <span className="lang-hi" lang="hi">रद्दीकरण और रिफंड</span>
        </h1>
      </header>

      <section id="cancellations-and-refunds" className="legal-section">
        <div className="legal-alert-box">
          <h3>No Refund Policy</h3>
          <p>
            There is no provision for any refund or cancellations for the services offered by
            investkaps through its website <strong>www.investkaps.com</strong>, its subdomains
            or its associate or affiliate channels.
          </p>
        </div>
        <h3>Before You Subscribe</h3>
        <p>
          Therefore, I request you to read through all the information including frequently asked
          questions (FAQs) about the scope of the service before subscribing. Thereafter, if you
          have any queries, then please feel free to write to me at{' '}
          <a href="mailto:investkaps@gmail.com">investkaps@gmail.com</a>{' '}
          before you make any purchase.
        </p>
        <div className="legal-agreement-box">
          <h3>Your Agreement</h3>
          <p>
            By availing of services, you agree to the condition of no cancellations or refunds.
          </p>
        </div>
        <div className="legal-support-box">
          <h3>Have Questions?</h3>
          <p>
            Please contact us before making any purchase decision. We're here to help clarify
            any doubts you may have about our services.
          </p>
          <a href="mailto:investkaps@gmail.com">Contact Support</a>
        </div>
      </section>
    </div>
  </div>
);

export default CancellationsAndRefunds;
