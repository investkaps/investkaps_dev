import React, { useEffect, useRef } from 'react';
import './Features.css';

const Features = () => {
  const sectionRef = useRef(null);
  const cardsRef = useRef([]);

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

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    cardsRef.current.forEach((card, index) => {
      if (card) {
        card.style.animationDelay = `${index * 0.1}s`;
        observer.observe(card);
      }
    });

    return () => observer.disconnect();
  }, []);

  const features = [
    {
      id: 1,
      title: 'Expert Advisory',
      description: 'Certified professionals with decades of experience in investment strategy and market analysis.',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      )
    },
    {
      id: 2,
      title: 'Personalized Strategies',
      description: 'Custom investment plans tailored to your risk profile, goals, and market conditions.',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
        </svg>
      )
    },
    {
      id: 3,
      title: 'Real-time Analytics',
      description: 'Advanced data analytics and AI-powered insights for informed investment decisions.',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="20" x2="18" y2="10"></line>
          <line x1="12" y1="20" x2="12" y2="4"></line>
          <line x1="6" y1="20" x2="6" y2="14"></line>
        </svg>
      )
    },
    {
      id: 4,
      title: 'Complete Transparency',
      description: 'Clear reporting with no hidden fees. Track your portfolio performance in real-time.',
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
      )
    },
    {
      id: 5,
      title: 'Proven Performance',
      description: 'Consistent track record of outperforming market benchmarks with disciplined approach.',
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
        </svg>
      )
    },
    {
      id: 6,
      title: 'Risk Management',
      description: 'Sophisticated risk assessment framework to protect and grow your investments.',
      gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
      )
    }
  ];

  return (
    <section className="features-section" ref={sectionRef}>
      <div className="features-container">
        <div className="section-header">
          <span className="section-label">Why Choose Us</span>
          <h2 className="section-title">Investment Excellence</h2>
          <p className="section-description">
            Empowering investors with professional advisory services and cutting-edge technology
          </p>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <div 
              key={feature.id} 
              className="feature-card"
              ref={(el) => (cardsRef.current[index] = el)}
            >
              <div className="feature-icon-wrapper" style={{ background: feature.gradient }}>
                <div className="feature-icon">
                  {feature.icon}
                </div>
              </div>
              <div className="feature-content">
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
              <div className="feature-hover-effect"></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
