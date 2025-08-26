// frontend/src/components/ConfirmModal.jsx
import React from 'react';
import Modal from './Modal';
import './ConfirmModal.css';

function ConfirmModal({ isOpen, onClose, onConfirm, title, children }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="confirm-modal-body">
        <p>{children}</p>
      </div>
      <div className="confirm-modal-actions">
        <button onClick={onClose} className="btn-secondary">
          Cancel
        </button>
        <button onClick={onConfirm} className="btn-danger">
          Confirm
        </button>
      </div>
    </Modal>
  );
}

export default ConfirmModal;