import React from 'react';
import { Link } from 'react-router-dom';
import './PlanDetails.css';

const LeveredRiskFnO = () => {
  return (
    <div className="plan-details-page">
      <div className="plan-details-container">
        {/* Header */}
        <div className="plan-header">
          <Link to="/subscribe" className="back-link">← Back to Plans</Link>
          <h1 className="plan-title">Levered Risk FnO Plan</h1>
        </div>

        {/* Two Column Layout */}
        <div className="plan-layout">
          {/* Plan Content - Left */}
          <div className="plan-content">
          <div className="plan-section">
            <h2 className="section-title">A. Research Focus</h2>
            <p className="section-text">
              Curated trading ideas using futures and options based on underlying indices and stocks.
            </p>
            <p className="section-text">
              The ideas can include single leg pure delta (directional views on underlying) or complex option 
              strategies largely on indices which may have multiple execution legs. Such complex strategies may 
              be based upon other first order option greeks such as vega or theta and need not be pure delta based.
            </p>
            <p className="section-text">
              The ideas will be based upon momentum, technical analysis, index or stock views as well as 
              quantitative analysis for derivatives.
            </p>
          </div>

          <div className="plan-section">
            <h2 className="section-title">B. Objective</h2>
            <p className="section-text">
              Maximizing risk adjusted returns in very short term. However, FnO requires extremely quick and 
              disciplined execution of entry and exit. Subscribers need to be mindful of the same and understand 
              the risks involved.
            </p>
          </div>

          <div className="plan-section">
            <h2 className="section-title">C. Subscription tenor & Pricing</h2>
            <p className="section-text">Monthly/ Quarterly/ Half-yearly subscription plans available.</p>
            <ul className="plan-list">
              <li>1 month - Rs. 11,999/-</li>
              <li>3 months - Rs. 29,999/-</li>
              <li>6 months - Rs. 49,999/-</li>
            </ul>
          </div>

          <div className="plan-section">
            <h2 className="section-title">D. Deliverables & Indicative Holding Period</h2>
            <p className="section-text">
              1 idea on an average per week of subscription period. Holding period starting intraday or few days 
              upto a month.
            </p>
          </div>

          <div className="plan-section">
            <h2 className="section-title">E. Minimum Capital</h2>
            <p className="section-text">
              Rs. 300,000 (considering the initial margin on a single lot of future or option sale leg as well as 
              accomodate any adverse MTM).
            </p>
            <p className="section-text">
              However, please note some strategies for instance selling a straddle involving shorting 2 option legs 
              will accordingly require much higher initial margin capital.
            </p>
          </div>

          <div className="plan-section">
            <h2 className="section-title">F. Risk Appetite</h2>
            <p className="section-text">
              Extremely high risk. Suited for sophisticated and active traders which understand the risks associated 
              with leveraged instruments such as futures and options as well as basic character of these instruments.
            </p>
          </div>

          {/* Warning Box */}
          <div className="warning-box">
            <p>
              Do read SEBI report (refer page 6) on FnO losses by majority of retailers{' '}
              <a 
                href="https://www.sebi.gov.in/reports-and-statistics/research/jan-2023/study-analysis-of-profit-and-loss-of-individual-traders-dealing-in-equity-fando-segment_67525.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="sebi-link"
              >
                here
              </a>.
            </p>
          </div>

          {/* Subscribe Button */}
          <div className="subscribe-section">
            <a 
              href="https://trade.investkaps.com/checkout" 
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

export default LeveredRiskFnO;
