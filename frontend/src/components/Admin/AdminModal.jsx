import React from 'react';
import './AdminModal.css';

const AdminModal = ({ isOpen, onClose, title, children, size = 'large' }) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={handleBackdropClick}>
      <div className={`admin-modal-container ${size}`}>
        <div className="admin-modal-header">
          <h3>{title}</h3>
          <button 
            className="admin-modal-close-btn" 
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        <div className="admin-modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AdminModal;
