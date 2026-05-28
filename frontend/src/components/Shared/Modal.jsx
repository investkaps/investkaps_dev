import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import '../../pages/Admin/AdminDashboard.css';

const Modal = ({ isOpen, onClose, closeOnBackdrop = true, children, contentWrapper = true }) => {
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (!closeOnBackdrop) return;
    if (e.target.classList && e.target.classList.contains('admin-modal-backdrop')) {
      onClose && onClose();
    }
  };

  return ReactDOM.createPortal(
    <>
      <div className="admin-modal-backdrop" onClick={handleBackdropClick} />
      <div className="admin-modal" role="dialog" aria-modal="true">
        {contentWrapper ? (
          <div className="admin-modal-content">{children}</div>
        ) : (
          children
        )}
      </div>
    </>,
    document.body
  );
};

export default Modal;
