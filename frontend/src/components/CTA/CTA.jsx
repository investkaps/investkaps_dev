import React from 'react';
import { Link } from 'react-router-dom';
import './CTA.css';
import Button from '../Button/Button';

const CTA = () => {
  return (
    <section className="cta-section">
      <div className="cta-container">
        <div className="cta-content">
          <div className="cta-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5"></path>
              <path d="M2 12l10 5 10-5"></path>
            </svg>
            <span>Start Investing Today</span>
          </div>
          <h2 className="cta-title">Ready to Grow Your Wealth?</h2>
          <p className="cta-description">
            Join thousands of successful investors who trust InvestKaps for expert investment advisory.
            Get personalized stock recommendations and market insights tailored to your goals.
          </p>
          <div className="cta-buttons">
            <Link to="/dashboard">
              <Button type="primary" size="large">Get Started Today</Button>
            </Link>
            <Link to="/dashboard">
              <Button type="outline" size="large">View Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
      <div className="cta-decoration cta-decoration-1"></div>
      <div className="cta-decoration cta-decoration-2"></div>
      <div className="cta-decoration cta-decoration-3"></div>
    </section>
  );
};

export default CTA;
