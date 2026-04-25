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

        <div className="testimonials-static-grid">
          {testimonials.map((testimonial, i) => (
            <TestimonialCard 
              key={i}
              {...testimonial}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
