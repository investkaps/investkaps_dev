import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-top">
          <div className="footer-column">
            <h3 className="footer-title">InvestKaps</h3>
            <p className="footer-description">
              Your trusted partner for smart investments and financial growth. We help you build wealth through strategic investment opportunities.
            </p>
          </div>
          
          <div className="footer-column">
            <h4 className="footer-heading">Legal & Policies</h4>
            <ul className="footer-links">
              <li><Link to="/privacy-policy" onClick={scrollToTop}>Privacy Policy</Link></li>
              <li><Link to="/disclaimer" onClick={scrollToTop}>Disclaimer</Link></li>
              <li><Link to="/terms-and-conditions" onClick={scrollToTop}>Terms and Conditions</Link></li>
              <li><Link to="/valid-upi" onClick={scrollToTop}>Valid UPI</Link></li>
              <li><Link to="/faqs" onClick={scrollToTop}>FAQs</Link></li>
              <li><Link to="/complaints-and-audit" onClick={scrollToTop}>Complaints and Audit</Link></li>
              <li><Link to="/complaints-data" onClick={scrollToTop}>Complaints Data</Link></li>
              <li><Link to="/cancellations-and-refunds" onClick={scrollToTop}>Cancellations and Refunds</Link></li>
              <li><Link to="/grievance-redressal" onClick={scrollToTop}>Grievance Redressal</Link></li>
              <li><Link to="/code-of-conduct" onClick={scrollToTop}>Code of Conduct</Link></li>
            </ul>
          </div>
          
          <div className="footer-column">
            <h4 className="footer-heading">Contact Us</h4>
            <ul className="contact-info">
              <li>
                <i className="fas fa-map-marker-alt"></i>
                <span>A-144, Vivek Vihar, Phase-1, Delhi-110095</span>
              </li>
              <li>
                <i className="fas fa-envelope"></i>
                <span>investkaps@gmail.com</span>
              </li>
              <li>
                <i className="fas fa-phone"></i>
                <span>+91-8076283540</span>
              </li>
            </ul>
            
            <h4 className="footer-heading" style={{ marginTop: '20px' }}>Follow Us</h4>
            <div className="social-links">
              <a 
                href="https://www.instagram.com/investkaps" 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label="Instagram"
              >
                <i className="fab fa-instagram"></i>
              </a>
              <a 
                href="https://www.x.com/_investkaps" 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label="X (Twitter)"
              >
                <i className="fab fa-x-twitter"></i>
              </a>
              <a 
                href="https://www.youtube.com/@investkaps" 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label="YouTube"
              >
                <i className="fab fa-youtube"></i>
              </a>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <div className="footer-credentials">
            <p className="credential-item">SEBI Research Analyst No.: INH000016834</p>
            <p className="credential-item">BSE Enlistment No.: 6226</p>
          </div>
          <div className="copyright">
            <p>&copy; {new Date().getFullYear()} InvestKaps. All Rights Reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
