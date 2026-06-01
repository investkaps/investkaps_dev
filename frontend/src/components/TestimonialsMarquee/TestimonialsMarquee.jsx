import React from 'react';
import { TestimonialCard } from '../TestimonialCard/TestimonialCard';
import './TestimonialsMarquee.css';

export function TestimonialsMarquee({ 
  title,
  description,
  testimonials,
  className = ''
}) {
  // Avoid repeating the same testimonials excessively.
  // Only repeat when there are few items so the marquee still scrolls.
  const visibleSlots = 4; // baseline number of items visible in the track
  let repeatCount = 1;
  if (!testimonials || testimonials.length === 0) {
    repeatCount = 1;
  } else if (testimonials.length < visibleSlots) {
    repeatCount = Math.ceil(visibleSlots / testimonials.length);
  }
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
              {Array.from({ length: repeatCount }).map((_, setIndex) => (
                testimonials.map((testimonial, i) => (
                  testimonial.empty ? (
                    <div key={`${setIndex}-${i}`} className="testimonial-card testimonial-card-empty" />
                  ) : (
                      <TestimonialCard
                        key={`${setIndex}-${i}`}
                        author={{
                          name: testimonial.name,
                          avatar: testimonial.avatar || null,
                          handle: testimonial.occupation || null,
                        }}
                        text={testimonial.text}
                      />
                  )
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
