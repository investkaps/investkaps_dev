import React, { useState } from 'react';
import './Subscribe.css';

const Subscribe = () => {
  const [expandedPlan, setExpandedPlan] = useState(null);

  const planCards = [
    {
      id: 'momentum-rider',
      category: 'Stock Recommendation Plans',
      name: 'Momentum Rider Plan',
      image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=250&fit=crop',
      alt: 'Momentum Trading',
      price: 'Rs. 4,999/-',
      priceNote: '*pricing for quarterly plan',
      summary: 'Active swing and momentum ideas with a medium-term holding style.',
      details: [
        { label: 'Subscription tenor & pricing', value: ['3 months - Rs. 4,999/-', '6 months - Rs. 8,999/-'] },
        { label: 'Deliverables', value: '1 cash based equity trade idea every 2 weeks with clear entry/exit/stop-loss levels and rationale.' },
        { label: 'Research focus', value: 'Swing Trading, Breakout Stocks, Technical Analysis, Momentum Plays' },
        { label: 'Indicative holding period', value: 'Short to Medium Term (Few weeks to 6 months)' },
        { label: 'Risk appetite', value: 'Medium to high risk. Suited for active participants/ medium term investors/ positional traders.' }
      ]
    },
    {
      id: 'moonshot-wealth',
      category: 'Stock Recommendation Plans',
      name: 'Moonshot Wealth Plan',
      image: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&h=250&fit=crop',
      alt: 'Wealth Growth',
      price: 'Coming soon',
      priceNote: 'launch details will be announced later',
      summary: 'A future offering for long-term wealth creation and portfolio building.',
      comingSoon: true,
      details: [
        { label: 'Status', value: '...to be launched soon' },
        { label: 'What to expect', value: 'Details will be shared once the product is ready.' }
      ]
    },
    {
      id: 'strategic-alpha',
      category: 'Stock Recommendation Plans',
      name: 'Strategic Alpha Plan',
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=250&fit=crop',
      alt: 'Strategic Planning',
      price: 'Rs. 5,499/-',
      priceNote: '*pricing for quarterly plan',
      summary: 'Medium-term equity ideas built around quality, momentum, and special situations.',
      details: [
        { label: 'Research focus', value: 'Equity cash based ideas involving stock recommendations scoring well on one or more of the criteria such as Techno-Funda Analysis, Growth at Reasonable Price, Strong Momentum, Cyclical Sectoral Bets, Special Situations, High Dividend Yields with holding period of tentatively upto 18 months.' },
        { label: 'Objective', value: 'Minimum objective is to beat passive index (Nifty50) investing over medium term investment horizon.' },
        { label: 'Subscription tenor', value: ['1 month - Rs. 2,499/-', '3 months - Rs. 5,499/-', '6 months - Rs. 9,999/-'] },
        { label: 'Deliverables', value: '1 idea on an average per month of subscription period.' },
        { label: 'Indicative holding period', value: 'Upto 18 months' },
        { label: 'Risk appetite', value: 'Medium risk. Suited for investors who have time horizon of few months to an year and not looking for only short term trading gains.' }
      ]
    },
    {
      id: 'levered-risk-fno',
      category: 'Stock & Index Derivatives Plans',
      name: 'Levered Risk FnO Plan',
      image: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=400&h=250&fit=crop',
      alt: 'Financial Trading',
      price: 'Rs. 11,999/-',
      priceNote: '*pricing for monthly plan',
      summary: 'High-conviction derivatives ideas for disciplined and sophisticated traders.',
      details: [
        { label: 'Research focus', value: 'Curated trading ideas using futures and options based on underlying indices and stocks. The ideas can include single leg pure delta (directional views on underlying) or complex option strategies largely on indices which may have multiple execution legs. Such complex strategies may be based upon other first order option greeks such as vega or theta and need not be pure delta based. The ideas will be based upon momentum, technical analysis, index or stock views as well as quantitative analysis for derivatives.' },
        { label: 'Objective', value: 'Maximizing risk adjusted returns in very short term. However, FnO requires extremely quick and disciplined execution of entry and exit. Subscribers need to be mindful of the same and understand the risks involved.' },
        { label: 'Subscription tenor & pricing', value: ['1 month - Rs. 11,999/-', '3 months - Rs. 29,999/-', '6 months - Rs. 49,999/-'] },
        { label: 'Deliverables & indicative holding period', value: '1 idea on an average per week of subscription period. Holding period starting intraday or few days upto a month.' },
        { label: 'Minimum capital', value: 'Rs. 300,000 (considering the initial margin on a single lot of future or option sale leg as well as accomodate any adverse MTM). However, please note some strategies for instance selling a straddle involving shorting 2 option legs will accordingly require much higher initial margin capital.' },
        { label: 'Risk appetite', value: 'Extremely high risk. Suited for sophisticated and active traders which understand the risks associated with leveraged instruments such as futures and options as well as basic character of these instruments.' },
        { label: 'Important note', value: 'Do read SEBI report (refer page 6) on FnO losses by majority of retailers.' }
      ]
    },
    {
      id: 'ik15-momentum',
      category: 'Model Portfolios',
      name: 'IK15_Momentum_Buys',
      image: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=400&h=250&fit=crop',
      alt: 'Financial Trading',
      price: 'Rs. 5,999/-',
      priceNote: '*pricing for half-yearly plan',
      summary: 'Momentum portfolio built around diversified top-15 Nifty500 names.',
      details: [
        { label: 'Research focus', value: 'Dynamic portfolio strategy aiming to outperform the underlying benchmark Nifty500 index by investing in top 15 stocks in the index with rebalancing. Weekly rebalancing ensures weak performers get exited and replaced periodiclly once they meet the exit criteria, giving way to new entries. Portfolio stocks get weights assigned basis risk parity and ensuring adequate diversification. The ideas will be based upon top momentum, relative strength as against broader market and other sectors and stocks.' },
        { label: 'Objective', value: 'Aiming to outperform the underlying benchmark Nifty500 index.' },
        { label: 'Subscription tenor & pricing', value: ['1 month - Rs. 999/-', '3 months - Rs. 2,999/-', '6 months - Rs. 5,999/-', '12 months - Rs. 9,999/-'] },
        { label: 'Deliverables & indicative holding period', value: 'Porfolio of stocks (out of Nifty500 constituents) with rebalacing per week.' },
        { label: 'Minimum capital', value: 'Rs. 300,000 given portfolio of 15 stocks and multiple thereof.' },
        { label: 'Risk appetite', value: 'Low to medium risk. Suited for investors looking for returns on portfolio basis.' }
      ]
    }
  ];

  const renderValue = (value) => {
    if (Array.isArray(value)) {
      return (
        <ul className="plan-detail-list">
          {value.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    }

    return <p className="plan-detail-text">{value}</p>;
  };

  const renderPlanCard = (plan) => {
    const isExpanded = expandedPlan === plan.id;
    const isComingSoon = Boolean(plan.comingSoon);

    return (
      <div key={plan.id} className={`plan-card ${isExpanded ? 'expanded' : ''}`}>
        <div className="plan-image">
          <img src={plan.image} alt={plan.alt} />
        </div>
        <h3 className="plan-name">{plan.name}</h3>
        <p className="plan-summary">{plan.summary}</p>
        <div className="plan-price">
          <span className="price">{plan.price}</span>
          <span className="price-note">{plan.priceNote}</span>
        </div>
        <div className="plan-actions">
          {isComingSoon ? (
            <span className="plan-coming-soon-pill">Coming soon</span>
          ) : (
            <>
              <button
                type="button"
                className="plan-read-more"
                onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
              >
                {isExpanded ? 'Show less' : 'Read plan details'}
              </button>
              <a href="https://trade.investkaps.com/checkout" className="plan-button">
                Subscribe
              </a>
            </>
          )}
        </div>
        <div className={`plan-details ${isExpanded && !isComingSoon ? 'open' : ''}`}>
          {plan.details.map((detail) => (
            <div key={detail.label} className="plan-detail-block">
              <h4>{detail.label}</h4>
              {renderValue(detail.value)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="subscribe-page">
      <div className="subscribe-container">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">
            <span className="lang-en" lang="en">Subscription Plans</span>
            <span className="lang-hi" lang="hi">सदस्यता योजनाएं</span>
          </h1>
          <p className="page-subtitle lang-en" lang="en">You may choose the offering best suited to your requirements</p>
          <p className="page-subtitle lang-hi" lang="hi">आप अपनी आवश्यकताओं के अनुसार सबसे उपयुक्त प्रस्ताव चुन सकते हैं</p>
        </div>

        {/* Stock Recommendation Plans */}
        <div className="plan-category">
          <h2 className="category-title">
            <span className="lang-en" lang="en">Stock Recommendation Plans</span>
            <span className="lang-hi" lang="hi">स्टॉक अनुशंसा योजनाएं</span>
          </h2>
          <div className="plans-grid">
            {planCards.filter((plan) => plan.category === 'Stock Recommendation Plans').map(renderPlanCard)}
          </div>
        </div>

        {/* Stock & Index Derivatives Plans */}
        <div className="plan-category">
          <h2 className="category-title">
            <span className="lang-en" lang="en">Stock & Index Derivatives Plans</span>
            <span className="lang-hi" lang="hi">स्टॉक और इंडेक्स डेरिवेटिव योजनाएं</span>
          </h2>
          <div className="plans-grid">
            {planCards.filter((plan) => plan.category === 'Stock & Index Derivatives Plans').map(renderPlanCard)}
          </div>
        </div>

        {/* Model Portfolios */}
        <div className="plan-category">
          <h2 className="category-title">
            <span className="lang-en" lang="en">Model Portfolios</span>
            <span className="lang-hi" lang="hi">मॉडल पोर्टफोलियो</span>
          </h2>
          <div className="plans-grid">
            <div className="plan-card coming-soon">
              <div className="plan-image">
                <img src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=250&fit=crop" alt="Portfolio Management" />
              </div>
              <h3 className="plan-name">
                <span className="lang-en" lang="en">Core Alpha Model Portfolio</span>
                <span className="lang-hi" lang="hi">कोर अल्फा मॉडल पोर्टफोलियो</span>
              </h3>
              <div className="plan-status">
                <span className="status-text lang-en" lang="en">...to be launched soon</span>
                <span className="status-text lang-hi" lang="hi">...जल्द लॉन्च किया जाएगा</span>
              </div>
            </div>
            {planCards.filter((plan) => plan.category === 'Model Portfolios').map(renderPlanCard)}
          </div>
        </div>

        {/* Free Subscription Section */}
        <div className="free-subscription-section">
          <div className="free-subscription-card">
            <h2 className="free-title">
              <span className="lang-en" lang="en">Free Subscription</span>
              <span className="lang-hi" lang="hi">मुफ्त सदस्यता</span>
            </h2>
            <p className="free-description lang-en" lang="en">
              We have free subscription for you with regular market updates, sector analysis, 
              analysis of financial results, free stock ideas and recommendations and more.
            </p>
            <p className="free-description lang-hi" lang="hi">
              हमारे पास आपके लिए मुफ्त सदस्यता है जिसमें नियमित बाजार अपडेट, क्षेत्र विश्लेषण, 
              वित्तीय परिणामों का विश्लेषण, मुफ्त स्टॉक विचार और अनुशंसाएं और बहुत कुछ शामिल हैं।
            </p>
            <a href="https://trade.investkaps.com/checkout" className="free-button">
              <span className="lang-en" lang="en">Subscribe For Free</span>
              <span className="lang-hi" lang="hi">मुफ्त सदस्यता लें</span>
            </a>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="disclaimer-section">
          <p className="disclaimer-text">
            <strong>Important Disclaimer:</strong> Please note that SEBI registration does not guarantee 
            any assurance of returns to investors on the recommendations made by research analyst or any 
            intermediary. It is important to note that investment in securities are subject to inherent 
            market risks. Read all the related documents carefully.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Subscribe;
