import React, { useEffect, useRef } from 'react';
import './Home.css';
import Hero from '../../components/Hero/Hero';
import CTA from '../../components/CTA/CTA';
import Features from '../../components/Features/Features';

const Home = () => {
  const investmentCardsRef = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
          }
        });
      },
      { threshold: 0.1 }
    );

    investmentCardsRef.current.forEach((card, index) => {
      if (card) {
        card.style.animationDelay = `${index * 0.15}s`;
        observer.observe(card);
      }
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="home-page">
      <Hero />

      <Features />
      
      {/* Investment Options Section */}
      <section className="investment-section">
        <div className="investment-container">
          <div className="section-header">
            <span className="section-label">Investment Options</span>
            <h2 className="section-title">Diversified Investment Opportunities</h2>
            <p className="section-description">
              Expert guidance across multiple asset classes to help you build and grow your investment portfolio
            </p>
          </div>
          
          <div className="investment-grid">
            <div 
              className="investment-card"
              ref={(el) => (investmentCardsRef.current[0] = el)}
            >
              <div className="investment-number">01</div>
              <div className="investment-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
              </div>
              <h3 className="investment-title">Stocks & Equities</h3>
              <p className="investment-description">
                Strategic equity investments with comprehensive analysis and risk management for optimal returns.
              </p>
              <a href="/investments/stocks-bonds" className="investment-link">
                Explore
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </a>
            </div>
            
            <div 
              className="investment-card"
              ref={(el) => (investmentCardsRef.current[1] = el)}
            >
              <div className="investment-number">02</div>
              <div className="investment-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path>
                  <path d="M12 18V6"></path>
                </svg>
              </div>
              <h3 className="investment-title">Mutual Funds</h3>
              <p className="investment-description">
                Professionally managed diversified funds designed to maximize returns while minimizing risk.
              </p>
              <a href="/investments/mutual-funds" className="investment-link">
                Explore
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </a>
            </div>
            
            <div 
              className="investment-card"
              ref={(el) => (investmentCardsRef.current[2] = el)}
            >
              <div className="investment-number">03</div>
              <div className="investment-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
              </div>
              <h3 className="investment-title">Advisory Services</h3>
              <p className="investment-description">
                Personalized investment recommendations and expert guidance tailored to your financial goals.
              </p>
              <a href="/investments/advisory" className="investment-link">
                Explore
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>
      
      <CTA />
    </div>
  );
};

export default Home;
