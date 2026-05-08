import React from 'react';
import './About.css';
import CTA from '../../components/CTA/CTA';

const About = () => {
  return (
    <div className="about-page">
      {/* Meet Our Founder Section */}
      <section className="founder-section">
        <div className="founder-container">
          <div className="section-header">
            <h1 className="about-main-title">
              <span className="lang-en" lang="en">Meet Our Founder</span>
              <span className="lang-hi" lang="hi">हमारे संस्थापक से मिलें</span>
            </h1>
            <p className="about-main-subtitle lang-en" lang="en">Your trusted partner in financial growth and investment success</p>
            <p className="about-main-subtitle lang-hi" lang="hi">आपका वित्तीय विकास और निवेश सफलता का विश्वसनीय साथी</p>
          </div>
          
          <div className="founder-content">
            <div className="founder-image-wrapper">
              <img src="/founder.png" alt="Kapil Aggarwal - Founder" className="founder-image" />
            </div>
            
            <div className="founder-bio">
              <h2 className="founder-name">
                <span className="lang-en" lang="en">Kapil Aggarwal</span>
                <span className="lang-hi" lang="hi">कपिल अग्रवाल</span>
              </h2>
              <p className="founder-title lang-en" lang="en">SEBI Registered Research Analyst & Founder</p>
              <p className="founder-title lang-hi" lang="hi">सेबी पंजीकृत रिसर्च एनालिस्ट और संस्थापक</p>
              
              <div className="founder-description">
                <p className="lang-en" lang="en">
                  Kapil Aggarwal is a SEBI-registered Research Analyst and the founder of investkaps. 
                  He is a seasoned professional with over 18 years of extensive experience navigating 
                  the Indian stock markets and possesses a deep passion for developing systematic, 
                  research-driven models for trading and investment strategies. This led him to establish 
                  investkaps with a clear mission: to empower a broad audience with the knowledge and 
                  tools for effective investing, ultimately aiming to maximize their returns through a 
                  well-reasoned approach.
                </p>
                <p className="lang-hi" lang="hi">
                  कपिल अग्रवाल एक सेबी-पंजीकृत रिसर्च एनालिस्ट और इन्वेस्टकैप्स के संस्थापक हैं। 
                  वे भारतीय शेयर बाजारों में नेविगेट करने के 18 से अधिक वर्षों के व्यापक अनुभव के साथ एक अनुभवी पेशेवर हैं और ट्रेडिंग और निवेश रणनीतियों के लिए व्यवस्थित, अनुसंधान-आधारित मॉडल विकसित करने में गहरी रुचि रखते हैं। इसने उन्हें एक स्पष्ट मिशन के साथ इन्वेस्टकैप्स की स्थापना करने के लिए प्रेरित किया: ज्ञान और प्रभावी निवेश के लिए उपकरणों के साथ एक व्यापक दर्शकों को सशक्त बनाना, अंततः एक सुविचारित दृष्टिकोण के माध्यम से उनके रिटर्न को अधिकतम करने का लक्ष्य रखना।
                </p>
                
                <p className="lang-en" lang="en">
                  Kapil holds an Engineering degree from IIT Delhi (2005), an MBA from IIM Lucknow (2007), 
                  a Masters in Management from ESCP Europe Paris (2008), and a Masters in Quantitative Finance. 
                  He has worked with major Banks and a High-Frequency Trading (HFT) firm, where he served as 
                  a trader, derivatives structurer, and risk analyst.
                </p>
                <p className="lang-hi" lang="hi">
                  कपिल ने आईआईटी दिल्ली (2005) से इंजीनियरिंग की डिग्री, आईआईएम लखनऊ (2007) से एमबीए, 
                  ईएससीपी यूरोप पेरिस (2008) से मैनेजमेंट में मास्टर्स, और क्वांटिटेटिव फाइनेंस में मास्टर्स किया है। 
                  उन्होंने प्रमुख बैंकों और एक हाई-फ्रीक्वेंसी ट्रेडिंग (HFT) फर्म के साथ काम किया है, जहां उन्होंने 
                  ट्रेडर, डेरिवेटिव्स स्ट्रक्चरर और रिस्क एनालिस्ट के रूप में कार्य किया।
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <CTA />
    </div>
  );
};

export default About;
