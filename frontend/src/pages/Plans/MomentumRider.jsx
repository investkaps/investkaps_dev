import React from 'react';
import { Link } from 'react-router-dom';
import './PlanDetails.css';

const MomentumRider = () => {
  return (
    <div className="plan-details-page">
      <div className="plan-details-container">
        {/* Header */}
        <div className="plan-header">
          <Link to="/subscribe" className="back-link">← Back to Plans</Link>
          <h1 className="plan-title">Momentum Rider Plan</h1>
        </div>

        {/* Two Column Layout */}
        <div className="plan-layout">
          {/* Plan Content - Left */}
          <div className="plan-content">
          <div className="plan-section">
            <h2 className="section-title">A. Subscription tenor & pricing</h2>
            <p className="section-text">Options available:</p>
            <ul className="plan-list">
              <li>3 months - Rs. 2,999/-</li>
              <li>6 months - Rs. 5,199/-</li>
            </ul>
          </div>

          <div className="plan-section">
            <h2 className="section-title">B. Deliverables</h2>
            <p className="section-text">
              1 cash based equity trade idea every 2 weeks with clear entry/exit/stop-loss levels and rationale.
            </p>
          </div>

          <div className="plan-section">
            <h2 className="section-title">C. Research Focus</h2>
            <p className="section-text">
              Swing Trading, Breakout Stocks, Technical Analysis, Momentum Plays
            </p>
          </div>

          <div className="plan-section">
            <h2 className="section-title">D. Indicative Holding Period</h2>
            <p className="section-text">
              Short to Medium Term (Few weeks to 6 months)
            </p>
          </div>

          <div className="plan-section">
            <h2 className="section-title">E. Risk Appetite</h2>
            <p className="section-text">
              Medium to high risk. Suited for active participants/ medium term investors/ positional traders.
            </p>
          </div>

          {/* Subscribe Button */}
          <div className="subscribe-section">
            <Link 
              to="/subscribe" 
              className="subscribe-button"
            >
              Subscribe Now
            </Link>
          </div>
          </div>

          {/* Plan Image - Right */}
          <div className="plan-hero-image">
            <img src="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=500&fit=crop" alt="Momentum Trading" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MomentumRider;
