import React, { useState } from 'react';
import './Contact.css';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  
  const [formStatus, setFormStatus] = useState({
    submitted: false,
    error: false,
    message: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // In a real application, you would send the form data to a server here
    
    // Simulate form submission
    setFormStatus({
      submitted: true,
      error: false,
      message: 'Thank you for your message! We will get back to you shortly.'
    });
    
    // Reset form after submission
    setFormData({
      name: '',
      email: '',
      phone: '',
      subject: '',
      message: ''
    });
  };

  return (
    <div className="contact-page">
      {/* Contact Information Section */}
      <section className="contact-info-section">
        <div className="contact-container">
          <div className="contact-page-header">
            <h1 className="contact-main-title">Contact Us</h1>
            <p className="contact-main-subtitle">Get in touch with our team of financial experts</p>
          </div>
          <div className="primary-contact-banner">
            <h2 className="primary-contact-title">We are right here:</h2>
            <p className="primary-contact-subtitle">
              <strong>Primary Contact/Grievances/Principal Officer/Nodal Officer:</strong> Kapil Aggarwal
            </p>
            <div className="registration-info">
              <p><strong>SEBI Registration:</strong> INH000016834</p>
              <p><strong>BSE Enlistment:</strong> 6226</p>
            </div>
            <p className="contact-tagline">
              Reach out at below details with any queries about the services, feedback or any complaints.
            </p>
          </div>

          <div className="contact-info-grid">
            <div className="contact-info-card">
              <div className="contact-info-icon">
                <i className="fab fa-whatsapp"></i>
              </div>
              <h3 className="contact-info-title">Message on WhatsApp</h3>
              <a href="https://wa.me/918076283540" target="_blank" rel="noopener noreferrer" className="whatsapp-link">
                +91-8076283540
              </a>
            </div>
            
            <div className="contact-info-card">
              <div className="contact-info-icon">
                <i className="contact-icon-location"></i>
              </div>
              <h3 className="contact-info-title">Visit Us</h3>
              <p className="contact-info-text">
                A-144, Vivek Vihar, Phase-1,<br />
                Delhi-110095
              </p>
            </div>
            
            <div className="contact-info-card">
              <div className="contact-info-icon">
                <i className="contact-icon-phone"></i>
              </div>
              <h3 className="contact-info-title">Call Us</h3>
              <p className="contact-info-text">
                <a href="tel:+918076283540">+91-8076283540</a>
              </p>
            </div>
            
            <div className="contact-info-card">
              <div className="contact-info-icon">
                <i className="contact-icon-email"></i>
              </div>
              <h3 className="contact-info-title">Email Us</h3>
              <p className="contact-info-text">
                <a href="mailto:investkaps@gmail.com">investkaps@gmail.com</a>
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Office Hours Section */}
      <section className="office-hours-section">
        <div className="contact-container">
          <div className="office-hours-content">
            <div className="section-header">
              <span className="section-subtitle">Visit Us</span>
              <h2 className="section-title">Office Hours</h2>
            </div>
            
            <div className="hours-grid">
              <div className="hours-item">
                <div className="day">Monday - Friday</div>
                <div className="time">9:00 AM - 5:00 PM</div>
              </div>
              
              <div className="hours-item">
                <div className="day">Saturday</div>
                <div className="time">11:00 AM - 1:00 PM</div>
              </div>
              
              <div className="hours-item">
                <div className="day">Sunday</div>
                <div className="time">Closed</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
