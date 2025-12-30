import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './FAQ.css';

const FAQ = () => {
  const [activeIndex, setActiveIndex] = useState(null);

  const toggleFAQ = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  const pdfUrl =
    'https://res.cloudinary.com/dh9pmvu5j/image/upload/v1767112860/FAQs.pdf';

  const faqs = [
    {
      question:
        "I have many basic questions about SEBI RAs in general. Where can I know more about them?",
      answer: (
        <>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="faq-link"
          >
            Click here
          </a>.
        </>
      ),
    },
    {
      question:
        "I know about SEBI RAs but I want to know more about investkaps, its offerings and how to subscribe. Where can I know more?",
      answer: (
        <>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="faq-link"
          >
            Click here
          </a>.
        </>
      ),
    },
    {
      question:
        "How do I verify genuine Research Analyst so as to not fall prey to impersonation fraud?",
      answer: (
        <>
          Please{' '}
          <Link to="/complaints-and-audit" className="faq-link">
            click here
          </Link>{' '}
          and refer to "Important Notice Regarding Fraudulent Activities".
          Ensure the correct registered RA details including contact number on{' '}
          <a
            href="https://www.sebi.gov.in/sebiweb/other/OtherAction.do?doRecognisedFpi=yes&intmId=14"
            target="_blank"
            rel="noopener noreferrer"
            className="faq-link"
          >
            SEBI website
          </a>.
        </>
      ),
    },
  ];

  return (
    <div className="faq-page">
      <div className="faq-container">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">Frequently Asked Questions</h1>
          <p className="page-subtitle">Find answers to common questions</p>
        </div>

        {/* FAQ List */}
        <div className="faq-list">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`faq-item ${activeIndex === index ? 'active' : ''}`}
            >
              <div
                className="faq-question"
                onClick={() => toggleFAQ(index)}
              >
                <h3>{faq.question}</h3>
                <span className="faq-icon">
                  {activeIndex === index ? '−' : '+'}
                </span>
              </div>
              <div
                className={`faq-answer ${
                  activeIndex === index ? 'show' : ''
                }`}
              >
                <p>{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FAQ;
