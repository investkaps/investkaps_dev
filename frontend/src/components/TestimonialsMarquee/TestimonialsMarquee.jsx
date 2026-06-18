import React, { useRef, useEffect } from 'react';
import { TestimonialCard } from '../TestimonialCard/TestimonialCard';
import './TestimonialsMarquee.css';

export function TestimonialsMarquee({ title, description, testimonials, className = '' }) {
  const cards = (testimonials || []).filter(t => !t.empty);
  const trackRef = useRef(null);

  // Duplicate cards so the loop is seamless
  const items = [...cards, ...cards];

  if (cards.length === 0) return null;

  return (
    <section className={`tsec ${className}`}>
      <div className="tsec-inner">
        <div className="tsec-header">
          <p className="tsec-eyebrow">Testimonials</p>
          <h2 className="tsec-title">{title}</h2>
          {description && <p className="tsec-desc">{description}</p>}
        </div>

        <div className="tsec-viewport">
          <div className="tsec-track" ref={trackRef}>
            {items.map((t, i) => (
              <div className="tsec-item" key={i}>
                <TestimonialCard
                  author={{ name: t.name, avatar: t.avatar || null, handle: t.occupation || null }}
                  text={t.text}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
