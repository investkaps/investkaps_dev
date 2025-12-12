import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import './Hero.css';

const Hero = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    }
  };

  return (
    <section className="hero">
      <div className="hero-background">
        <div className="hero-gradient"></div>
        <div className="hero-pattern"></div>
      </div>

      <motion.div 
        className="hero-content"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.h1 className="hero-title" variants={itemVariants}>
          Build Your
          <span className="title-highlight"> Financial Future</span>
          <br />
          With Confidence
        </motion.h1>

        <motion.p className="hero-subtitle" variants={itemVariants}>
          Professional investment management tailored to your goals.
          Start your journey towards financial freedom with our expert guidance.
        </motion.p>

        <motion.div className="hero-actions" variants={itemVariants}>
          <a href="https://trade.investkaps.com/checkout" className="hero-cta-button">
            Start Investing Today
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;
