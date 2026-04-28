import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import styles from './Modal.module.css';

const Modal = ({ 
  isOpen = false, 
  title, 
  children, 
  onClose, 
  size = 'md',
  showCloseIcon = true,
  closeOnOverlayClick = true,
  preventClose = false,
  footer
}) => {
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && !preventClose && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, preventClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Focus management and keyboard accessibility (focus trapping)
  useEffect(() => {
    if (!isOpen) return;
    
    // Focus close button when modal opens
    closeButtonRef.current?.focus();
    
    const handleTab = (e) => {
      if (e.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        
        if (!focusableElements?.length) return;
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };
    
    document.addEventListener('keydown', handleTab);
    
    return () => {
      document.removeEventListener('keydown', handleTab);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = (e) => {
    if (e) e.stopPropagation();
    if (!preventClose && onClose) {
      onClose();
    }
  };

  const modalClassName = [styles.modal, styles[size]].filter(Boolean).join(' ');

  return (
    <div 
      className={styles.overlay}
      onClick={(e) => {
        if (closeOnOverlayClick && e.target === e.currentTarget) {
          handleClose(e);
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        ref={modalRef}
        className={modalClassName}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div className={styles.header}>
            <h3 id="modal-title" className={styles.title}>{title}</h3>
            {showCloseIcon && (
              <button 
                ref={closeButtonRef}
                type="button"
                onClick={handleClose}
                disabled={preventClose}
                className={styles.closeButton}
                aria-label="Close modal"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className={styles.body}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className={styles.footer}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
