import React from 'react';
import { TestimonialCard } from '../TestimonialCard/TestimonialCard';
import './TestimonialsMarquee.css';

export function TestimonialsMarquee({ 
  title,
  description,
  testimonials,
  className = ''
}) {
  return (
    <section className={`testimonials-marquee-section ${className}`}>
      <div className="testimonials-marquee-container">
        <div className="testimonials-marquee-header">
          <h2 className="testimonials-marquee-title">
            {title}
          </h2>
          <p className="testimonials-marquee-description">
            {description}
          </p>
        </div>

        <div className="testimonials-marquee-wrapper">
          <div className="testimonials-marquee-track">
            <div className="testimonials-marquee-content">
              {[...Array(4)].map((_, setIndex) => (
                testimonials.map((testimonial, i) => (
                  <TestimonialCard 
                    key={`${setIndex}-${i}`}
                    {...testimonial}
                  />
                ))
              ))}
            </div>
          </div>

          <div className="testimonials-marquee-gradient testimonials-marquee-gradient-left" />
          <div className="testimonials-marquee-gradient testimonials-marquee-gradient-right" />
        </div>
      </div>
    </section>
  );
}
