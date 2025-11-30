import React from 'react';
import './Services.css';

const Services = () => {
  const services = [
    {
      id: 1,
      title: 'Stock Market Advisory',
      description: 'Expert recommendations on equity investments with detailed analysis and entry/exit strategies.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
          <polyline points="17 6 23 6 23 12"></polyline>
        </svg>
      ),
      color: '#8b5cf6'
    },
    {
      id: 2,
      title: 'Portfolio Management',
      description: 'Comprehensive portfolio construction and rebalancing to optimize your investment returns.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
        </svg>
      ),
      color: '#ec4899'
    },
    {
      id: 3,
      title: 'Market Research',
      description: 'In-depth market research, technical analysis, and fundamental insights for informed decisions.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
      ),
      color: '#06b6d4'
    },
    {
      id: 4,
      title: 'Risk Assessment',
      description: 'Evaluate and manage investment risks with our sophisticated risk analysis framework.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
      ),
      color: '#10b981'
    },
    {
      id: 5,
      title: 'Investment Strategies',
      description: 'Customized investment strategies aligned with your financial goals and risk appetite.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      ),
      color: '#f59e0b'
    },
    {
      id: 6,
      title: 'Real-time Alerts',
      description: 'Get instant notifications on market movements and investment opportunities.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
      ),
      color: '#ef4444'
    }
  ];

  return (
    <section className="services-section" id="services">
      <div className="services-container">
        <div className="section-header">
          <span className="section-label">Our Services</span>
          <h2 className="section-title">Comprehensive Investment Solutions</h2>
          <p className="section-description">
            Professional advisory services designed to help you make smarter investment decisions and grow your wealth
          </p>
        </div>

        <div className="services-grid">
          {services.map((service) => (
            <div key={service.id} className="service-card">
              <div className="service-icon" style={{ backgroundColor: `${service.color}15`, color: service.color }}>
                {service.icon}
              </div>
              <h3 className="service-title">{service.title}</h3>
              <p className="service-description">{service.description}</p>
              <div className="service-arrow" style={{ color: service.color }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
