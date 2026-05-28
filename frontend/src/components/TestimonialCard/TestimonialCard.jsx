import React from 'react';
import './TestimonialCard.css';

export function TestimonialCard({ 
  // Support two shapes: { author: { name, avatar, handle }, text }
  // or flattened props: { name, occupation, avatar, text }
  author,
  name,
  occupation,
  avatar,
  text,
  href,
  className = ''
}) {
  const CardElement = href ? 'a' : 'div';

  const authorName = author?.name || name || 'Anonymous';
  const authorHandle = author?.handle || occupation || '';
  const authorAvatar = author?.avatar || avatar || null;

  return (
    <CardElement
      {...(href ? { href, target: "_blank", rel: "noopener noreferrer" } : {})}
      className={`testimonial-card ${className}`}
    >
      <div className="testimonial-card-header">
        {authorAvatar && (
          <div className="testimonial-avatar">
            <img src={authorAvatar} alt={authorName} />
          </div>
        )}
        <div className="testimonial-author-info">
          <h3 className="testimonial-author-name">
            {authorName}
          </h3>
          {authorHandle && (
            <p className="testimonial-author-handle">
              {authorHandle}
            </p>
          )}
        </div>
      </div>
      <p className="testimonial-text">
        {text}
      </p>
    </CardElement>
  );
}
