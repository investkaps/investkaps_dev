import React, { useState, useEffect } from 'react';
import './Testimonials.css';
import Card from '../Card/Card';

const Testimonials = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  
  const testimonials = [
    {
      id: 1,
      name: 'Sarah Johnson',
      position: 'CEO, Tech Innovations',
      content: 'InvestKaps has transformed our company\'s financial strategy. Their expert advice helped us maximize returns while minimizing risk. I highly recommend their services to any business looking to grow their investments.',
      image: '/src/assets/testimonial-1.jpg'
    },
    {
      id: 2,
      name: 'Michael Chen',
      position: 'Retired Professor',
      content: 'After 30 years in academia, I was worried about my retirement portfolio. InvestKaps provided personalized guidance that gave me confidence in my financial future. Their team is knowledgeable, responsive, and truly cares about their clients.',
      image: '/src/assets/testimonial-2.jpg'
    },
    {
      id: 3,
      name: 'Emily Rodriguez',
      position: 'Small Business Owner',
      content: 'As a small business owner, I needed investment advice that understood my unique situation. InvestKaps delivered beyond my expectations. They helped me create a diversified portfolio that supports both my business and personal financial goals.',
      image: '/src/assets/testimonial-3.jpg'
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [testimonials.length]);

  return (
    <section className="testimonials-section">
      <div className="testimonials-container">
        <div className="section-header">
          <span className="section-subtitle">Client Feedback</span>
          <h2 className="section-title">What Our Clients Say</h2>
          <p className="section-description">
            Don't just take our word for it. Hear from our satisfied clients about their experience with InvestKaps.
          </p>
        </div>

        <div className="testimonials-slider">
          <div 
            className="testimonials-track" 
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {testimonials.map((testimonial) => (
              <div className="testimonial-slide" key={testimonial.id}>
                <Card
                  variant="testimonial"
                  content={testimonial.content}
                  image={testimonial.image}
                  title={testimonial.name}
                  subtitle={testimonial.position}
                />
              </div>
            ))}
          </div>
          
          <div className="testimonials-dots">
            {testimonials.map((_, index) => (
              <button 
                key={index} 
                className={`dot ${index === activeIndex ? 'active' : ''}`}
                onClick={() => setActiveIndex(index)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
