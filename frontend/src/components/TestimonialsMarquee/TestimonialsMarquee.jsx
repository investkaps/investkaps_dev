import React, { useRef, useEffect } from 'react';
import { TestimonialCard } from '../TestimonialCard/TestimonialCard';
import './TestimonialsMarquee.css';

export function TestimonialsMarquee({ title, description, testimonials, className = '' }) {
  const cards = (testimonials || []).filter(t => !t.empty);
  const trackRef = useRef(null);

  // Interleave a blank spacer after every real card, then duplicate for seamless loop
  const withSpacers = cards.flatMap(c => [c, { spacer: true }]);
  const items = [...withSpacers, ...withSpacers];

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
                {t.spacer
                  ? <div className="tsec-spacer-card" aria-hidden="true" />
                  : <TestimonialCard
                      author={{ name: t.name, avatar: t.avatar || null, handle: t.occupation || null }}
                      text={t.text}
                    />
                }
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
