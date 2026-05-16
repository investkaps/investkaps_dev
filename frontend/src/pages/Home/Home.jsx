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
    {
      empty: true
    },
    {
      author: {
        name: "Upasna Kapur",
        handle: "Retail Industry Professional",
      },
      text: "I do not have much idea of intricacies of financial world and stock markets. Availing services of investkaps has been of immense value addition to returns generated from my investments."
    },
    {
      empty: true
    },
    {
      author: {
        name: "Hitesh Raghav",
        handle: "Senior Banker",
      },
      text: "I have been a regular subscriber of Investkaps and it has been the most prudent and satisfactory decision for me so far. Consistent delivery of good returns even during the bad market phase is the highlight of the team Investkaps which reflects their research capability and understanding of the market. The accuracy of as high as 70 - 75% of the recommendations coming good without unnecessary deluge of messages, has built required confidence in this financial relation. Highly recommended."
    },
    {
      empty: true
    },
    {
      empty: true
    }
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
            <h2 className="section-title">
              <span className="lang-en" lang="en">Investment Advisory</span>
              <span className="lang-hi" lang="hi">हमारी सिद्ध प्रक्रिया</span>
            </h2>
            <p className="section-description lang-en" lang="en">
              Discover our proven process from initial consultation through implementation and ongoing management. Explore our collective research and media presence across leading finance outlets, which showcases how we present investment ideas and market insights.
            </p>
            <p className="section-description lang-hi" lang="hi">
              प्रारंभिक परामर्श से लेकर कार्यान्वयन और निरंतर प्रबंधन तक हमारी सिद्ध प्रक्रिया देखें। प्रमुख वित्तीय मीडिया आउटलेट्स में हमारी कवरेज देखें, जो यह दर्शाती है कि हम निवेश विचारों और बाजार अंतर्दृष्टियों को कैसे प्रस्तुत करते हैं।
            </p>
          </motion.div>
          
          <div className="process-steps">
            <div className="steps-grid">
              <article className="process-step-card">
                <div className="process-step-number">01</div>
                <h3 className="process-step-title">Initial Consultation</h3>
                <p className="process-step-text">We start by understanding your financial picture, goals, risk tolerance, and life stage.</p>
              </article>
              <article className="process-step-card">
                <div className="process-step-number">02</div>
                <h3 className="process-step-title">Strategy Development</h3>
                <p className="process-step-text">A tailored plan is built for your objectives, whether wealth creation, retirement, ESOPs, or education funding.</p>
              </article>
              <article className="process-step-card">
                <div className="process-step-number">03</div>
                <h3 className="process-step-title">Implementation</h3>
                <p className="process-step-text">We execute with disciplined monitoring, low-cost entry, and careful tracking of what matters most.</p>
              </article>
              <article className="process-step-card">
                <div className="process-step-number">04</div>
                <h3 className="process-step-title">Ongoing Management</h3>
                <p className="process-step-text">Annual reviews, rebalancing, and life-event check-ins keep your plan aligned with your changing needs.</p>
              </article>
            </div>
          </div>

          <div className="media-showcase">
            <h3 className="showcase-title">Media Presence</h3>
            <p className="section-description">Explore our coverage and articles across leading finance and news platforms.</p>
            <div className="media-links-list">
              <a href="#" target="_blank" rel="noreferrer" className="media-link">Investing – Our approach to long-term investment ideas</a>
              <a href="#" target="_blank" rel="noreferrer" className="media-link">MSN – Expert commentary on market trends and portfolio strategy</a>
              <a href="#" target="_blank" rel="noreferrer" className="media-link">Economic Times – Research-led stock recommendations and outlook</a>
            </div>
          </div>
        </div>
      </motion.section>

      <TestimonialsMarquee 
        title={<><span className="lang-en" lang="en">Testimonials</span><span className="lang-hi" lang="hi">प्रशंसापत्र</span></>}
        description={<><span className="lang-en" lang="en">What our client say about us</span><span className="lang-hi" lang="hi">हमारे ग्राहक हमारे बारे में क्या कहते हैं</span></>}
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