import React from 'react';
import './Loading.css';

const Loading = ({ message = 'Loading...' }) => {
  return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <h3 className="loading-text">{message}</h3>
    </div>
  );
};

export default Loading;
