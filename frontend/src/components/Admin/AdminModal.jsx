import React from 'react';
import Modal from '../Shared/Modal';

const sizeMap = { medium: 'medium', large: 'large', xlarge: 'xlarge', small: 'small' };

const AdminModal = ({ isOpen, onClose, title, children, size = 'large' }) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={title}
    size={sizeMap[size] || 'large'}
    contentWrapper={true}
  >
    {children}
  </Modal>
);

export default AdminModal;
