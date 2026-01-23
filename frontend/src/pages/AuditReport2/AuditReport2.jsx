import React from 'react';
import './AuditReport2.css';

const AuditReport2 = () => {
  return (
    <div className="audit-report-page">
      <div className="audit-report-container">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">About InvestKaps</h1>
          <p className="page-subtitle">Our Offerings and Subscription Details</p>
        </div>

        {/* Content Section */}
        <section className="audit-content">
          <div className="content-card">
            <h2 className="content-heading">Welcome to InvestKaps</h2>
            <p className="content-text">
              InvestKaps is a SEBI registered Research Analyst firm dedicated to providing professional 
              investment advisory services. We specialize in equity research, portfolio management guidance, 
              and strategic investment recommendations tailored to your financial goals.
            </p>

            <h3 className="content-subheading">Our Registration Details:</h3>
            <div className="registration-box">
              <p><strong>SEBI Research Analyst No.:</strong> INH000016834</p>
              <p><strong>BSE Enlistment No.:</strong> 6226</p>
            </div>

            <h3 className="content-subheading">Our Services:</h3>
            <ul className="content-list">
              <li>Comprehensive equity research and analysis</li>
              <li>Personalized investment recommendations</li>
              <li>Portfolio review and optimization strategies</li>
              <li>Market insights and trend analysis</li>
              <li>Risk assessment and management guidance</li>
              <li>Regular research reports and updates</li>
            </ul>

            <h3 className="content-subheading">Why Choose InvestKaps?</h3>
            <p className="content-text">
              With years of experience in financial markets and a commitment to ethical practices, 
              InvestKaps provides research-backed investment advice. Our team of certified professionals 
              ensures that every recommendation is thoroughly analyzed and aligned with your investment 
              objectives and risk profile.
            </p>

            <h3 className="content-subheading">How to Subscribe:</h3>
            <ol className="numbered-list">
              <li>Visit our website and explore our service offerings</li>
              <li>Choose a subscription plan that suits your investment needs</li>
              <li>Complete the registration process with your KYC documents</li>
              <li>Make payment through our secure payment gateway</li>
              <li>Start receiving personalized research reports and recommendations</li>
            </ol>

            <h3 className="content-subheading">Subscription Plans:</h3>
            <p className="content-text">
              We offer flexible subscription plans designed to cater to different investor profiles - 
              from beginners to experienced traders. Each plan includes access to our research portal, 
              regular market updates, and dedicated customer support.
            </p>

            <div className="info-box">
              <h4>Contact Us</h4>
              <p><strong>Principal Officer:</strong> Kapil Aggarwal</p>
              <p><strong>Email:</strong> investkaps@gmail.com</p>
              <p><strong>Phone:</strong> +91-8076283540</p>
              <p><strong>Address:</strong> A-144, Vivek Vihar, Phase-1, Delhi-110095</p>
            </div>

            <div className="cta-box">
              <h4>Ready to Start Your Investment Journey?</h4>
              <p>Get in touch with us today to learn more about our services and subscription options.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AuditReport2;
