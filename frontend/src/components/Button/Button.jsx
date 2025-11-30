import React from 'react';
import './Button.css';

const Button = ({ 
  children, 
  type = 'primary', 
  size = 'medium', 
  onClick, 
  fullWidth = false,
  disabled = false,
  className = '',
  animated = true
}) => {
  return (
    <button
      className={`
        button 
        button-${type} 
        button-${size}
        ${fullWidth ? 'button-full-width' : ''}
        ${animated ? 'button-animated' : ''}
        ${className}
      `}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default Button;
