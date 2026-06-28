import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import './Home.css';
import Hero from '../../components/Hero/Hero';
import CTA from '../../components/CTA/CTA';
import Features from '../../components/Features/Features';
import Newsletter from '../../components/Newsletter/Newsletter';
import { TestimonialsMarquee } from '../../components/TestimonialsMarquee/TestimonialsMarquee';
import { testimonialsAPI } from '../../services/api';

const SQRT_5000 = Math.sqrt(5000);

// Odd count (5) guarantees index 2 is always position 0 (true center)
const MEDIA_ARTICLES = [
  {
    id: 0,
    href: 'https://newsable.asianetnews.com/markets/indian-markets-rebound-from-six-weeks-of-losses-s-p-upgrades-credit-rating-articleshow-ocvv8cv',
    quote: '"Indian markets rebound from six weeks of losses as global sentiment improves and S&P upgrades India\'s credit rating outlook."',
    headline: 'Indian markets rebound from six weeks of losses; S&P upgrades credit rating',
    source: 'Newsable – AsianetNews',
    logoColor: '#e8091c',
    logoText: 'Newsable',
    imgSrc: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=150&h=150&fit=crop',
  },
  {
    id: 1,
    href: 'https://stocktwits.com/news-articles/markets/equity/nifty-sensex-end-lower-august-6/chr1HYmRdPx',
    quote: '"Nifty and Sensex closed in the red on August 6 as selling pressure mounted across mid and large-cap segments."',
    headline: 'Nifty, Sensex end lower on August 6',
    source: 'StockTwits',
    logoColor: '#1DA1F2',
    logoText: 'StockTwits',
    imgSrc: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=150&h=150&fit=crop',
  },
  {
    id: 2,
    href: 'https://www.msn.com/en-us/money/topstocks/buy-call-on-goodluck-india-sebi-ra-investkaps-sees-rerating-potential-amid-defense-entry-capex-push/ar-AA1Jyrnw',
    quote: '"InvestKaps issues a buy call on Goodluck India, citing re-rating potential as the company enters the defence sector with a strong capex push."',
    headline: 'Buy call on Goodluck India — InvestKaps sees re-rating potential amid defence entry & capex push',
    source: 'MSN Money',
    logoColor: '#00a4ef',
    logoText: 'MSN Money',
    imgSrc: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=150&h=150&fit=crop',
  },
  {
    id: 3,
    href: 'https://in.investing.com/news/stock-market-news/pnb-bounces-from-200dma-sebi-ra-kapil-aggarwal-sees-nearly-10-upside-4883257',
    quote: '"SEBI-registered analyst Kapil Aggarwal of InvestKaps sees PNB bouncing from its 200-day moving average with nearly 10% upside potential."',
    headline: 'PNB bounces from 200DMA — SEBI RA Kapil Aggarwal sees nearly 10% upside',
    source: 'Investing.com',
    logoColor: '#e8231a',
    logoText: 'Investing.com',
    imgSrc: 'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=150&h=150&fit=crop',
  },
  {
    id: 4,
    href: 'https://newsable.asianetnews.com/markets/indian-markets-rebound-from-six-weeks-of-losses-s-p-upgrades-credit-rating-articleshow-ocvv8cv',
    quote: '"InvestKaps research team continues to deliver consistent market insights featured across top financial media outlets in India."',
    headline: 'InvestKaps featured across leading Indian financial media platforms',
    source: 'Newsable – AsianetNews',
    logoColor: '#e8091c',
    logoText: 'Newsable',
    imgSrc: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=150&h=150&fit=crop',
  },
];

function MediaCard({ article, position, cardSize, onMove }) {
  const isCenter = position === 0;
  const translateX = (cardSize / 1.5) * position;
  const translateY = isCenter ? -65 : position % 2 ? 15 : -15;
  const rotate = isCenter ? 0 : position % 2 ? 2.5 : -2.5;

  return (
    <div
      className={`mstagger-card${isCenter ? ' mstagger-card--center' : ''}`}
      onClick={() => onMove(position)}
      style={{
        width: cardSize,
        height: cardSize,
        clipPath: 'polygon(50px 0%, calc(100% - 50px) 0%, 100% 50px, 100% 100%, calc(100% - 50px) 100%, 50px 100%, 0 100%, 0 0)',
        transform: `translate(-50%, -50%) translateX(${translateX}px) translateY(${translateY}px) rotate(${rotate}deg)`,
        boxShadow: isCenter ? '0px 8px 0px 4px #cbd5e1' : '0px 0px 0px 0px transparent',
      }}
    >
      {/* folded-corner diagonal line */}
      <span className="mstagger-card__corner" style={{ width: SQRT_5000 }} />

      {/* publication logo badge */}
      <div className="mstagger-card__logo-badge" style={{ background: article.logoColor }}>
        {article.logoText}
      </div>

      {/* article image */}
      <img
        src={article.imgSrc}
        alt={article.source}
        className="mstagger-card__img"
      />

      {/* quote */}
      <p className="mstagger-card__quote">{article.quote}</p>

      {/* headline + CTA pinned to bottom */}
      <div className="mstagger-card__footer">
        <p className="mstagger-card__headline">{article.headline}</p>
        <a
          href={article.href}
          target="_blank"
          rel="noopener noreferrer"
          className="mstagger-card__cta"
          onClick={e => e.stopPropagation()}
        >
          Click here to read the full article ↗
        </a>
      </div>
    </div>
  );
}

function MediaStagger() {
  const [articles, setArticles] = useState(MEDIA_ARTICLES);
  const [cardSize, setCardSize] = useState(365);

  useEffect(() => {
    const update = () => setCardSize(window.matchMedia('(min-width: 640px)').matches ? 365 : 290);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const handleMove = useCallback((steps) => {
    setArticles(prev => {
      const list = [...prev];
      if (steps > 0) {
        for (let i = steps; i > 0; i--) {
          const item = list.shift();
          if (!item) return prev;
          list.push({ ...item });
        }
      } else {
        for (let i = steps; i < 0; i++) {
          const item = list.pop();
          if (!item) return prev;
          list.unshift({ ...item });
        }
      }
      return list;
    });
  }, []);

  return (
    <div className="mstagger-stage" style={{ height: cardSize + 180 }}>
      {articles.map((article, index) => {
        const position = index - Math.floor(articles.length / 2);
        return (
          <MediaCard
            key={article.id + '-' + index}
            article={article}
            position={position}
            cardSize={cardSize}
            onMove={handleMove}
          />
        );
      })}
      <div className="mstagger-nav">
        <button className="mstagger-nav__btn" onClick={() => handleMove(-1)} aria-label="Previous article">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <button className="mstagger-nav__btn" onClick={() => handleMove(1)} aria-label="Next article">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>
  );
}

const Home = () => {
  const fallbackTestimonials = [
    { empty: true },
    { name: 'Upasna Kapur', occupation: 'Retail Industry Professional', text: 'I do not have much idea of intricacies of financial world and stock markets. Availing services of investkaps has been of immense value addition to returns generated from my investments.' },
    { empty: true },
    { name: 'Hitesh Raghav', occupation: 'Senior Banker', text: 'I have been a regular subscriber of Investkaps and it has been the most prudent and satisfactory decision for me so far. Consistent delivery of good returns even during the bad market phase is the highlight of the team Investkaps which reflects their research capability and understanding of the market. The accuracy of as high as 70 - 75% of the recommendations coming good without unnecessary deluge of messages, has built required confidence in this financial relation. Highly recommended.' },
    { empty: true },
    { empty: true }
  ];

  const [testimonials, setTestimonials] = useState(fallbackTestimonials);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await testimonialsAPI.getPublic();
        if (!mounted) return;
        if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
          // backend returns flattened testimonials with fields: name, occupation, text, avatar?
          setTestimonials(res.data.map(t => ({
            name: t.name,
            occupation: t.occupation,
            text: t.text,
            avatar: t.avatar || null,
            empty: false
          })));
        }
      } catch (err) {
        // keep fallback
        console.warn('Could not load public testimonials:', err);
      }
    })();
    return () => { mounted = false; };
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

        </div>
      </motion.section>

      <div className="media-showcase-fullwidth">
        <h3 className="showcase-title">Media Presence</h3>
        <p className="section-description media-showcase-desc">Explore our coverage and articles across leading finance and news platforms.</p>
        <MediaStagger />
      </div>

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