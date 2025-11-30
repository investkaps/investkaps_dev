import React from 'react';
import './Card.css';

const Card = ({ 
  title, 
  subtitle, 
  content, 
  image, 
  icon,
  buttonText,
  buttonAction,
  variant = 'default',
  className = ''
}) => {
  return (
    <div className={`card card-${variant} ${className}`}>
      {image && (
        <div className="card-image">
          <img src={image} alt={title} />
        </div>
      )}
      
      <div className="card-content">
        {icon && <div className="card-icon">{icon}</div>}
        
        {title && <h3 className="card-title">{title}</h3>}
        
        {subtitle && <h4 className="card-subtitle">{subtitle}</h4>}
        
        {content && <div className="card-text">{content}</div>}
        
        {buttonText && (
          <button className="card-button" onClick={buttonAction}>
            {buttonText}
          </button>
        )}
      </div>
    </div>
  );
};

export default Card;
