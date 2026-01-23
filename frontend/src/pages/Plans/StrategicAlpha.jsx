import React from 'react';
import { Link } from 'react-router-dom';
import './PlanDetails.css';

const StrategicAlpha = () => {
  return (
    <div className="plan-details-page">
      <div className="plan-details-container">
        {/* Header */}
        <div className="plan-header">
          <Link to="/subscribe" className="back-link">← Back to Plans</Link>
          <h1 className="plan-title">Strategic Alpha Plan</h1>
        </div>

        {/* Two Column Layout */}
        <div className="plan-layout">
          {/* Plan Content - Left */}
          <div className="plan-content">
          <div className="plan-section">
            <h2 className="section-title">A. Research Focus</h2>
            <p className="section-text">
              Equity cash based ideas involving stock recommendations scoring well on one or more of the criteria 
              such as Techno-Funda Analysis, Growth at Reasonable Price, Strong Momentum, Cyclical Sectoral Bets, 
              Special Situations, High Dividend Yields with holding period of tentatively upto 18 months.
            </p>
          </div>

          <div className="plan-section">
            <h2 className="section-title">B. Objective</h2>
            <p className="section-text">
              Minimum objective is to beat passive index (Nifty50) investing over medium term investment horizon.
            </p>
          </div>

          <div className="plan-section">
            <h2 className="section-title">C. Subscription tenor</h2>
            <p className="section-text">Monthly/ Quarterly/ Half-yearly subscription plans available.</p>
            <ul className="plan-list">
              <li>1 month - Rs. 1,999/-</li>
              <li>3 months - Rs. 5,499/-</li>
              <li>6 months - Rs. 9,999/-</li>
            </ul>
          </div>

          <div className="plan-section">
            <h2 className="section-title">D. Deliverables</h2>
            <p className="section-text">
              1 idea on an average per month of subscription period.
            </p>
          </div>

          <div className="plan-section">
            <h2 className="section-title">E. Indicative Holding Period</h2>
            <p className="section-text">
              Upto 18 months
            </p>
          </div>

          <div className="plan-section">
            <h2 className="section-title">F. Risk Appetite</h2>
            <p className="section-text">
              Medium risk. Suited for investors who have time horizon of few months to an year and not looking 
              for only short term trading gains.
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
            <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=500&fit=crop" alt="Strategic Planning" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrategicAlpha;
