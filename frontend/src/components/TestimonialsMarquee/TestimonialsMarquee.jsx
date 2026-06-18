import React, { useState, useEffect, useCallback } from 'react';
import { TestimonialCard } from '../TestimonialCard/TestimonialCard';
import './TestimonialsMarquee.css';

export function TestimonialsMarquee({ title, description, testimonials, className = '' }) {
  const cards = (testimonials || []).filter(t => !t.empty);
  const [index, setIndex] = useState(0);

  const next = useCallback(() => {
    setIndex(i => (i + 1) % cards.length);
  }, [cards.length]);

  const prev = () => setIndex(i => (i - 1 + cards.length) % cards.length);

  useEffect(() => {
    if (cards.length < 2) return;
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [next, cards.length]);

  if (cards.length === 0) return null;

  return (
    <section className={`tm-section ${className}`}>
      <div className="tm-container">
        <div className="tm-header">
          <h2 className="tm-title">{title}</h2>
          <p className="tm-description">{description}</p>
        </div>

        <div className="tm-carousel">
          <button className="tm-arrow tm-arrow-left" onClick={prev} aria-label="Previous">&#8592;</button>

          <div className="tm-card-wrap">
            {cards.map((t, i) => (
              <div
                key={i}
                className={`tm-slide ${i === index ? 'tm-slide-active' : ''}`}
                aria-hidden={i !== index}
              >
                <TestimonialCard
                  author={{ name: t.name, avatar: t.avatar || null, handle: t.occupation || null }}
                  text={t.text}
                />
              </div>
            ))}
          </div>

          <button className="tm-arrow tm-arrow-right" onClick={next} aria-label="Next">&#8594;</button>
        </div>

        {cards.length > 1 && (
          <div className="tm-dots">
            {cards.map((_, i) => (
              <button
                key={i}
                className={`tm-dot ${i === index ? 'tm-dot-active' : ''}`}
                onClick={() => setIndex(i)}
                aria-label={`Go to testimonial ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
