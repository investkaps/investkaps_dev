import React from 'react';
import { Link } from 'react-router-dom';
import './Subscribe.css';

const Subscribe = () => {
  return (
    <div className="subscribe-page">
      <div className="subscribe-container">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">Subscription Plans</h1>
          <p className="page-subtitle">You may choose the offering best suited to your requirements</p>
        </div>

        {/* Subscription Plans Grid */}
        <div className="plans-grid">
          {/* Momentum Rider Plan */}
          <div className="plan-card">
            <div className="plan-image">
              <img src="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=250&fit=crop" alt="Momentum Trading" />
            </div>
            <h3 className="plan-name">Momentum Rider Plan</h3>
            <div className="plan-price">
              <span className="price">Rs. 5,199/-</span>
              <span className="price-note">*pricing for half-yearly plan</span>
            </div>
            <Link to="/plans/momentum-rider" className="plan-button">
              click to know more and subscribe
            </Link>
          </div>

          {/* Strategic Alpha Plan */}
          <div className="plan-card">
            <div className="plan-image">
              <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=250&fit=crop" alt="Strategic Planning" />
            </div>
            <h3 className="plan-name">Strategic Alpha Plan</h3>
            <div className="plan-price">
              <span className="price">Rs. 9,999/-</span>
              <span className="price-note">*pricing for half-yearly plan</span>
            </div>
            <Link to="/plans/strategic-alpha" className="plan-button">
              click to know more and subscribe
            </Link>
          </div>

          {/* Levered Risk FnO Plan */}
          <div className="plan-card">
            <div className="plan-image">
              <img src="https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=400&h=250&fit=crop" alt="Financial Trading" />
            </div>
            <h3 className="plan-name">Levered Risk FnO Plan</h3>
            <div className="plan-price">
              <span className="price">Rs. 11,999/-</span>
              <span className="price-note">*pricing for monthly plan</span>
            </div>
            <Link to="/plans/levered-risk-fno" className="plan-button">
              click to know more and subscribe
            </Link>
          </div>

          {/* Moonshot Wealth Plan */}
          <div className="plan-card coming-soon">
            <div className="plan-image">
              <img src="https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&h=250&fit=crop" alt="Wealth Growth" />
            </div>
            <h3 className="plan-name">Moonshot Wealth Plan</h3>
            <div className="plan-status">
              <span className="status-text">...to be launched soon</span>
            </div>
          </div>

          {/* Core Alpha Model Portfolio */}
          <div className="plan-card coming-soon">
            <div className="plan-image">
              <img src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=250&fit=crop" alt="Portfolio Management" />
            </div>
            <h3 className="plan-name">Core Alpha Model Portfolio</h3>
            <div className="plan-status">
              <span className="status-text">...to be launched soon</span>
            </div>
          </div>
        </div>

        {/* Free Subscription Section */}
        <div className="free-subscription-section">
          <div className="free-subscription-card">
            <h2 className="free-title">Free Subscription</h2>
            <p className="free-description">
              We have free subscription for you with regular market updates, sector analysis, 
              analysis of financial results, free stock ideas and recommendations and more.
            </p>
            <a href="https://trade.investkaps.com/checkout" className="free-button">
              Subscribe For Free
            </a>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="disclaimer-section">
          <p className="disclaimer-text">
            <strong>Important Disclaimer:</strong> Please note that SEBI registration does not guarantee 
            any assurance of returns to investors on the recommendations made by research analyst or any 
            intermediary. It is important to note that investment in securities are subject to inherent 
            market risks. Read all the related documents carefully.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Subscribe;
