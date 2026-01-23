import React from 'react';
import './Services.css';
import CTA from '../../components/CTA/CTA';

const ServicesPage = () => {
  const services = [
    {
      id: 1,
      title: 'Wealth Management',
      description: 'Our comprehensive wealth management service takes a holistic approach to your financial well-being. We analyze your entire financial situation, create personalized strategies, and provide ongoing management to help you build and preserve wealth.',
      features: [
        'Personalized financial planning',
        'Investment portfolio management',
        'Risk assessment and management',
        'Regular performance reviews',
        'Wealth preservation strategies'
      ],
      icon: '💼'
    },
    {
      id: 2,
      title: 'Investment Advisory',
      description: 'Our investment advisory services provide expert guidance on investment opportunities across various asset classes. We help you make informed decisions based on your financial goals, risk tolerance, and market conditions.',
      features: [
        'Customized investment strategies',
        'Diversification planning',
        'Market analysis and insights',
        'Investment opportunity identification',
        'Portfolio rebalancing'
      ],
      icon: '📈'
    },
    {
      id: 3,
      title: 'Retirement Planning',
      description: 'Secure your future with our comprehensive retirement planning services. We help you create a roadmap to financial independence, ensuring you have the resources to enjoy your retirement years with confidence and peace of mind.',
      features: [
        'Retirement needs analysis',
        'Income projection planning',
        'Tax-efficient withdrawal strategies',
        'Social security optimization',
        'Healthcare cost planning'
      ],
      icon: '🏖️'
    },
    {
      id: 4,
      title: 'Tax Planning',
      description: 'Optimize your tax strategy with our expert tax planning services. We work to minimize your tax liabilities while ensuring compliance with all regulations, helping you keep more of what you earn and invest.',
      features: [
        'Tax-efficient investment strategies',
        'Income tax planning',
        'Estate and gift tax planning',
        'Tax loss harvesting',
        'Charitable giving strategies'
      ],
      icon: '📊'
    },
    {
      id: 5,
      title: 'Estate Planning',
      description: 'Our estate planning services help you secure your legacy and ensure your assets are distributed according to your wishes. We work with you to create a comprehensive plan that protects your loved ones and minimizes taxes.',
      features: [
        'Will and trust creation',
        'Asset protection strategies',
        'Beneficiary designation review',
        'Legacy planning',
        'Charitable giving integration'
      ],
      icon: '📝'
    },
    {
      id: 6,
      title: 'Financial Education',
      description: 'Empower yourself with financial knowledge through our educational resources and guidance. We believe informed investors make better decisions, and we\'re committed to helping you understand the financial landscape.',
      features: [
        'One-on-one financial coaching',
        'Investment workshops and seminars',
        'Educational resources and materials',
        'Market updates and newsletters',
        'Financial literacy programs'
      ],
      icon: '🎓'
    }
  ];

  return (
    <div className="services-page">
      {/* Services Hero Section */}
      <section className="services-hero">
        <div className="services-hero-overlay"></div>
        <div className="services-hero-content">
          <h1 className="services-hero-title">Our Services</h1>
          <p className="services-hero-subtitle">
            Comprehensive financial solutions tailored to your unique needs
          </p>
        </div>
      </section>
      
      {/* Services Overview */}
      <section className="services-overview">
        <div className="services-overview-container">
          <div className="section-header">
            <span className="section-subtitle">What We Offer</span>
            <h2 className="section-title">Comprehensive Financial Services</h2>
            <p className="section-description">
              At InvestKaps, we offer a wide range of financial services designed to help you achieve your financial goals. 
              Our expert team provides personalized solutions tailored to your unique needs and circumstances.
            </p>
          </div>
        </div>
      </section>
      
      {/* Services List */}
      <section className="services-list">
        <div className="services-list-container">
          {services.map((service) => (
            <div className="service-card" key={service.id}>
              <div className="service-icon">
                <span>{service.icon}</span>
              </div>
              <div className="service-content">
                <h3 className="service-title">{service.title}</h3>
                <p className="service-description">{service.description}</p>
                <div className="service-features">
                  <h4 className="features-title">Key Features</h4>
                  <ul className="features-list">
                    {service.features.map((feature, index) => (
                      <li key={index} className="feature-item">
                        <span className="feature-check">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <button className="service-button">Learn More</button>
              </div>
            </div>
          ))}
        </div>
      </section>
      
      {/* Process Section */}
      <section className="process-section">
        <div className="process-container">
          <div className="section-header">
            <span className="section-subtitle">Our Approach</span>
            <h2 className="section-title">How We Work With You</h2>
            <p className="section-description">
              Our client-centered approach ensures that we understand your unique financial situation and goals before creating a personalized strategy.
            </p>
          </div>
          
          <div className="process-steps">
            <div className="process-step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3 className="step-title">Initial Consultation</h3>
                <p className="step-description">
                  We begin with a comprehensive discussion to understand your financial goals, risk tolerance, and current financial situation.
                </p>
              </div>
            </div>
            
            <div className="process-step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3 className="step-title">Financial Analysis</h3>
                <p className="step-description">
                  Our team conducts a thorough analysis of your financial data to identify opportunities and potential challenges.
                </p>
              </div>
            </div>
            
            <div className="process-step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3 className="step-title">Strategy Development</h3>
                <p className="step-description">
                  We create a personalized financial strategy designed to help you achieve your specific goals and objectives.
                </p>
              </div>
            </div>
            
            <div className="process-step">
              <div className="step-number">4</div>
              <div className="step-content">
                <h3 className="step-title">Implementation</h3>
                <p className="step-description">
                  With your approval, we implement the recommended strategies and begin working toward your financial goals.
                </p>
              </div>
            </div>
            
            <div className="process-step">
              <div className="step-number">5</div>
              <div className="step-content">
                <h3 className="step-title">Ongoing Management</h3>
                <p className="step-description">
                  We continuously monitor your portfolio and financial plan, making adjustments as needed to keep you on track.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* FAQ Section */}
      <section className="faq-section">
        <div className="faq-container">
          <div className="section-header">
            <span className="section-subtitle">Common Questions</span>
            <h2 className="section-title">Frequently Asked Questions</h2>
          </div>
          
          <div className="faq-grid">
            <div className="faq-item">
              <h3 className="faq-question">What is the minimum investment amount?</h3>
              <p className="faq-answer">
                Our services are available for various investment levels. While some strategies may require minimum investments, we offer solutions for investors at different stages of their financial journey.
              </p>
            </div>
            
            <div className="faq-item">
              <h3 className="faq-question">How often will we review my portfolio?</h3>
              <p className="faq-answer">
                We conduct regular portfolio reviews, typically quarterly, but we also monitor your investments continuously and make adjustments as market conditions change.
              </p>
            </div>
            
            <div className="faq-item">
              <h3 className="faq-question">What fees do you charge?</h3>
              <p className="faq-answer">
                Our fee structure varies based on the services provided and the size of your portfolio. We believe in transparency and will discuss all fees upfront before you make any commitments.
              </p>
            </div>
            
            <div className="faq-item">
              <h3 className="faq-question">Can I access my funds at any time?</h3>
              <p className="faq-answer">
                Most of our investment options provide liquidity, allowing you to access your funds when needed. However, some specialized investments may have specific terms regarding withdrawals.
              </p>
            </div>
            
            <div className="faq-item">
              <h3 className="faq-question">How do you measure investment performance?</h3>
              <p className="faq-answer">
                We measure performance against established benchmarks and your personal financial goals. Regular reports will show your progress and how your investments are performing.
              </p>
            </div>
            
            <div className="faq-item">
              <h3 className="faq-question">What makes InvestKaps different from other firms?</h3>
              <p className="faq-answer">
                Our personalized approach, transparent communication, and focus on long-term relationships set us apart. We prioritize your financial goals and work as your partner in achieving them.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      <CTA />
    </div>
  );
};

export default ServicesPage;
