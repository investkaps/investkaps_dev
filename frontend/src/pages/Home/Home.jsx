import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
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

  // Animation variants for sections
  const sectionVariants = {
    hidden: { opacity: 0, y: 60 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.8, 
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    }
  };

  const headerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.6, 
        ease: "easeOut"
      }
    }
  };

  return (
    <div className="home-page">
      <Hero />

      {/* Transition Divider: Hero to Features */}
      <div className="section-transition">
        <div className="transition-wave">
          <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
            <path d="M0,64 C480,150 960,-20 1440,64 L1440,120 L0,120 Z" fill="#ffffff"></path>
          </svg>
        </div>
      </div>

      <Features />

      {/* Transition Divider: Features to Investment */}
      <div className="section-transition section-transition-alt">
        <div className="transition-connector">
          <div className="connector-line"></div>
          <div className="connector-dot"></div>
          <div className="connector-line"></div>
        </div>
      </div>
      
      {/* Investment Options Section */}
      <motion.section 
        className="investment-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionVariants}
      >
        <div className="investment-container">
          <motion.div 
            className="section-header"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={headerVariants}
          >
            <span className="section-label">Investment Options</span>
            <h2 className="section-title">Diversified Investment Opportunities</h2>
            <p className="section-description">
              Expert guidance across multiple asset classes to help you build and grow your investment portfolio
            </p>
          </motion.div>
          
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
      </motion.section>

      {/* Transition Divider: Investment to CTA */}
      <div className="section-transition section-transition-cta">
        <div className="transition-gradient"></div>
        <div className="transition-particles">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
      
      <CTA />
    </div>
  );
};

export default Home;
