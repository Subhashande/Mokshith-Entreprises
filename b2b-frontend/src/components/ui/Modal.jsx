import React, { useEffect } from 'react';
import { X } from 'lucide-react';

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

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    full: 'max-w-[95vw]'
  };

  const handleClose = (e) => {
    if (e) e.stopPropagation();
    if (!preventClose && onClose) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
      onClick={(e) => {
        if (closeOnOverlayClick && e.target === e.currentTarget) {
          handleClose(e);
        }
      }}
    >
      <div 
        className={`bg-white rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] w-full ${sizeClasses[size] || sizeClasses.md} overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 ease-out`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-10 py-8 border-b border-gray-50 flex justify-between items-center bg-white/80 backdrop-blur-xl sticky top-0 z-10">
          <div>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight leading-none">{title}</h3>
            <div className="h-1.5 w-16 bg-blue-600 rounded-full mt-4 shadow-sm shadow-blue-200"></div>
          </div>
          {showCloseIcon && (
            <button 
              type="button"
              onClick={handleClose}
              disabled={preventClose}
              className={`p-4 rounded-[1.25rem] transition-all duration-500 active:scale-90 ${
                preventClose 
                  ? 'text-gray-100 cursor-not-allowed opacity-50' 
                  : 'hover:bg-gray-100 text-gray-400 hover:text-gray-900 hover:rotate-180 bg-gray-50/50'
              }`}
              aria-label="Close modal"
            >
              <X size={24} strokeWidth={3} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-10 py-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-10 py-8 bg-gray-50/50 border-t border-gray-100 flex items-center justify-end gap-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
