import React from 'react';
import { Link } from 'react-router-dom';
import './PlanDetails.css';

const IK15MomentumMP = () => {
  return (
    <div className="plan-details-page">
      <div className="plan-details-container">
        {/* Header */}
        <div className="plan-header">
          <Link to="/subscribe" className="back-link">← Back to Plans</Link>
          <h1 className="plan-title">IK15 Momentum Buys Model Portfolio</h1>
        </div>

        {/* Two Column Layout */}
        <div className="plan-layout">
          {/* Plan Content - Left */}
          <div className="plan-content">
          <div className="plan-section">
            <h2 className="section-title">A. Research Focus</h2>
            <p className="section-text">
              Dynamic portfolio strategy aiming to outperform the underlying benchmark Nifty500 index by investing in top 15 stocks in the index with rebalancing.
            </p>
            <p className="section-text">
              Weekly rebalancing ensures weak performers get exited and replaced periodiclly once they meet the exit criteria, giving way to new entries.
            </p>
            <p className="section-text">
              Portfolio stocks get weights assigned basis risk parity and ensuring adequate diversification. The ideas will be based upon top momentum, relative strength as against broader market and other sectors and stocks.
            </p>
          </div>

          <div className="plan-section">
            <h2 className="section-title">B. Objective</h2>
            <p className="section-text">
              Aiming to outperform the underlying benchmark Nifty500 index. 
            </p>
          </div>

          <div className="plan-section">
            <h2 className="section-title">C. Subscription tenor & Pricing</h2>
            <p className="section-text">Monthly/ Quarterly/ Half-yearly subscription plans available.</p>
            <ul className="plan-list">
              <li>1 month - Rs. 999/-</li>
              <li>3 months - Rs. 2,999/-</li>
              <li>6 months - Rs. 5,999/-</li>
              <li>12 months - Rs. 9,999/-</li>
            </ul>
          </div>

          <div className="plan-section">
            <h2 className="section-title">D. Deliverables & Indicative Holding Period</h2>
            <p className="section-text">
              Porfolio of stocks (out of Nifty500 constituents) with rebalacing per week.
            </p>
          </div>

          <div className="plan-section">
            <h2 className="section-title">E. Minimum Capital</h2>
            <p className="section-text">
              Rs. 300,000 given portfolio of 15 stocks and multiple thereof.
            </p>
          </div>

          <div className="plan-section">
            <h2 className="section-title">F. Risk Appetite</h2>
            <p className="section-text">
              Low to medium risk. Suited for investors looking for returns on portfolio basis.
            </p>
          </div>

          {/* Subscribe Button */}
          <div className="subscribe-section">
            <a 
              href="https://trade.investkaps.com/model-portfolios" 
              className="subscribe-button"
            >
              Subscribe Now
            </a>
          </div>
          </div>
          {/* Plan Image - Right */}
          <div className="plan-hero-image">
            <img src="https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&h=500&fit=crop" alt="Financial Trading" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default IK15MomentumMP;
