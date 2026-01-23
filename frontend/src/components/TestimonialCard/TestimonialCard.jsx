import React from 'react';
import './TestimonialCard.css';

export function TestimonialCard({ 
  author,
  text,
  href,
  className = ''
}) {
  const CardElement = href ? 'a' : 'div';
  
  return (
    <CardElement
      {...(href ? { href, target: "_blank", rel: "noopener noreferrer" } : {})}
      className={`testimonial-card ${className}`}
    >
      <div className="testimonial-card-header">
        <div className="testimonial-avatar">
          <img src={author.avatar} alt={author.name} />
        </div>
        <div className="testimonial-author-info">
          <h3 className="testimonial-author-name">
            {author.name}
          </h3>
          <p className="testimonial-author-handle">
            {author.handle}
          </p>
        </div>
      </div>
      <p className="testimonial-text">
        {text}
      </p>
    </CardElement>
  );
}
