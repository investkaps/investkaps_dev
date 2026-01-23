import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import './CTA.css';
import Button from '../Button/Button';

const CTA = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    }
  };

  return (
    <section className="cta-section">
      <div className="cta-container">
        <motion.div 
          className="cta-content"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={containerVariants}
        >
          <motion.div className="cta-badge" variants={itemVariants}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5"></path>
              <path d="M2 12l10 5 10-5"></path>
            </svg>
            <span>Start Investing Today</span>
          </motion.div>
          <motion.h2 className="cta-title" variants={itemVariants}>Ready to Grow Your Wealth?</motion.h2>
          <motion.p className="cta-description" variants={itemVariants}>
            Join thousands of successful investors who trust InvestKaps for expert investment advisory.
            Get personalized stock recommendations and market insights tailored to your goals.
          </motion.p>
          <motion.div className="cta-buttons" variants={itemVariants}>
            <Link to="/dashboard">
              <Button type="primary" size="large">Get Started Today</Button>
            </Link>
            <Link to="/dashboard">
              <Button type="outline" size="large">View Dashboard</Button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
      <div className="cta-decoration cta-decoration-1"></div>
      <div className="cta-decoration cta-decoration-2"></div>
      <div className="cta-decoration cta-decoration-3"></div>
    </section>
  );
};

export default CTA;
