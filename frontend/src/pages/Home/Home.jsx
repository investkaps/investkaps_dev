import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import './Home.css';
import Hero from '../../components/Hero/Hero';
import CTA from '../../components/CTA/CTA';
import Features from '../../components/Features/Features';
import Newsletter from '../../components/Newsletter/Newsletter';
import { TestimonialsMarquee } from '../../components/TestimonialsMarquee/TestimonialsMarquee';

const Home = () => {
  const testimonials = [
    // {
    //   author: {
    //     name: "Rajesh Kumar",
    //     handle: "@rajeshfinance",
    //     avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
    //   },
    //   text: "investkaps has completely transformed my investment strategy. Their expert recommendations helped me achieve 40% returns in just 6 months. Highly recommended!",
    //   href: "https://twitter.com/rajeshfinance"
    // },
    // {
    //   author: {
    //     name: "Priya Sharma",
    //     handle: "@priyainvests",
    //     avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face"
    //   },
    //   text: "As a first-time investor, I was nervous about the stock market. investkaps provided personalized guidance that gave me confidence. Their research-driven approach is exceptional."
    // },
    // {
    //   author: {
    //     name: "Amit Patel",
    //     handle: "@amittrader",
    //     avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face"
    //   },
    //   text: "The advisory services are top-notch. They understand market trends and provide timely recommendations. My portfolio has never been more diversified and profitable.",
    //   href: "https://twitter.com/amittrader"
    // },
    // {
    //   author: {
    //     name: "Sneha Reddy",
    //     handle: "@snehastocks",
    //     avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face"
    //   },
    //   text: "investkaps made investing simple and accessible. Their platform is user-friendly and their team is always available to answer questions. Best investment decision I've made!"
    // },
    // {
    //   author: {
    //     name: "Vikram Singh",
    //     handle: "@vikraminvest",
    //     avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face"
    //   },
    //   text: "Professional, reliable, and results-driven. investkaps has helped me build a strong investment portfolio aligned with my financial goals. Truly grateful for their expertise."
    // },
    // {
    //   author: {
    //     name: "Ananya Desai",
    //     handle: "@ananyawealth",
    //     avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
    //   },
    //   text: "The research quality and stock recommendations are outstanding. investkaps has consistently delivered value and helped me make informed investment decisions."
    // }
  ];

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
      
      {/* Our Proven Process Section */}
      <motion.section 
        className="proven-process-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionVariants}
      >
        <div className="proven-process-container">
          <motion.div 
            className="section-header"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={headerVariants}
          >
            <span className="section-label">Our Proven Process</span>
            <h2 className="section-title"></h2>
            <p className="section-description">
              Real results from our research-driven recommendations. Providing a glimpse of our work by sharing our recent winning recommendations is a tool to communicate factual & verifiable output of our trading and investment process. It should not be considered as an advertisement, promotion or claim.
            </p>
          </motion.div>
          
          <div className="recommendations-showcase">
            <h3 className="showcase-title">Recent Winning Recommendations</h3>
            <div className="recommendations-grid">
              <div className="recommendation-card">
                <div className="recommendation-header">
                  <span className="stock-name">Shriram Pistons</span>
                  <span className="recommendation-badge success">On Target</span>
                </div>
                <div className="recommendation-details">
                  <div className="detail-row">
                    <span className="detail-label">Symbol</span>
                    <span className="detail-value">SHRIPISTON</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Entry Price</span>
                    <span className="detail-value">₹2,390</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Entry Date</span>
                    <span className="detail-value">May 14, 2025</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Target Price</span>
                    <span className="detail-value">₹3,500</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Duration</span>
                    <span className="detail-value">12 months</span>
                  </div>
                  {/* <div className="detail-row highlight">
                    <span className="detail-label">Returns (Dec 29th)</span>
                    <span className="detail-value gain">+31.2%</span>
                  </div> */}
                </div>
                {/* <div className="recommendation-timeline">
                  <span className="timeline-text">Duration: 5 months</span>
                </div> */}
                <a href="/reports/infosys.pdf" target="_blank" rel="noopener noreferrer" className="recommendation-link">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  View Report
                </a>
              </div>

              <div className="recommendation-card">
                <div className="recommendation-header">
                  <span className="stock-name">Sanghvi Movers</span>
                  <span className="recommendation-badge success">Target Achieved</span>
                </div>
                <div className="recommendation-details">
                  <div className="detail-row">
                    <span className="detail-label">Symbol</span>
                    <span className="detail-value">SANGHVIMOV</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Entry Price</span>
                    <span className="detail-value">₹336.7</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Entry Date</span>
                    <span className="detail-value">Sep 4, 2025</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Exit Price</span>
                    <span className="detail-value">₹387</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Exit Date</span>
                    <span className="detail-value">Sep 16, 2025</span>
                  </div>
                  {/* <div className="detail-row highlight">
                    <span className="detail-label">Returns</span>
                    <span className="detail-value gain">+14.9%</span>
                  </div> */}
                </div>
                {/* <div className="recommendation-timeline">
                  <span className="timeline-text">Duration: 5 months</span>
                </div> */}
                <a href="/reports/infosys.pdf" target="_blank" rel="noopener noreferrer" className="recommendation-link">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  View Report
                </a>
              </div>

              <div className="recommendation-card">
                <div className="recommendation-header">
                  <span className="stock-name">Interarch Building</span>
                  <span className="recommendation-badge success">Target Achieved</span>
                </div>
                <div className="recommendation-details">
                  <div className="detail-row">
                    <span className="detail-label">Symbol</span>
                    <span className="detail-value">INTERARCH</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Entry Price</span>
                    <span className="detail-value">₹2,175-2,200</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Entry Date</span>
                    <span className="detail-value">Nov 4, 2025</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Exit Price</span>
                    <span className="detail-value">₹2,400</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Exit Date</span>
                    <span className="detail-value">Nov 7, 2025</span>
                  </div>
                  {/* <div className="detail-row highlight">
                    <span className="detail-label">Returns</span>
                    <span className="detail-value gain">+9.1%</span>
                  </div> */}
                </div>
                {/* <div className="recommendation-timeline">
                  <span className="timeline-text">Duration: 5 months</span>
                </div> */}
                <a href="/reports/infosys.pdf" target="_blank" rel="noopener noreferrer" className="recommendation-link">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  View Report
                </a>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <TestimonialsMarquee 
        title="Testimonials"
        description="What our client say about us"
        testimonials={testimonials}
      />

      {/* Transition Divider: Testimonials to Newsletter */}
      <div className="section-transition section-transition-cta">
        <div className="transition-gradient"></div>
        <div className="transition-particles">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
      
      <Newsletter />
      
      <CTA />
    </div>
  );
};

export default Home;