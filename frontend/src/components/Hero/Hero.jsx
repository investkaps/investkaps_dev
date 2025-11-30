import React from 'react';
import { Link } from 'react-router-dom';
import './Hero.css';

const Hero = () => {
  return (
    <section className="hero">
      <div className="hero-background">
        <div className="hero-gradient"></div>
        <div className="hero-pattern"></div>
      </div>

      <div className="hero-content">
        <h1 className="hero-title">
          Build Your
          <span className="title-highlight"> Financial Future</span>
          <br />
          With Confidence
        </h1>

        <p className="hero-subtitle">
          Professional investment management tailored to your goals.
          Start your journey towards financial freedom with our expert guidance.
        </p>

        <div className="hero-actions">
          <a href="https://trade.investkaps.com/checkout" className="hero-cta-button">
            Start Investing Today
          </a>
        </div>
      </div>
    </section>
  );
};

export default Hero;
