import React from 'react';
import './About.css';
import CTA from '../../components/CTA/CTA';

const About = () => {
  return (
    <div className="about-page">
      {/* Hero Section */}
      <section className="about-hero">
        <div className="about-hero-overlay"></div>
        <div className="about-hero-content">
          <h1 className="about-hero-title">About InvestKaps</h1>
          <p className="about-hero-subtitle">
            Your trusted partner in financial growth and investment success
          </p>
        </div>
      </section>
      
      {/* Meet Our Founder Section */}
      <section className="founder-section">
        <div className="founder-container">
          <div className="section-header">
            <span className="section-subtitle">Leadership</span>
            <h2 className="section-title">Meet Our Founder</h2>
          </div>
          
          <div className="founder-content">
            <div className="founder-image-wrapper">
              <img src="/founder.png" alt="Kapil Aggarwal - Founder" className="founder-image" />
            </div>
            
            <div className="founder-bio">
              <h3 className="founder-name">Kapil Aggarwal</h3>
              <p className="founder-title">SEBI Registered Research Analyst & Founder</p>
              
              <div className="founder-description">
                <p>
                  Kapil Aggarwal is a SEBI-registered Research Analyst and the founder of investkaps. 
                  He is a seasoned professional with over 18 years of extensive experience navigating 
                  the Indian stock markets and possesses a deep passion for developing systematic, 
                  research-driven models for trading and investment strategies. This led him to establish 
                  investkaps with a clear mission: to empower a broad audience with the knowledge and 
                  tools for effective investing, ultimately aiming to maximize their returns through a 
                  well-reasoned approach.
                </p>
                
                <p>
                  Kapil holds an Engineering degree from IIT Delhi (2005), an MBA from IIM Lucknow (2007), 
                  a Masters in Management from ESCP Europe Paris (2008), and a Masters in Quantitative Finance. 
                  He has worked with major Banks and a High-Frequency Trading (HFT) firm, where he served as 
                  a trader, derivatives structurer, and risk analyst.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <CTA />
    </div>
  );
};

export default About;
