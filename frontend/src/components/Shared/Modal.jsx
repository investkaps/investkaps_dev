import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';

const Modal = ({
  isOpen,
  onClose,
  closeOnBackdrop = true,
  children,
  // contentWrapper=true wraps children in a white scrollable box
  // contentWrapper=false renders children directly (child brings its own styling)
  contentWrapper = true,
  // size only applies when contentWrapper=true
  size = 'large',
  title,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidths = { small: '480px', medium: '600px', large: '800px', xlarge: '960px' };
  const maxW = maxWidths[size] || maxWidths.large;

  const handleBackdrop = (e) => {
    if (closeOnBackdrop && e.target === e.currentTarget) onClose?.();
  };

  return ReactDOM.createPortal(
    <div
      onClick={handleBackdrop}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: '1rem',
      }}
    >
      {contentWrapper ? (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            maxWidth: maxW,
            maxHeight: '90vh',
            background: '#fff',
            borderRadius: '10px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            overflow: 'hidden',
          }}
        >
          {title && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem 1.5rem',
              borderBottom: '1px solid #e5e7eb',
              background: '#f9fafb',
              flexShrink: 0,
            }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#1f2937' }}>{title}</h3>
              <button onClick={onClose} style={{
                background: 'none', border: 'none', fontSize: '1.5rem',
                color: '#6b7280', cursor: 'pointer', lineHeight: 1,
                padding: '0 0.25rem', borderRadius: '4px',
              }}>×</button>
            </div>
          )}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
            {children}
          </div>
        </div>
      ) : (
        <div onClick={e => e.stopPropagation()}>
          {children}
        </div>
      )}
    </div>,
    document.body
  );
};

export default Modal;
